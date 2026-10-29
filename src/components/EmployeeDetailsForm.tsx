import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { employeeSchema, type EmployeeIdentity } from '@/lib/employeeIdentity';

export default function EmployeeDetailsForm({ identity, refresh }: { identity?: EmployeeIdentity | null; refresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const [savedIdentity, setSavedIdentity] = useState(identity);
  const [values, setValues] = useState({ full_name: identity?.full_name ?? '', job_title: identity?.job_title ?? '', claimed_company: identity?.claimed_company ?? '', work_email: identity?.work_email ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    const parsed = employeeSchema.safeParse(values);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your details.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const d = parsed.data;
      const saved = await supabase.rpc('save_employee_identity', { _name: d.full_name, _job_title: d.job_title, _company: d.claimed_company, _work_email: d.work_email });
      if (saved.error) throw new Error(saved.error.message);
      setSavedIdentity({ full_name: d.full_name ?? '', job_title: d.job_title ?? '', claimed_company: d.claimed_company ?? '', work_email: d.work_email ?? '', work_email_verified_at: savedIdentity?.work_email === d.work_email ? savedIdentity.work_email_verified_at : null, matched_company_id: savedIdentity?.work_email === d.work_email ? savedIdentity.matched_company_id : null });
      const verification = await supabase.functions.invoke('employee-work-email', { body: { action: 'send' } });
      if (verification.error || verification.data?.error) {
        setMessage('Your details are saved. Your work email is not verified yet.');
        const detail = verification.error?.context instanceof Response ? await verification.error.context.json().catch(() => null) : null;
        setError(verification.data?.error ?? detail?.error ?? 'Verification email could not be sent. Please try again later.');
      } else setMessage('Verification email requested. Open the link within 30 minutes while signed in to this platform account.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Your details could not be saved.'); }
    finally { setBusy(false); }
  }
  async function request() {
    setBusy(true); setError('');
    try {
      const result = await supabase.rpc('request_company_access', { _pathway: 'join' });
      if (result.error) throw new Error(result.error.message);
      await refresh(); navigate('/employer/status');
    } catch (e) { setError(e instanceof Error ? e.message : 'Your request could not be saved.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6">
    <div className="flex flex-wrap gap-2"><Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />Work email {savedIdentity?.work_email_verified_at ? 'verified' : 'not verified'}</Badge></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    <form onSubmit={save} className="space-y-5">{([
      ['full_name', 'Your name', 'text', 100], ['job_title', 'Job title', 'text', 100], ['claimed_company', 'Company name', 'text', 160], ['work_email', 'Work email', 'email', 254],
    ] as const).map(([key, label, type, max]) => <div key={key} className="space-y-2"><Label htmlFor={`employee-${key}`}>{label}</Label><Input id={`employee-${key}`} type={type} required maxLength={max} autoComplete={key === 'full_name' ? 'name' : key === 'work_email' ? 'email' : 'organization-title'} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} /></div>)}
      <p className="text-sm text-muted-foreground">Changing your work email pauses employee membership until the new address is verified and approved again. Your platform sign-in email stays unchanged.</p>
      <Button type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Save and send verification link</Button>
    </form>
    {savedIdentity && <div className="border-t border-border pt-6 space-y-3"><h2 className="text-lg font-semibold">Company membership</h2><p className="text-sm text-muted-foreground">{savedIdentity.matched_company_id ? 'An approved company domain matches your verified work email. Membership needs company administrator approval.' : 'No verified company domain currently matches. Request manual review; this does not create a company identity or grant company-branded drafts.'}</p><Button variant="outline" disabled={busy} onClick={() => void request()}>Request {savedIdentity.matched_company_id ? 'company membership' : 'manual company review'}</Button></div>}
  </section>;
}