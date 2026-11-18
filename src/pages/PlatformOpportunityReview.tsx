import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OpportunityPreview } from '@/components/OpportunityDrafts';
import { fromRow } from '@/lib/opportunityForm';
import { statusLabel } from '@/lib/opportunityStatus';
import { latestAssessmentClears, SAFETY_FLAG_LABELS, safetyAssessmentProblem, type SafetyDecision } from '@/lib/safety';

type Assessment = { id: string; decision: SafetyDecision; note: string; checks: Record<string, boolean>; created_at: string; reviewer_id: string };
type Pending = { request_id: string; job_id: string; company_name: string; revision: number; company_note: string | null; company_reviewed_at: string; snapshot: Parameters<typeof fromRow>[0]; safety_flags: string[]; safety_review_required: boolean; assessments: Assessment[] };
type Listing = { job_id: string; title: string; status: string; company_name: string; updated_at: string; safety_flags: string[] };

export default function PlatformOpportunityReview() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<{ pending: Pending[]; listings: Listing[] } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError('');
    const role = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (role.error) { setError('Could not check administrator access.'); return; }
    setAllowed(role.data === true);
    if (!role.data) return;
    const r = await supabase.rpc('list_platform_job_reviews');
    if (r.error) setError('Could not load opportunities for review.'); else setData(r.data as unknown as { pending: Pending[]; listings: Listing[] });
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true); setError(''); setNotice('');
    const r = await p; setBusy(false);
    if (r.error) setError(r.error.message); else { setNotice(ok); await load(); }
  }

  if (!authLoading && !user) return <Navigate to="/employer/sign-in" replace />;
  return <EmployerShell><main className="container max-w-5xl px-5 py-10">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 font-display text-3xl font-bold"><ShieldCheck className="h-7 w-7 text-primary" />Opportunity safety review</h1><p className="mt-3 max-w-2xl text-muted-foreground">Company-approved opportunities that need a platform check before publication. Flags require a separate documented human assessment; approval never proves automatic legal compliance.</p></div><Button asChild variant="outline"><Link to="/admin/safety">Safety investigations</Link></Button></div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    {allowed === false ? <p className="mt-8 flex items-center gap-2 text-muted-foreground"><LockKeyhole className="h-4 w-4" />Only platform administrators can view this page.</p> : !data ? <p role="status" className="mt-8 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p> : <>
      <section className="mt-8 space-y-5"><h2 className="text-xl font-semibold">Awaiting platform review</h2>{data.pending.length ? data.pending.map(p => {
        const note = notes[p.request_id] ?? ''; const ok = note.trim().length >= 10;
        const cleared = latestAssessmentClears(p.safety_flags, p.assessments);
        return <article key={p.request_id} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2"><Badge>{statusLabel('pending_platform')}</Badge><span className="text-sm text-muted-foreground">Revision {p.revision} · company approved {new Date(p.company_reviewed_at).toLocaleString()}</span></div>
          {p.safety_flags.length > 0 && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"><p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-destructive" />Human safety assessment required</p><div className="mt-3 flex flex-wrap gap-2">{p.safety_flags.map((f) => <Badge key={f} variant="destructive">{SAFETY_FLAG_LABELS[f] ?? f.replace(/_/g, ' ')}</Badge>)}</div><p className="mt-3 text-xs text-muted-foreground">Assess the actual activities, business benefit, pay, supervision, workplace and safeguarding arrangements. Seek qualified UK employment-law or safeguarding advice where the position is uncertain.</p></div>}
          {p.company_note && <p className="text-sm"><span className="font-medium">Company reviewer note: </span>{p.company_note}</p>}
          <div className="rounded-lg border border-border p-4"><OpportunityPreview form={fromRow(p.snapshot)} companyName={p.company_name} /></div>
          {p.assessments.length > 0 && <div className="space-y-2 rounded-lg bg-muted p-3 text-sm"><p className="font-medium">Latest assessment: {p.assessments[0].decision.replace(/_/g, ' ')}</p><p className="whitespace-pre-wrap text-muted-foreground">{p.assessments[0].note}</p><p className="text-xs text-muted-foreground">{new Date(p.assessments[0].created_at).toLocaleString()} · {p.assessments.length} recorded assessment(s)</p></div>}
          {p.safety_review_required && <SafetyAssessment key={`${p.request_id}:${p.assessments[0]?.id ?? 'new'}`} requestId={p.request_id} onDone={load} />}
          <div className="space-y-2"><Label htmlFor={`pr-${p.request_id}`}>Publication review notes (required)</Label><Textarea id={`pr-${p.request_id}`} maxLength={2000} value={note} onChange={e => setNotes(n => ({ ...n, [p.request_id]: e.target.value }))} /></div>
          {!cleared && <p className="text-sm text-destructive">A cleared manual safety assessment is required before the publication button becomes available.</p>}
          <div className="flex flex-wrap gap-3"><Button disabled={busy || !ok || !cleared} onClick={() => void run(supabase.rpc('platform_review_job', { _request_id: p.request_id, _approve: true, _note: note }), 'Published after the recorded reviews.')}>Approve and publish</Button><Button variant="outline" disabled={busy || !ok} onClick={() => void run(supabase.rpc('platform_review_job', { _request_id: p.request_id, _approve: false, _note: note }), 'Rejected.')}>Reject</Button></div>
        </article>;
      }) : <p className="text-sm text-muted-foreground">Nothing is waiting for platform review.</p>}</section>
      <section className="mt-10"><h2 className="text-xl font-semibold">Listings</h2>{data.listings.length ? <ul className="mt-3 divide-y divide-border">{data.listings.map(l => {
        const note = notes[l.job_id] ?? '';
        return <li key={l.job_id} className="space-y-2 py-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{l.title}</p><p className="text-muted-foreground">{l.company_name} · <Badge variant="outline">{statusLabel(l.status)}</Badge></p>{l.safety_flags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{l.safety_flags.map((f) => <Badge key={f} variant="secondary">{SAFETY_FLAG_LABELS[f] ?? f}</Badge>)}</div>}</div></div>
          <div className="flex flex-wrap items-end gap-3"><div className="min-w-[16rem] flex-1 space-y-1"><Label htmlFor={`s-${l.job_id}`}>Reason (required)</Label><Textarea id={`s-${l.job_id}`} rows={2} maxLength={2000} value={note} onChange={e => setNotes(n => ({ ...n, [l.job_id]: e.target.value }))} /></div>
            {l.status === 'suspended' ? <Button variant="outline" disabled={busy || note.trim().length < 10} onClick={() => void run(supabase.rpc('set_job_listing_state', { _job_id: l.job_id, _action: 'reinstate', _note: note }), 'Reinstated as a draft; it needs fresh approval.')}>Reinstate as draft</Button>
              : <Button variant="outline" disabled={busy || note.trim().length < 10} onClick={() => void run(supabase.rpc('set_job_listing_state', { _job_id: l.job_id, _action: 'suspend', _note: note }), 'Suspended.')}>Suspend</Button>}</div></li>;
      })}</ul> : <p className="mt-2 text-sm text-muted-foreground">No listings yet.</p>}</section>
    </>}
  </main></EmployerShell>;
}

function SafetyAssessment({ requestId, onDone }: { requestId: string; onDone: () => Promise<void> }) {
  const [decision, setDecision] = useState<SafetyDecision>('changes_required');
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState({ tasks_reviewed: false, employment_law_reviewed: false, safeguarding_reviewed: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    const problem = safetyAssessmentProblem(decision, note, checks);
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    const result = await supabase.rpc('record_listing_safety_assessment', { _request_id: requestId, _decision: decision, _note: note.trim(), _checks: checks });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    await onDone();
  };
  return <div className="space-y-4 rounded-lg border border-primary/30 p-4"><h3 className="font-semibold">Record manual safety assessment</h3>
    <div className="space-y-2"><Label htmlFor={`assessment-${requestId}`}>Outcome</Label><Select value={decision} onValueChange={(v) => setDecision(v as SafetyDecision)}><SelectTrigger id={`assessment-${requestId}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="changes_required">Changes or further information required</SelectItem><SelectItem value="escalated">Escalate for specialist assessment</SelectItem><SelectItem value="cleared">Cleared for a separate publication decision</SelectItem></SelectContent></Select></div>
    <div className="space-y-3">{([
      ['tasks_reviewed','I compared the stated activities with the educational or paid category and considered whether the business benefits from productive work.'],
      ['employment_law_reviewed','I reviewed pay, hours and employment-status risks and identified where qualified UK employment-law advice is needed.'],
      ['safeguarding_reviewed','I reviewed supervision, workplace arrangements, eligibility, safeguarding contact and under-18 restrictions.'],
    ] as const).map(([key, text]) => <label key={key} className="flex items-start gap-3 text-sm"><Checkbox checked={checks[key]} onCheckedChange={(v) => setChecks((c) => ({ ...c, [key]: v === true }))} /><span>{text}</span></label>)}</div>
    <div className="space-y-2"><Label htmlFor={`assessment-note-${requestId}`}>Evidence and reasoning</Label><Textarea id={`assessment-note-${requestId}`} rows={4} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Record what you checked, unresolved questions and why this outcome is appropriate. Do not state that the listing is automatically legally compliant." /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button variant="secondary" disabled={busy} onClick={() => void submit()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save assessment</Button>
  </div>;
}
