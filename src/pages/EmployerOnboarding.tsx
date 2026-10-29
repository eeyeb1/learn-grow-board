import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import CompanyRegistrationForm from '@/components/CompanyRegistrationForm';
import EmployeeDetailsForm from '@/components/EmployeeDetailsForm';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';

export default function EmployerOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pathway, setPathway] = useState<'register' | 'join'>(() => sessionStorage.getItem('employer-pathway') === 'join' ? 'join' : 'register');
  const { access, loading: accessLoading, refresh } = useCompanyAccess();
  if (!loading && !user) return <Navigate to="/employer/sign-in" replace />;
  return <EmployerShell><main className="mx-auto max-w-xl px-5 py-12"><h1 className="font-display text-3xl font-bold">Set up company access</h1><p className="mt-3 break-words text-muted-foreground">Continue with your existing account{user?.email ? `: ${user.email}` : ''}.</p>
    <div className="my-7 grid gap-3 sm:grid-cols-2" role="group" aria-label="Company access pathway"><Button variant={pathway === 'register' ? 'default' : 'outline'} className="h-auto whitespace-normal py-4" aria-pressed={pathway === 'register'} onClick={() => setPathway('register')}><Building2 className="mr-2 h-5 w-5 shrink-0" />Register my company</Button><Button variant={pathway === 'join' ? 'default' : 'outline'} className="h-auto whitespace-normal py-4" aria-pressed={pathway === 'join'} onClick={() => setPathway('join')}><Users className="mr-2 h-5 w-5 shrink-0" />Join a company as an employee</Button></div>
    <p className="mb-6 text-sm text-muted-foreground">{pathway === 'register' ? 'Company verification and administrator authorisation are reviewed separately. Registration does not give publishing access.' : 'Use an email on an approved domain of a verified company. Drafting eligibility is separate from approved membership.'}</p>
    {pathway === 'register' ? <CompanyRegistrationForm email={user?.email ?? ''} /> : accessLoading ? <p role="status">Loading employee details…</p> : <EmployeeDetailsForm identity={access?.employee} refresh={refresh} />}<Button variant="link" className="mt-4 px-0" onClick={() => navigate('/employer/status')}>View my access status</Button>
  </main></EmployerShell>;
}