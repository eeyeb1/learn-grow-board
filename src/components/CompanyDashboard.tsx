import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bell, Briefcase, CheckCircle2, ClipboardCheck, Clock, FileText, Plus, RefreshCw, Send, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CompanyContext } from '@/lib/companyAccess';

const AWAITING = ['pending', 'submitted', 'reviewing'];
type Job = { id: string; title: string; status: string; updated_at: string };
type App = { id: string; job_id: string; status: string; submitted_at: string };
type Placement = { id: string; status: string; job_id: string; start_date: string | null; updated_at: string };
type Hour = { id: string; work_date: string; minutes: number; application_id: string };
type Pub = { id: string; revision: number; created_at: string; job_id: string };
type Note = { id: string; title: string; preview: string; link: string | null; read_at: string | null; created_at: string };
type Event = { id: string; action: string; created_at: string };
interface Data { jobs: Job[]; apps: App[]; placements: Placement[]; hours: Hour[]; pubs: Pub[]; memberRequests: number | null; notes: Note[]; events: Event[] }

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function CompanyDashboard({ context }: { context: CompanyContext }) {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const isAdmin = context.state === 'company_admin';
  const scope = isAdmin ? 'company_admin' : context.scope;
  const cid = context.company_id;

  const load = useCallback(async () => {
    if (!user) return;
    setError(''); setData(null);
    // Every query is row-level restricted on the server; the results only include records this account may see.
    const [jobs, apps, placements, pubs, notes, events] = await Promise.all([
      supabase.from('jobs').select('id,title,status,updated_at').eq('company_id', cid).order('updated_at', { ascending: false }),
      supabase.from('applications').select('id,job_id,status,submitted_at').order('submitted_at', { ascending: false }).limit(500),
      supabase.from('placements').select('id,status,job_id,start_date,updated_at').eq('company_id', cid).order('updated_at', { ascending: false }),
      supabase.from('job_publication_requests').select('id,revision,created_at,job_id').eq('company_id', cid).eq('status', 'pending').order('created_at'),
      supabase.from('notifications').select('id,title,preview,link,read_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      isAdmin ? supabase.from('company_permission_events').select('id,action,created_at').eq('company_id', cid).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
    ]);
    const failed = [jobs, apps, placements, pubs, notes, events].find(r => r.error);
    if (failed) { setError('Some dashboard records could not be loaded. Please try again.'); return; }
    const jobIds = new Set((jobs.data ?? []).map(j => j.id));
    const companyApps = (apps.data ?? []).filter(a => jobIds.has(a.job_id));
    const appIds = companyApps.map(a => a.id);
    const hours = appIds.length ? await supabase.from('hour_entries').select('id,work_date,minutes,application_id').in('application_id', appIds).eq('status', 'pending').order('work_date') : { data: [], error: null };
    let memberRequests: number | null = null;
    if (isAdmin) {
      const m = await supabase.rpc('list_employee_membership_requests', { _company_id: cid });
      if (!m.error && Array.isArray(m.data)) memberRequests = (m.data as { status?: string }[]).filter(r => !r.status || r.status === 'pending').length;
    }
    if (hours.error) { setError('Hour logs could not be loaded.'); return; }
    setData({ jobs: jobs.data ?? [], apps: companyApps, placements: placements.data ?? [], hours: hours.data ?? [], pubs: pubs.data ?? [], memberRequests, notes: notes.data ?? [], events: (events.data ?? []) as Event[] });
  }, [cid, user, isAdmin]);

  useEffect(() => { void load(); }, [load]);

  if (error) return <div role="alert" className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-5"><AlertTriangle className="h-5 w-5 text-destructive" /><p className="flex-1 text-sm">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>;
  if (!data) return <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading dashboard">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;

  const title = (id: string) => data.jobs.find(j => j.id === id)?.title ?? 'Opportunity';
  const published = data.jobs.filter(j => j.status === 'active');
  const awaiting = data.apps.filter(a => AWAITING.includes(a.status));
  const active = data.placements.filter(p => p.status === 'active' || p.status === 'upcoming');
  const completed = data.placements.filter(p => p.status === 'completed');
  const showApps = isAdmin || scope === 'opportunity_manager' || data.apps.length > 0;
  const showPlacements = isAdmin || scope === 'supervisor' || data.placements.length > 0;

  const cards = [
    { label: 'Published opportunities', value: published.length, icon: Briefcase, href: '#listings' },
    { label: 'Pending listing approvals', value: data.pubs.length, icon: Send, href: isAdmin ? '#publication-approvals' : `/employer/drafts?company=${cid}` },
    showApps && { label: 'Applications awaiting review', value: awaiting.length, icon: Users, href: '#applicants' },
    showPlacements && { label: 'Active placements', value: active.length, icon: UserCheck, href: '#placements' },
    showPlacements && { label: 'Hours needing verification', value: data.hours.length, icon: Clock, href: '/hour-approvals' },
    showPlacements && { label: 'Completed experiences', value: completed.length, icon: CheckCircle2, href: '#placements' },
  ].filter(Boolean) as { label: string; value: number; icon: typeof Briefcase; href: string }[];

  const urgent = [
    isAdmin && data.memberRequests ? { text: `${data.memberRequests} employee approval request${data.memberRequests > 1 ? 's' : ''}`, href: `/employer/employees?company=${cid}#membership-requests` } : null,
    isAdmin && data.pubs.length ? { text: `${data.pubs.length} opportunity publication request${data.pubs.length > 1 ? 's' : ''}`, href: '#publication-approvals' } : null,
    data.hours.length ? { text: `${data.hours.length} hour log${data.hours.length > 1 ? 's' : ''} to verify`, href: '/hour-approvals' } : null,
    awaiting.length ? { text: `${awaiting.length} application${awaiting.length > 1 ? 's' : ''} awaiting review`, href: '#applicants' } : null,
  ].filter(Boolean) as { text: string; href: string }[];

  const go = (href: string, children: React.ReactNode, className = '') => href.startsWith('#') ? <a href={href} className={className}>{children}</a> : <Link to={href} className={className}>{children}</Link>;

  return <div className="mt-8 space-y-8">
    <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(c => go(c.href, <><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{c.label}</span><span className="rounded-lg bg-primary/10 p-2 text-primary"><c.icon className="h-4 w-4" /></span></div><p className="mt-3 font-display text-3xl font-bold">{c.value}</p></>, 'block rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'))}
    </section>

    <div className="grid gap-6 lg:grid-cols-3">
      <Panel title="Urgent tasks" icon={AlertTriangle}>{urgent.length ? <ul className="space-y-2">{urgent.map(u => <li key={u.text}>{go(u.href, <><span>{u.text}</span><ArrowRight className="h-4 w-4" /></>, 'flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2 text-sm hover:bg-accent')}</li>)}</ul> : <Empty>Nothing needs your attention right now.</Empty>}</Panel>
      <Panel title="Notifications" icon={Bell} action={<Link to="/dashboard/notifications" className="text-sm text-primary hover:underline">View all</Link>}>{data.notes.length ? <ul className="divide-y divide-border">{data.notes.map(n => <li key={n.id} className="py-2 text-sm">{go(n.link ?? '/dashboard/notifications', <><p className={n.read_at ? '' : 'font-semibold'}>{n.title}</p><p className="text-xs text-muted-foreground">{n.preview} · {fmt(n.created_at)}</p></>, 'block hover:text-primary')}</li>)}</ul> : <Empty>No notifications yet.</Empty>}</Panel>
      <Panel title="Quick actions" icon={Plus}><div className="grid gap-2">
        {isAdmin && <Button asChild><Link to={`/employer/drafts?company=${cid}`}><Plus className="mr-2 h-4 w-4" />Post a role</Link></Button>}
        {context.can_draft && <Button asChild variant="outline"><Link to={`/employer/drafts?company=${cid}`}><FileText className="mr-2 h-4 w-4" />My drafts</Link></Button>}
        {showPlacements && <Button asChild variant="outline"><Link to="/hour-approvals"><Clock className="mr-2 h-4 w-4" />Verify hours</Link></Button>}
        {isAdmin && <Button asChild variant="outline"><Link to={`/employer/employees?company=${cid}`}><Users className="mr-2 h-4 w-4" />Employee management</Link></Button>}
        <Button asChild variant="ghost"><Link to="/employer/employee-details">Work email details</Link></Button>
      </div></Panel>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Panel id="listings" title={isAdmin ? 'Company opportunities' : 'Assigned listings'} icon={Briefcase}>{data.jobs.length ? <ul className="divide-y divide-border">{data.jobs.slice(0, 8).map(j => <li key={j.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{j.title}</span><Badge variant={j.status === 'active' ? 'default' : 'outline'}>{j.status}</Badge></li>)}</ul> : <Empty>No listings available to your role.</Empty>}</Panel>
      {showApps && <Panel id="applicants" title="Applicants" icon={Users}>{data.apps.length ? <ul className="divide-y divide-border">{data.apps.slice(0, 8).map(a => <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0"><span className="block break-words">{title(a.job_id)}</span><span className="text-xs text-muted-foreground">Applied {fmt(a.submitted_at)}</span></span><Badge variant="outline">{a.status}</Badge></li>)}</ul> : <Empty>No applications on listings assigned to you.</Empty>}</Panel>}
      {showPlacements && <Panel id="placements" title={isAdmin ? 'Placements' : 'Assigned placements'} icon={UserCheck}>{data.placements.length ? <ul className="divide-y divide-border">{data.placements.slice(0, 8).map(p => <li key={p.id}><Link to={`/placements/${p.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"><span className="min-w-0 break-words">{title(p.job_id)}{p.start_date && <span className="block text-xs text-muted-foreground">Starts {fmt(p.start_date)}</span>}</span><Badge variant="outline">{p.status}</Badge></Link></li>)}</ul> : <Empty>No placements assigned to you.</Empty>}</Panel>}
      {showPlacements && <Panel title="Pending hour logs" icon={ClipboardCheck} action={<Link to="/hour-approvals" className="text-sm text-primary hover:underline">Review</Link>}>{data.hours.length ? <ul className="divide-y divide-border">{data.hours.slice(0, 8).map(h => <li key={h.id} className="flex justify-between py-2 text-sm"><span>{fmt(h.work_date)}</span><span className="text-muted-foreground">{(h.minutes / 60).toFixed(1)} h</span></li>)}</ul> : <Empty>No hours waiting for verification.</Empty>}</Panel>}
      {isAdmin && <Panel title="Recent permission activity" icon={RefreshCw}>{data.events.length ? <ul className="divide-y divide-border">{data.events.map(e => <li key={e.id} className="flex justify-between py-2 text-sm"><span>{e.action.replace(/_/g, ' ')}</span><span className="text-muted-foreground">{fmt(e.created_at)}</span></li>)}</ul> : <Empty>No recorded activity yet.</Empty>}</Panel>}
    </div>
  </div>;
}

function Panel({ id, title, icon: Icon, action, children }: { id?: string; title: string; icon: typeof Briefcase; action?: React.ReactNode; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{title}</h2>{action}</div>{children}</section>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-3 text-sm text-muted-foreground">{children}</p>; }
