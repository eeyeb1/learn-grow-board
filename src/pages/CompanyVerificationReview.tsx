import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, Loader2 } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { registrationStatus, reviewSchema } from '@/lib/companyRegistration';
import type { Tables } from '@/integrations/supabase/types';

type Submission = Tables<'company_registration_submissions'>;
type Review = Tables<'company_registration_reviews'>;
type Candidate = { id: string; company_name: string; website: string | null; status: string; has_admin: boolean; registration_identifier: string | null };
export default function CompanyVerificationReview() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    if (!user) return;
    setLoading(true); setError('');
    const role = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (role.error) { setError('Could not check administrator access.'); setLoading(false); return; }
    setAllowed(role.data === true);
    if (!role.data) { setLoading(false); return; }
    const [submissions, history, companies] = await Promise.all([
      supabase.from('company_registration_submissions').select('*').order('submitted_at', { ascending: false }),
      supabase.from('company_registration_reviews').select('*').order('created_at', { ascending: false }),
      supabase.rpc('list_company_review_candidates'),
    ]);
    if (submissions.error || history.error || companies.error) setError('Could not load the private review queue.');
    else { setRows(submissions.data ?? []); setReviews(history.data ?? []); setCandidates(companies.data as unknown as Candidate[]); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, [user?.id]);
  if (!authLoading && !user) return <Navigate to="/employer/sign-in" replace />;
  const active = rows.find(s => s.id === selected);
  return <EmployerShell><main className="container max-w-6xl px-5 py-10">
    <div className="border-b border-border pb-6"><p className="flex gap-2 items-center text-sm text-primary"><ShieldCheck className="h-5 w-5" />Platform administration</p><h1 className="mt-3 font-display text-3xl font-bold">Company verification</h1><p className="mt-3 flex gap-2 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4 shrink-0" />Private evidence and administrator review history</p><Button asChild variant="link" className="px-0 mt-2"><Link to="/moderation/references">Reference and portfolio reports</Link></Button></div>
    {loading || authLoading ? <p role="status" className="py-8 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Checking review access…</p> : error ? <div className="py-8"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" className="mt-4" onClick={() => void load()}>Try again</Button></div> : !allowed ? <p className="py-8 text-muted-foreground">Only platform administrators can review company registrations. Company administrator status does not grant this permission.</p> : <div className="grid gap-8 py-7 lg:grid-cols-[280px_minmax(0,1fr)]"><aside><Label htmlFor="review-filter">Registration status</Label><Select value={filter} onValueChange={setFilter}><SelectTrigger id="review-filter" className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(registrationStatus).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><div className="mt-5 space-y-2">{rows.filter(s => filter === 'all' || s.status === filter).map(s => <Button key={s.id} variant={selected === s.id ? 'secondary' : 'ghost'} className="w-full h-auto items-start flex-col text-left whitespace-normal py-4" onClick={() => setSelected(s.id)}><span className="break-words">{s.legal_name}</span><span className="mt-1 text-xs text-muted-foreground">{registrationStatus[s.status as keyof typeof registrationStatus]} · {new Date(s.submitted_at).toLocaleDateString()}</span></Button>)}{!rows.some(s => filter === 'all' || s.status === filter) && <p className="text-sm text-muted-foreground">No registrations in this status.</p>}</div></aside><div className="min-w-0">{active ? <ReviewDetail key={`${active.id}:${active.reviewed_at}`} submission={active} candidates={candidates} history={reviews.filter(r => r.submission_id === active.id)} reload={load} /> : <p className="text-muted-foreground">No registration selected.</p>}</div></div>}
  </main></EmployerShell>;
}

function ReviewDetail({ submission: s, candidates, history, reload }: { submission: Submission; candidates: Candidate[]; history: Review[]; reload: () => Promise<void> }) {
  const [decision, setDecision] = useState<'note' | 'verified' | 'rejected' | 'suspended'>('note');
  const [company, setCompany] = useState(s.company_id ?? 'new');
  const [legitimacy, setLegitimacy] = useState('');
  const [authority, setAuthority] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [domains, setDomains] = useState('');
  const [checks, setChecks] = useState({ legitimacy: false, authority: false, domain: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    const parsed = reviewSchema.safeParse({ decision, legitimacy, authority, notes, message, domains: domains.split(/[\s,]+/).filter(Boolean) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the review'); return; }
    if (decision === 'verified' && (!checks.legitimacy || !checks.authority || (parsed.data.domains.length > 0 && !checks.domain))) { setError('Confirm independent legitimacy, authority and any domain checks before approval.'); return; }
    setBusy(true); setError('');
    try {
      const result = await supabase.rpc('review_company_registration', { _submission_id: s.id, _decision: decision, _legitimacy_evidence: parsed.data.legitimacy, _authority_evidence: parsed.data.authority, _notes: parsed.data.notes, _message: parsed.data.message, _company_id: company === 'new' ? null : company, _domains: parsed.data.domains });
      if (result.error) { setError(result.error.message); return; }
      await reload(); setNotes(''); setMessage('');
    } catch { setError('The review could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-7"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-semibold break-words">{s.legal_name}</h2><Badge variant="outline">{registrationStatus[s.status as keyof typeof registrationStatus]}</Badge></div>
    <dl className="grid gap-5 sm:grid-cols-2">{([
      ['Trading name', s.trading_name || 'Not supplied'], ['Business website', s.website], ['Industry', s.industry], ['Business location', s.business_location], ['Registration identifier', s.registration_identifier || 'Not applicable / not supplied'], ['Verified account email at submission', s.work_email], ['Claimed relationship', s.relationship], ['Supporting evidence', s.submitted_evidence],
    ]).map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</dd></div>)}</dl>
    <p className="text-xs text-muted-foreground">Submitted {new Date(s.submitted_at).toLocaleString()} · Applicant ID {s.user_id}</p>
    <form onSubmit={submit} className="border-t border-border pt-6 space-y-5"><h3 className="text-xl font-semibold">Record review</h3>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <div className="space-y-2"><Label htmlFor="review-decision">Decision</Label><Select value={decision} onValueChange={v => setDecision(v as typeof decision)}><SelectTrigger id="review-decision"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Save private review note</SelectItem>{['pending','suspended'].includes(s.status) && <SelectItem value="verified">{s.status === 'suspended' ? 'Restore verified access' : 'Verify and appoint company administrator'}</SelectItem>}{s.status === 'pending' && <SelectItem value="rejected">Reject registration</SelectItem>}{s.status === 'verified' && <SelectItem value="suspended">Suspend company access</SelectItem>}</SelectContent></Select></div>
      {decision === 'verified' && <><div className="space-y-2"><Label htmlFor="canonical-company">Canonical company record</Label><Select value={company} onValueChange={setCompany}><SelectTrigger id="canonical-company"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Create only if no existing company matches</SelectItem>{candidates.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name} · {c.website ?? 'No website'} · {c.has_admin ? 'Administrator exists' : c.status}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Check all possible matches. Existing administrator appointments cannot be replaced through registration.</p></div><div className="space-y-2"><Label htmlFor="review-domains">Independently verified email domains (optional)</Label><Input id="review-domains" value={domains} onChange={e => setDomains(e.target.value)} maxLength={1000} /><p className="text-xs text-muted-foreground">Leave blank for manual-only membership. Consumer/disposable email services are not eligible; an email match is never proof of authority.</p></div></>}
      {([['legitimacy', 'Company legitimacy evidence', legitimacy, setLegitimacy], ['authority', 'Applicant authority evidence', authority, setAuthority], ['notes', 'Private administrator notes', notes, setNotes], ['message', 'Message visible to the applicant', message, setMessage]] as const).map(([key, label, value, setter]) => <div key={key} className="space-y-2"><Label htmlFor={`review-${key}`}>{label}</Label><Textarea id={`review-${key}`} rows={3} maxLength={key === 'message' ? 1000 : 5000} value={value} onChange={e => setter(e.target.value)} required={key === 'notes' || (decision === 'verified' && (key === 'legitimacy' || key === 'authority')) || (decision !== 'note' && key === 'message')} /></div>)}
      {decision === 'verified' && <div className="space-y-3">{([['legitimacy', 'I independently checked business legitimacy and recorded the evidence.'], ['authority', 'I independently checked applicant authority; email, domain and registry records alone are not sufficient.'], ['domain', 'I independently verified control of every proposed business domain.']] as const).map(([key, text]) => <div key={key} className="flex gap-3 items-start"><Checkbox id={`check-${key}`} checked={checks[key]} onCheckedChange={v => setChecks(c => ({ ...c, [key]: v === true }))} /><Label className="text-sm leading-relaxed" htmlFor={`check-${key}`}>{text}</Label></div>)}</div>}
      <Button type="submit" variant={decision === 'suspended' || decision === 'rejected' ? 'destructive' : 'default'} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{decision === 'verified' ? 'Confirm verification and access' : decision === 'suspended' ? 'Confirm suspension' : decision === 'rejected' ? 'Confirm rejection' : 'Save private note'}</Button>
    </form>
    <section className="border-t border-border pt-6"><h3 className="text-xl font-semibold">Review history</h3>{history.length ? history.map(r => <article key={r.id} className="border-b border-border py-5 space-y-3 text-sm"><p className="font-medium">{r.action === 'note' ? 'Private note' : registrationStatus[r.action as keyof typeof registrationStatus]} · {new Date(r.created_at).toLocaleString()}</p><p className="text-xs text-muted-foreground">Reviewer {r.reviewer_id}</p>{[['Legitimacy', r.legitimacy_evidence], ['Authority', r.authority_evidence], ['Private notes', r.private_notes], ['Applicant message', r.applicant_message], ['Approved domains', r.approved_domains.join(', ')]].filter(([,v]) => v).map(([label, value]) => <p key={label} className="whitespace-pre-wrap break-words"><strong>{label}:</strong> {value}</p>)}</article>) : <p className="mt-3 text-sm text-muted-foreground">No reviews recorded.</p>}</section>
  </div>;
}