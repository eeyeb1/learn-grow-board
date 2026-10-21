import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmployerShell from '@/components/EmployerShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [recovery, setRecovery] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy || !recovery) return; setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const checked = await supabase.auth.getUser();
    if (checked.error || !checked.data.user) { setError('Your reset link has expired. Request a new link.'); setBusy(false); return; }
    const result = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (result.error) setError('Password could not be changed. Use a different password or request a new reset link.');
    else { setDone(true); await supabase.auth.signOut(); }
  }
  return <EmployerShell><main className="mx-auto max-w-md px-5 py-12"><h1 className="font-display text-3xl font-bold">Set a new password</h1>{done ? <div className="mt-6"><p role="status">Your password has been updated.</p><Button asChild className="mt-5"><Link to="/employer/sign-in">Employer sign in</Link></Button><Button asChild variant="ghost" className="mt-5"><Link to="/">Seeker sign in</Link></Button></div> : !recovery ? <div className="mt-6"><p>This page needs a valid password reset link.</p><Button asChild className="mt-5"><Link to="/employer/forgot-password">Request a reset link</Link></Button></div> : <form className="mt-7 space-y-5" onSubmit={submit}>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} /></div><Button className="w-full" type="submit" disabled={busy}>Update password</Button></form>}</main></EmployerShell>;
}