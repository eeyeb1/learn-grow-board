import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardList, Loader2, ShieldAlert } from 'lucide-react';
import type { Placement } from '@/hooks/useSeekerDashboard';

type Item = { label: string; done: boolean; done_at?: string | null };
type Sup = { user_id: string; name: string; job_title: string | null };
const closed = (s: string) => s === 'completed' || s === 'cancelled';

export default function PlacementOnboarding({ placement, isSeeker, canManage, onChange }: { placement: Placement; isSeeker: boolean; canManage: boolean; onChange: () => void }) {
  const edit = canManage && !isSeeker && !closed(placement.status);
  const [f, setF] = useState({ schedule: placement.schedule ?? '', location: placement.location ?? '', expected_duration: placement.expected_duration ?? '', safeguarding: placement.safeguarding ?? '', expectations: placement.expectations ?? '' });
  const [ind, setInd] = useState<Item[]>(placement.induction_checklist ?? []);
  const [comp, setComp] = useState<Item[]>(placement.completion_checklist ?? []);
  const [sups, setSups] = useState<Sup[] | null>(null);
  const [sup, setSup] = useState('');
  const [supNote, setSupNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!edit) return;
    void supabase.rpc('list_placement_supervisors', { _placement_id: placement.id }).then(({ data }) => setSups((data ?? []) as unknown as Sup[]));
  }, [edit, placement.id]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('update_placement_onboarding', { _placement_id: placement.id, _data: { ...f, induction_checklist: ind.map((i) => ({ done: i.done })), completion_checklist: comp.map((i) => ({ done: i.done })) } });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Onboarding saved'); onChange();
  };
  const assign = async () => {
    if (supNote.trim().length < 10) return toast.error('Add a short note (10+ characters) explaining the assignment.');
    setBusy(true);
    const { error } = await supabase.rpc('assign_placement_supervisor', { _placement_id: placement.id, _user_id: sup, _note: supNote.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Supervisor assigned'); setSupNote(''); onChange();
  };
  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('confirm_placement_onboarding', { _placement_id: placement.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Thanks — your employer can see you confirmed the details.'); onChange();
  };

  const Field = ({ k, label, long, help }: { k: keyof typeof f; label: string; long?: boolean; help?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`ob-${k}`}>{label}</Label>
      {edit ? (long ? <Textarea id={`ob-${k}`} value={f[k]} maxLength={3000} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <Input id={`ob-${k}`} value={f[k]} maxLength={1000} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)
        : <p className="text-sm text-muted-foreground whitespace-pre-wrap">{placement[k] || 'Not provided yet.'}</p>}
      {help && edit && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
  const List = ({ title, items, set }: { title: string; items: Item[]; set: (i: Item[]) => void }) => (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-2 flex items-center gap-2 font-medium"><ClipboardList className="h-4 w-4 text-primary" />{title} <span className="text-xs text-muted-foreground">({items.filter((i) => i.done).length}/{items.length})</span></p>
      <ul className="space-y-2">{items.map((it, i) => (
        <li key={it.label} className="flex items-start gap-2 text-sm">
          <Checkbox id={`${title}-${i}`} checked={it.done} disabled={!edit} onCheckedChange={(v) => set(items.map((x, j) => (j === i ? { ...x, done: !!v } : x)))} />
          <label htmlFor={`${title}-${i}`} className={it.done ? 'text-foreground' : 'text-muted-foreground'}>{it.label}{it.done && it.done_at ? <span className="ml-1 text-xs text-muted-foreground">· {new Date(it.done_at).toLocaleDateString()}</span> : null}</label>
        </li>))}</ul>
    </div>
  );

  return (
    <Card className="print:hidden">
      <CardHeader><CardTitle className="text-lg">Placement onboarding</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {placement.status === 'disputed' && <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"><ShieldAlert className="h-4 w-4 shrink-0 text-destructive" /><p><span className="font-medium">Disputed{placement.disputed_at ? ` on ${new Date(placement.disputed_at).toLocaleDateString()}` : ''}.</span> {placement.dispute_reason}</p></div>}
        <div className="rounded-md bg-muted p-3 text-sm">
          {placement.seeker_confirmed_at ? <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Seeker confirmed these details on {new Date(placement.seeker_confirmed_at).toLocaleDateString()}.</p>
            : <p>{isSeeker ? 'Please read the details below and confirm them before your placement starts.' : 'Waiting for the seeker to confirm these details. Changing schedule, location, safeguarding or expectations asks them to confirm again.'}</p>}
          {isSeeker && !placement.seeker_confirmed_at && !closed(placement.status) && placement.schedule && placement.expectations && <Button size="sm" className="mt-2" disabled={busy} onClick={() => void confirm()}>I confirm these details</Button>}
        </div>
        {edit && sups !== null && sups.length > 0 && (
          <div className="grid gap-2 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><Label htmlFor="ob-sup">Assign supervisor</Label><Select value={sup} onValueChange={setSup}><SelectTrigger id="ob-sup"><SelectValue placeholder="Choose an approved supervisor" /></SelectTrigger><SelectContent>{sups.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.name}{s.job_title ? ` · ${s.job_title}` : ''}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="ob-supnote">Reason (recorded)</Label><Input id="ob-supnote" value={supNote} maxLength={500} onChange={(e) => setSupNote(e.target.value)} /></div>
            <Button disabled={!sup || busy} onClick={() => void assign()}>Assign</Button>
          </div>)}
        {edit && sups !== null && sups.length === 0 && !placement.supervisor_id && <p className="text-sm text-muted-foreground">No supervisor assigned. A company administrator can assign an approved member with Supervisor permission.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="schedule" label="Agreed schedule" long help="Days, times and any breaks." />
          <Field k="location" label="Location" help="Where the seeker should go, or 'Remote'." />
          <Field k="expected_duration" label="Expected duration" help="For example, '2 weeks, 15 hours per week'." />
          <Field k="safeguarding" label="Safeguarding requirements (if relevant)" long help="Required for under-18s: named safeguarding contact, supervision ratios, any restrictions." />
        </div>
        <Field k="expectations" label="Agreed expectations" long help="Dress code, conduct, what to bring, how to report absence." />
        <div className="grid gap-4 md:grid-cols-2">
          <List title="Initial instructions" items={ind} set={setInd} />
          <List title="Completion checklist" items={comp} set={setComp} />
        </div>
        {edit && <Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save onboarding</Button>}
        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <p>Accepted: {new Date(placement.created_at).toLocaleString()}</p>
          {placement.activated_at && <p>Activated: {new Date(placement.activated_at).toLocaleString()}</p>}
          {placement.completed_at && <p>Completed: {new Date(placement.completed_at).toLocaleString()}</p>}
          {placement.cancelled_at && <p>Cancelled: {new Date(placement.cancelled_at).toLocaleString()}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
