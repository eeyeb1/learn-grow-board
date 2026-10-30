import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { jobDetails, type JobDetail } from "@/data/jobDetails";
import { transformDbJobToDetail } from "@/lib/jobDetail";
import { acceptsApplications } from "@/lib/opportunityStatus";
import type { Job } from "@/hooks/useJobs";

/** Resolves sample listings locally and real listings from the database (RLS: only published are public). */
export function useJobDetail(id: string | undefined) {
  const local = id ? jobDetails[id] : undefined;
  const [job, setJob] = useState<JobDetail | null>(local ?? null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(!local && !!id);

  useEffect(() => {
    if (!id || jobDetails[id]) { setJob(id ? jobDetails[id] : null); setOpen(true); setLoading(false); return; }
    let live = true;
    setLoading(true);
    void supabase.from("jobs").select("*, company:company_profiles(company_name, company_description, company_website, industry, logo_url)").eq("id", id).maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        const row = data as unknown as Job | null;
        setJob(row ? transformDbJobToDetail(row) : null);
        setOpen(row ? acceptsApplications(row.status, row.expires_at) : false);
        setLoading(false);
      });
    return () => { live = false; };
  }, [id]);

  return { job, open, loading };
}
