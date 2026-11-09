import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Placement } from "@/hooks/useSeekerDashboard";
import { formatHours } from "@/hooks/useSeekerDashboard";
import { completionBlocker, type CompletionReview } from "@/lib/placementCompletion";
import { CERT_DISCLAIMER } from "@/lib/certificatePdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Award, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PlacementCompletion({ placement, onChange }: { placement: Placement; onChange: () => void }) {
  const [review, setReview] = useState<CompletionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_placement_completion_review", { _placement_id: placement.id });
    setReview(data as unknown as CompletionReview | null); setFailed(!!error); setLoading(false);
  }, [placement.id]);
  useEffect(() => { void load(); }, [load, placement.updated_at]);
  if (loading) return <Skeleton className="h-32" />;
  if (failed || !review) return <p className="text-sm text-muted-foreground">Completion review is unavailable. <Button variant="ghost" size="sm" onClick={() => void load()}>Try again</Button></p>;
  const blocker = completionBlocker(placement.status, review.outstanding_count, (placement.completion_checklist ?? []).length > 0 && (placement.completion_checklist ?? []).every(i => i.done), placement.start_date, placement.end_date ?? "", new Date().toISOString().slice(0, 10));
  const complete = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("placement_action", { _placement_id: placement.id, _action: "complete", _note: "Employer confirmed placement ended; final hours, observed skills and feedback reviewed." });
    setBusy(false); setOpen(false);
    if (error) { toast.error(error.message); void load(); return; }
    toast.success(review.approved_minutes > 0 ? "Placement completed and certificate issued" : "Placement completed; no certificate awarded without approved hours");
    onChange();
  };
  return <Card className="print:hidden border-primary/30">
    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" />Final completion review</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div><p className="text-muted-foreground">Approved hours</p><p className="font-semibold">{formatHours(review.approved_minutes)}</p></div>
        <div><p className="text-muted-foreground">Outstanding entries</p><p className="font-semibold">{review.outstanding_count}</p></div>
        <div><p className="text-muted-foreground">Rejected entries · excluded</p><p className="font-semibold">{review.rejected_count}</p></div>
      </div>
      {review.outstanding_count > 0 && <Link to="/hour-approvals"><Button variant="outline" size="sm">Review outstanding hours</Button></Link>}
      <div><p className="font-medium text-sm">Employer-verified skills</p>{review.skills.length ? <ul className="divide-y divide-border">{review.skills.map((s, i) => <li key={`${s.skill}-${i}`} className="py-2 text-sm"><p className="font-medium">{s.skill}</p><p className="text-muted-foreground break-words">{s.example}</p><p className="text-xs text-muted-foreground">Observed by {s.verifier_name}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No observed skills confirmed. No skill claims will be added to the certificate.</p>}</div>
      <div><p className="text-sm font-medium">Final feedback</p><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{placement.employer_feedback || "No feedback recorded yet."}</p></div>
      <p className="text-xs text-muted-foreground">{CERT_DISCLAIMER}</p>
      {blocker && <p role="status" className="text-sm text-destructive">{blocker}</p>}
      {!review.approved_minutes && <p className="text-sm text-muted-foreground">Completion can be recorded, but no certificate will be awarded without approved hours.</p>}
      <div className="flex gap-2 items-start"><Checkbox id="completion-confirm" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><Label htmlFor="completion-confirm" className="leading-relaxed">I confirm this placement has ended and I have reviewed the hours, observed skills and factual feedback.</Label></div>
      <Button disabled={!!blocker || !confirmed || busy} onClick={() => setOpen(true)}><Award className="h-4 w-4 mr-2" />Confirm completion</Button>
      <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm placement completion?</AlertDialogTitle><AlertDialogDescription>Hour logging closes. The seeker is notified and any certificate uses only approved hours and observed verified skills. Your decision is recorded.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void complete(); }}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirm completion</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </CardContent>
  </Card>;
}