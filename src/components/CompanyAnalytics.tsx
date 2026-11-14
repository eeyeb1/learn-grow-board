import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, Briefcase, CheckCircle2, Clock3, Download, Eye, FileCheck2, FilterX, Info, Loader2, RefreshCw, ShieldCheck, TimerReset, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_MIN_SAMPLE, companyAnalyticsCsv, hoursLabel, sampleRatio, waitLabel, type CompanyAnalytics } from '@/lib/companyAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function CompanyAnalytics({ companyId, companyName, isAdmin }: { companyId: string; companyName: string; isAdmin: boolean }) {
  const [jobId, setJobId] = useState('all');
  const [department, setDepartment] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<CompanyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    setError('');
    if (from && to && from > to) {
      setData(null); setLoading(false); setError('The start date must be on or before the end date.'); return;
    }
    setLoading(true);
    const result = await supabase.rpc('get_company_analytics', {
      _company_id: companyId,
      _job_id: jobId === 'all' ? null : jobId,
      _department: department === 'all' ? null : department,
      _from: from || null,
      _to: to || null,
    });
    if (current !== request.current) return;
    if (result.error) {
      setData(null);
      setError(result.error.message.includes('membership') || result.error.message.includes('Sign in')
        ? 'Your current company role does not include analytics access.'
        : 'Analytics could not be loaded. Please try again.');
    } else setData(result.data as unknown as CompanyAnalytics);
    setLoading(false);
  }, [companyId, jobId, department, from, to]);

  useEffect(() => { void load(); return () => { request.current += 1; }; }, [load]);

  const departments = useMemo(() => Array.from(new Set((data?.listings ?? []).map(l => l.department).filter((d): d is string => !!d))).sort(), [data?.listings]);
  const clear = () => { setJobId('all'); setDepartment('all'); setFrom(''); setTo(''); };
  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob([companyAnalyticsCsv(data, companyName)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `company-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success('Aggregate-only analytics exported.');
  };

  const acceptance = data ? sampleRatio(data.applications.accepted, data.applications.total, data.applications.total) : null;
  const completion = data ? sampleRatio(data.placements.completed, data.placements.total, data.placements.total) : null;
  const verifiedShare = data ? sampleRatio(data.hours.verified_minutes, data.hours.submitted_minutes, data.hours.entries) : null;
  const hasActivity = !!data && (data.applications.total + data.placements.total + data.hours.entries + data.skills.verifications) > 0;
  const filtered = jobId !== 'all' || department !== 'all' || !!from || !!to;

  return <section className="space-y-6" aria-labelledby="analytics-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="analytics-title" className="flex items-center gap-2 font-display text-2xl font-bold"><BarChart3 className="h-6 w-6 text-primary" />Company analytics</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{isAdmin ? 'Authorised company records only.' : 'Only listings and placements explicitly available to your role.'} No individual seeker records are included.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        <Button size="sm" onClick={exportCsv} disabled={!data || loading}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>
    </div>

    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="xl:col-span-2"><Label htmlFor="analytics-job">Opportunity</Label><Select value={jobId} onValueChange={setJobId}><SelectTrigger id="analytics-job"><SelectValue placeholder="All authorised opportunities" /></SelectTrigger><SelectContent><SelectItem value="all">All authorised opportunities</SelectItem>{(data?.listings ?? []).map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="analytics-department">Department</Label><Select value={department} onValueChange={setDepartment}><SelectTrigger id="analytics-department"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="analytics-from">From</Label><Input id="analytics-from" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></div>
      <div><Label htmlFor="analytics-to">To</Label><Input id="analytics-to" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></div>
      {filtered && <Button variant="ghost" size="sm" className="justify-self-start xl:col-span-5" onClick={clear}><FilterX className="mr-2 h-4 w-4" />Clear filters</Button>}
    </div>
    <p className="-mt-3 text-xs text-muted-foreground">Dates apply to application submission, placement creation, hours worked and skill verification respectively.</p>

    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading analytics">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      : error ? <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6"><AlertTriangle className="h-6 w-6 text-destructive" /><p className="mt-2 text-sm">{error}</p><Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>Try again</Button></div>
      : data ? <>
        {!data.listings.length && <EmptyPanel icon={Briefcase} title={isAdmin ? 'No company opportunities yet' : 'No analytics assignments yet'}>{isAdmin ? 'Analytics will appear when genuine applications, placements, hours or skills are recorded.' : 'Ask a company administrator to assign you a listing or placement. Approved membership alone does not grant company-wide analytics.'}</EmptyPanel>}
        {data.listings.length > 0 && !hasActivity && <EmptyPanel icon={BarChart3} title={filtered ? 'No activity matches these filters' : 'No activity to report yet'}>{filtered ? 'Try clearing or widening the filters. Empty results are shown as zero, not estimated.' : 'Applications, placements, logged hours and verified skills will appear here as real activity is recorded.'}</EmptyPanel>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Users} label="Applications" value={String(data.applications.total)} detail={`${data.applications.accepted} ever accepted`} />
          <Metric icon={FileCheck2} label="Acceptance rate" value={acceptance === null ? 'Not shown' : `${acceptance}%`} detail={acceptance === null ? `Requires ${ANALYTICS_MIN_SAMPLE}+ applications` : `${data.applications.accepted} of ${data.applications.total} submitted`} muted={acceptance === null} />
          <Metric icon={CheckCircle2} label="Completion rate" value={completion === null ? 'Not shown' : `${completion}%`} detail={completion === null ? `Requires ${ANALYTICS_MIN_SAMPLE}+ placements` : `${data.placements.completed} of ${data.placements.total} placements`} muted={completion === null} />
          <Metric icon={Eye} label="Opportunity views" value="Unavailable" detail="View tracking is not enabled" muted />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Application pipeline" icon={Users}>
            {data.applications.total ? <div className="space-y-3">{[
              ['Submitted', data.applications.current_submitted], ['Under review', data.applications.current_under_review],
              ['Accepted', data.applications.current_accepted], ['Completed', data.applications.current_completed],
              ['Declined', data.applications.current_declined], ['Withdrawn', data.applications.current_withdrawn],
            ].map(([label, value]) => <div key={label as string} className="flex items-center gap-3 text-sm"><span className="w-28 text-muted-foreground">{label}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(Number(value) > 0 ? 4 : 0, Number(value) / data.applications.total * 100)}%` }} /></div><span className="w-7 text-right font-medium">{value}</span></div>)}</div> : <Empty>No applications in this selection.</Empty>}
            <Definition>Acceptance uses applications ever accepted, including those with a retained placement record. The bars show current application stages, so they tell a different story.</Definition>
          </Panel>

          <Panel title="Placement outcomes" icon={CheckCircle2}>
            {data.placements.total ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Upcoming', data.placements.upcoming], ['Active', data.placements.active], ['Completed', data.placements.completed], ['Cancelled', data.placements.cancelled], ['Disputed', data.placements.disputed]].map(([label, value]) => <div key={label as string} className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div> : <Empty>No placements in this creation-date selection.</Empty>}
            <Definition>Completion is completed placements divided by every placement created in the selected dates, including cancelled and disputed records.</Definition>
          </Panel>

          <Panel title="Submitted versus verified hours" icon={Clock3}>
            {data.hours.entries ? <>
              <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-accent/50 p-4"><p className="text-sm text-muted-foreground">Submitted</p><p className="mt-1 font-display text-2xl font-bold">{hoursLabel(data.hours.submitted_minutes)}</p></div><div className="rounded-lg bg-primary/10 p-4"><p className="text-sm text-muted-foreground">Verified</p><p className="mt-1 font-display text-2xl font-bold">{hoursLabel(data.hours.verified_minutes)}</p></div></div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground"><p>Pending: {hoursLabel(data.hours.pending_minutes)}</p><p>Correction requested: {hoursLabel(data.hours.correction_minutes)}</p><p>Rejected: {hoursLabel(data.hours.rejected_minutes)}</p></div>
              <p className="mt-3 text-sm font-medium">Verified share: {verifiedShare === null ? `Not shown below ${ANALYTICS_MIN_SAMPLE} entries` : `${verifiedShare}%`}</p>
            </> : <Empty>No hours were logged for work dates in this selection.</Empty>}
            <Definition>Submitted includes every logged minute and review status. Verified means supervisor-approved minutes only; it is never an editable total.</Definition>
          </Panel>

          <Panel title="Time awaiting supervisor review" icon={TimerReset}>
            {data.review_wait.pending_entries ? <><div className="grid grid-cols-3 gap-2 text-center">{[['Average', data.review_wait.average_hours], ['Median', data.review_wait.median_hours], ['Oldest', data.review_wait.oldest_hours]].map(([label, value]) => <div key={label as string} className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{waitLabel(value as number)}</p></div>)}</div><p className="mt-3 text-sm text-muted-foreground">{data.review_wait.pending_entries} pending {data.review_wait.pending_entries === 1 ? 'entry' : 'entries'}.</p></> : <Empty>No entries are awaiting review in this selection.</Empty>}
            <Definition>Wait runs from the latest submission or resubmission to now. Correction-requested and reviewed entries are excluded.</Definition>
          </Panel>
        </div>

        <Panel title="Categories of skills verified" icon={ShieldCheck}>
          {data.skills.categories.length ? <div className="grid gap-3 sm:grid-cols-2">{data.skills.categories.map(c => <div key={c.category} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{c.category}</p><span className="text-sm text-muted-foreground">{c.verifications} verifications</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, c.verifications / data.skills.verifications * 100)}%` }} /></div></div>)}</div>
            : <Empty>{data.skills.verifications ? 'Category details are hidden until at least five different seekers have active verified skills in this selection.' : 'No active supervisor-verified skills were recorded in this selection.'}</Empty>}
          <Definition>Only active, observed skill confirmations count. Every visible category represents at least five distinct seekers; hidden or revoked skills are excluded.</Definition>
        </Panel>

        <details className="rounded-xl border border-border bg-card p-5 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Info className="h-4 w-4 text-primary" />Metric definitions and privacy</summary>
          <div className="mt-4 grid gap-4 text-muted-foreground md:grid-cols-2">
            <p>Rates are withheld when their cohort has fewer than five records. “Not shown” never means zero, and small cohorts should not be compared as trends.</p>
            <p>The CSV repeats these definitions and contains aggregates only: no seeker names, user IDs, contact details, statements, individual dates or row-level records.</p>
            <p>Each metric uses its own record date: application submission, placement creation, worked date or skill verification. Results can therefore describe different cohorts under one filter.</p>
            <p>Opportunity views remain unavailable until genuine view tracking exists. No views, benchmarks or trends are inferred from other activity.</p>
          </div>
        </details>
      </> : null}
  </section>;
}

function Metric({ icon: Icon, label, value, detail, muted = false }: { icon: typeof Users; label: string; value: string; detail: string; muted?: boolean }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className={`mt-3 font-display text-2xl font-bold ${muted ? 'text-muted-foreground' : ''}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{title}</h3>{children}</section>;
}
function Definition({ children }: { children: React.ReactNode }) { return <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{children}</p>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{children}</p>; }
function EmptyPanel({ icon: Icon, title, children }: { icon: typeof Briefcase; title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center"><Icon className="mx-auto h-7 w-7 text-muted-foreground" /><h3 className="mt-2 font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{children}</p></div>;
}
