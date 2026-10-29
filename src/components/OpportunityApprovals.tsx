import { useCallback, useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OpportunityPreview } from '@/components/OpportunityDrafts';
import OpportunityReviewHistory from '@/components/OpportunityReviewHistory';
import { fromRow } from '@/lib/opportunityForm';
import { statusLabel } from '@/lib/opportunityStatus';

const COLS = 'id,title,category,description,location_type,location,duration,hours_per_week,what_you_will_learn,mentorship_details,expires_at,opportunity_details,status,updated_at';
type Job = Parameters<typeof fromRow>[0] & { id: string; title: string; status: string; updated_at: string };
type Req = { id: string; revision: number; created_at: string; requested_by: string; job: Job | null };

/** Company-admin approval queue. Decisions are made only by the review RPC on the server. */
export default function OpportunityApprovals({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Req[] | null>(null);
  const [listings, setListings] = useState<Job[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Job | null>(null);

  const load = useCallback(async () => {
    setError('');
    const [r, j] = await Promise.all([
      supabase.from('job_publication_requests').select(`id,revision,created_at,requested_by,job:jobs(${COLS})`).eq('company_id', companyId).eq('status', 'pending').order('created_at'),
      supabase.from('jobs').select(COLS).eq('company_id', companyId).neq('status', 'draft').order('updated_at', { ascending: false }).limit(50),
    ]);
    if (r.error || j.error) { setError('Could not load the approval queue.'); setRows([]); return; }
    setRows(((r.data ?? []) as unknown as Req[]).filter(x => x.job?.status === 'pending_company'));
    setListings((j.data ?? []) as Job[]);
  }, [companyId]);
  useEffect(() => { setRows(null); setNotes({}); void load(); }, [load]);

  async function decide(id: string, decision: 'approve' | 'reject' | 'changes') {
    setBusy(id + decision); setError(''); setNotice('');
    const r = await supabase.rpc('review_job_submission', { _request_id: id, _decision: decision, _note: notes[id] ?? '' });
    setBusy(null);
    if (r.error) { setError(r.error.message); return; }
    setNotice(decision === 'approve' ? (r.data === 'active' ? 'Approved and published.' : 'Approved. It now awaits platform safety review before publication.') : decision === 'reject' ? 'Rejected. The author has been told why.' : 'Returned to the author with your requested changes.');
    await load();
  }
  async function close(job: Job) {
    setBusy(job.id); setError('');
    const r = await supabase.rpc('set_job_listing_state', { _job_id: job.id, _action: 'close', _note: '' });
    setBusy(null); if (r.error) setError(r.error.message); else { setNotice('Listing closed.'); await load(); }
  }

  return <section className="mt-10 space-y-8 border-t border-border pt-7">
    <div><h2 className="text-xl font-semibold">Opportunity approval queue</h2><p className="mt-1 text-sm text-muted-foreground">Submissions are read-only while you review them. Every decision needs an explanation and is permanently recorded with your name, the time and the exact version approved.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {!rows ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p> : rows.length ? rows.map(r => {
      const note = notes[r.id] ?? ''; const ok = note.trim().length >= 10; const own = r.requested_by === user?.id;
      return <article key={r.id} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Badge>{statusLabel('pending_company')}</Badge><span className="text-sm text-muted-foreground">Revision {r.revision} · submitted {new Date(r.created_at).toLocaleString()}{own && ' · your own submission'}</span></div><Button variant="ghost" size="sm" onClick={() => setHistoryFor(r.job)}><History className="mr-1.5 h-4 w-4" />History</Button></div>
        {r.job && <div className="rounded-lg border border-border p-4"><OpportunityPreview form={fromRow(r.job)} companyName={companyName} /></div>}
        {own && <p className="text-sm text-muted-foreground">You can approve your own submission only when you are the company's sole administrator, and it will then also need platform safety review.</p>}
        <div className="space-y-2"><Label htmlFor={`review-${r.id}`}>Explanation for the author (required)</Label><Textarea id={`review-${r.id}`} maxLength={2000} value={note} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="At least 10 characters" /></div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!!busy || !ok} onClick={() => void decide(r.id, 'approve')}>{busy === r.id + 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve</Button>
          <Button variant="outline" disabled={!!busy || !ok} onClick={() => void decide(r.id, 'changes')}>Request changes</Button>
          <Button variant="outline" disabled={!!busy || !ok} onClick={() => void decide(r.id, 'reject')}>Reject</Button>
        </div>
      </article>;
    }) : <p className="text-sm text-muted-foreground">No submissions are waiting for company approval.</p>}

    <div><h3 className="font-semibold">Company opportunities</h3>{listings.length ? <ul className="mt-3 divide-y divide-border">{listings.map(j => <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="break-words font-medium">{j.title}</p><Badge variant={j.status === 'active' ? 'default' : 'outline'} className="mt-1">{statusLabel(j.status)}</Badge></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setHistoryFor(j)}><History className="mr-1.5 h-4 w-4" />History</Button>{j.status === 'active' && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void close(j)}>Close listing</Button>}</div></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No submitted opportunities yet.</p>}</div>
    <OpportunityReviewHistory jobId={historyFor?.id ?? null} title={historyFor?.title ?? ''} open={!!historyFor} onOpenChange={o => !o && setHistoryFor(null)} />
  </section>;
}
