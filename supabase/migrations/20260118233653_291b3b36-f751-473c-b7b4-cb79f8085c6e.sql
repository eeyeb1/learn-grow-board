-- Allow companies to delete applications to their jobs
CREATE POLICY "Companies can delete applications to their jobs" 
ON public.applications 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM jobs
  WHERE ((jobs.id)::text = applications.job_id) 
  AND (jobs.company_id IN ( 
    SELECT company_profiles.id
    FROM company_profiles
    WHERE (company_profiles.user_id = auth.uid())
  ))
));