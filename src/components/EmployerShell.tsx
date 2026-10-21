import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function EmployerShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card">
      <div className="container flex min-h-20 flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/employer/sign-in" className="flex items-center gap-3"><Briefcase className="h-7 w-7 text-primary" /><span className="font-display text-xl font-bold">ExpBoard <span className="block text-xs font-medium text-muted-foreground">Employer & employee</span></span></Link>
        <div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to={user ? '/dashboard' : '/'}><ArrowLeft className="mr-2 h-4 w-4" />{user ? 'Seeker workspace' : 'Back to ExpBoard'}</Link></Button>{user && <Button size="icon" variant="ghost" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut className="h-4 w-4" /></Button>}</div>
      </div>
    </header>
    {children}
    <footer className="container flex flex-wrap justify-center gap-5 px-4 py-8 text-xs text-muted-foreground"><Link to="/terms">Terms of use</Link><Link to="/privacy">Privacy policy</Link></footer>
  </div>;
}