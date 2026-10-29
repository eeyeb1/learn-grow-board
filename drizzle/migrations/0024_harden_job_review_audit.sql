REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.job_review_events FROM authenticated, anon;
REVOKE ALL ON public.job_review_events FROM anon;
CREATE TRIGGER job_review_events_no_delete BEFORE DELETE ON public.job_review_events FOR EACH ROW EXECUTE FUNCTION public.guard_job_review_events();
DROP POLICY "Company authorised job deletes" ON public.jobs;
CREATE POLICY "Company authorised job deletes" ON public.jobs FOR DELETE TO authenticated USING (
  NOT EXISTS (SELECT 1 FROM public.job_review_events e WHERE e.job_id = jobs.id)
  AND ((public.company_permission(company_id,auth.uid(),'admin') AND status = 'draft') OR (created_by=auth.uid() AND status = 'draft' AND public.company_can_draft(company_id,auth.uid()))));