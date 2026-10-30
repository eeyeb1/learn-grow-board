import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Copy, ExternalLink, History, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import OpportunityReviewHistory from '@/components/OpportunityReviewHistory';
import { CATEGORIES } from '@/lib/opportunityForm';
import { listingGroup, statusLabel, type ListingGroup } from '@/lib/opportunityStatus';

type Listing = {
  id: string; title: string; category: string | null; status: string; created_at: string; updated_at: string; expires_at: string | null;
  openings: string | null; start_date: string | null; end_date: string | null; is_admin: boolean; own: boolean; ever_approved: boolean; has_history: boolean;
  managers: string[]; applications: number; applications_pending: number; applications_accepted: number; placements: number; placements_completed: number; saves: number;
};
type Action = 'pause' | 'resume' | 'close' | 'archive';
const TABS: { value: ListingGroup; label: string }[] = [
  { value: 'draft', label: 'Draft' }, { value: 'review', label: 'In Review' }, { value: 'live', label: 'Live' }, { value: 'closed', label: 'Closed' }, { value: 'archived', label: 'Archived' },
];
const ACTION_COPY: Record<Action, [string, string]> = {
  pause: ['Pause this listing?', 'It will be hidden from seekers and stop taking applications until resumed. Existing applications are kept.'],
  resume: ['Resume this listing?', 'It will be visible again, but only if this exact version was approved and the closing date has not passed.'],
  close: ['Close this listing?', 'It will stop taking applications permanently. Existing applications and placements are kept. To run it again, duplicate it as a new draft.'],
  archive: ['Archive this listing?', 'It moves out of your active lists. Applications, placements, hours and certificates linked to it are kept.'],
};
const STATUS_HELP: Record<string, string> = {
  draft: 'Not visible to seekers. Submit for approval when ready.', changes_requested: 'Returned by a company administrator — see their note in your drafts.',
  pending_company: 'Waiting for a company administrator. Locked while under review.', company_approved: 'Approved by the company.', pending_platform: 'Waiting for platform safety review before seekers can see it.',
  active: 'Live in Find Experience, recommendations and saved lists; accepting applications until its closing date.', paused: 'Hidden from seekers and not accepting applications.',
  closed: 'Not accepting applications.', rejected: 'Not published. Duplicate an earlier approved listing to start again.', suspended: 'Suspended by the platform; not visible and not accepting applications.', archived: 'Kept for records only.',
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

/** Company staff listing management. Visibility and every action are decided by server RPCs. */
export default function MyOpportunities({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [tab, setTab] = useState<ListingGroup>('live');
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ job: Listing; action: Action } | null>(null);
  const [stats, setStats] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    setError('');
    const r = await supabase.rpc('list_managed_opportunities', { _company_id: companyId });
    if (r.error) { setError('Could not load your opportunities.'); setRows([]); return; }
    setRows((r.data ?? []) as unknown as Listing[]);
  }, [companyId]);
  useEffect(() => { setRows(null); void load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t.value, (rows ?? []).filter(r => listingGroup(r.status) === t.value).length])), [rows]);
  const shown = (rows ?? []).filter(r => listingGroup(r.status) === tab);

  async function act(job: Listing, action: Action) {
    setBusy(job.id); setError(''); setNotice('');
    const r = await supabase.rpc('set_job_listing_state', { _job_id: job.id, _action: action, _note: '' });
    setBusy(null); setConfirm(null);
    if (r.error) { setError(r.error.message); return; }
    setNotice({ pause: 'Listing paused.', resume: 'Listing is live again.', close: 'Listing closed to applications.', archive: 'Listing archived. Its history is kept.' }[action]);
    await load();
  }
  async function duplicate(job: Listing) {
    setBusy(job.id); setError(''); setNotice('');
    const r = await supabase.rpc('duplicate_job_as_draft', { _job_id: job.id });
    setBusy(null);
    if (r.error) { setError(r.error.message); return; }
    setNotice('Duplicated as a new draft. It needs its own approval before going live.');
    navigate(`/employer/drafts?company=${companyId}`);
  }

  return <section className="space-y-6">
    <div><h2 className="text-xl font-semibold">My Opportunities</h2><p className="mt-1 text-sm text-muted-foreground">Listings you are allowed to manage. Changing key details of an approved listing takes it offline until it is approved again.</p></div>
    <div role="tablist" aria-label="Listing status" className="flex flex-wrap gap-2">
      {TABS.map(t => <Button key={t.value} role="tab" aria-selected={tab === t.value} size="sm" variant={tab === t.value ? 'default' : 'outline'} onClick={() => setTab(t.value)}>{t.label}<span className="ml-1.5 opacity-70">{counts[t.value] ?? 0}</span></Button>)}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {!rows ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
      : !shown.length ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No listings here. <Link className="text-primary underline" to={`/employer/drafts?company=${companyId}`}>Create an opportunity</Link></p>
      : <ul className="space-y-4">{shown.map(j => {
        const cat = CATEGORIES.find(c => c.value === j.category)?.label ?? 'No category';
        const editable = j.own && (j.status === 'draft' || j.status === 'changes_requested');
        return <li key={j.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="break-words text-lg font-semibold">{j.title}</h3><p className="mt-1 text-sm text-muted-foreground">{cat}</p></div>
            <Badge variant={j.status === 'active' ? 'default' : 'outline'}>{statusLabel(j.status)}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{STATUS_HELP[j.status]}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="font-medium">Applications</dt><dd className="text-muted-foreground">{j.applications}</dd></div>
            <div><dt className="font-medium">Openings</dt><dd className="text-muted-foreground">{j.openings ?? '—'}</dd></div>
            <div><dt className="font-medium">Dates</dt><dd className="text-muted-foreground">{j.start_date || j.end_date ? `${fmt(j.start_date)} – ${fmt(j.end_date)}` : '—'}</dd></div>
            <div><dt className="font-medium">Closes</dt><dd className="text-muted-foreground">{fmt(j.expires_at)}</dd></div>
            <div className="col-span-2 sm:col-span-4"><dt className="font-medium">Assigned manager</dt><dd className="text-muted-foreground">{j.managers.length ? j.managers.join(', ') : 'None assigned — company administrators manage it'}</dd></div>
          </dl>
          {stats === j.id && <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-5">
            {([['Saved by seekers', j.saves], ['Awaiting decision', j.applications_pending], ['Accepted', j.applications_accepted], ['Placements', j.placements], ['Completed', j.placements_completed]] as const).map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>)}
          </dl>}
          <div className="mt-4 flex flex-wrap gap-2">
            {editable && <Button asChild size="sm" variant="outline"><Link to={`/employer/drafts?company=${companyId}`}><Pencil className="mr-1.5 h-4 w-4" />Edit draft</Link></Button>}
            {j.status === 'active' && <Button asChild size="sm" variant="outline"><Link to={`/jobs/${j.id}`}><ExternalLink className="mr-1.5 h-4 w-4" />View as seeker</Link></Button>}
            <Button size="sm" variant="outline" onClick={() => setStats(stats === j.id ? null : j.id)}><BarChart3 className="mr-1.5 h-4 w-4" />Performance</Button>
            {j.status === 'active' && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm({ job: j, action: 'pause' })}>Pause</Button>}
            {j.status === 'paused' && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm({ job: j, action: 'resume' })}>Resume</Button>}
            {(j.status === 'active' || j.status === 'paused') && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm({ job: j, action: 'close' })}>Close</Button>}
            {j.is_admin && (j.status === 'closed' || j.status === 'rejected') && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setConfirm({ job: j, action: 'archive' })}>Archive</Button>}
            {j.ever_approved && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void duplicate(j)}><Copy className="mr-1.5 h-4 w-4" />Duplicate as draft</Button>}
            {j.has_history && <Button size="sm" variant="ghost" onClick={() => setHistoryFor(j)}><History className="mr-1.5 h-4 w-4" />History</Button>}
          </div>
          {j.has_history && <p className="mt-3 text-xs text-muted-foreground">Listings with review history can't be deleted; close or archive instead so application and placement records are kept.</p>}
        </li>;
      })}</ul>}
    <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
      <AlertDialogContent>{confirm && <><AlertDialogHeader><AlertDialogTitle>{ACTION_COPY[confirm.action][0]}</AlertDialogTitle><AlertDialogDescription>{ACTION_COPY[confirm.action][1]}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void act(confirm.job, confirm.action)}>Confirm</AlertDialogAction></AlertDialogFooter></>}</AlertDialogContent>
    </AlertDialog>
    <OpportunityReviewHistory jobId={historyFor?.id ?? null} title={historyFor?.title ?? ''} open={!!historyFor} onOpenChange={o => !o && setHistoryFor(null)} />
  </section>;
}
