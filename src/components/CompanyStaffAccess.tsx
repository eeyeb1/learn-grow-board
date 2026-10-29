import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Staff = { user_id: string; role: string; status: string; scope: string; draft: boolean };
type Resource = { id: string; title: string; kind: 'job' | 'placement' };
type Assignment = { id: string; user_id: string; job_id: string | null; placement_id: string | null; permissions: string[] };
type Event = { id: string; action: string; created_at: string; note: string | null };

export default function CompanyStaffAccess({ companyId }: { companyId: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState('');
  const [scope, setScope] = useState('approved_employee');
  const [draft, setDraft] = useState(false);
  const [resource, setResource] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const [members, scopes, jobs, placements, assigned, history] = await Promise.all([
      supabase.from('company_memberships').select('user_id,role,status').eq('company_id', companyId),
      supabase.from('company_staff_scopes').select('user_id,scope,permissions').eq('company_id', companyId),
      supabase.from('jobs').select('id,title').eq('company_id', companyId),
      supabase.from('placements').select('id,supervisor_name,status').eq('company_id', companyId),
      supabase.from('company_resource_assignments').select('id,user_id,job_id,placement_id,permissions').eq('company_id', companyId),
      supabase.from('company_permission_events').select('id,action,created_at,note').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30),
    ]);
    if ([members, scopes, jobs, placements, assigned, history].some(r => r.error)) { setError('Staff access could not be loaded. Check your company authority.'); return; }
    setStaff((members.data ?? []).map(m => { const s = scopes.data?.find(s => s.user_id === m.user_id); return { ...m, scope: s?.scope ?? 'approved_employee', draft: s?.permissions.includes('draft') ?? false }; }));
    setResources([...(jobs.data ?? []).map(j => ({ ...j, kind: 'job' as const })), ...(placements.data ?? []).map(p => ({ id: p.id, title: `${p.supervisor_name ?? 'Placement'} · ${p.status} · ${p.id.slice(0, 8)}`, kind: 'placement' as const }))]);
    setAssignments(assigned.data ?? []); setEvents(history.data ?? []);
  }
  useEffect(() => { setStaff([]); setResources([]); setAssignments([]); setEvents([]); setSelected(''); setResource(''); setNote(''); void load(); }, [companyId]);
  const chosen = resources.find(r => r.id === resource);
  const person = staff.find(s => s.user_id === selected);
  async function save(revoke: boolean) {
    if (!person || busy) return;
    setBusy(true); setError('');
    const result = await supabase.rpc('set_company_staff_access', { _company_id: companyId, _user_id: selected, _scope: scope, _draft: draft, _revoke: revoke, _note: note });
    setBusy(false);
    if (result.error) setError(result.error.message); else { setNote(''); await load(); }
  }
  async function assign(values: string[], item?: Assignment) {
    if ((!chosen && !item) || busy) return;
    setBusy(true); setError('');
    const result = await supabase.rpc('set_company_resource_assignment', { _company_id: companyId, _user_id: item?.user_id ?? selected, _job_id: item?.job_id ?? (chosen?.kind === 'job' ? chosen.id : null), _placement_id: item?.placement_id ?? (chosen?.kind === 'placement' ? chosen.id : null), _permissions: values, _note: note });
    setBusy(false);
    if (result.error) setError(result.error.message); else { setNote(''); await load(); }
  }
  return <section className="mt-10 border-t border-border pt-7 space-y-6">
    <h2 className="text-xl font-semibold">Staff & permissions</h2>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="divide-y divide-border">{staff.map(s => <div key={s.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><span className="font-mono text-xs">{s.user_id.slice(0, 8)}</span> <Badge variant="outline">{s.role === 'company_admin' ? 'Company Admin' : s.scope.replace(/_/g, ' ')}</Badge> <Badge variant="outline">{s.status}</Badge></div>{s.role !== 'company_admin' && s.status === 'approved' && <Button variant="outline" size="sm" onClick={() => { setSelected(s.user_id); setScope(s.scope); setDraft(s.draft); setPermissions([]); setResource(''); }}>Manage permissions</Button>}</div>)}</div>
    {person && person.status === 'approved' && <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4"><h3 className="font-semibold">Staff scope · {selected.slice(0, 8)}</h3><div className="space-y-2"><Label htmlFor="staff-scope">Role</Label><Select value={scope} onValueChange={setScope}><SelectTrigger id="staff-scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="opportunity_manager">Opportunity Manager</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="approved_employee">Approved Employee</SelectItem></SelectContent></Select></div><Label className="flex items-center gap-2"><Checkbox checked={draft} onCheckedChange={v => setDraft(v === true)} />Create personal company drafts</Label><div className="space-y-2"><Label htmlFor="permission-note">Reason for permission change</Label><Textarea id="permission-note" value={note} onChange={e => setNote(e.target.value)} minLength={10} maxLength={2000} /></div><div className="flex flex-wrap gap-3"><Button disabled={busy || note.trim().length < 10} onClick={() => void save(false)}>Save staff scope</Button><Button variant="destructive" disabled={busy || note.trim().length < 10} onClick={() => { if (window.confirm('Revoke this employee’s company access?')) void save(true); }}>Revoke membership</Button></div></div>
      <div className="space-y-4"><h3 className="font-semibold">Resource assignments</h3><Select value={resource} onValueChange={v => { setResource(v); setPermissions([]); }}><SelectTrigger aria-label="Opportunity or placement"><SelectValue placeholder="Choose a record" /></SelectTrigger><SelectContent>{resources.filter(r => person.scope === 'approved_employee' || (person.scope === 'supervisor' ? r.kind === 'placement' : r.kind === 'job')).map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent></Select>{chosen && <div className="space-y-3">{(chosen.kind === 'job' ? ['read', 'edit', 'applications'] : ['manage']).map(p => <Label key={p} className="flex items-center gap-2"><Checkbox checked={permissions.includes(p)} onCheckedChange={v => setPermissions(old => v === true ? [...old, p] : old.filter(x => x !== p))} />{p === 'manage' ? 'Supervise placement, hours and skills' : p === 'applications' ? 'Manage applications' : p === 'edit' ? 'Edit opportunity (not publication)' : 'Read opportunity'}</Label>)}<Button disabled={busy || !permissions.length || note.trim().length < 10} onClick={() => void assign(permissions)}>Assign permissions</Button></div>}{assignments.filter(a => a.user_id === selected).map(a => <div key={a.id} className="flex items-start justify-between gap-3 border-b border-border py-3"><div className="min-w-0"><p className="break-words text-sm">{resources.find(r => r.id === (a.job_id ?? a.placement_id))?.title ?? 'Assigned record'}</p><p className="text-xs text-muted-foreground">{a.permissions.join(', ')}</p></div><Button variant="outline" size="sm" disabled={busy || note.trim().length < 10} onClick={() => void assign([], a)}>Remove</Button></div>)}</div>
    </div>}
    <div><h3 className="font-semibold">Permission history</h3>{events.length ? events.map(e => <div key={e.id} className="border-b border-border py-3 text-sm"><p>{e.action.replace(/_/g, ' ')} <span className="text-muted-foreground">· {new Date(e.created_at).toLocaleString()}</span></p>{e.note && <p className="mt-1 text-muted-foreground">{e.note}</p>}</div>) : <p className="py-4 text-muted-foreground">No permission changes recorded.</p>}</div>
  </section>;
}