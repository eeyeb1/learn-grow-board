import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag, Loader2, Pencil, Undo2 } from "lucide-react";

export interface StructuredReference {
  id: string;
  placement_id: string;
  author_id?: string;
  author_name: string;
  author_role: string | null;
  content: string;
  duties: string | null;
  strengths: string | null;
  skills_demonstrated: string | null;
  improvement_areas: string | null;
  status: string;
  seeker_approved: boolean;
  created_at: string;
  updated_at?: string;
  moderation_note?: string | null;
}

export const REFERENCE_SELECT =
  "id, placement_id, author_id, author_name, author_role, content, duties, strengths, skills_demonstrated, improvement_areas, status, seeker_approved, created_at, updated_at, moderation_note";

export const REPORT_REASONS = [
  { value: "abusive", label: "Abusive or offensive" },
  { value: "inaccurate", label: "Inaccurate or untrue" },
  { value: "not_my_placement", label: "Not about my placement" },
  { value: "personal_information", label: "Contains personal information" },
  { value: "other", label: "Something else" },
] as const;

export const STATUS_LABEL: Record<string, string> = { published: "Active", hidden: "Hidden by moderator", withdrawn: "Withdrawn by author" };

/** Read-only structured display. `showPrivate` includes improvement areas (never public). */
export const ReferenceBody = ({ r, company, showPrivate = false }: { r: Pick<StructuredReference, "content" | "duties" | "strengths" | "skills_demonstrated" | "improvement_areas" | "author_name" | "author_role" | "created_at">; company?: string; showPrivate?: boolean }) => {
  const structured = r.duties || r.strengths;
  const rows: [string, string | null][] = structured
    ? [["Duties", r.duties], ["Strengths", r.strengths], ["Skills demonstrated", r.skills_demonstrated], ...(showPrivate ? [["Areas to develop (private)", r.improvement_areas] as [string, string | null]] : [])]
    : [["Reference", r.content]];
  return (
    <div className="space-y-2">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k}</p><p className="text-sm text-foreground whitespace-pre-line">{v}</p></div>
      ))}
      <p className="text-xs text-muted-foreground">— {r.author_name}{r.author_role ? `, ${r.author_role}` : ""}{company ? ` · ${company}` : ""} · {new Date(r.created_at).toLocaleDateString()}</p>
    </div>
  );
};

export const ReportReferenceButton = ({ referenceId }: { referenceId: string }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return toast.error("Choose a reason");
    if (details.length > 1000) return toast.error("Details must be 1000 characters or fewer");
    setBusy(true);
    const { error } = await supabase.rpc("report_reference", { _id: referenceId, _reason: reason, _details: details });
    setBusy(false);
    if (error) return toast.error(error.message.includes("already") ? "You've already reported this reference" : "Couldn't send report");
    toast.success("Report sent to our moderators");
    setOpen(false); setReason(""); setDetails("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost"><Flag className="w-4 h-4 mr-1" />Report</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this reference</DialogTitle>
          <DialogDescription>Tell us if it is abusive or inaccurate. A moderator will review it and may hide it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger aria-label="Reason"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
            <SelectContent>{REPORT_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Optional details — what's wrong?" />
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Send report</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const opt = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);
const refSchema = z.object({
  author_name: z.string().trim().min(2, "Add your name").max(100),
  author_role: z.string().trim().min(2, "Add your role").max(100),
  duties: z.string().trim().min(10, "Describe their duties (at least 10 characters)").max(1000),
  strengths: z.string().trim().min(10, "Describe their strengths (at least 10 characters)").max(1000),
  skills: opt(1000),
  improvements: opt(1000),
});
type RefForm = z.infer<typeof refSchema>;
const empty: RefForm = { author_name: "", author_role: "", duties: "", strengths: "", skills: "", improvements: "" };

/** Employer-side: write, edit and withdraw references for a completed placement. */
export const EmployerReferencePanel = ({ placementId, companyName }: { placementId: string; companyName?: string }) => {
  const { user } = useAuth();
  const [refs, setRefs] = useState<StructuredReference[]>([]);
  const [f, setF] = useState<RefForm>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("placement_references").select(REFERENCE_SELECT).eq("placement_id", placementId).order("created_at");
    setRefs((data ?? []) as StructuredReference[]);
  }, [placementId]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const p = refSchema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const args = { _author_name: p.data.author_name, _author_role: p.data.author_role, _duties: p.data.duties, _strengths: p.data.strengths, _skills: p.data.skills, _improvements: p.data.improvements };
    setBusy(true);
    const { error } = editing
      ? await supabase.rpc("update_reference", { _id: editing, ...args })
      : await supabase.rpc("submit_reference", { _placement_id: placementId, ...args });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Reference updated — the seeker will need to approve it again" : "Reference sent — the seeker decides whether to show it");
    setF(empty); setEditing(null); load();
  };
  const withdraw = async (id: string) => {
    const { error } = await supabase.rpc("withdraw_reference", { _id: id });
    if (error) return toast.error("Couldn't withdraw reference");
    toast.success("Reference withdrawn"); load();
  };
  const startEdit = (r: StructuredReference) => {
    setEditing(r.id);
    setF({ author_name: r.author_name, author_role: r.author_role ?? "", duties: r.duties ?? r.content, strengths: r.strengths ?? "", skills: r.skills_demonstrated ?? "", improvements: r.improvement_areas ?? "" });
  };

  return (
    <div className="border-t border-border pt-5 space-y-4">
      <div>
        <p className="font-medium text-foreground">References</p>
        <p className="text-xs text-muted-foreground">Write a short, factual reference based only on what you observed. Don't include contact details. Improvement areas are shared privately with the seeker and never shown publicly. The seeker must approve a reference before it appears on their profile.</p>
      </div>
      {refs.length === 0 && <p className="text-sm text-muted-foreground">No references written for this placement yet.</p>}
      {refs.map((r) => (
        <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
          <ReferenceBody r={r} company={companyName} showPrivate />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{r.status !== "published" ? STATUS_LABEL[r.status] : r.seeker_approved ? "Approved by seeker" : "Awaiting seeker approval"}</Badge>
            {r.author_id === user?.id && r.status === "published" && (
              <>
                <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => withdraw(r.id)}><Undo2 className="w-4 h-4 mr-1" />Withdraw</Button>
              </>
            )}
            {r.status === "published" && <ReportReferenceButton referenceId={r.id} />}
          </div>
          {r.status === "hidden" && r.moderation_note && <p className="text-xs text-muted-foreground">Moderator note: {r.moderation_note}</p>}
        </div>
      ))}
      <div className="space-y-3 rounded-lg bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">{editing ? "Edit reference" : "Write a reference"}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="ra">Your name</Label><Input id="ra" maxLength={100} value={f.author_name} onChange={(e) => setF({ ...f, author_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="rr">Your role</Label><Input id="rr" maxLength={100} placeholder="e.g. Team lead" value={f.author_role} onChange={(e) => setF({ ...f, author_role: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="rd">Duties carried out</Label><Textarea id="rd" rows={2} maxLength={1000} value={f.duties} onChange={(e) => setF({ ...f, duties: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="rs">Strengths</Label><Textarea id="rs" rows={2} maxLength={1000} value={f.strengths} onChange={(e) => setF({ ...f, strengths: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="rk">Skills demonstrated (optional)</Label><Textarea id="rk" rows={2} maxLength={1000} value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ri">Areas to develop (optional, private to the seeker)</Label><Textarea id="ri" rows={2} maxLength={1000} value={f.improvements} onChange={(e) => setF({ ...f, improvements: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">Attributed to {companyName ?? "your company"}.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? "Save changes" : "Submit reference"}</Button>
          {editing && <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setF(empty); }}>Cancel</Button>}
        </div>
      </div>
    </div>
  );
};
