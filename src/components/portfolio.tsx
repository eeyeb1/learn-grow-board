import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadPortfolioFile, PortfolioItem, PORTFOLIO_TYPES, PublicPortfolioItem, reasonLabel, RemovalRequest,
  REMOVAL_REASONS, validatePortfolioFile,
} from "@/lib/portfolio";
import { Placement } from "@/hooks/useSeekerDashboard";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, FileText, FolderOpen, ImageIcon, Link2, Loader2, Lock, Pencil, Plus, Trash2, Globe, Flag } from "lucide-react";

const month = (ym: string | null) => (ym ? new Date(ym.slice(0, 7) + "-01T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null);
const range = (a: string | null, b: string | null) => [month(a), month(b)].filter(Boolean).join(" – ");

/** Image or PDF loaded through the checked file function. */
export const PortfolioMedia = ({ id, kind, version }: { id: string; kind: "image" | "pdf" | null; version?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!kind) return;
    let alive = true;
    loadPortfolioFile(id, version).then((u) => { if (alive) { setUrl(u); setFailed(!u); } });
    return () => { alive = false; };
  }, [id, kind, version]);
  if (!kind) return null;
  if (failed) return <p className="text-xs text-muted-foreground">File unavailable</p>;
  if (!url) return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  if (kind === "image") return <img src={url} alt="" className="w-full max-h-72 object-contain rounded-lg bg-muted" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-primary hover:bg-accent">
      <FileText className="w-4 h-4" /> View PDF
    </a>
  );
};

const kindOf = (mime: string | null) => (mime?.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : null);

const ItemBody = ({ title, description, task_summary, outcomes, skills, dates, link_url, media, context }: {
  title: string; description: string | null; task_summary: string | null; outcomes: string | null; skills: string[];
  dates: string; link_url: string | null; media: React.ReactNode; context?: string | null;
}) => (
  <div className="space-y-2">
    <div>
      <p className="font-medium text-foreground">{title}</p>
      {(context || dates) && <p className="text-xs text-muted-foreground">{[context, dates].filter(Boolean).join(" · ")}</p>}
    </div>
    {description && <p className="text-sm text-foreground whitespace-pre-line">{description}</p>}
    {task_summary && <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What I did</p><p className="text-sm text-foreground whitespace-pre-line">{task_summary}</p></div>}
    {outcomes && <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outcome</p><p className="text-sm text-foreground whitespace-pre-line">{outcomes}</p></div>}
    {media}
    {link_url && (
      <a href={link_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all">
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />{link_url.replace(/^https:\/\//, "")}
      </a>
    )}
    {skills.length > 0 && <div className="flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s} variant="soft">{s}</Badge>)}</div>}
  </div>
);

/** Public profile rendering — only items the server returned as published. */
export const PublicPortfolioList = ({ items }: { items: PublicPortfolioItem[] }) => (
  <div className="space-y-5">
    {items.map((it) => (
      <div key={it.id} className="border-b border-border last:border-0 pb-5 last:pb-0">
        <ItemBody {...it} dates={range(it.start, it.end)} context={it.company ? `${it.role_title ?? "Placement"} at ${it.company}` : null}
          media={<PortfolioMedia id={it.id} kind={it.file_kind} />} />
      </div>
    ))}
  </div>
);

// ---------- Seeker manager ----------

const schema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().trim().max(2000),
  task_summary: z.string().trim().max(1500),
  outcomes: z.string().trim().max(1500),
  skills: z.array(z.string().trim().min(1).max(40)).max(15, "Up to 15 skills"),
  link_url: z.string().trim().max(500).refine((v) => !v || /^https:\/\/[^\s<>"]{3,}$/.test(v), "Links must start with https://"),
  start_date: z.string(), end_date: z.string(),
}).refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, "End date must be on or after the start date");

type FormState = {
  title: string; description: string; task_summary: string; outcomes: string; skills: string; link_url: string;
  start_date: string; end_date: string; placement_id: string; is_public: boolean; permission: boolean;
  file: File | null; removeFile: boolean;
};
const blank: FormState = { title: "", description: "", task_summary: "", outcomes: "", skills: "", link_url: "", start_date: "", end_date: "", placement_id: "none", is_public: false, permission: false, file: null, removeFile: false };

export const PortfolioManager = ({ items, requests, placements, published, onChange }: {
  items: PortfolioItem[]; requests: RemovalRequest[]; placements: Placement[]; published: boolean; onChange: () => void;
}) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState<PortfolioItem | "new" | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [busy, setBusy] = useState(false);
  const linkable = placements.filter((p) => p.status === "active" || p.status === "completed");
  const placementLabel = (id: string | null) => {
    const p = placements.find((x) => x.id === id);
    return p ? `${p.job?.title ?? "Placement"} · ${p.company?.company_name ?? ""}` : null;
  };

  const open = (it: PortfolioItem | "new") => {
    setEditing(it);
    setForm(it === "new" ? blank : {
      title: it.title, description: it.description ?? "", task_summary: it.task_summary ?? "", outcomes: it.outcomes ?? "",
      skills: it.skills.join(", "), link_url: it.link_url ?? "", start_date: it.start_date ?? "", end_date: it.end_date ?? "",
      placement_id: it.placement_id ?? "none", is_public: it.is_public, permission: it.permission_confirmed, file: null, removeFile: false,
    });
  };

  const save = async () => {
    if (!user || !editing) return;
    const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const parsed = schema.safeParse({ ...form, skills });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!form.permission) return toast.error("Please confirm you have permission to share this work");
    const v = parsed.data;
    setBusy(true);
    try {
      let file: Partial<PortfolioItem> = {};
      const prev = editing === "new" ? null : editing;
      if (form.file) {
        const err = await validatePortfolioFile(form.file);
        if (err) { toast.error(err); return; }
        const path = `${user.id}/${crypto.randomUUID()}.${PORTFOLIO_TYPES[form.file.type]}`;
        const { error } = await supabase.storage.from("portfolio").upload(path, form.file, { contentType: form.file.type, upsert: false });
        if (error) { toast.error("Upload failed. Please try again."); return; }
        file = { file_path: path, file_name: form.file.name.slice(0, 150), file_mime: form.file.type, file_size: form.file.size };
      } else if (form.removeFile) {
        file = { file_path: null, file_name: null, file_mime: null, file_size: null };
      }
      const row = {
        title: v.title, description: v.description || null, task_summary: v.task_summary || null, outcomes: v.outcomes || null,
        skills: v.skills, link_url: v.link_url || null, start_date: v.start_date || null, end_date: v.end_date || null,
        placement_id: form.placement_id === "none" ? null : form.placement_id, is_public: form.is_public,
        permission_confirmed: true, ...file,
      };
      const { error } = prev
        ? await supabase.from("portfolio_items").update(row).eq("id", prev.id)
        : await supabase.from("portfolio_items").insert({ ...row, user_id: user.id });
      if (error) {
        if (file.file_path) await supabase.storage.from("portfolio").remove([file.file_path]);
        toast.error(error.message); return;
      }
      if (prev?.file_path && "file_path" in file && prev.file_path !== file.file_path) await supabase.storage.from("portfolio").remove([prev.file_path]);
      toast.success(prev ? "Portfolio item updated" : "Portfolio item added");
      setEditing(null); onChange();
    } finally { setBusy(false); }
  };

  const remove = async (it: PortfolioItem) => {
    if (!confirm(`Delete "${it.title}"? This also deletes any uploaded file.`)) return;
    const { error } = await supabase.from("portfolio_items").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    if (it.file_path) await supabase.storage.from("portfolio").remove([it.file_path]);
    toast.success("Item deleted"); onChange();
  };

  const togglePublic = async (it: PortfolioItem, v: boolean) => {
    const { error } = await supabase.from("portfolio_items").update({ is_public: v }).eq("id", it.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const openReq = (id: string) => requests.find((r) => r.item_id === id && r.status === "open");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" />Portfolio</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Add projects and samples of your work. Everything is private until you switch an item to Public{published ? "" : " and publish your profile"}.</p>
          </div>
          <Button onClick={() => open("new")}><Plus className="w-4 h-4 mr-1" />Add item</Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-foreground">No portfolio items yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Show what you worked on — a design, a report, a photo of something you built, or a link to a live project.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => {
                const req = openReq(it.id);
                return (
                  <div key={it.id} className="rounded-lg border border-border p-4 space-y-3">
                    {(it.status !== "active") && (
                      <div className="flex gap-2 rounded-md bg-destructive/10 text-destructive p-3 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          {it.status === "removal_requested"
                            ? <>The employer asked for this to be removed: <strong>{req ? reasonLabel(req.reason) : "under review"}</strong>{req?.details ? ` — “${req.details}”` : ""}. It's hidden from your profile while a moderator reviews it. You can delete it at any time.</>
                            : <>A moderator agreed this item should be removed. It can't be shown publicly — please delete it.</>}
                        </div>
                      </div>
                    )}
                    <ItemBody {...it} dates={range(it.start_date, it.end_date)} context={placementLabel(it.placement_id)}
                      media={<PortfolioMedia id={it.id} kind={kindOf(it.file_mime)} version={it.file_path ?? ""} />} />
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={it.is_public} disabled={it.status !== "active"} onCheckedChange={(v) => togglePublic(it, v)} />
                        {it.is_public ? <><Globe className="w-4 h-4 text-primary" />Public</> : <><Lock className="w-4 h-4 text-muted-foreground" />Private</>}
                      </label>
                      <div className="flex gap-2">
                        {it.status === "active" && <Button size="sm" variant="outline" onClick={() => open(it)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>}
                        <Button size="sm" variant="ghost" onClick={() => remove(it)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && !busy && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add portfolio item" : "Edit portfolio item"}</DialogTitle>
            <DialogDescription>Only share work you're allowed to. Never include passwords, client data or other people's personal details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="pf-title">Title *</Label><Input id="pf-title" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Linked placement</Label>
              <Select value={form.placement_id} onValueChange={(v) => setForm({ ...form, placement_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked to a placement</SelectItem>
                  {linkable.map((p) => <SelectItem key={p.id} value={p.id}>{p.job?.title ?? "Placement"} · {p.company?.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">The employer for a linked placement can see this item and ask for it to be removed.</p>
            </div>
            <div><Label htmlFor="pf-desc">Description</Label><Textarea id="pf-desc" rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label htmlFor="pf-task">What you did (task summary)</Label><Textarea id="pf-task" rows={3} maxLength={1500} value={form.task_summary} onChange={(e) => setForm({ ...form, task_summary: e.target.value })} /></div>
            <div><Label htmlFor="pf-out">Outcome</Label><Textarea id="pf-out" rows={2} maxLength={1500} value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} /></div>
            <div><Label htmlFor="pf-skills">Skills used (comma separated)</Label><Input id="pf-skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Research, Excel, Presenting" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="pf-start">Start date</Label><Input id="pf-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label htmlFor="pf-end">End date</Label><Input id="pf-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="pf-link" className="flex items-center gap-1"><Link2 className="w-4 h-4" />Link</Label><Input id="pf-link" placeholder="https://" maxLength={500} value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
            <div>
              <Label htmlFor="pf-file" className="flex items-center gap-1"><ImageIcon className="w-4 h-4" />Image or PDF</Label>
              <Input id="pf-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) { const err = await validatePortfolioFile(f); if (err) { toast.error(err); e.target.value = ""; return; } }
                  setForm({ ...form, file: f, removeFile: false });
                }} />
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP or PDF, up to 10 MB. Files are stored privately and checked before they're shown.</p>
              {editing !== "new" && editing?.file_path && !form.file && (
                <label className="flex items-center gap-2 text-sm mt-2">
                  <Checkbox checked={form.removeFile} onCheckedChange={(v) => setForm({ ...form, removeFile: !!v })} />
                  Remove current file ({editing.file_name})
                </label>
              )}
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Show on my public profile</span>
              <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <Checkbox className="mt-0.5" checked={form.permission} onCheckedChange={(v) => setForm({ ...form, permission: !!v })} />
              <span>I confirm this is my own work, or I have permission from the company to share it, and it contains no confidential information or other people's personal data.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={busy || !form.permission} onClick={save}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Employer view on a placement ----------

export const PlacementPortfolioPanel = ({ placementId, isSeeker, canManage }: { placementId: string; isSeeker: boolean; canManage: boolean }) => {
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [target, setTarget] = useState<PortfolioItem | null>(null);
  const [reason, setReason] = useState("confidential");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("portfolio_items").select("*").eq("placement_id", placementId).order("created_at", { ascending: false });
    setItems(error ? [] : (data as PortfolioItem[]));
  };
  useEffect(() => { load(); }, [placementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("request_portfolio_removal", { _item_id: target.id, _reason: reason, _details: details });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Removal requested. The item is now hidden while a moderator reviews it.");
    setTarget(null); setDetails(""); load();
  };

  return (
    <Card><CardContent className="p-6 space-y-4">
      {isSeeker ? (
        <p className="text-sm text-muted-foreground">Portfolio items you link to this placement appear here. <Link to="/dashboard/portfolio" className="text-primary hover:underline">Manage your portfolio</Link></p>
      ) : (
        <p className="text-sm text-muted-foreground">Work samples the participant has linked to this placement, including private ones. If something is confidential or shared without permission, request its removal — it's hidden immediately.</p>
      )}
      {items === null ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No portfolio items are linked to this placement.</p>
      ) : items.map((it) => (
        <div key={it.id} className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="soft">{it.is_public ? "Public" : "Private"}</Badge>
            {it.status === "removal_requested" && <Badge variant="soft" className="bg-destructive/10 text-destructive">Removal requested</Badge>}
            {it.status === "removed" && <Badge variant="soft" className="bg-destructive/10 text-destructive">Removed by moderator</Badge>}
          </div>
          <ItemBody {...it} dates={range(it.start_date, it.end_date)} media={<PortfolioMedia id={it.id} kind={kindOf(it.file_mime)} version={it.file_path ?? ""} />} />
          {canManage && !isSeeker && it.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => setTarget(it)}><Flag className="w-4 h-4 mr-1" />Request removal</Button>
          )}
        </div>
      ))}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request removal</DialogTitle>
            <DialogDescription>“{target?.title}” will be hidden from the participant's public profile straight away. A moderator will review the request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REMOVAL_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea rows={3} maxLength={1000} placeholder="Explain what's confidential or unauthorised (shared with the participant)" value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={submit}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Request removal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
};

// ---------- Moderator queue ----------

export const PortfolioRemovalQueue = () => {
  const [reqs, setReqs] = useState<RemovalRequest[] | null>(null);
  const [items, setItems] = useState<Record<string, PortfolioItem>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = async () => {
    const { data } = await supabase.from("portfolio_removal_requests").select("*").order("created_at", { ascending: false });
    const rs = (data ?? []) as RemovalRequest[];
    const ids = rs.map((r) => r.item_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: it } = await supabase.from("portfolio_items").select("*").in("id", ids);
      setItems(Object.fromEntries(((it ?? []) as PortfolioItem[]).map((i) => [i.id, i])));
    }
    setReqs(rs);
  };
  useEffect(() => { load(); }, []);
  const decide = async (id: string, decision: "upheld" | "dismissed") => {
    const { error } = await supabase.rpc("resolve_portfolio_removal", { _request_id: id, _decision: decision, _note: notes[id] ?? "" });
    if (error) return toast.error(error.message);
    toast.success(decision === "upheld" ? "Item removed from public view" : "Request dismissed"); load();
  };
  const label: Record<string, string> = { open: "Open", upheld: "Upheld", dismissed: "Dismissed", item_deleted: "Deleted by owner" };
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold text-foreground">Portfolio removal requests</h2>
      {reqs === null ? <Loader2 className="w-5 h-5 animate-spin" /> : reqs.length === 0 ? (
        <Card><CardContent className="p-6 text-muted-foreground">No removal requests.</CardContent></Card>
      ) : reqs.map((r) => {
        const it = r.item_id ? items[r.item_id] : undefined;
        return (
          <Card key={r.id}><CardContent className="p-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft">{reasonLabel(r.reason)}</Badge><Badge variant="soft">{label[r.status]}</Badge>
              <span className="text-xs text-muted-foreground">Requested {new Date(r.created_at).toLocaleString()}</span>
            </div>
            {r.details && <p className="text-sm text-foreground">“{r.details}”</p>}
            {it ? <div className="rounded-lg border border-border p-3"><ItemBody {...it} dates={range(it.start_date, it.end_date)} media={<PortfolioMedia id={it.id} kind={kindOf(it.file_mime)} version={it.file_path ?? ""} />} /></div>
              : <p className="text-sm text-muted-foreground">“{r.item_title}” (no longer available)</p>}
            {r.status === "open" ? (
              <div className="space-y-2">
                <Textarea rows={2} maxLength={1000} placeholder="Moderator note" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => decide(r.id, "upheld")}>Uphold & remove</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "dismissed")}>Dismiss</Button>
                </div>
              </div>
            ) : <p className="text-xs text-muted-foreground">Resolved {r.resolved_at && new Date(r.resolved_at).toLocaleString()}{r.resolution_note ? ` · ${r.resolution_note}` : ""}</p>}
          </CardContent></Card>
        );
      })}
    </div>
  );
};
