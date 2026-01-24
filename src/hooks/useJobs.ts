import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyProfile } from "./useCompanyProfile";

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  location_type: string;
  duration: string | null;
  hours_per_week: string | null;
  skill_level: string;
  industry: string | null;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  what_you_will_learn: string[];
  mentorship_details: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  company?: {
    company_name: string;
    company_description: string | null;
    company_website: string | null;
    industry: string | null;
    logo_url: string | null;
  };
}

export interface CreateJobData {
  title: string;
  description: string;
  location?: string;
  location_type: string;
  duration?: string;
  hours_per_week?: string;
  skill_level: string;
  industry?: string;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  what_you_will_learn: string[];
  mentorship_details?: string;
}

export const useJobs = () => {
  const { companyProfile } = useCompanyProfile();
  const [loading, setLoading] = useState(false);

  const createJob = useCallback(
    async (data: CreateJobData) => {
      if (!companyProfile) {
        return { error: new Error("No company profile found") };
      }

      setLoading(true);
      try {
        const { data: newJob, error } = await supabase
          .from("jobs")
          .insert({
            company_id: companyProfile.id,
            title: data.title,
            description: data.description,
            location: data.location,
            location_type: data.location_type,
            duration: data.duration,
            hours_per_week: data.hours_per_week,
            skill_level: data.skill_level,
            industry: data.industry,
            skills: data.skills,
            responsibilities: data.responsibilities,
            requirements: data.requirements,
            what_you_will_learn: data.what_you_will_learn,
            mentorship_details: data.mentorship_details,
            status: "active",
          })
          .select()
          .single();

        return { data: newJob, error };
      } finally {
        setLoading(false);
      }
    },
    [companyProfile]
  );

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          company:company_profiles(
            company_name,
            company_description,
            company_website,
            industry,
            logo_url
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      return { data, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyJobs = useCallback(async () => {
    if (!companyProfile) return { data: null, error: new Error("No company profile") };

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", companyProfile.id)
        .order("created_at", { ascending: false });

      return { data, error };
    } finally {
      setLoading(false);
    }
  }, [companyProfile]);

  return {
    loading,
    createJob,
    fetchJobs,
    fetchMyJobs,
  };
};
