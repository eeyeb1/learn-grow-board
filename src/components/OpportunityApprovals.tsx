import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GitCompare, History, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OpportunityPreview } from '@/components/OpportunityDrafts';
import OpportunityReviewHistory from '@/components/OpportunityReviewHistory';
import { CATEGORIES, fromRow, isPaid, warnings } from '@/lib/opportunityForm';
import { statusLabel } from '@/lib/opportunityStatus';
import { approvalFilter, FILTERS, type ApprovalFilter, diffSnapshots } from '@/lib/approvalCentre';

const COLS = 'id,title,category,description,location_type,location,duration,hours_per_week,what_you_will_learn,mentorship_details,expires_at,opportunity_details,status,updated_at,company_id';
type Job = Parameters<typeof fromRow>[0] & { id: string; title: string; status: string };
type Req = {
  id: string; job_id: string; revision: number; status: string; created_at: string; requested_by: string;
  author_name: string; author_title: string | null; reviewed_at: string | null; reviewer_name: string | null; note: string | null;
  self_authored_approval: boolean; platform_review_required: boolean; platform_status: string | null; platform_note: string | null;
  job_status: string; category: string | null; second_authoriser_required: boolean;
  current: Record<string, unknown> | null; previous: Record<string, unknown> | null; approved: Record<string, unknown> | null;
};

/** Company-admin Opportunity Approval Centre. Listing and decisions are enforced by server RPCs. */
export default function OpportunityApprovals({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Req[] | null>(null);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [filter, setFilter] = useState<ApprovalFilter>('awaiting');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: string; title: string } | null>(null);
  const [inspect, setInspect] = useState<Req | null>(null);
  const [compare, setCompare] = useState<Req | null>(null);

  const load = useCallback(async () => {
    setError('');
    const r = await supabase.rpc('list_company_approval_requests', { _company_id: companyId });
    if (r.error) { setError('Could not load approval requests.'); setRows([]); return; }
    const list = (r.data ?? []) as unknown as Req[];
    const ids = [...new Set(list.map(x => x.job_id))];
    if (ids.length) {
      const j = await supabase.from('jobs').select(COLS).in('id', ids);
      if (!j.error) setJobs(Object.fromEntries(((j.data ?? []) as unknown as Job[]).map(x => [x.id, x])));
    }
    setRows(list);
  }, [companyId]);
  useEffect(() => { setRows(null); setNotes({}); void load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.value, (rows ?? []).filter(r => approvalFilter(r) === f.value).length])), [rows]);
  const shown = (rows ?? []).filter(r => approvalFilter(r) === filter);

  async function decide(r: Req, decision: 'approve' | 'reject' | 'changes') {
    setBusy(r.id + decision); setError(''); setNotice('');
    const res = await supabase.rpc('review_job_submission', { _request_id: r.id, _decision: decision, _note: notes[r.id] ?? '' });
    setBusy(null);
    if (res.error) { setError(res.error.message); return; }
    setNotice(decision === 'approve' ? (res.data === 'active' ? 'Approved and published.' : 'Approved. It now awaits platform safety review before seekers can see it.') : decision === 'reject' ? 'Rejected. The author has been told why.' : 'Returned to the author with your requested changes.');
    await load();
  }
  async function close(jobId: string) {
    setBusy(jobId); setError('');
    const r = await supabase.rpc('set_job_listing_state', { _job_id: jobId, _action: 'close', _note: '' });
    setBusy(null); if (r.error) setError(r.error.message); else { setNotice('Listing closed.'); await load(); }
  }

  return <section className="mt-10 space-y-6 border-t border-border pt-7">
    <div><h2 className="text-xl font-semibold">Opportunity Approval Centre</h2><p className="mt-1 text-sm text-muted-foreground">Only {companyName}'s submissions appear here. Every decision needs an explanation and is permanently recorded with your name, the time and the exact version.</p></div>
    <div role="tablist" aria-label="Filter approval requests" className="flex flex-wrap gap-2">
      {FILTERS.map(f => <Button key={f.value} role="tab" aria-selected={filter === f.value} size="sm" variant={filter === f.value ? 'default' : 'outline'} onClick={() => setFilter(f.value)}>{f.label} <span className="ml-1.5 opacity-70">{counts[f.value] ?? 0}</span></Button>)}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {!rows ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
      : shown.length ? shown.map(r => {
        const job = jobs[r.job_id]; const form = job ? fromRow(job) : null; const flags = form ? warnings(form) : [];
        const cat = CATEGORIES.find(c => c.value === r.category); const own = r.requested_by === user?.id;
        const pending = r.status === 'pending' && r.job_status === 'pending_company';
        const note = notes[r.id] ?? ''; const ok = note.trim().length >= 10;
        const blockedSelf = own && r.second_authoriser_required;
        return <article key={r.id} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="break-words text-lg font-semibold">{job?.title ?? 'Opportunity'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">By {r.author_name}{r.author_title ? `, ${r.author_title}` : ''}{own && ' (you)'} · {companyName} · submitted {new Date(r.created_at).toLocaleString()} · revision {r.revision}</p></div>
            <div className="flex flex-wrap gap-2"><Badge variant={r.job_status === 'active' ? 'default' : 'outline'}>{statusLabel(r.job_status)}</Badge>{cat && <Badge variant="secondary">{cat.label}</Badge>}</div>
          </div>
          {form && <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field k="Payment" v={isPaid(form.category) ? form.payment_details : `Unpaid educational${form.payment_details ? ` — ${form.payment_details}` : ''}`} />
            <Field k="Expenses" v={form.expense_details} />
            <Field k="Expected activities" v={form.activities} />
            <Field k="Supervision" v={form.supervision} />
          </dl>}
          {flags.length > 0 && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"><p className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4" />Potential safety flags</p><ul className="mt-2 list-disc space-y-1 pl-5">{flags.map(f => <li key={f}>{f}</li>)}</ul></div>}
          {r.status !== 'pending' && <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p><span className="font-medium">{r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Changes requested'}</span>{r.reviewer_name && ` by ${r.reviewer_name}`}{r.reviewed_at && ` on ${new Date(r.reviewed_at).toLocaleString()}`}{r.note && `: ${r.note}`}</p>
            {r.self_authored_approval && <p className="mt-1 text-muted-foreground">Recorded as a self-authored administrator approval; sent for platform moderation.</p>}
            {r.platform_review_required && <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-4 w-4" />Platform safety review: {r.platform_status ?? 'pending'}{r.platform_note ? ` — ${r.platform_note}` : ''}</p>}
          </div>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!form} onClick={() => setInspect(r)}>Inspect full draft</Button>
            <Button variant="outline" size="sm" disabled={!r.previous} title={r.previous ? undefined : 'No earlier approved version'} onClick={() => setCompare(r)}><GitCompare className="mr-1.5 h-4 w-4" />Compare revisions</Button>
            <Button variant="ghost" size="sm" onClick={() => setHistoryFor({ id: r.job_id, title: job?.title ?? '' })}><History className="mr-1.5 h-4 w-4" />History</Button>
            {r.job_status === 'active' && r.status === 'approved' && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void close(r.job_id)}>Close listing</Button>}
          </div>
          {pending && <div className="space-y-3 border-t border-border pt-4">
            {blockedSelf ? <p className="text-sm text-muted-foreground">This category needs a second authoriser, so another company administrator must review your own submission.</p>
              : own && <p className="text-sm text-muted-foreground">You wrote this. You can approve it only as the sole administrator; it will be recorded as a self-authored approval and sent for platform moderation.</p>}
            <div className="space-y-2"><Label htmlFor={`review-${r.id}`}>Message or reason for the author (required)</Label><Textarea id={`review-${r.id}`} maxLength={2000} value={note} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="At least 10 characters" /></div>
            <div className="flex flex-wrap gap-3">
              <Button disabled={!!busy || !ok || blockedSelf} onClick={() => void decide(r, 'approve')}>{busy === r.id + 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve</Button>
              <Button variant="outline" disabled={!!busy || !ok} onClick={() => void decide(r, 'changes')}>Request changes</Button>
              <Button variant="outline" disabled={!!busy || !ok} onClick={() => void decide(r, 'reject')}>Reject</Button>
            </div>
          </div>}
        </article>;
      }) : <p className="text-sm text-muted-foreground">Nothing in this view.</p>}

    <Dialog open={!!inspect} onOpenChange={o => !o && setInspect(null)}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Full draft</DialogTitle></DialogHeader>
        {inspect && jobs[inspect.job_id] && <OpportunityPreview form={fromRow(jobs[inspect.job_id])} companyName={companyName} />}</DialogContent>
    </Dialog>
    <Dialog open={!!compare} onOpenChange={o => !o && setCompare(null)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Changes since the last approved version</DialogTitle></DialogHeader>
        {compare && (() => { const d = diffSnapshots(compare.previous, compare.current); return d.length ? <ul className="space-y-3 text-sm">{d.map(c => <li key={c.key} className="rounded-lg border border-border p-3"><p className="font-medium">{c.key}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><pre className="whitespace-pre-wrap break-words rounded bg-destructive/5 p-2 text-xs">{c.before || '—'}</pre><pre className="whitespace-pre-wrap break-words rounded bg-primary/5 p-2 text-xs">{c.after || '—'}</pre></div></li>)}</ul> : <p className="text-sm text-muted-foreground">No material differences.</p>; })()}
      </DialogContent>
    </Dialog>
    <OpportunityReviewHistory jobId={historyFor?.id ?? null} title={historyFor?.title ?? ''} open={!!historyFor} onOpenChange={o => !o && setHistoryFor(null)} />
  </section>;
}

function Field({ k, v }: { k: string; v: string }) {
  return <div><dt className="font-medium">{k}</dt><dd className="mt-0.5 whitespace-pre-line break-words text-muted-foreground">{v?.trim() || 'Not provided'}</dd></div>;
}
