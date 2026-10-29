import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OpportunityPreview } from '@/components/OpportunityDrafts';
import { fromRow } from '@/lib/opportunityForm';
import { statusLabel } from '@/lib/opportunityStatus';

type Pending = { request_id: string; job_id: string; company_name: string; revision: number; company_note: string | null; company_reviewed_at: string; snapshot: Parameters<typeof fromRow>[0] };
type Listing = { job_id: string; title: string; status: string; company_name: string; updated_at: string };

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
    <h1 className="flex items-center gap-2 font-display text-3xl font-bold"><ShieldCheck className="h-7 w-7 text-primary" />Opportunity safety review</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Company-approved opportunities that need a platform check before publication: unpaid learning opportunities, a company's first listing, and listings approved by their own author.</p>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    {allowed === false ? <p className="mt-8 flex items-center gap-2 text-muted-foreground"><LockKeyhole className="h-4 w-4" />Only platform administrators can view this page.</p> : !data ? <p role="status" className="mt-8 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p> : <>
      <section className="mt-8 space-y-5"><h2 className="text-xl font-semibold">Awaiting platform review</h2>{data.pending.length ? data.pending.map(p => {
        const note = notes[p.request_id] ?? ''; const ok = note.trim().length >= 10;
        return <article key={p.request_id} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2"><Badge>{statusLabel('pending_platform')}</Badge><span className="text-sm text-muted-foreground">Revision {p.revision} · company approved {new Date(p.company_reviewed_at).toLocaleString()}</span></div>
          {p.company_note && <p className="text-sm"><span className="font-medium">Company reviewer note: </span>{p.company_note}</p>}
          <div className="rounded-lg border border-border p-4"><OpportunityPreview form={fromRow(p.snapshot)} companyName={p.company_name} /></div>
          <div className="space-y-2"><Label htmlFor={`pr-${p.request_id}`}>Safety review notes (required)</Label><Textarea id={`pr-${p.request_id}`} maxLength={2000} value={note} onChange={e => setNotes(n => ({ ...n, [p.request_id]: e.target.value }))} /></div>
          <div className="flex flex-wrap gap-3"><Button disabled={busy || !ok} onClick={() => void run(supabase.rpc('platform_review_job', { _request_id: p.request_id, _approve: true, _note: note }), 'Published.')}>Approve and publish</Button><Button variant="outline" disabled={busy || !ok} onClick={() => void run(supabase.rpc('platform_review_job', { _request_id: p.request_id, _approve: false, _note: note }), 'Rejected.')}>Reject</Button></div>
        </article>;
      }) : <p className="text-sm text-muted-foreground">Nothing is waiting for platform review.</p>}</section>
      <section className="mt-10"><h2 className="text-xl font-semibold">Listings</h2>{data.listings.length ? <ul className="mt-3 divide-y divide-border">{data.listings.map(l => {
        const note = notes[l.job_id] ?? '';
        return <li key={l.job_id} className="space-y-2 py-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{l.title}</p><p className="text-muted-foreground">{l.company_name} · <Badge variant="outline">{statusLabel(l.status)}</Badge></p></div></div>
          <div className="flex flex-wrap items-end gap-3"><div className="min-w-[16rem] flex-1 space-y-1"><Label htmlFor={`s-${l.job_id}`}>Reason (required)</Label><Textarea id={`s-${l.job_id}`} rows={2} maxLength={2000} value={note} onChange={e => setNotes(n => ({ ...n, [l.job_id]: e.target.value }))} /></div>
            {l.status === 'suspended' ? <Button variant="outline" disabled={busy || note.trim().length < 10} onClick={() => void run(supabase.rpc('set_job_listing_state', { _job_id: l.job_id, _action: 'reinstate', _note: note }), 'Reinstated as a draft; it needs fresh approval.')}>Reinstate as draft</Button>
              : <Button variant="outline" disabled={busy || note.trim().length < 10} onClick={() => void run(supabase.rpc('set_job_listing_state', { _job_id: l.job_id, _action: 'suspend', _note: note }), 'Suspended.')}>Suspend</Button>}</div></li>;
      })}</ul> : <p className="mt-2 text-sm text-muted-foreground">No listings yet.</p>}</section>
    </>}
  </main></EmployerShell>;
}
