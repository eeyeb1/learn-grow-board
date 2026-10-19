CREATE POLICY "Seekers view jobs for their placements" ON public.jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.placements p WHERE p.job_id = jobs.id AND p.user_id = auth.uid()));
CREATE POLICY "Companies view their own jobs" ON public.jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.company_profiles c WHERE c.id = jobs.company_id AND c.user_id = auth.uid()));