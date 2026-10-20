import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Placement, formatHours } from "@/hooks/useSeekerDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, Copy, Download, FileText, Loader2, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, UserPen } from "lucide-react";

type Basis = "verified" | "self_reported";
interface Bullet { text: string; placement_id: string; basis: Basis; sources: string[]; edited?: boolean }
interface Draft { id: string; title: string; target: string; placement_ids: string[]; bullets: Bullet[]; updated_at: string }
interface DiaryEntry { id: string; placement_id: string; entry_date: string; content: string }

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");

export default function CvWriter({ completed }: { completed: Placement[] }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [selfReported, setSelfReported] = useState("");
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [diaryIds, setDiaryIds] = useState<string[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDrafts = async () => {
    const { data, error } = await supabase.from("cv_drafts").select("*").order("updated_at", { ascending: false });
    if (error) { toast.error("Couldn't load saved drafts"); setDrafts([]); return; }
    setDrafts((data ?? []) as unknown as Draft[]);
  };
  useEffect(() => { loadDrafts(); }, []);

  useEffect(() => {
    if (!selected.length) { setDiary([]); setDiaryIds([]); return; }
    supabase.from("placement_diary").select("id, placement_id, entry_date, content").in("placement_id", selected).order("entry_date", { ascending: false })
      .then(({ data }) => {
        setDiary((data ?? []) as DiaryEntry[]);
        setDiaryIds((ids) => ids.filter((id) => (data ?? []).some((d) => d.id === id)));
      });
  }, [selected]);

  const byId = useMemo(() => Object.fromEntries(completed.map((p) => [p.id, p])), [completed]);
  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const generate = async () => {
    if (!selected.length || !target.trim()) return;
    setGenerating(true); setGenError(null);
    const { data, error } = await supabase.functions.invoke("cv-writer", {
      body: { placement_ids: selected, target: target.trim(), diary_ids: diaryIds, self_reported: selfReported.trim() },
    });
    setGenerating(false);
    if (error || !data?.bullets) {
      let msg = "We couldn't write suggestions this time. Please try again.";
      try { const b = await (error as { context?: Response })?.context?.json(); if (b?.error) msg = b.error; } catch { /* keep default */ }
      if (data?.error) msg = data.error;
      setGenError(msg);
      return;
    }
    setBullets(data.bullets as Bullet[]);
    setDraftId(null);
    if (!data.bullets.length) setGenError("There wasn't enough recorded information to write bullet points. Add diary notes or ask your supervisor to confirm skills.");
  };

  const grouped = useMemo(() => {
    const ids = [...new Set(bullets.map((b) => b.placement_id))];
    return ids.map((id) => ({ placement: byId[id], items: bullets.map((b, i) => ({ b, i })).filter(({ b }) => b.placement_id === id) }));
  }, [bullets, byId]);

  const sectionText = () =>
    grouped.map(({ placement, items }) => {
      const head = placement ? `${placement.job?.title ?? "Work experience"} — ${placement.company?.company_name ?? ""}\n${fmtDate(placement.start_date)}${placement.end_date ? ` – ${fmtDate(placement.end_date)}` : ""}` : "Work experience";
      return `${head}\n${items.map(({ b }) => `• ${b.text}`).join("\n")}`;
    }).join("\n\n");

  const copy = async (text: string) => { await navigator.clipboard.writeText(text); toast.success("Copied"); };

  const exportTxt = () => {
    const blob = new Blob([`WORK EXPERIENCE\n\n${sectionText()}\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "cv-experience-section.txt"; a.click();
    URL.revokeObjectURL(a.href);
  };

  const save = async () => {
    if (!user || !bullets.length) return;
    setSaving(true);
    const row = { user_id: user.id, title: `${target.trim() || "CV"} — ${new Date().toLocaleDateString("en-GB")}`.slice(0, 120), target: target.trim().slice(0, 120) || "General", placement_ids: selected, bullets: bullets as never };
    const res = draftId
      ? await supabase.from("cv_drafts").update({ bullets: row.bullets, target: row.target, placement_ids: row.placement_ids }).eq("id", draftId).select("id").single()
      : await supabase.from("cv_drafts").insert(row).select("id").single();
    setSaving(false);
    if (res.error) { toast.error("Couldn't save — please try again"); return; }
    setDraftId(res.data.id);
    toast.success("Saved to your CV drafts");
    loadDrafts();
  };

  const openDraft = (d: Draft) => {
    setDraftId(d.id); setTarget(d.target); setSelected(d.placement_ids.filter((id) => byId[id])); setBullets(d.bullets); setGenError(null);
  };
  const deleteDraft = async (id: string) => {
    const { error } = await supabase.from("cv_drafts").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete"); return; }
    if (draftId === id) setDraftId(null);
    loadDrafts();
  };

  const updateBullet = (i: number, text: string) => setBullets((bs) => bs.map((b, j) => (j === i ? { ...b, text, edited: true } : b)));
  const removeBullet = (i: number) => setBullets((bs) => bs.filter((_, j) => j !== i));

  if (!completed.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-accent mx-auto flex items-center justify-center mb-3"><FileText className="w-6 h-6 text-accent-foreground" /></div>
          <p className="font-medium text-foreground">No completed placements yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">The CV writer only uses real, completed placements. Once an employer marks one completed, you can turn it into CV bullet points here.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/dashboard/experiences">View my experiences</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> CV Writer</h1>
        <p className="text-muted-foreground mt-1">Turn your recorded placements into CV bullet points. Suggestions only use your placement records, employer-verified skills, approved hours and the diary notes you choose.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">1. Choose what to include</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Completed placements</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {completed.map((p) => (
                <label key={p.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selected.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
                  <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => setSelected((s) => toggle(s, p.id))} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground truncate">{p.job?.title ?? "Placement"}</span>
                    <span className="block text-xs text-muted-foreground truncate">{p.company?.company_name} · {fmtDate(p.start_date)}{p.end_date ? ` – ${fmtDate(p.end_date)}` : ""}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-target">Target role or industry</Label>
            <Input id="cv-target" maxLength={120} placeholder="e.g. Marketing assistant, healthcare, software engineering" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>

          {selected.length > 0 && (
            <div className="space-y-2">
              <Label>Diary notes to include <span className="text-muted-foreground font-normal">(optional, counted as self-reported)</span></Label>
              {diary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No diary entries for the selected placements.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-border p-2">
                  {diary.map((e) => (
                    <label key={e.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
                      <Checkbox checked={diaryIds.includes(e.id)} onCheckedChange={() => setDiaryIds((s) => toggle(s, e.id))} className="mt-0.5" />
                      <span className="text-sm min-w-0">
                        <span className="text-xs text-muted-foreground">{new Date(e.entry_date).toLocaleDateString("en-GB")} · {byId[e.placement_id]?.job?.title}</span>
                        <span className="block text-foreground line-clamp-2">{e.content}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cv-self">Your own achievements <span className="text-muted-foreground font-normal">(optional, will be marked self-reported)</span></Label>
            <Textarea id="cv-self" maxLength={1500} rows={3} placeholder="Anything you did that isn't in your records yet. Avoid personal details like phone numbers or addresses." value={selfReported} onChange={(e) => setSelfReported(e.target.value)} />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>Only role titles, company names, dates, approved hours, verified skills and the notes you tick are sent to the AI. Your name, email, supervisor contact details and other private information are never sent, and emails, phone numbers and links in notes are removed first.</span>
          </div>

          <Button onClick={generate} disabled={generating || !selected.length || !target.trim()}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : bullets.length ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Writing…" : bullets.length ? "Regenerate" : "Write bullet points"}
          </Button>
        </CardContent>
      </Card>

      {genError && (
        <Card className="border-destructive/40"><CardContent className="py-4 flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{genError}</CardContent></Card>
      )}

      {generating && !bullets.length && <Skeleton className="h-48 w-full" />}

      {bullets.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg">2. Review and edit</CardTitle>
              <CardDescription>Edit any line before you use it.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={generate} disabled={generating}>{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Regenerate</Button>
              <Button size="sm" variant="outline" onClick={() => copy(sectionText())}><Copy className="w-4 h-4" />Copy all</Button>
              <Button size="sm" variant="outline" onClick={exportTxt}><Download className="w-4 h-4" />Export section</Button>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{draftId ? "Save changes" : "Save"}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span><strong>Check every statement before using it.</strong> AI can make mistakes. Make sure each line is true and matches what you actually did. Lines marked <em>Self-reported</em> haven't been confirmed by an employer.</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-primary" />Verified: based only on employer-confirmed records</span>
              <span className="flex items-center gap-1"><UserPen className="w-3.5 h-3.5" />Self-reported: uses your diary or own notes</span>
            </div>

            {grouped.map(({ placement, items }) => (
              <div key={placement?.id ?? "x"} className="space-y-3">
                <div>
                  <p className="font-semibold text-foreground">{placement?.job?.title ?? "Placement"} — {placement?.company?.company_name}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(placement?.start_date ?? null)}{placement?.end_date ? ` – ${fmtDate(placement.end_date)}` : ""}</p>
                </div>
                {items.map(({ b, i }) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {b.basis === "verified" ? (
                        <Badge variant="soft" className="bg-primary/10 text-primary gap-1"><BadgeCheck className="w-3 h-3" />Verified</Badge>
                      ) : (
                        <Badge variant="soft" className="bg-muted text-muted-foreground gap-1"><UserPen className="w-3 h-3" />Self-reported</Badge>
                      )}
                      {b.edited && <Badge variant="outline" className="text-xs">Edited by you</Badge>}
                      {b.sources.length > 0 && <span className="text-xs text-muted-foreground truncate">From: {b.sources.join(", ")}</span>}
                    </div>
                    <Textarea value={b.text} rows={2} maxLength={300} onChange={(e) => updateBullet(i, e.target.value)} aria-label="CV bullet point" />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => copy(b.text)}><Copy className="w-4 h-4" />Copy</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeBullet(i)}><Trash2 className="w-4 h-4" />Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Saved CV drafts</CardTitle></CardHeader>
        <CardContent>
          {drafts === null ? <Skeleton className="h-16 w-full" /> : drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing saved yet. Saved drafts are private to you.</p>
          ) : (
            <div className="divide-y divide-border">
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.bullets.length} bullet points · updated {new Date(d.updated_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDraft(d)}>Open</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDraft(d.id)} aria-label="Delete draft"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
