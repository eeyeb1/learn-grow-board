import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { registrationSchema, type RegistrationDetails } from '@/lib/companyRegistration';

export default function CompanyRegistrationForm({ email }: { email: string }) {
  const navigate = useNavigate();
  const [details, setDetails] = useState<RegistrationDetails>({ legal_name: '', trading_name: '', website: '', industry: '', business_location: '', registration_identifier: '', work_email: email, relationship: '', submitted_evidence: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key: keyof RegistrationDetails, value: string) => setDetails(d => ({ ...d, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    const parsed = registrationSchema.safeParse({ ...details, work_email: email });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your details'); return; }
    setBusy(true); setError('');
    try {
      const result = await supabase.rpc('submit_company_registration', { _details: parsed.data });
      if (result.error) { setError(result.error.message); return; }
      sessionStorage.removeItem('employer-pathway');
      navigate('/employer/status', { replace: true });
    } catch { setError('Your registration could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="flex gap-3 border-y border-border py-4 text-sm text-muted-foreground"><LockKeyhole className="h-5 w-5 shrink-0 text-primary" /><p>Your supporting evidence is private. A platform administrator reviews company legitimacy and your authority separately. Email or registry matching alone does not authorise you.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      {([
        ['legal_name', 'Company legal name', 160, true], ['trading_name', 'Trading name (if different)', 160, false],
        ['website', 'Business website', 300, true], ['industry', 'Industry', 100, true],
        ['business_location', 'Business location', 300, true], ['registration_identifier', 'Registration identifier (if applicable)', 100, false],
      ] as const).map(([key, label, max, required]) => <div key={key} className="space-y-2"><Label htmlFor={`registration-${key}`}>{label}</Label><Input id={`registration-${key}`} type={key === 'website' ? 'url' : 'text'} maxLength={max} required={required} value={details[key]} onChange={e => update(key, e.target.value)} placeholder={key === 'website' ? 'https://' : undefined} /></div>)}
    </div>
    <div className="space-y-2"><Label htmlFor="registration-work-email">Work email</Label><Input id="registration-work-email" type="email" value={email} readOnly aria-describedby="work-email-note" /><p id="work-email-note" className="text-xs text-muted-foreground">Your verified account email is used. Businesses using personal email can be reviewed manually; this never enables automatic domain matching.</p></div>
    <div className="space-y-2"><Label htmlFor="registration-relationship">Your relationship to the business</Label><Textarea id="registration-relationship" required minLength={5} maxLength={1000} rows={3} value={details.relationship} onChange={e => update('relationship', e.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="registration-evidence">Supporting evidence and references</Label><Textarea id="registration-evidence" required minLength={20} maxLength={5000} rows={5} value={details.submitted_evidence} onChange={e => update('submitted_evidence', e.target.value)} aria-describedby="evidence-note" /><p id="evidence-note" className="text-xs text-muted-foreground">Describe evidence of the business and your authorisation, including relevant document references or restricted links. Do not submit passwords, identity-document numbers or unrelated personal information.</p></div>
    <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review</Button>
  </form>;
}