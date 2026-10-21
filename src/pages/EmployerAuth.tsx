import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Building2, Users, Mail, Eye, EyeOff, Loader2, ShieldCheck, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EmployerShell from '@/components/EmployerShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

export default function EmployerAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const register = location.pathname.endsWith('/register');
  const forgot = location.pathname.endsWith('/forgot-password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pathway, setPathway] = useState<'register' | 'join'>('register');
  if (user && !forgot && !loading) return <Navigate to={register ? '/employer/onboarding' : '/employer/workspace'} replace />;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (forgot) {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setNotice('If an account uses this email, a password reset link will arrive shortly.');
      } else if (register) {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/employer/onboarding`, data: { full_name: name.trim() } } });
        if (result.error) throw result.error;
        // Account preference is not authority; onboarding is resumed only after a validated sign-in.
        sessionStorage.setItem('employer-pathway', pathway);
        setNotice('Check your email to confirm your account. Already registered as a seeker? Sign in with that same account to continue.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) {
          if (result.error.code === 'email_not_confirmed') setError('Please verify your email before signing in. You can resend the confirmation below.');
          else if (result.error.status === 429) setError('Too many attempts. Please wait before trying again.');
          else setError('Sign-in failed. Check your email and password, or reset your password.');
        }
      }
    } catch { setError('We could not complete that request. Please check your details and try again shortly.'); }
    finally { setBusy(false); }
  }
  async function social(provider: 'google' | 'lovable') {
    if (busy) return; setBusy(true); setError('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/employer/sign-in` });
      if (result.error) setError('Sign-in could not be completed. Please try again.');
    } catch { setError('Sign-in is temporarily unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (!email.trim() || busy) return; setBusy(true); setError('');
    const result = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/employer/onboarding` } });
    setBusy(false);
    if (result.error) setError('We could not resend the email. Please wait and try again.');
    else setNotice('If confirmation is needed, a new link will arrive in your inbox.');
  }
  return <EmployerShell><main className="mx-auto max-w-lg px-5 py-10 sm:py-14">
    <div className="mb-8"><span className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary"><Building2 className="h-5 w-5" />Company access</span><h1 className="font-display text-3xl font-bold">{forgot ? 'Reset your password' : register ? 'Employer registration' : 'Employer Sign In'}</h1><p className="mt-3 text-muted-foreground">{forgot ? 'Enter the email address for your existing account.' : register ? 'Use your existing account or create one to request company access.' : 'Welcome back to your company workspace.'}</p></div>
    {register && <div className="mb-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="Registration pathway"><Button variant={pathway === 'register' ? 'default' : 'outline'} className="h-auto whitespace-normal py-4" aria-pressed={pathway === 'register'} onClick={() => setPathway('register')}><Building2 className="mr-2 h-5 w-5 shrink-0" />Register my company</Button><Button variant={pathway === 'join' ? 'default' : 'outline'} className="h-auto whitespace-normal py-4" aria-pressed={pathway === 'join'} onClick={() => setPathway('join')}><Users className="mr-2 h-5 w-5 shrink-0" />Join a company as an employee</Button></div>}
    {error && <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-lg border border-border bg-accent p-4 text-sm text-accent-foreground">{notice}</p>}
    <form onSubmit={submit} className="space-y-5">
      {register && <div className="space-y-2"><Label htmlFor="employer-name">Full name</Label><Input id="employer-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={100} required /></div>}
      <div className="space-y-2"><Label htmlFor="employer-email">{register && pathway === 'join' ? 'Company email address' : 'Email address'}</Label><Input id="employer-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      {!forgot && <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="employer-password">Password</Label>{!register && <Link className="text-sm text-primary hover:underline" to="/employer/forgot-password">Forgot password?</Link>}</div><div className="relative"><Input id="employer-password" type={show ? 'text' : 'password'} className="pr-12" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} required /><Button type="button" size="icon" variant="ghost" className="absolute right-0 top-0" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{register && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}</div>}
      <Button className="w-full" type="submit" disabled={busy || loading}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{forgot ? 'Send reset link' : register ? 'Create account' : 'Sign in'}</Button>
    </form>
    {!forgot && <><div className="my-6 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div><div className="grid gap-3"><Button variant="outline" disabled={busy} onClick={() => void social('google')}><Chrome className="mr-2 h-4 w-4" />Continue with Google</Button><Button variant="outline" disabled={busy} onClick={() => void social('lovable')}>Sign in with Lovable</Button></div><Button variant="link" className="mt-3 h-auto px-0 text-sm" disabled={!email || busy} onClick={() => void resend()}><Mail className="mr-2 h-4 w-4" />Resend verification email</Button></>}
    <div className="mt-7 border-t border-border pt-5 text-sm"><Link className="text-primary hover:underline" to={register || forgot ? '/employer/sign-in' : '/employer/register'}>{register || forgot ? 'Already have an account? Sign in' : 'New here? Register your company or join as an employee'}</Link></div>
    {!forgot && <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Company email verification does not grant membership or authority to publish. Company access requires the appropriate approval.</p>}
  </main></EmployerShell>;
}