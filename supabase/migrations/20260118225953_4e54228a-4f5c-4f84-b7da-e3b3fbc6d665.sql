-- Add policy for companies to view applications to their jobs
CREATE POLICY "Companies can view applications to their jobs"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id::text = applications.job_id
    AND jobs.company_id IN (
      SELECT id FROM public.company_profiles
      WHERE user_id = auth.uid()
    )
  )
);