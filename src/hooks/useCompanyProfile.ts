import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
      // Check user type from profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", user.id)
        .maybeSingle();

      const userIsCompany = profileData?.user_type === "company";
      setIsCompany(userIsCompany);

      if (userIsCompany) {
        // Fetch company profile
        const { data: companyData } = await supabase
          .from("company_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        setCompanyProfile(companyData);
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

    // First update user type to company
    await supabase
      .from("profiles")
      .update({ user_type: "company" })
      .eq("user_id", user.id);

    // Then create company profile
    const { data: newProfile, error } = await supabase
      .from("company_profiles")
      .insert({
        user_id: user.id,
        company_name: data.company_name,
        company_description: data.company_description,
        company_website: data.company_website,
        industry: data.industry,
      })
      .select()
      .single();

    if (!error && newProfile) {
      setCompanyProfile(newProfile);
      setIsCompany(true);
    }

    return { data: newProfile, error };
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
