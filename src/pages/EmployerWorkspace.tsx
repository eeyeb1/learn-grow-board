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
      {context && unrestricted ? <>
        <nav className="my-6 flex flex-wrap gap-3" aria-label="Company workspace"><Button asChild variant="outline"><Link to={companyDestination(context)}><ShieldCheck className="mr-2 h-4 w-4" />{context.state === 'company_admin' ? 'Dashboard' : context.state === 'employee' ? 'Workspace' : 'My drafts'}</Link></Button>{context.state !== 'draft_only' && <Button asChild variant="outline"><Link to={`/employer/drafts?company=${context.company_id}`}><FileText className="mr-2 h-4 w-4" />My drafts</Link></Button>}{context.manage_placements && <Button asChild variant="outline"><Link to="/hour-approvals"><Clock className="mr-2 h-4 w-4" />Hour approvals</Link></Button>}{context.state === 'company_admin' && <Button asChild><Link to={`/post-role?company=${context.company_id}`}><Plus className="mr-2 h-4 w-4" />Post a role</Link></Button>}</nav>
        {section === 'drafts' || context.state === 'draft_only' ? <CompanyDrafts companyId={context.company_id} /> : <CompanyRecords companyId={context.company_id} manage={context.manage_placements} />}
      </> : <div className="py-8 space-y-5"><Badge variant="outline">Restricted access</Badge>{!access?.email_verified && <p className="text-sm text-muted-foreground">Open the confirmation link in your email, then sign in again.</p>}{access?.requests.map(r => <p key={r.id} className="text-sm text-muted-foreground">{r.pathway === 'register' ? 'Company registration' : 'Membership request'}: {r.status}</p>)}<div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/employer/onboarding">Register or join a company<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="ghost"><Link to="/employer/forgot-password">Password recovery</Link></Button></div></div>}
    </>}
  </main></EmployerShell>;
}

function CompanyDrafts({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; title: string; description: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
    setEditing(null); setTitle(''); setDescription(''); await load();
  }
  return <section className="grid gap-10 border-t border-border pt-7 md:grid-cols-2"><div><h2 className="text-xl font-semibold">{editing ? 'Edit draft' : 'New draft'}</h2><p className="mt-2 text-sm text-muted-foreground">Private to you and authorised company members. This does not publish a role.</p>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<form className="mt-5 space-y-4" onSubmit={save}><div className="space-y-2"><Label htmlFor="draft-title">Role title</Label><Input id="draft-title" required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="draft-description">Description</Label><Textarea id="draft-description" required maxLength={10000} rows={6} value={description} onChange={e => setDescription(e.target.value)} /></div><Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save draft</Button>{editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setTitle(''); setDescription(''); }}>Cancel edit</Button>}</form></div><div><h2 className="text-xl font-semibold">Saved drafts</h2>{loading ? <p className="py-6 text-sm text-muted-foreground">Loading drafts…</p> : rows.length ? rows.map(r => <article key={r.id} className="flex items-center justify-between gap-4 border-b border-border py-5"><div className="min-w-0"><p className="break-words font-medium">{r.title}</p><Badge variant="outline" className="mt-2">Draft</Badge></div><Button variant="outline" size="sm" onClick={() => { setEditing(r.id); setTitle(r.title); setDescription(r.description); }}>Edit</Button></article>) : <p className="py-6 text-sm text-muted-foreground">No drafts yet.</p>}</div></section>;
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