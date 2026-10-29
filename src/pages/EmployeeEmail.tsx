import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import EmployeeDetailsForm from '@/components/EmployeeDetailsForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { supabase } from '@/integrations/supabase/client';

export default function EmployeeEmail() {
  const { user, loading: authLoading } = useAuth();
  const { access, loading, error, refresh } = useCompanyAccess();
  const location = useLocation();
  const verifying = location.pathname.endsWith('/verify-work-email');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [problem, setProblem] = useState('');
  const token = new URLSearchParams(location.hash.slice(1)).get('token');
  async function confirm() {
    if (!token || busy) return;
    setBusy(true); setProblem('');
    try {
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
      const result = await supabase.rpc('confirm_employee_email', { _hash: hash });
      if (result.error) throw new Error(result.error.message);
      window.history.replaceState(null, '', location.pathname);
      setOutcome('Work email verified. Company membership and publication remain separately authorised.'); await refresh();
    } catch (e) { setProblem(e instanceof Error ? e.message : 'Could not verify this email.'); }
    finally { setBusy(false); }
  }
  if (!verifying && !authLoading && !user) return <Navigate to="/employer/sign-in" replace />;
  return <EmployerShell><main className="mx-auto max-w-xl px-5 py-12"><Mail className="mb-4 h-8 w-8 text-primary" /><h1 className="font-display text-3xl font-bold">{verifying ? 'Verify work email' : 'Employee details'}</h1>
    {verifying ? <div className="mt-6 space-y-5">{outcome ? <><p role="status">{outcome}</p><Button asChild><Link to="/employer/status">View access status</Link></Button></> : !user ? <><p className="text-muted-foreground">Sign in with the platform account that requested the link, then reopen this email link.</p><Button asChild><Link to="/employer/sign-in">Sign in</Link></Button></> : !token || !/^[a-f0-9]{64}$/.test(token) ? <><p role="alert" className="text-destructive">This verification link is invalid. Request a new link.</p><Button asChild variant="outline"><Link to="/employer/employee-details">Employee details</Link></Button></> : <><p className="text-muted-foreground">Confirm control of the work email for your signed-in platform account. This link expires after 30 minutes and can be used once.</p>{problem && <p role="alert" className="text-destructive">{problem}</p>}<Button disabled={busy || authLoading} onClick={() => void confirm()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm work email</Button><Button asChild variant="link"><Link to="/employer/employee-details">Request a new link</Link></Button></>}</div> : loading || authLoading ? <p role="status" className="mt-6">Loading employee details…</p> : error ? <p role="alert" className="mt-6 text-destructive">{error}</p> : <div className="mt-6"><EmployeeDetailsForm identity={access?.employee} refresh={refresh} /></div>}
  </main></EmployerShell>;
}