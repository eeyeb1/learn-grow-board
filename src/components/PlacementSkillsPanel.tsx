import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SKILL_CATEGORIES, SkillVerification, categoryLabel } from "@/lib/skills";
import { toast } from "sonner";
import { BadgeCheck, Loader2, Trash2, User, Wrench } from "lucide-react";

const schema = z.object({
  skill: z.string().trim().min(1, "Enter a skill").max(60, "Skill must be 60 characters or fewer"),
  category: z.string().min(1, "Choose a category"),
  example: z.string().trim().max(300, "Example must be 300 characters or fewer"),
  observed: z.literal(true, { errorMap: () => ({ message: "Confirm you directly observed this skill" }) }),
});

export const EmployerVerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
    <BadgeCheck className="w-3.5 h-3.5" /> Employer Verified
  </span>
);
export const SelfReportedBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
    <User className="w-3.5 h-3.5" /> Self Reported
  </span>
);

interface Props {
  placementId: string;
  status: string;
  canManage: boolean;
  isSeeker: boolean;
  listedSkills: string[];
}

const PlacementSkillsPanel = ({ placementId, status, canManage, isSeeker, listedSkills }: Props) => {
  const [items, setItems] = useState<SkillVerification[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ok">("loading");
  const [f, setF] = useState({ skill: "", category: "", example: "", observed: false });
  const [busy, setBusy] = useState(false);
  const canVerify = canManage && !isSeeker && (status === "active" || status === "completed");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("skill_verifications").select("*").eq("placement_id", placementId).order("verified_at", { ascending: false });
    if (error) return setState("error");
    setItems((data ?? []) as SkillVerification[]);
    setState("ok");
  }, [placementId]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const r = schema.safeParse(f);
    if (!r.success) return toast.error(r.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.rpc("verify_placement_skill", {
      _placement_id: placementId, _skill: r.data.skill, _category: r.data.category, _example: r.data.example, _directly_observed: true,
    });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "That skill is already confirmed for this placement" : error.message);
    toast.success("Skill confirmed");
    setF({ skill: "", category: "", example: "", observed: false });
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.rpc("revoke_skill_verification", { _id: id });
    if (error) return toast.error("Couldn't remove skill");
    load();
  };

  const toggle = async (id: string, v: boolean) => {
    setItems((x) => x.map((i) => (i.id === id ? { ...i, show_on_profile: v } : i)));
    const { error } = await supabase.rpc("set_skill_visibility", { _id: id, _visible: v });
    if (error) { toast.error("Couldn't update visibility"); load(); }
  };

  return (
    <Card><CardContent className="p-6 space-y-6">
      {canVerify && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="font-medium text-foreground">Confirm a demonstrated skill</p>
          <p className="text-xs text-muted-foreground">Only confirm skills you or your team directly observed during this placement. Your name and today's date are recorded.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sv-cat">Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger id="sv-cat"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>{SKILL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-skill">Skill</Label>
              <Input id="sv-skill" maxLength={60} value={f.skill} onChange={(e) => setF({ ...f, skill: e.target.value })} placeholder="e.g. Presenting to a team" />
            </div>
          </div>
          {listedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listedSkills.map((s) => <button key={s} type="button" onClick={() => setF({ ...f, skill: s })} className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground">{s}</button>)}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="sv-ex">Brief example (optional)</Label>
            <Textarea id="sv-ex" rows={2} maxLength={300} value={f.example} onChange={(e) => setF({ ...f, example: e.target.value })} placeholder="e.g. Led the Friday stand-up and summarised actions clearly." />
          </div>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox checked={f.observed} onCheckedChange={(v) => setF({ ...f, observed: !!v })} />
            <span>I directly observed this skill being demonstrated during the placement.</span>
          </label>
          <Button size="sm" onClick={submit} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Confirm skill</Button>
        </div>
      )}
      {canManage && !isSeeker && !canVerify && (
        <p className="text-sm text-muted-foreground">Skills can be confirmed once this placement is active.</p>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3"><p className="font-medium text-foreground">Confirmed skills</p><EmployerVerifiedBadge /></div>
        {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> :
         state === "error" ? <p className="text-sm text-destructive">Couldn't load skills. <button className="underline" onClick={load}>Try again</button></p> :
         items.length === 0 ? (
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <Wrench className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">No skills confirmed yet</p>
            <p className="text-xs text-muted-foreground mt-1">{isSeeker ? "Your supervisor can confirm skills they observed during this placement." : "Confirm skills you've seen the candidate demonstrate."}</p>
          </div>
         ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.skill} <Badge variant="soft" className="ml-1">{categoryLabel(s.category)}</Badge></p>
                  {s.example && <p className="text-sm text-muted-foreground mt-0.5">“{s.example}”</p>}
                  <p className="text-xs text-muted-foreground mt-1">Verified by {s.verifier_name} · {new Date(s.verified_at).toLocaleDateString()}</p>
                </div>
                {isSeeker && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    Public <Switch checked={s.show_on_profile} onCheckedChange={(v) => toggle(s.id, v)} aria-label={`Show ${s.skill} on public profile`} />
                  </label>
                )}
                {canManage && !isSeeker && (
                  <Button size="icon" variant="ghost" aria-label={`Remove ${s.skill}`} onClick={() => revoke(s.id)}><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
            ))}
            {isSeeker && status !== "completed" && <p className="text-xs text-muted-foreground">Verified skills appear on your public profile once this placement is completed.</p>}
          </div>
         )}
      </div>

      <div>
        <p className="font-medium text-foreground mb-2">Listed for this opportunity</p>
        {listedSkills.length === 0 ? <p className="text-sm text-muted-foreground">No skills listed.</p> :
          <div className="flex flex-wrap gap-2">{listedSkills.map((s) => <Badge key={s} variant="soft">{s}</Badge>)}</div>}
      </div>
    </CardContent></Card>
  );
};

export default PlacementSkillsPanel;
