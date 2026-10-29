import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Building2, FileText, ShieldCheck, Clock, Plus, Loader2, ArrowRight } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { companyDestination, workspacePermitted, type CompanyState } from '@/lib/companyAccess';
import { supabase } from '@/integrations/supabase/client';
import CompanyRegistrationStatus from '@/components/CompanyRegistrationStatus';
import EmployeeMembershipReview from '@/components/EmployeeMembershipReview';
import CompanyStaffAccess from '@/components/CompanyStaffAccess';

const messages: Record<CompanyState, [string, string]> = {
  company_admin: ['Company dashboard', 'Authorised company administrator'],
  employee: ['Employee workspace', 'Approved company membership'],
  draft_only: ['My company drafts', 'Draft-only access · Membership not approved'],
  email_pending: ['Email verification required', 'Confirm your email before company access can be checked.'],
  company_pending: ['Company verification pending', 'Company verification and administrator approval are still required. You cannot publish or access applicant records.'],
  membership_pending: ['Company membership pending', 'Your company membership has not been approved. No applicant or placement access is available.'],
  access_denied: ['Company access unavailable', 'Your request or membership has been rejected or revoked. No company workspace access is available.'],
};

export default function EmployerWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const { access, loading, error, refresh } = useCompanyAccess();
  const location = useLocation();
  const [params] = useSearchParams();
  const section = location.pathname.split('/').pop() ?? 'workspace';
  const companyId = params.get('company');
  const context = access?.contexts.find(c => c.company_id === companyId) ?? (!companyId && access?.contexts.length === 1 ? access.contexts[0] : undefined);
  if (!authLoading && !user) return <Navigate to="/employer/sign-in" replace />;
  if (!loading && !error && context && (section === 'workspace' || !workspacePermitted(context.state, section))) return <Navigate to={companyDestination(context)} replace />;
  const state = !access?.email_verified ? 'email_pending' : context?.state;
  const unrestricted = state === 'company_admin' || state === 'employee' || state === 'draft_only';
  return <EmployerShell><main className="container max-w-5xl px-5 py-10">
    {loading || authLoading ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Checking your company access…</p> : error ? <><p role="alert" className="text-destructive">{error}</p><Button className="mt-4" onClick={() => void refresh()}>Try again</Button></> : <>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-7"><div><span className="mb-3 flex items-center gap-2 text-sm text-primary"><Building2 className="h-5 w-5" />{context?.company_name ?? 'Company access'}</span><h1 className="font-display text-3xl font-bold">{section === 'drafts' && unrestricted ? 'My company drafts' : state ? messages[state][0] : 'Your company access'}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{state ? messages[state][1] : companyId ? 'This company does not exist or is not available to your account.' : access?.requests.length ? 'Your company access request is recorded. An approved company domain and membership authorisation are still needed.' : 'No company access has been requested yet.'}</p></div><Button variant="outline" onClick={() => void refresh()}>Refresh status</Button></div>
      {access && access.contexts.length > 1 && <div className="my-6 flex flex-wrap gap-3" aria-label="Company selection">{access.contexts.map(c => <Button key={c.company_id} asChild variant={c.company_id === context?.company_id ? 'default' : 'outline'}><Link to={companyDestination(c)}>{c.company_name}</Link></Button>)}</div>}
      <CompanyRegistrationStatus />
      <div className="py-5 flex flex-wrap gap-3 items-center">{context?.scope && <Badge>{context.scope.replace(/_/g, ' ')}</Badge>}<Badge variant="outline">Work email {access?.employee?.work_email_verified_at ? 'verified' : 'not verified'}</Badge><Badge variant="outline">Company membership {context?.membership_approved ? 'approved' : 'not approved'}</Badge><Badge variant="outline">Authorised to publish: {context?.authorised_to_publish ? 'Yes' : 'No'}</Badge><Button asChild variant="link"><Link to="/employer/employee-details">Work email and employee details</Link></Button></div>
      {context && unrestricted ? <>
        <nav className="my-6 flex flex-wrap gap-3" aria-label="Company workspace"><Button asChild variant="outline"><Link to={companyDestination(context)}><ShieldCheck className="mr-2 h-4 w-4" />{context.state === 'company_admin' ? 'Dashboard' : context.state === 'employee' ? 'Workspace' : 'My drafts'}</Link></Button>{context.state !== 'draft_only' && <Button asChild variant="outline"><Link to={`/employer/drafts?company=${context.company_id}`}><FileText className="mr-2 h-4 w-4" />My drafts</Link></Button>}{context.manage_placements && <Button asChild variant="outline"><Link to="/hour-approvals"><Clock className="mr-2 h-4 w-4" />Hour approvals</Link></Button>}{context.state === 'company_admin' && <Button asChild><Link to={`/post-role?company=${context.company_id}`}><Plus className="mr-2 h-4 w-4" />Post a role</Link></Button>}</nav>
        {context.state === 'draft_only' ? <DraftContributorHome companyId={context.company_id} canDraft={context.can_draft ?? false} workEmailVerified={!!access?.employee?.work_email_verified_at} /> : section === 'drafts' ? <CompanyDrafts companyId={context.company_id} canDraft={context.can_draft ?? false} /> : <CompanyDashboard context={context} />}
        {context.state === 'company_admin' && section !== 'drafts' && <div id="membership-requests" className="scroll-mt-24"><EmployeeMembershipReview companyId={context.company_id} /></div>}
        {context.state === 'company_admin' && section !== 'drafts' && <><div id="publication-approvals" className="scroll-mt-24"><PublicationApprovals companyId={context.company_id} /></div><div id="staff-access" className="scroll-mt-24"><CompanyStaffAccess companyId={context.company_id} /></div></>}
      </> : <div className="py-8 space-y-5"><Badge variant="outline">Restricted access</Badge>{!access?.email_verified && <p className="text-sm text-muted-foreground">Open the confirmation link in your email, then sign in again.</p>}{access?.requests.map(r => <p key={r.id} className="text-sm text-muted-foreground">{r.pathway === 'register' ? 'Company registration' : 'Membership request'}: {r.status}</p>)}<div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/employer/onboarding">Register or join a company<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="ghost"><Link to="/employer/forgot-password">Password recovery</Link></Button></div></div>}
    </>}
  </main></EmployerShell>;
}

function CompanyDrafts({ companyId, canDraft }: { companyId: string; canDraft: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; title: string; description: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  async function load() {
    if (!user) return;
    setLoading(true);
    const result = await supabase.from('jobs').select('id,title,description').eq('company_id', companyId).eq('created_by', user.id).eq('status', 'draft').order('created_at', { ascending: false });
    if (result.error) setError('We could not load your drafts.'); else setRows(result.data ?? []);
    setLoading(false);
  }
  useEffect(() => { setRows([]); setEditing(null); setTitle(''); setDescription(''); void load(); }, [companyId, user?.id]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy || !user) return; setBusy(true); setError('');
    const result = editing
      ? await supabase.from('jobs').update({ title: title.trim(), description: description.trim() }).eq('id', editing).eq('company_id', companyId).eq('created_by', user.id).eq('status', 'draft').select('id').single()
      : await supabase.from('jobs').insert({ company_id: companyId, title: title.trim(), description: description.trim(), status: 'draft', location_type: 'remote', skill_level: 'beginner' }).select('id').single();
    setBusy(false);
    if (result.error) { setError('Draft could not be saved. Your company drafting permission may have changed.'); return; }
    setEditing(null); setTitle(''); setDescription(''); setRequestVersion(v => v + 1); await load();
  }
  async function submit(id: string) {
    setBusy(true); setError('');
    const result = await supabase.rpc('request_job_publication', { _job_id: id });
    setBusy(false);
    if (result.error) setError(result.error.message); else { setRequestVersion(v => v + 1); await load(); }
  }
  return <section className="grid gap-10 border-t border-border pt-7 md:grid-cols-2"><div><h2 className="text-xl font-semibold">{editing ? 'Edit draft' : 'New draft'}</h2>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{canDraft ? <form className="mt-5 space-y-4" onSubmit={save}><div className="space-y-2"><Label htmlFor="draft-title">Role title</Label><Input id="draft-title" required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="draft-description">Description</Label><Textarea id="draft-description" required maxLength={10000} rows={6} value={description} onChange={e => setDescription(e.target.value)} /></div><Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save draft</Button>{editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setTitle(''); setDescription(''); }}>Cancel edit</Button>}</form> : <p className="py-5 text-muted-foreground">Draft creation is not granted to your account.</p>}</div><div><h2 className="text-xl font-semibold">Saved drafts</h2>{loading ? <p className="py-6 text-sm text-muted-foreground">Loading drafts…</p> : rows.length ? rows.map(r => <article key={r.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5"><div className="min-w-0"><p className="break-words font-medium">{r.title}</p><Badge variant="outline" className="mt-2">Draft</Badge></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(r.id); setTitle(r.title); setDescription(r.description); }}>Edit</Button><Button size="sm" disabled={busy} onClick={() => void submit(r.id)}>Request company approval</Button></div></article>) : <p className="py-6 text-sm text-muted-foreground">No drafts yet.</p>}<OwnPublicationRequests companyId={companyId} version={requestVersion} /></div></section>;
}

function OwnPublicationRequests({ companyId, version = 0 }: { companyId: string; version?: number }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<{ id: string; status: string; revision: number; note: string | null }[]>([]);
  useEffect(() => { setRequests([]); if (!user) return; void supabase.from('job_publication_requests').select('id,status,revision,note').eq('company_id', companyId).eq('requested_by', user.id).order('created_at', { ascending: false }).then(r => setRequests(r.data ?? [])); }, [companyId, user?.id, version]);
  return <div className="mt-5"><h3 className="font-semibold">My approval requests</h3>{requests.map(r => <div key={r.id} className="border-b border-border py-3 text-sm"><Badge variant="outline">{r.status}</Badge> <span>Revision {r.revision}</span>{r.note && <p className="mt-2 text-muted-foreground">{r.note}</p>}</div>)}</div>;
}

function PublicationApprovals({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<{ id: string; revision: number; job: { title: string; description: string } | null }[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await supabase.from('job_publication_requests').select('id,revision,job:jobs(title,description)').eq('company_id', companyId).eq('status', 'pending');
    if (r.error) setError(r.error.message); else setRows(r.data ?? []);
  }
  useEffect(() => { setRows([]); setNotes({}); void load(); }, [companyId]);
  async function review(id: string, approve: boolean) {
    setBusy(true); setError('');
    const r = await supabase.rpc('review_job_publication', { _request_id: id, _approve: approve, _note: notes[id] ?? '' });
    setBusy(false); if (r.error) setError(r.error.message); else await load();
  }
  return <section className="mt-10 border-t border-border pt-7"><h2 className="text-xl font-semibold">Publication approvals</h2>{error && <p role="alert" className="text-destructive">{error}</p>}{rows.length ? rows.map(r => <article key={r.id} className="space-y-4 border-b border-border py-5"><h3 className="font-semibold">{r.job?.title} · Revision {r.revision}</h3><p className="whitespace-pre-wrap break-words text-sm">{r.job?.description}</p><Label htmlFor={`approval-${r.id}`}>Review notes</Label><Textarea id={`approval-${r.id}`} maxLength={2000} value={notes[r.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} /><div className="flex gap-3"><Button disabled={busy || (notes[r.id]?.trim().length ?? 0) < 10} onClick={() => void review(r.id, true)}>Approve publication</Button><Button variant="outline" disabled={busy || (notes[r.id]?.trim().length ?? 0) < 10} onClick={() => void review(r.id, false)}>Reject</Button></div></article>) : <p className="py-5 text-muted-foreground">No pending publication requests.</p>}</section>;
}

function DraftContributorHome({ companyId, canDraft, workEmailVerified }: { companyId: string; canDraft: boolean; workEmailVerified: boolean }) {
  return <div className="space-y-8">
    <section aria-label="Verification status" className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Verification status</h2><p className="mt-2 text-sm text-muted-foreground">Work email {workEmailVerified ? 'verified' : 'not verified'} · Company membership not approved · Not authorised to publish</p><Button asChild variant="link" className="px-0"><Link to="/employer/employee-details">Manage work email</Link></Button></div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" />Request membership</h2><p className="mt-2 text-sm text-muted-foreground">A company administrator must approve membership before you can see applications, staff or placements.</p><Button asChild variant="outline" size="sm" className="mt-3"><Link to="/employer/employee-details">Request company membership<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
    </section>
    <CompanyDrafts companyId={companyId} canDraft={canDraft} />
  </div>;
}

function CompanyRecords({ companyId, manage }: { companyId: string; manage: boolean }) {
  const [jobs, setJobs] = useState<{ id: string; title: string; status: string }[]>([]);
  const [placements, setPlacements] = useState<{ id: string; status: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setJobs([]); setPlacements([]);
    void (async () => {
      const result = await supabase.from('jobs').select('id,title,status').eq('company_id', companyId).order('created_at', { ascending: false });
      const placementResult = manage ? await supabase.from('placements').select('id,status').eq('company_id', companyId) : null;
      if (!active) return;
      if (result.error || placementResult?.error) setError('Company records could not be loaded.');
      else { setJobs(result.data ?? []); setPlacements(placementResult?.data ?? []); }
      setLoading(false);
    })(); return () => { active = false; };
  }, [companyId, manage]);
  return <section className="grid gap-10 border-t border-border pt-7 md:grid-cols-2">{error && <p role="alert" className="text-destructive">{error}</p>}<div><h2 className="text-xl font-semibold">Company opportunities</h2>{loading ? <p className="py-5 text-muted-foreground">Loading…</p> : jobs.length ? jobs.map(j => <div key={j.id} className="flex items-start justify-between gap-3 border-b border-border py-5"><span className="break-words">{j.title}</span><Badge variant="outline">{j.status}</Badge></div>) : <p className="py-5 text-sm text-muted-foreground">No opportunities recorded.</p>}</div>{manage && <div><h2 className="text-xl font-semibold">Placements</h2>{placements.length ? placements.map(p => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border py-4"><Badge variant="outline">{p.status}</Badge><Button asChild variant="link"><Link to={`/placements/${p.id}`}>Open placement<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>) : !loading && <p className="py-5 text-sm text-muted-foreground">No placements recorded.</p>}</div>}</section>;
}