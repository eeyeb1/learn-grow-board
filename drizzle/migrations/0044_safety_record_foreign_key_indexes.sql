CREATE INDEX listing_safety_assessments_job_idx ON public.listing_safety_assessments(job_id);
CREATE INDEX safety_reports_application_idx ON public.safety_reports(application_id);
CREATE INDEX safety_reports_company_idx ON public.safety_reports(company_id);
CREATE INDEX safety_reports_job_idx ON public.safety_reports(job_id);
CREATE INDEX safety_reports_placement_idx ON public.safety_reports(placement_id);
