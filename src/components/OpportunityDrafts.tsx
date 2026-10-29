import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Copy, Eye, History, Loader2, Pencil, Plus, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, emptyForm, fromRow, isPaid, toRow, validate, warnings, type Errors, type OpportunityForm } from '@/lib/opportunityForm';

const COLS = 'id,title,category,description,location_type,location,duration,hours_per_week,what_you_will_learn,mentorship_details,expires_at,opportunity_details,updated_at';
type DraftRow = Parameters<typeof fromRow>[0] & { id: string; updated_at: string };
type Version = { id: string; version: number; created_at: string; updated_at: string; snapshot: Record<string, unknown> };

interface Props { companyId: string; companyName: string; canDraft: boolean; onSubmitted?: () => void }

export default function OpportunityDrafts({ companyId, companyName, canDraft, onSubmitted }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; form: OpportunityForm } | null>(null);
  const [toDelete, setToDelete] = useState<DraftRow | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setListError('');
    const [r, p] = await Promise.all([
      supabase.from('jobs').select(COLS).eq('company_id', companyId).eq('created_by', user.id).eq('status', 'draft').order('updated_at', { ascending: false }),
      supabase.from('job_publication_requests').select('job_id').eq('company_id', companyId).eq('requested_by', user.id).eq('status', 'pending'),
    ]);
    if (r.error) setListError('We could not load your drafts. Try again.'); else setRows((r.data ?? []) as DraftRow[]);
    setPending(new Set((p.data ?? []).map(x => x.job_id)));
    setLoading(false);
  }, [companyId, user]);
  useEffect(() => { setRows([]); setEditing(null); void load(); }, [load]);

  async function duplicate(r: DraftRow) {
    const f = fromRow(r);
    const row = toRow({ ...f, title: `Copy of ${f.title || 'untitled draft'}`.slice(0, 160) });
    const res = await supabase.from('jobs').insert({ ...row, company_id: companyId, status: 'draft' }).select('id').single();
    if (res.error) setListError(res.error.message); else { setNotice('Draft duplicated.'); await load(); }
  }
  async function remove() {
    if (!toDelete || !user) return;
    const res = await supabase.from('jobs').delete().eq('id', toDelete.id).eq('created_by', user.id).eq('status', 'draft');
    setToDelete(null);
    if (res.error) setListError(res.error.message); else { setNotice('Draft deleted.'); await load(); }
  }

  if (editing) return <OpportunityEditor key={editing.id ?? 'new'} companyId={companyId} companyName={companyName} initialId={editing.id} initial={editing.form} hadPending={!!editing.id && pending.has(editing.id)}
    onClose={() => { setEditing(null); void load(); }} onSubmitted={() => { onSubmitted?.(); setEditing(null); setNotice('Sent for company review. A company administrator decides whether it is published.'); void load(); }} />;

  return <section className="border-t border-border pt-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">My opportunity drafts</h2><p className="mt-1 text-sm text-muted-foreground">Only you can see and change these drafts. Publication needs approval from a {companyName} administrator.</p></div>
      {canDraft && <Button onClick={() => setEditing({ id: null, form: emptyForm })}><Plus className="mr-2 h-4 w-4" />Create opportunity</Button>}
    </div>
    {!canDraft && <p className="py-5 text-muted-foreground">Draft creation is not granted to your account.</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    {listError && <p role="alert" className="mt-4 text-sm text-destructive">{listError} <Button variant="link" className="h-auto p-0" onClick={() => void load()}>Retry</Button></p>}
    {loading ? <p className="py-6 text-sm text-muted-foreground" role="status">Loading drafts…</p> : rows.length ? <ul className="mt-4 divide-y divide-border">{rows.map(r => {
      const cat = CATEGORIES.find(c => c.value === r.category);
      const complete = Object.keys(validate(fromRow(r))).length === 0;
      return <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0"><p className="break-words font-medium">{r.title}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">Draft</Badge>{cat && <Badge variant={cat.paid ? 'default' : 'secondary'}>{cat.label}</Badge>}{pending.has(r.id) ? <Badge>Awaiting company review</Badge> : !complete && <Badge variant="outline">Incomplete</Badge>}<span className="text-xs text-muted-foreground">Saved {new Date(r.updated_at).toLocaleString()}</span></div></div>
        {canDraft && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: r.id, form: fromRow(r) })}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button><Button variant="outline" size="sm" onClick={() => void duplicate(r)}><Copy className="mr-1.5 h-4 w-4" />Duplicate</Button><Button variant="ghost" size="sm" onClick={() => setToDelete(r)} aria-label={`Delete ${r.title}`}><Trash2 className="h-4 w-4" /></Button></div>}</li>;
    })}</ul> : <p className="py-6 text-sm text-muted-foreground">No drafts yet.</p>}
    <AlertDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this draft?</AlertDialogTitle><AlertDialogDescription>“{toDelete?.title}” and its version history will be permanently deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void remove()}>Delete draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

function OpportunityEditor({ companyId, companyName, initialId, initial, hadPending, onClose, onSubmitted }: { companyId: string; companyName: string; initialId: string | null; initial: OpportunityForm; hadPending: boolean; onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm] = useState(initial);
  const [id, setId] = useState(initialId);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(false);
  const dirty = useRef(false);
  const saving = useRef<Promise<string | null> | null>(null);

  const errors: Errors = useMemo(() => validate(form), [form]);
  const warns = useMemo(() => warnings(form), [form]);
  const set = <K extends keyof OpportunityForm>(k: K, v: OpportunityForm[K]) => { dirty.current = true; setForm(f => ({ ...f, [k]: v })); };

  const save = useCallback(async (f: OpportunityForm): Promise<string | null> => {
    if (saving.current) await saving.current;
    const run = (async () => {
      setStatus('saving'); setSaveError('');
      const row = toRow(f);
      const res = id
        ? await supabase.from('jobs').update(row).eq('id', id).eq('status', 'draft').select('id').single()
        : await supabase.from('jobs').insert({ ...row, company_id: companyId, status: 'draft' }).select('id').single();
      if (res.error) { setStatus('error'); setSaveError(res.error.message); return null; }
      dirty.current = false; setId(res.data.id); setStatus('saved'); return res.data.id as string;
    })();
    saving.current = run; const out = await run; saving.current = null; return out;
  }, [id, companyId]);

  useEffect(() => {
    if (!dirty.current || (!id && !form.title.trim())) return;
    const t = setTimeout(() => void save(form), 2000);
    return () => clearTimeout(t);
  }, [form, id, save]);

  async function submit() {
    setShowErrors(true); setSubmitError('');
    if (Object.keys(errors).length) { setSubmitError('Fix the highlighted fields before requesting review.'); return; }
    setSubmitting(true);
    const savedId = await save(form);
    if (!savedId) { setSubmitting(false); return; }
    const r = await supabase.rpc('request_job_publication', { _job_id: savedId });
    setSubmitting(false);
    if (r.error) setSubmitError(r.error.message); else onSubmitted();
  }

  const err = (k: keyof OpportunityForm) => showErrors && errors[k] ? <p id={`${k}-error`} className="text-sm text-destructive">{errors[k]}</p> : null;
  const aria = (k: keyof OpportunityForm) => ({ 'aria-invalid': showErrors && !!errors[k], 'aria-describedby': showErrors && errors[k] ? `${k}-error` : undefined });
  const text = (k: keyof OpportunityForm, label: string, opts: { area?: boolean; hint?: string; max?: number; required?: boolean; type?: string } = {}) => <div className="space-y-2">
    <Label htmlFor={`opp-${k}`}>{label}{opts.required && <span className="text-destructive"> *</span>}</Label>
    {opts.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
    {opts.area ? <Textarea id={`opp-${k}`} rows={4} maxLength={opts.max ?? 3000} value={form[k] as string} onChange={e => set(k, e.target.value as never)} {...aria(k)} />
      : <Input id={`opp-${k}`} type={opts.type ?? 'text'} maxLength={opts.max ?? 300} value={form[k] as string} onChange={e => set(k, e.target.value as never)} {...aria(k)} />}
    {err(k)}
  </div>;
  const cat = CATEGORIES.find(c => c.value === form.category);

  return <section className="border-t border-border pt-7">
    <div className="sticky top-16 z-10 -mx-2 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/95 px-3 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">{status === 'saving' ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : status === 'saved' ? <><CheckCircle2 className="h-4 w-4 text-primary" />All changes saved</> : status === 'error' ? <span className="text-destructive">Not saved: {saveError}</span> : id ? 'Draft' : 'Autosave starts once you add a title'}</div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={async () => { if (dirty.current && (id || form.title.trim())) await save(form); onClose(); }}>Back to drafts</Button>
        {id && <Button variant="outline" size="sm" onClick={() => setHistory(true)}><History className="mr-1.5 h-4 w-4" />Versions</Button>}
        <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye className="mr-1.5 h-4 w-4" />Preview</Button>
        <Button variant="outline" size="sm" disabled={status === 'saving' || !form.title.trim()} onClick={() => void save(form)}>Save now</Button>
        <Button size="sm" disabled={submitting} onClick={() => void submit()}>{submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}Request company review</Button>
      </div>
    </div>
    {hadPending && <p className="mb-5 rounded-md border border-border bg-muted p-3 text-sm">This draft is awaiting company review. Saving changes withdraws that request; send it again when you are ready.</p>}
    {submitError && <p role="alert" className="mb-5 text-sm text-destructive">{submitError}</p>}

    <div className="space-y-10">
      <Step n={1} title="The basics">
        {text('title', 'Opportunity title', { required: true, max: 160 })}
        <div className="space-y-2"><Label>Company affiliation</Label><p className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{companyName}</p><p className="text-xs text-muted-foreground">Set from your verified access and checked by the server. It cannot be changed here.</p></div>
        {text('department', 'Department or team')}
        <fieldset className="space-y-3"><legend className="text-sm font-medium">Category<span className="text-destructive"> *</span></legend>
          <div className="grid gap-3 sm:grid-cols-2">{CATEGORIES.map(c => <label key={c.value} className={`cursor-pointer rounded-lg border p-4 text-sm transition-colors ${form.category === c.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
            <input type="radio" name="opp-category" className="sr-only" checked={form.category === c.value} onChange={() => set('category', c.value)} />
            <span className="flex items-center justify-between gap-2 font-medium">{c.label}<Badge variant={c.paid ? 'default' : 'secondary'}>{c.paid ? 'Paid work' : 'Educational'}</Badge></span>
            <span className="mt-1 block text-muted-foreground">{c.help}</span></label>)}</div>{err('category')}</fieldset>
      </Step>

      <Step n={2} title="Where and when">
        <div className="space-y-2"><Label htmlFor="opp-location_type">Work setting</Label><Select value={form.location_type} onValueChange={v => set('location_type', v as OpportunityForm['location_type'])}><SelectTrigger id="opp-location_type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="onsite">On-site</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem><SelectItem value="remote">Remote</SelectItem></SelectContent></Select></div>
        {text('location', 'Location', { required: form.location_type !== 'remote', hint: 'Town or area. Avoid private addresses.' })}
        {text('remote_preference', 'Remote preference details', { hint: 'For example: two days in the office, the rest remote.' })}
        {text('schedule', 'Estimated schedule', { required: true, hint: 'For example: Tuesdays and Thursdays, 10am–3pm.' })}
        {text('hours_per_week', 'Hours per week')}
        <div className="grid gap-4 sm:grid-cols-3">{text('start_date', 'Start date', { type: 'date', required: true })}{text('end_date', 'End date', { type: 'date', required: true })}{text('closing_date', 'Applications close', { type: 'date', required: true })}</div>
        <div className="grid gap-4 sm:grid-cols-2">{text('estimated_hours', 'Estimated total hours', { type: 'number', required: true })}{text('openings', 'Number of openings', { type: 'number', required: true })}</div>
      </Step>

      <Step n={3} title="Who it is for">
        {text('audience', 'Intended audience', { area: true, required: true, hint: 'For example: students aged 16–18 interested in engineering.' })}
        {text('eligibility', 'Eligibility', { area: true, required: true, hint: 'Requirements must be relevant to the opportunity, never based on protected characteristics.' })}
        {text('accessibility_notes', 'Accessibility notes', { area: true, hint: 'Step-free access, adjustments you can offer, quiet spaces, how to ask for support.' })}
      </Step>

      <Step n={4} title="Learning and activities">
        {text('objectives', 'Learning objectives', { area: true, required: true, hint: 'One per line. What will participants learn?' })}
        {text('activities', 'Expected activities', { area: true, required: true, max: 10000, hint: 'One per line. Be specific about what participants will actually do.' })}
        {text('supervision', 'Supervisor arrangements', { area: true, required: true, hint: 'Who supervises, their role, how often they check in, and who to contact with concerns.' })}
      </Step>

      <Step n={5} title="Payment and expenses">
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm"><p className="font-medium">{cat ? (cat.paid ? 'This is paid work' : 'This is an educational learning experience') : 'Choose a category first'}</p><p className="mt-1 text-muted-foreground">Educational opportunities let people observe and learn through exercises set for their benefit. If participants will do real work the business uses — serving customers, producing deliverables, covering shifts — it is commercial work and should be paid, at least at the applicable minimum wage where it applies.</p></div>
        {text('payment_details', isPaid(form.category) ? 'Pay rate and arrangements' : 'Payment (optional)', { area: true, required: isPaid(form.category), hint: 'Rate, how it is calculated, and when it is paid.' })}
        {text('expense_details', 'Expense reimbursement', { area: true, hint: 'Legitimate costs you will cover, such as travel or lunch, and how to claim them.' })}
        {(form.category === 'shadowing' || form.category === 'learning_project') && <div className="space-y-2"><label className="flex items-start gap-3 text-sm"><Checkbox checked={form.no_productive_work_confirmed} onCheckedChange={v => set('no_productive_work_confirmed', v === true)} aria-invalid={showErrors && !!errors.no_productive_work_confirmed} /><span>I confirm participants will not do work the company would otherwise pay someone to do. Any tasks are educational exercises for their learning.</span></label>{err('no_productive_work_confirmed')}</div>}
      </Step>

      {warns.length > 0 && <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="note" aria-label="Warnings">{warns.map(w => <p key={w} className="flex gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{w}</p>)}</div>}
    </div>

    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{form.title || 'Untitled opportunity'}</DialogTitle><DialogDescription>Preview of how seekers would see this if a company administrator approves it. Not published.</DialogDescription></DialogHeader><OpportunityPreview form={form} companyName={companyName} /></DialogContent></Dialog>
    {id && <VersionHistory open={history} onOpenChange={setHistory} jobId={id} onRestore={f => { dirty.current = true; setForm(f); setHistory(false); }} />}
  </section>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return <fieldset className="space-y-5"><legend className="mb-4 flex items-center gap-3 font-display text-lg font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>{title}</legend>{children}</fieldset>;
}

function OpportunityPreview({ form, companyName }: { form: OpportunityForm; companyName: string }) {
  const cat = CATEGORIES.find(c => c.value === form.category);
  const list = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);
  const Row = ({ label, value }: { label: string; value: string }) => value.trim() ? <div><h4 className="text-sm font-semibold">{label}</h4><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{value}</p></div> : null;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{companyName}</Badge>{form.department && <Badge variant="outline">{form.department}</Badge>}{cat && <Badge variant={cat.paid ? 'default' : 'secondary'}>{cat.label}</Badge>}<Badge variant="outline">{form.location_type === 'remote' ? 'Remote' : `${form.location_type === 'hybrid' ? 'Hybrid · ' : ''}${form.location || 'Location not set'}`}</Badge></div>
    <p className="text-sm">{form.start_date || '—'} to {form.end_date || '—'} · {form.estimated_hours || '?'} hours · {form.openings || '?'} opening(s) · Applications close {form.closing_date || '—'}</p>
    <Row label="Schedule" value={[form.schedule, form.hours_per_week && `${form.hours_per_week} hours per week`, form.remote_preference].filter(Boolean).join('\n')} />
    {list(form.objectives).length > 0 && <div><h4 className="text-sm font-semibold">What you will learn</h4><ul className="ml-5 list-disc text-sm text-muted-foreground">{list(form.objectives).map(l => <li key={l}>{l}</li>)}</ul></div>}
    {list(form.activities).length > 0 && <div><h4 className="text-sm font-semibold">What you will do</h4><ul className="ml-5 list-disc text-sm text-muted-foreground">{list(form.activities).map(l => <li key={l}>{l}</li>)}</ul></div>}
    <Row label="Supervision" value={form.supervision} /><Row label="Who it is for" value={form.audience} /><Row label="Eligibility" value={form.eligibility} />
    <Row label="Payment" value={form.payment_details || (cat && !cat.paid ? 'Unpaid educational experience' : '')} /><Row label="Expenses" value={form.expense_details} /><Row label="Accessibility" value={form.accessibility_notes} />
  </div>;
}

function VersionHistory({ open, onOpenChange, jobId, onRestore }: { open: boolean; onOpenChange: (o: boolean) => void; jobId: string; onRestore: (f: OpportunityForm) => void }) {
  const [rows, setRows] = useState<Version[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!open) return; setRows(null); void supabase.from('job_versions').select('id,version,created_at,updated_at,snapshot').eq('job_id', jobId).order('version', { ascending: false }).then(r => { if (r.error) setError('Version history could not be loaded.'); else setRows((r.data ?? []) as Version[]); }); }, [open, jobId]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Version history</DialogTitle><DialogDescription>Saves within 10 minutes are grouped into one version. Restoring loads a version into the form; it is saved as a new version.</DialogDescription></DialogHeader>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !rows ? <p className="text-sm text-muted-foreground" role="status">Loading…</p> : rows.length ? <ul className="divide-y divide-border">{rows.map((v, i) => <li key={v.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">Version {v.version}{i === 0 && ' · current'}</p><p className="text-muted-foreground">{String(v.snapshot.title ?? '')} · {new Date(v.updated_at).toLocaleString()}</p></div>{i > 0 && <Button size="sm" variant="outline" onClick={() => onRestore(fromRow(v.snapshot as never))}>Restore</Button>}</li>)}</ul> : <p className="text-sm text-muted-foreground">No versions yet.</p>}
  </DialogContent></Dialog>;
}
