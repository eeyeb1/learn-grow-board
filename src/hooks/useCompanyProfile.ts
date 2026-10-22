import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CompanyAccess } from '@/lib/companyAccess';

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_description: string | null;
  company_website: string | null;
  industry: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useCompanyProfile = () => {
  const { user } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompany, setIsCompany] = useState(false);

  const fetchCompanyProfile = useCallback(async () => {
    if (!user) {
      setCompanyProfile(null);
      setIsCompany(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setCompanyProfile(null);
      setIsCompany(false);
      const { data, error } = await supabase.rpc('get_company_access');
      if (error) return;
      const access = data as unknown as CompanyAccess;
      const requested = new URLSearchParams(window.location.search).get('company');
      const context = access.contexts.find(c => c.state === 'company_admin' && (!requested || c.company_id === requested));
      if (context) {
        // Fetch company profile
        const { data: companyData } = await supabase
          .from("company_profiles")
          .select("*")
          .eq("id", context.company_id)
          .maybeSingle();

        setCompanyProfile(companyData);
        setIsCompany(!!companyData);
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  const createCompanyProfile = async (data: {
    company_name: string;
    company_description?: string;
    company_website?: string;
    industry?: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.rpc('request_company_access', { _pathway: 'register', _company_name: data.company_name, _website: data.company_website || '' });
    await fetchCompanyProfile();
    return { error };
  };

  const updateCompanyProfile = async (data: Partial<CompanyProfile>) => {
    if (!user || !companyProfile) return { error: new Error("No company profile") };

    const { data: updatedProfile, error } = await supabase
      .from("company_profiles")
      .update(data)
      .eq("id", companyProfile.id)
      .select()
      .single();

    if (!error && updatedProfile) {
      setCompanyProfile(updatedProfile);
    }

    return { data: updatedProfile, error };
  };

  return {
    companyProfile,
    isCompany,
    loading,
    createCompanyProfile,
    updateCompanyProfile,
    refreshProfile: fetchCompanyProfile,
  };
};
