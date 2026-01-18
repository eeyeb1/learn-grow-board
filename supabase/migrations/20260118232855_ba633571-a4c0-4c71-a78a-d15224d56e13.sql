-- Add policy for companies to update application status for their jobs
CREATE POLICY "Companies can update applications to their jobs"
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id::text = applications.job_id
    AND jobs.company_id IN (
      SELECT id FROM public.company_profiles
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id::text = applications.job_id
    AND jobs.company_id IN (
      SELECT id FROM public.company_profiles
      WHERE user_id = auth.uid()
    )
  )
);