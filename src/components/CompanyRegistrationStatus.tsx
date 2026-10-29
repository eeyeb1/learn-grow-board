import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { registrationStatus } from '@/lib/companyRegistration';
import type { Tables } from '@/integrations/supabase/types';

export default function CompanyRegistrationStatus() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tables<'company_registration_submissions'>[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!user) return;
    setLoading(true); setError('');
    const result = await supabase.from('company_registration_submissions').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false });
    if (result.error) setError('Could not load your registration status.'); else setRows(result.data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [user?.id]);
  return <section className="border-b border-border py-7 space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Company registrations</h2><Button size="sm" variant="ghost" disabled={loading} onClick={() => void load()}>Refresh registrations</Button></div>
    {loading ? <p role="status" className="text-sm text-muted-foreground">Loading registrations…</p> : error ? <p role="alert" className="text-destructive">{error}</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No company registration submitted.</p> : rows.map(s => <article key={s.id} className="border border-border rounded-lg p-5 space-y-3"><div className="flex flex-wrap justify-between gap-3"><h3 className="break-words font-semibold">{s.legal_name}</h3><Badge variant={s.status === 'verified' ? 'default' : 'outline'}>{registrationStatus[s.status as keyof typeof registrationStatus] ?? s.status}</Badge></div><p className="text-xs text-muted-foreground">Submitted {new Date(s.submitted_at).toLocaleString()}{s.reviewed_at && ` · Reviewed ${new Date(s.reviewed_at).toLocaleString()}`}</p><p className="text-sm text-muted-foreground">{s.decision_message ?? 'Business legitimacy and your authority to represent it are awaiting independent review. No company access has been granted.'}</p>{s.status === 'verified' && s.company_id && <Button asChild variant="outline"><Link to={`/employer/dashboard?company=${s.company_id}`}>Open company dashboard</Link></Button>}</article>)}
  </section>;
}