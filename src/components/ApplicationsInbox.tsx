import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Loader2, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { applicationLabel, employerTransitions, reasonRequired, APPLICATION_LABELS } from '@/lib/applicationStatus';

type Ev = { from: string | null; to: string; reason: string | null; actor_role: string; at: string };
type InboxApp = {
  id: string; job_id: string; job_title: string; job_status: string; openings: number | null;
  status: string; status_reason: string | null; submitted_at: string;
  applicant_name: string; statement: string | null; links: Record<string, string>;
  profile: { slug: string; headline: string | null; skills: string[] } | null;
  verified_skills: string[]; public_portfolio: { title: string; description: string | null }[];
  can_manage: boolean; events: Ev[];
};

const tone: Record<string, string> = {
  submitted: 'bg-muted text-muted-foreground', reviewed: 'bg-accent text-accent-foreground',
  accepted: 'bg-primary/10 text-primary', completed: 'bg-primary text-primary-foreground',
  rejected: 'bg-destructive/10 text-destructive', withdrawn: 'bg-muted text-muted-foreground',
};
const actionLabel: Record<string, string> = { reviewed: 'Mark under review', accepted: 'Accept', rejected: 'Decline' };

export default function ApplicationsInbox({ companyId }: { companyId: string }) {
  const [apps, setApps] = useState<InboxApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState('all');
  const [stage, setStage] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState<InboxApp | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc('list_company_applications', { _company_id: companyId });
    if (error) setError('Applications could not be loaded.');
    else setApps((data ?? []) as unknown as InboxApp[]);
    setLoading(false);
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);

  const jobs = useMemo(() => Array.from(new Map(apps.map((a) => [a.job_id, a.job_title])).entries()), [apps]);
  const filled = (jobId: string) => apps.filter((a) => a.job_id === jobId && (a.status === 'accepted' || a.status === 'completed')).length;
  const list = apps.filter((a) =>
    (job === 'all' || a.job_id === job) && (stage === 'all' || a.status === stage) &&
    (!from || a.submitted_at.slice(0, 10) >= from) && (!to || a.submitted_at.slice(0, 10) <= to));

  const apply = async () => {
    if (!open || !pending) return;
    if (reasonRequired(pending) && reason.trim().length < 10) { toast.error('Give a reason of at least 10 characters.'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('set_application_status', { _application_id: open.id, _status: pending, _reason: reason.trim() || null });
    setBusy(false);
    if (error) { toast.error(error.message); await load(); return; }
    toast.success(`Application ${applicationLabel(pending).toLowerCase()}. The applicant has been notified.`);
    setPending(null); setReason(''); setOpen(null); await load();
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-2xl font-bold">Applications inbox</h2><p className="text-sm text-muted-foreground">Only applications for opportunities you're authorised to manage. Applicants see the same status in their dashboard.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label htmlFor="f-job">Opportunity</Label><Select value={job} onValueChange={setJob}><SelectTrigger id="f-job"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All opportunities</SelectItem>{jobs.map(([id, t]) => <SelectItem key={id} value={id}>{t}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="f-stage">Stage</Label><Select value={stage} onValueChange={setStage}><SelectTrigger id="f-stage"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{Object.entries(APPLICATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="f-from">Submitted from</Label><Input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="f-to">Submitted to</Label><Input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : error ? <div className="rounded-xl border border-destructive/40 p-6 text-center"><p className="text-destructive">{error}</p><Button className="mt-3" size="sm" onClick={() => void load()}>Retry</Button></div>
        : list.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center"><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-medium">{apps.length ? 'No applications match these filters' : 'No applications yet'}</p><p className="text-sm text-muted-foreground">{apps.length ? 'Try clearing a filter.' : 'Applications to your published opportunities will appear here.'}</p></div>
        : <ul className="divide-y divide-border rounded-xl border border-border bg-card">{list.map((a) => (
          <li key={a.id}><button className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setOpen(a); setPending(null); setReason(''); }}>
            <div className="min-w-0"><p className="font-medium">{a.applicant_name}</p><p className="truncate text-sm text-muted-foreground">{a.job_title} · Submitted {new Date(a.submitted_at).toLocaleDateString()}</p></div>
            <Badge variant="soft" className={tone[a.status]}>{applicationLabel(a.status)}</Badge>
          </button></li>))}</ul>}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {open && <>
            <DialogHeader><DialogTitle>{open.applicant_name}</DialogTitle><DialogDescription>{open.job_title} · <span className="font-medium">{applicationLabel(open.status)}</span>{open.openings ? ` · ${filled(open.job_id)} of ${open.openings} openings filled` : ''}</DialogDescription></DialogHeader>
            <div className="space-y-4 text-sm">
              <div><h3 className="font-semibold">Application statement</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{open.statement || 'No statement was included with this application.'}</p></div>
              {Object.keys(open.links).length > 0 && <div><h3 className="font-semibold">Links the applicant shared</h3><ul className="mt-1 space-y-1">{Object.entries(open.links).map(([k, v]) => <li key={k}><a className="inline-flex items-center gap-1 text-primary hover:underline" href={/^https?:\/\//i.test(v) ? v : `https://${v}`} target="_blank" rel="noopener noreferrer nofollow">{k}<ExternalLink className="h-3 w-3" /></a></li>)}</ul></div>}
              <div><h3 className="font-semibold">Public profile</h3>{open.profile ? <div className="mt-1 space-y-1"><p className="text-muted-foreground">{open.profile.headline || 'No headline'}</p>{open.profile.skills.length > 0 && <p className="text-muted-foreground">Self-reported skills: {open.profile.skills.join(', ')}</p>}<Link className="text-primary hover:underline" to={`/p/${open.profile.slug}`} target="_blank">View public profile</Link></div> : <p className="mt-1 text-muted-foreground">This applicant hasn't published a public profile.</p>}</div>
              {open.verified_skills.length > 0 && <div><h3 className="flex items-center gap-1 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Employer-verified skills</h3><div className="mt-1 flex flex-wrap gap-1">{open.verified_skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div></div>}
              {open.public_portfolio.length > 0 && <div><h3 className="font-semibold">Public portfolio</h3><ul className="mt-1 list-disc pl-5 text-muted-foreground">{open.public_portfolio.map((p, i) => <li key={i}>{p.title}</li>)}</ul></div>}
              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Contact details, diary entries and private portfolio items are not shared. Use status updates to communicate decisions.</p>
              <div><h3 className="font-semibold">History</h3><ol className="mt-1 space-y-1 text-muted-foreground"><li>Submitted · {new Date(open.submitted_at).toLocaleString()}</li>{open.events.map((e, i) => <li key={i}>{applicationLabel(e.to)} by {e.actor_role === 'seeker' ? 'applicant' : 'company'} · {new Date(e.at).toLocaleString()}{e.reason ? ` — “${e.reason}”` : ''}</li>)}</ol></div>
              {open.can_manage && employerTransitions(open.status).length > 0 && <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold">Update stage</h3>
                <div className="flex flex-wrap gap-2">{employerTransitions(open.status).map((s) => <Button key={s} size="sm" variant={pending === s ? 'default' : s === 'rejected' ? 'outline' : 'secondary'} onClick={() => setPending(s)}>{open.status === 'accepted' && s === 'rejected' ? 'Rescind acceptance' : actionLabel[s]}</Button>)}</div>
                {pending && <><Label htmlFor="reason">Reason {reasonRequired(pending) ? '(required, shared with the applicant)' : '(optional, shared with the applicant)'}</Label><Textarea id="reason" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} /></>}
              </div>}
              {open.status === 'withdrawn' && <p className="text-muted-foreground">The applicant withdrew this application, so it can't be changed.</p>}
            </div>
            {pending && <DialogFooter><Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button><Button disabled={busy} onClick={() => void apply()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm: {applicationLabel(pending)}</Button></DialogFooter>}
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
