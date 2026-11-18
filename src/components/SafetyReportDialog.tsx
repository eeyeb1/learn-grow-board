import { useEffect, useState } from 'react';
import { AlertTriangle, Flag, Loader2, LockKeyhole } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SAFETY_REASONS, SAFETY_SUBJECT_LABELS, safetyReportProblem, type SafetySubject } from '@/lib/safety';

type Props = {
  subjectType: SafetySubject;
  subjectId?: string | null;
  contextId?: string | null;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
};

export default function SafetyReportButton({ subjectType, subjectId = null, contextId = null, label, variant = 'outline', size = 'sm', className }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const title = label ?? SAFETY_SUBJECT_LABELS[subjectType];

  const start = () => {
    setError(''); setReference('');
    if (!user) setAuthOpen(true); else setOpen(true);
  };

  const submit = async () => {
    const problem = safetyReportProblem(reason, details);
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('submit_safety_report', {
      _subject_type: subjectType, _subject_id: subjectId, _context_id: contextId,
      _reason: reason, _details: details.trim(), _urgent: urgent,
    });
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    setReference(String(data));
    window.dispatchEvent(new Event('safety-report-submitted'));
  };

  return <>
    <Button type="button" variant={variant} size={size} className={className} onClick={start}><Flag className="mr-1.5 h-4 w-4" />{title}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Private report for authorised safety reviewers. The reported person or organisation is not told simply because you filed a report.</DialogDescription></DialogHeader>
      {reference ? <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4" role="status">
        <p className="font-medium">Report received</p><p className="text-sm text-muted-foreground">Reference <span className="font-mono text-foreground">{reference.slice(0, 8).toUpperCase()}</span>. You can see its status under Community Guidelines → Your reports.</p>
        <Button onClick={() => setOpen(false)}>Done</Button>
      </div> : <div className="space-y-5">
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><p>If someone is in immediate danger, call <strong>999</strong> now. This report is not an emergency service and does not guarantee an immediate response.</p></div>
        <div className="space-y-2"><Label htmlFor={`report-reason-${subjectType}`}>What best describes the concern?</Label><Select value={reason} onValueChange={setReason}><SelectTrigger id={`report-reason-${subjectType}`}><SelectValue placeholder="Choose a reason" /></SelectTrigger><SelectContent>{SAFETY_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor={`report-details-${subjectType}`}>What happened?</Label><Textarea id={`report-details-${subjectType}`} rows={6} maxLength={5000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Include dates, what you observed and any immediate risk. Do not include passwords, identification documents or unnecessary personal information." /><p className="text-xs text-muted-foreground">At least 20 characters. Share only what reviewers need.</p></div>
        <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm"><Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(v === true)} /><span><span className="font-medium">Someone may be at immediate risk</span><span className="mt-1 block text-xs text-muted-foreground">This marks the report urgent for reviewer triage. It does not replace emergency help.</span></span></label>
        <div className="flex gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 shrink-0" /><p>Retaliation for a good-faith report is against our guidelines. Reporter details are limited to authorised reviewers, although confidentiality cannot be absolute where action is required to protect someone or investigate the concern.</p></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={() => void submit()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit private report</Button></div>
      </div>}
    </DialogContent></Dialog>
    <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
  </>;
}

type OwnReport = { id: string; subject_type: SafetySubject; reason: string; details: string; status: string; priority: string; created_at: string };
export function MySafetyReports() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OwnReport[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) { setRows([]); return; }
    const load = () => void supabase.rpc('list_my_safety_reports').then(({ data, error: e }) => {
      if (e) setError('Your report status could not be loaded.'); else setRows((data ?? []) as unknown as OwnReport[]);
    });
    load();
    window.addEventListener('safety-report-submitted', load);
    return () => window.removeEventListener('safety-report-submitted', load);
  }, [user]);
  if (!user) return null;
  return <div className="mt-6 rounded-lg border border-border p-4"><h3 className="font-semibold">Your reports</h3>
    {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : rows === null ? <p role="status" className="mt-2 text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">You have not submitted a safety report.</p> : <ul className="mt-3 space-y-3">{rows.map((r) => <li key={r.id} className="border-t border-border pt-3 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge>{r.priority !== 'standard' && <Badge variant="secondary">{r.priority}</Badge>}<span className="text-xs text-muted-foreground">{r.id.slice(0, 8).toUpperCase()} · {new Date(r.created_at).toLocaleDateString()}</span></div><p className="mt-2 text-muted-foreground">{SAFETY_SUBJECT_LABELS[r.subject_type]} · {SAFETY_REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}</p></li>)}</ul>}
  </div>;
}
