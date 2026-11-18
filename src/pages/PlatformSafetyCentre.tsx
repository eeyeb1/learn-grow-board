import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SAFETY_REASONS, SAFETY_SUBJECT_LABELS, type SafetySubject } from '@/lib/safety';

type Event = { id: string; actor_id: string | null; action: string; note: string | null; from_status: string | null; to_status: string | null; created_at: string };
type Report = { id: string; subject_type: SafetySubject; subject_id: string | null; context_id: string | null; company_id: string | null; job_id: string | null; application_id: string | null; placement_id: string | null; reporter_id: string; reason: string; details: string; urgent: boolean; priority: string; status: string; assigned_to: string | null; resolution_note: string | null; created_at: string; updated_at: string; target_label: string; company_name: string | null; events: Event[] };

export default function PlatformSafetyCentre() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Report[] | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [status, setStatus] = useState('active');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setError('');
    const [admin, moderator] = await Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
    ]);
    const yes = admin.data === true || moderator.data === true;
    setAllowed(yes);
    if (!yes) { setRows([]); return; }
    const result = await supabase.rpc('list_safety_reports');
    if (result.error) { setError('The private investigation queue could not be loaded.'); setRows([]); }
    else setRows((result.data ?? []) as unknown as Report[]);
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => (rows ?? []).filter((r) =>
    (status === 'all' || (status === 'active' ? !['resolved', 'dismissed'].includes(r.status) : r.status === status)) &&
    (type === 'all' || r.subject_type === type) &&
    (!query.trim() || `${r.target_label} ${r.company_name ?? ''} ${r.details} ${r.id}`.toLowerCase().includes(query.trim().toLowerCase()))), [rows, status, type, query]);

  const act = async (action: string) => {
    if (!selected || note.trim().length < 10) { setError('Record an investigation note of at least 10 characters.'); return; }
    setBusy(true); setError('');
    const result = await supabase.rpc('review_safety_report', { _report_id: selected.id, _action: action, _note: note.trim() });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setSelected(null); setNote(''); await load();
  };

  if (!authLoading && !user) return <Navigate to="/employer/sign-in" replace />;
  return <EmployerShell><main className="container max-w-6xl px-5 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div><p className="flex items-center gap-2 text-sm text-primary"><ShieldAlert className="h-5 w-5" />Private safety administration</p><h1 className="mt-3 font-display text-3xl font-bold">Safety investigations</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Report details and investigator notes are visible only to authorised platform reviewers. Do not disclose reporter identity to the reported person.</p></div><Badge variant="outline">{rows?.filter((r) => r.priority === 'urgent' && !['resolved', 'dismissed'].includes(r.status)).length ?? 0} urgent open</Badge></div>
    <div className="mt-5 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><p><strong>Urgent procedure:</strong> immediate danger requires emergency services (999 in the UK), not just an in-app report. Assess safeguarding needs promptly, limit further harm, escalate to the appropriate safeguarding lead or external agency where required, and record the action and reasoning. This system does not determine legal compliance automatically.</p></div>
    {allowed === false ? <p className="mt-8 flex items-center gap-2 text-muted-foreground"><LockKeyhole className="h-5 w-5" />Only platform administrators and moderators can view this queue.</p> : <>
      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3"><div><Label htmlFor="safety-status">Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id="safety-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Open and investigating</SelectItem><SelectItem value="all">All reports</SelectItem>{['open','investigating','escalated','resolved','dismissed'].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="safety-type">Report type</Label><Select value={type} onValueChange={setType}><SelectTrigger id="safety-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{Object.entries(SAFETY_SUBJECT_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="safety-search">Search</Label><Input id="safety-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reference, target or detail" /></div></div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {rows === null ? <p role="status" className="mt-8 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading reports…</p> : filtered.length === 0 ? <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No reports match these filters.</p> : <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">{filtered.map((r) => <li key={r.id}><button className="w-full p-5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setSelected(r); setNote(''); setError(''); }}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{r.target_label}</p><p className="mt-1 text-sm text-muted-foreground">{SAFETY_SUBJECT_LABELS[r.subject_type]} · {SAFETY_REASONS.find((x) => x.value === r.reason)?.label}</p></div><div className="flex flex-wrap gap-2"><Badge variant={r.priority === 'urgent' ? 'destructive' : 'outline'}>{r.priority}</Badge><Badge variant="secondary">{r.status.replace(/_/g, ' ')}</Badge></div></div><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{r.details}</p><p className="mt-2 text-xs text-muted-foreground">{r.id.slice(0,8).toUpperCase()} · {new Date(r.created_at).toLocaleString()}</p></button></li>)}</ul>}
    </>}
    <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">{selected && <>
      <DialogHeader><DialogTitle>{selected.target_label}</DialogTitle><DialogDescription>{SAFETY_SUBJECT_LABELS[selected.subject_type]} · {selected.id.slice(0,8).toUpperCase()} · reported {new Date(selected.created_at).toLocaleString()}</DialogDescription></DialogHeader>
      <div className="flex flex-wrap gap-2"><Badge variant={selected.priority === 'urgent' ? 'destructive' : 'outline'}>{selected.priority}</Badge><Badge variant="secondary">{selected.status}</Badge></div>
      <section><h3 className="text-sm font-semibold">Reporter's account</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.details}</p><p className="mt-2 text-xs text-muted-foreground">Reporter ID: {selected.reporter_id} · visible only for authorised investigation.</p></section>
      <section><h3 className="text-sm font-semibold">Investigation history</h3><ol className="mt-2 space-y-3">{selected.events.map((e) => <li key={e.id} className="border-l-2 border-border pl-3 text-sm"><p className="font-medium">{e.action.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.actor_id ?? 'system'}</p>{e.note && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{e.note}</p>}</li>)}</ol></section>
      <div className="space-y-2"><Label htmlFor="investigation-note">Private investigation note (required for every action)</Label><Textarea id="investigation-note" rows={4} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Record evidence checked, immediate protections, external escalation, and reasoning. Do not record unnecessary personal data." /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">{!['resolved','dismissed'].includes(selected.status) && <><Button disabled={busy} variant="outline" onClick={() => void act('acknowledge')}>Acknowledge</Button><Button disabled={busy} variant="destructive" onClick={() => void act('escalate')}>Record urgent escalation</Button><Button disabled={busy} onClick={() => void act('resolve')}>Resolve</Button><Button disabled={busy} variant="outline" onClick={() => void act('dismiss')}>Dismiss with reasoning</Button></>}<Button disabled={busy} variant="ghost" onClick={() => void act('note')}>Add note only</Button></div>
    </>}</DialogContent></Dialog>
  </main></EmployerShell>;
}
