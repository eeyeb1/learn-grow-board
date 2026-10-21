import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CompanyAccess } from '@/lib/companyAccess';

export function useCompanyAccess() {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<CompanyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setAccess(null); setError('');
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const validated = await supabase.auth.getUser();
    if (validated.error || !validated.data.user) { setError('Your session has expired. Please sign in again.'); setLoading(false); return; }
    const result = await supabase.rpc('get_company_access');
    if (result.error) setError('We could not check your company access. Please try again.');
    else setAccess(result.data as unknown as CompanyAccess);
    setLoading(false);
  }, [user?.id, authLoading]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { access, loading, error, refresh };
}