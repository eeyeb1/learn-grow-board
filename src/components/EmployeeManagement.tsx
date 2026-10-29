import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, ShieldAlert, Users } from 'lucide-react';
import EmployeeMembershipReview from '@/components/EmployeeMembershipReview';

type Member = { user_id: string; role: string; status: string; approved_at: string | null; approved_work_email: string | null; name: string | null; job_title: string | null; scope: string | null; draft: boolean; access_active: boolean; is_self: boolean };
type Invite = { id: string; invited_email: string; scope: string; draft: boolean; status: string; expires_at: string; created_at: string; responded_at: string | null };
type Resource = { id: string; title: string; kind: 'job' | 'placement' };
type Assignment = { id: string; user_id: string; job_id: string | null; placement_id: string | null; permissions: string[] };
type Event = { id: string; action: string; created_at: string; note: string | null; actor_id: string | null; subject_id: string | null };

const scopeLabel: Record<string, string> = { company_admin: 'Company Admin', opportunity_manager: 'Opportunity Manager', supervisor: 'Supervisor', approved_employee: 'Approved Employee' };
const label = (s: string | null) => (s && scopeLabel[s]) ?? 'Approved Employee';
const fail = (m: string) => m.replace(/^.*?:\s*/, '') || 'Action could not be completed.';

function ScopePicker({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="opportunity_manager">Opportunity Manager</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="approved_employee">Approved Employee</SelectItem></SelectContent></Select>;
}

export default function EmployeeManagement({ companyId }: { companyId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [admins, setAdmins] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  async function load() {
    setLoading(true); setError('');
    const [staff, jobs, placements, assigned, history] = await Promise.all([
      supabase.rpc('list_company_staff', { _company_id: companyId }),
      supabase.from('jobs').select('id,title').eq('company_id', companyId),
      supabase.from('placements').select('id,supervisor_name,status').eq('company_id', companyId),
      supabase.from('company_resource_assignments').select('id,user_id,job_id,placement_id,permissions').eq('company_id', companyId),
      supabase.from('company_permission_events').select('id,action,created_at,note,actor_id,subject_id').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
    ]);
    setLoading(false);
    if (staff.error || [jobs, placements, assigned, history].some(r => r.error)) { setError('Employee records could not be loaded. Only authorised company administrators can manage staff.'); return; }
    const d = staff.data as unknown as { members: Member[]; invitations: Invite[]; active_admins: number };
    setMembers(d.members); setInvites(d.invitations); setAdmins(d.active_admins);
    setResources([...(jobs.data ?? []).map(j => ({ ...j, kind: 'job' as const })), ...(placements.data ?? []).map(p => ({ id: p.id, title: `Placement · ${p.supervisor_name ?? 'no supervisor named'} · ${p.status}`, kind: 'placement' as const }))]);
    setAssignments(assigned.data ?? []); setEvents(history.data ?? []);
  }
  useEffect(() => { setMembers([]); setInvites([]); setSelected(''); void load(); }, [companyId]);

  const nameOf = (id: string | null) => { const m = members.find(x => x.user_id === id); return m ? (m.name ?? m.approved_work_email ?? 'Member') : id ? 'Former or external account' : 'System'; };
  const active = members.filter(m => m.status === 'approved');
  const revoked = members.filter(m => m.status === 'revoked');
  const pendingInvites = invites.filter(i => i.status === 'pending');
  const person = members.find(m => m.user_id === selected);

  return <section className="mt-8 space-y-6">
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3">
      {[['Active members', active.length], ['Company admins', admins], ['Pending invitations', pendingInvites.length]].map(([t, v]) => <div key={t} className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">{t}</p><p className="mt-2 font-display text-3xl font-bold">{loading ? '–' : v}</p></div>)}
    </div>
    <Tabs defaultValue={location.hash === '#membership-requests' ? 'requests' : 'members'}>
      <TabsList className="flex h-auto flex-wrap"><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="requests">Membership requests</TabsTrigger><TabsTrigger value="invites">Invitations</TabsTrigger><TabsTrigger value="history">Permission history</TabsTrigger></TabsList>
      <TabsContent value="members" className="space-y-6">
        {loading ? <p role="status" className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading members…</p> : !active.length ? <p className="py-6 text-muted-foreground">No active members.</p> :
          <div className="divide-y divide-border rounded-xl border border-border bg-card">{active.map(m => <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-medium break-words">{m.name ?? 'Unnamed member'}{m.is_self && <span className="text-muted-foreground"> (you)</span>}</p><p className="text-sm text-muted-foreground break-all">{[m.job_title, m.approved_work_email].filter(Boolean).join(' · ')}</p><div className="mt-2 flex flex-wrap gap-2"><Badge>{m.role === 'company_admin' ? 'Company Admin' : label(m.scope)}</Badge>{m.draft && <Badge variant="outline">Can draft</Badge>}<Badge variant="outline">{m.access_active ? 'Access active' : 'Access paused · work email changed'}</Badge>{m.approved_at && <Badge variant="outline">Since {new Date(m.approved_at).toLocaleDateString()}</Badge>}</div></div>{!m.is_self && <Button variant={selected === m.user_id ? 'default' : 'outline'} size="sm" onClick={() => setSelected(selected === m.user_id ? '' : m.user_id)}>Manage</Button>}</div>)}</div>}
        {person && <MemberEditor key={person.user_id} companyId={companyId} member={person} resources={resources} assignments={assignments.filter(a => a.user_id === person.user_id)} reload={load} />}
        {revoked.length > 0 && <div><h3 className="mb-2 font-semibold">Revoked access</h3><p className="mb-3 text-sm text-muted-foreground">These people can no longer reach private company records. Drafts they wrote and decisions they made stay in your history.</p>{revoked.map(m => <p key={m.user_id} className="border-b border-border py-2 text-sm">{m.name ?? 'Former member'} <span className="text-muted-foreground">· {m.approved_work_email}</span></p>)}</div>}
      </TabsContent>
      <TabsContent value="requests" id="membership-requests"><p className="text-sm text-muted-foreground">Requests come from people who verified a work email at your approved domain. Requesting never grants access — only your approval does.</p><EmployeeMembershipReview companyId={companyId} /></TabsContent>
      <TabsContent value="invites"><Invitations companyId={companyId} invites={invites} reload={load} /></TabsContent>
      <TabsContent value="history">{events.length ? <div className="divide-y divide-border">{events.map(e => <div key={e.id} className="py-3 text-sm"><p className="font-medium">{e.action.replace(/^company_/, '').replace(/[_:]/g, ' ')}</p><p className="text-muted-foreground">{new Date(e.created_at).toLocaleString()} · by {nameOf(e.actor_id)}{e.subject_id ? ` · for ${nameOf(e.subject_id)}` : ''}</p>{e.note && <p className="mt-1">{e.note}</p>}</div>)}</div> : <p className="py-6 text-muted-foreground">No permission changes recorded.</p>}</TabsContent>
    </Tabs>
  </section>;
}

function Invitations({ companyId, invites, reload }: { companyId: string; invites: Invite[]; reload: () => Promise<void> }) {
  const [email, setEmail] = useState(''); const [scope, setScope] = useState('approved_employee'); const [draft, setDraft] = useState(false); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState('');
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setDone('');
    const r = await supabase.rpc('invite_company_staff', { _company_id: companyId, _email: email.trim(), _scope: scope, _draft: draft, _note: note.trim() });
    setBusy(false);
    if (r.error) setError(fail(r.error.message)); else { setDone(`Invitation created for ${email.trim().toLowerCase()}.`); setEmail(''); setNote(''); await reload(); }
  }
  async function cancel(id: string) { setBusy(true); const r = await supabase.rpc('cancel_company_invitation', { _id: id }); setBusy(false); if (r.error) setError(fail(r.error.message)); else await reload(); }
  return <div className="grid gap-8 md:grid-cols-2">
    <form onSubmit={send} className="space-y-4"><h3 className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-primary" />Invite staff</h3>
      <div className="space-y-2"><Label htmlFor="inv-email">Work email</Label><Input id="inv-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@yourcompany.com" /><p className="text-xs text-muted-foreground">Must be at one of your company's approved email domains.</p></div>
      <div className="space-y-2"><Label htmlFor="inv-scope">Role</Label><ScopePicker id="inv-scope" value={scope} onChange={setScope} /></div>
      <Label className="flex items-center gap-2"><Checkbox checked={draft} onCheckedChange={v => setDraft(v === true)} />Allow personal company drafts</Label>
      <div className="space-y-2"><Label htmlFor="inv-note">Reason (recorded in history)</Label><Textarea id="inv-note" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{done && <p role="status" className="text-sm text-primary">{done}</p>}
      <Button type="submit" disabled={busy || note.trim().length < 10}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create invitation</Button>
      <p className="text-xs text-muted-foreground">Invitations expire after 7 days and can be used once. Only the account that has verified this exact work email can accept, so a forwarded invitation is useless. The person is told in the app; emailed invitations start once email sending is set up.</p>
    </form>
    <div><h3 className="mb-3 font-semibold">Sent invitations</h3>{invites.length ? invites.map(i => <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"><div className="min-w-0"><p className="break-all text-sm font-medium">{i.invited_email}</p><p className="text-xs text-muted-foreground">{label(i.scope)} · {i.status === 'pending' ? `expires ${new Date(i.expires_at).toLocaleString()}` : `${i.status}${i.responded_at ? ` ${new Date(i.responded_at).toLocaleDateString()}` : ''}`}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{i.status}</Badge>{i.status === 'pending' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void cancel(i.id)}>Cancel</Button>}</div></div>) : <p className="text-sm text-muted-foreground">No invitations sent.</p>}</div>
  </div>;
}

function MemberEditor({ companyId, member, resources, assignments, reload }: { companyId: string; member: Member; resources: Resource[]; assignments: Assignment[]; reload: () => Promise<void> }) {
  const isAdmin = member.role === 'company_admin';
  const [scope, setScope] = useState(member.scope ?? 'approved_employee'); const [draft, setDraft] = useState(member.draft);
  const [note, setNote] = useState(''); const [resource, setResource] = useState(''); const [perms, setPerms] = useState<string[]>([]); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const ok = note.trim().length >= 10;
  async function run(p: PromiseLike<{ error: { message: string } | null }>) { setBusy(true); setError(''); const r = await p; setBusy(false); if (r.error) setError(fail(r.error.message)); else { setNote(''); setConfirm(''); setPerms([]); await reload(); } }
  const chosen = resources.find(r => r.id === resource);
  const allowed = resources.filter(r => scope === 'approved_employee' || (scope === 'supervisor' ? r.kind === 'placement' : r.kind === 'job'));
  return <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm">
    <h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" />{member.name ?? 'Member'}</h3>
    <div className="space-y-2"><Label htmlFor="m-note">Reason for this change (recorded in history)</Label><Textarea id="m-note" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {isAdmin ? <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy || note.trim().length < 20} onClick={() => void run(supabase.rpc('set_company_admin_role', { _company_id: companyId, _user_id: member.user_id, _promote: false, _confirm_email: '', _note: note.trim() }))}>Remove admin role (keep as employee)</Button><Button variant="destructive" disabled={busy || !ok} onClick={() => { if (window.confirm('Revoke this administrator’s company access?')) void run(supabase.rpc('revoke_company_admin', { _company_id: companyId, _user_id: member.user_id, _note: note.trim() })); }}>Revoke access</Button></div> : <>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4"><h4 className="font-medium">Role</h4><ScopePicker id="m-scope" value={scope} onChange={setScope} /><Label className="flex items-center gap-2"><Checkbox checked={draft} onCheckedChange={v => setDraft(v === true)} />Allow personal company drafts</Label><p className="text-xs text-muted-foreground">Changing role clears existing listing and placement assignments.</p><div className="flex flex-wrap gap-3"><Button disabled={busy || !ok} onClick={() => void run(supabase.rpc('set_company_staff_access', { _company_id: companyId, _user_id: member.user_id, _scope: scope, _draft: draft, _revoke: false, _note: note.trim() }))}>Save role</Button><Button variant="destructive" disabled={busy || !ok} onClick={() => { if (window.confirm('Revoke this person’s company access? They lose access immediately.')) void run(supabase.rpc('set_company_staff_access', { _company_id: companyId, _user_id: member.user_id, _scope: scope, _draft: false, _revoke: true, _note: note.trim() })); }}>Revoke access</Button></div></div>
        <div className="space-y-3"><h4 className="font-medium">Listing and placement assignments</h4><Select value={resource} onValueChange={v => { setResource(v); setPerms([]); }}><SelectTrigger aria-label="Opportunity or placement"><SelectValue placeholder={allowed.length ? 'Choose a record' : 'No records for this role'} /></SelectTrigger><SelectContent>{allowed.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent></Select>
          {chosen && <>{(chosen.kind === 'job' ? ['read', 'edit', 'applications'] : ['manage']).map(p => <Label key={p} className="flex items-center gap-2"><Checkbox checked={perms.includes(p)} onCheckedChange={v => setPerms(o => v === true ? [...o, p] : o.filter(x => x !== p))} />{p === 'manage' ? 'Supervise placement, hours and skills' : p === 'applications' ? 'Manage applications' : p === 'edit' ? 'Edit opportunity (not publish)' : 'Read opportunity'}</Label>)}<Button disabled={busy || !perms.length || !ok} onClick={() => void run(supabase.rpc('set_company_resource_assignment', { _company_id: companyId, _user_id: member.user_id, _job_id: chosen.kind === 'job' ? chosen.id : null, _placement_id: chosen.kind === 'placement' ? chosen.id : null, _permissions: perms, _note: note.trim() }))}>Assign</Button></>}
          {assignments.map(a => <div key={a.id} className="flex items-start justify-between gap-3 border-b border-border py-2"><div className="min-w-0"><p className="break-words text-sm">{resources.find(r => r.id === (a.job_id ?? a.placement_id))?.title ?? 'Assigned record'}</p><p className="text-xs text-muted-foreground">{a.permissions.join(', ')}</p></div><Button variant="outline" size="sm" disabled={busy || !ok} onClick={() => void run(supabase.rpc('set_company_resource_assignment', { _company_id: companyId, _user_id: member.user_id, _job_id: a.job_id, _placement_id: a.placement_id, _permissions: [], _note: note.trim() }))}>Remove</Button></div>)}
        </div>
      </div>
      <div className="space-y-3 border-t border-border pt-5"><h4 className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4 text-destructive" />Promote to company admin</h4><p className="text-sm text-muted-foreground">Admins can approve staff and publish listings. Checks: active membership for at least 24 hours, a currently verified work email at your approved domain, and a written record (20+ characters) of how you confirmed their authority.</p><div className="space-y-2"><Label htmlFor="m-confirm">Type their work email to confirm</Label><Input id="m-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={member.approved_work_email ?? ''} /></div><Button variant="outline" disabled={busy || note.trim().length < 20 || confirm.trim().toLowerCase() !== (member.approved_work_email ?? '').toLowerCase()} onClick={() => { if (window.confirm('Make this person a company administrator?')) void run(supabase.rpc('set_company_admin_role', { _company_id: companyId, _user_id: member.user_id, _promote: true, _confirm_email: confirm.trim(), _note: note.trim() })); }}>Promote to company admin</Button></div>
    </>}
  </div>;
}

export function MyCompanyInvitations({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<{ id: string; company_name: string; scope: string; expires_at: string }[]>([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function load() { const r = await supabase.rpc('list_my_company_invitations'); if (!r.error) setRows((r.data ?? []) as unknown as typeof rows); }
  useEffect(() => { void load(); }, []);
  async function respond(id: string, accept: boolean) { setBusy(true); setError(''); const r = await supabase.rpc('respond_company_invitation', { _id: id, _accept: accept }); setBusy(false); if (r.error) setError(fail(r.error.message)); else { await load(); onChange?.(); } }
  if (!rows.length && !error) return null;
  return <section aria-label="Company invitations" className="my-6 space-y-3 rounded-xl border border-primary/40 bg-card p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-primary" />Company invitations</h2>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{rows.map(i => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm"><strong>{i.company_name}</strong> invited you as {label(i.scope)} · expires {new Date(i.expires_at).toLocaleString()}</p><div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => void respond(i.id, true)}>Accept</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void respond(i.id, false)}>Decline</Button></div></div>)}</section>;
}

export function AdminRecovery() {
  type C = { id: string; company_name: string; members: { user_id: string; name: string | null; work_email: string | null; work_email_verified: boolean }[] };
  const [rows, setRows] = useState<C[] | null>(null); const [error, setError] = useState('');
  async function load() { const r = await supabase.rpc('list_companies_without_admin'); if (r.error) setError(fail(r.error.message)); else setRows(r.data as unknown as C[]); }
  useEffect(() => { void load(); }, []);
  return <section className="space-y-4 border-t border-border py-7"><h2 className="text-xl font-semibold">Companies without an administrator</h2><p className="text-sm text-muted-foreground">Appoint a replacement only after confirming the company is genuine and the person is authorised. You cannot appoint yourself, and every recovery is recorded.</p>{error && <p role="alert" className="text-destructive">{error}</p>}{rows === null && !error ? <p role="status" className="text-muted-foreground">Loading…</p> : rows?.length ? rows.map(c => <RecoveryRow key={c.id} c={c} reload={load} />) : !error && <p className="text-sm text-muted-foreground">Every verified company has an active administrator.</p>}</section>;
}
function RecoveryRow({ c, reload }: { c: { id: string; company_name: string; members: { user_id: string; name: string | null; work_email: string | null; work_email_verified: boolean }[] }; reload: () => Promise<void> }) {
  const [user, setUser] = useState(''); const [legit, setLegit] = useState(''); const [auth, setAuth] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const eligible = c.members.filter(m => m.work_email_verified);
  async function go() { setBusy(true); setError(''); const r = await supabase.rpc('recover_company_admin', { _company_id: c.id, _user_id: user, _legitimacy: legit.trim(), _authority: auth.trim() }); setBusy(false); if (r.error) setError(fail(r.error.message)); else await reload(); }
  return <article className="space-y-3 rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">{c.company_name}</h3>{eligible.length ? <><Select value={user} onValueChange={setUser}><SelectTrigger aria-label="Appointee"><SelectValue placeholder="Choose a verified member" /></SelectTrigger><SelectContent>{eligible.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.name ?? 'Member'} · {m.work_email}</SelectItem>)}</SelectContent></Select><div className="space-y-2"><Label htmlFor={`l-${c.id}`}>Company legitimacy evidence</Label><Textarea id={`l-${c.id}`} value={legit} onChange={e => setLegit(e.target.value)} maxLength={4000} /></div><div className="space-y-2"><Label htmlFor={`a-${c.id}`}>Appointee authority evidence</Label><Textarea id={`a-${c.id}`} value={auth} onChange={e => setAuth(e.target.value)} maxLength={4000} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy || !user || legit.trim().length < 20 || auth.trim().length < 20} onClick={() => void go()}>Appoint company administrator</Button></> : <p className="text-sm text-muted-foreground">No member currently has a verified work email at this company's domain. Ask the company to have a staff member verify their work email and request membership first.</p>}</article>;
}
