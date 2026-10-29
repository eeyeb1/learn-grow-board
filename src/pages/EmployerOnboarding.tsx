import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, Users, Loader2 } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CompanyRegistrationForm from '@/components/CompanyRegistrationForm';

export default function EmployerOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pathway, setPathway] = useState<'register' | 'join'>(() => sessionStorage.getItem('employer-pathway') === 'join' ? 'join' : 'register');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!loading && !user) return <Navigate to="/employer/sign-in" replace />;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const validated = await supabase.auth.getUser();
      if (!validated.data.user?.email_confirmed_at) { setError('Verify your email before requesting company access.'); return; }
      const result = await supabase.rpc('request_company_access', { _pathway: 'join', _job_title: title.trim(), _department: department.trim() });
      if (result.error) { setError(result.error.message); return; }
      sessionStorage.removeItem('employer-pathway');
      navigate('/employer/workspace', { replace: true });
    } catch { setError('Your request could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <EmployerShell><main className="mx-auto max-w-xl px-5 py-12"><h1 className="font-display text-3xl font-bold">Set up company access</h1><p className="mt-3 break-words text-muted-foreground">Continue with your existing account{user?.email ? `: ${user.email}` : ''}.</p>
    <div className="my-7 grid gap-3 sm:grid-cols-2" role="group" aria-label="Company access pathway"><Button variant={pathway === 'register' ? 'default' : 'outline'} className="h-auto whitespace-normal py-4" aria-pressed={pathway === 'register'} onClick={() => setPathway('register')}><Building2 className="mr-2 h-5 w-5 shrink-0" />Register my company</Button><Button variant={pathway === 'join' ? 'default' : 'outline'} className="h-auto whitespace-normal py-4" aria-pressed={pathway === 'join'} onClick={() => setPathway('join')}><Users className="mr-2 h-5 w-5 shrink-0" />Join a company as an employee</Button></div>
    <p className="mb-6 text-sm text-muted-foreground">{pathway === 'register' ? 'Company verification and administrator authorisation are reviewed separately. Registration does not give publishing access.' : 'Use an email on an approved domain of a verified company. Drafting eligibility is separate from approved membership.'}</p>
    {error && <p role="alert" className="mb-5 text-sm text-destructive">{error}</p>}
    {pathway === 'register' ? <CompanyRegistrationForm email={user?.email ?? ''} /> : <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="employee-title">Job title (optional)</Label><Input id="employee-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} /></div><div className="space-y-2"><Label htmlFor="employee-department">Department (optional)</Label><Input id="employee-department" value={department} onChange={e => setDepartment(e.target.value)} maxLength={100} /></div></div>
      <Button type="submit" className="w-full" disabled={busy || loading}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Request company membership</Button>
    </form>}<Button variant="link" className="mt-4 px-0" onClick={() => navigate('/employer/status')}>View my access status</Button>
  </main></EmployerShell>;
}