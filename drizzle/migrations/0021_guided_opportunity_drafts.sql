ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category text, ADD COLUMN IF NOT EXISTS opportunity_details jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE FUNCTION public.validate_opportunity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d jsonb := NEW.opportunity_details; k text; sd date; ed date; cd date; h numeric; o int;
BEGIN
  IF NEW.category IS NULL THEN RETURN NEW; END IF;
  IF NEW.category NOT IN ('shadowing','learning_project','paid_task','paid_job') THEN RAISE EXCEPTION 'Choose a valid opportunity category'; END IF;
  IF jsonb_typeof(d) <> 'object' THEN RAISE EXCEPTION 'Invalid opportunity details'; END IF;
  FOR k IN SELECT jsonb_object_keys(d) LOOP
    IF k NOT IN ('department','remote_preference','schedule','start_date','end_date','estimated_hours','openings','audience','eligibility','payment_details','expense_details','accessibility_notes','no_productive_work_confirmed') THEN RAISE EXCEPTION 'Unknown opportunity field: %', k; END IF;
    IF k NOT IN ('estimated_hours','openings','no_productive_work_confirmed') AND (jsonb_typeof(d->k) <> 'string' OR length(d->>k) > 3000) THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
  END LOOP;
  IF length(btrim(NEW.title)) NOT BETWEEN 5 AND 160 THEN RAISE EXCEPTION 'Title must be 5 to 160 characters'; END IF;
  IF length(btrim(NEW.description)) NOT BETWEEN 30 AND 10000 THEN RAISE EXCEPTION 'Describe the expected activities in at least 30 characters'; END IF;
  IF NEW.location_type NOT IN ('remote','onsite','hybrid') THEN RAISE EXCEPTION 'Invalid location type'; END IF;
  IF NEW.location_type <> 'remote' AND length(btrim(coalesce(NEW.location,''))) < 2 THEN RAISE EXCEPTION 'Location is required for on-site or hybrid opportunities'; END IF;
  IF length(btrim(coalesce(NEW.mentorship_details,''))) < 30 THEN RAISE EXCEPTION 'Describe supervisor arrangements in at least 30 characters'; END IF;
  IF coalesce(array_length(NEW.what_you_will_learn,1),0) = 0 THEN RAISE EXCEPTION 'Add at least one learning objective'; END IF;
  BEGIN
    sd := nullif(d->>'start_date','')::date; ed := nullif(d->>'end_date','')::date;
    cd := (NEW.expires_at AT TIME ZONE 'UTC')::date;
  EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid date'; END;
  IF sd IS NULL OR ed IS NULL OR cd IS NULL THEN RAISE EXCEPTION 'Start, end and application closing dates are required'; END IF;
  IF ed < sd THEN RAISE EXCEPTION 'End date must be on or after the start date'; END IF;
  IF cd > sd THEN RAISE EXCEPTION 'Applications must close on or before the start date'; END IF;
  IF jsonb_typeof(d->'estimated_hours') <> 'number' OR jsonb_typeof(d->'openings') <> 'number' THEN RAISE EXCEPTION 'Estimated hours and openings are required'; END IF;
  h := (d->>'estimated_hours')::numeric; o := (d->>'openings')::numeric::int;
  IF h <= 0 OR h > 2000 THEN RAISE EXCEPTION 'Estimated hours must be between 1 and 2000'; END IF;
  IF o < 1 OR o > 100 OR (d->>'openings')::numeric <> o THEN RAISE EXCEPTION 'Openings must be a whole number from 1 to 100'; END IF;
  IF length(btrim(coalesce(d->>'audience',''))) < 3 OR length(btrim(coalesce(d->>'eligibility',''))) < 3 THEN RAISE EXCEPTION 'Intended audience and eligibility are required'; END IF;
  IF NEW.category IN ('paid_task','paid_job') AND length(btrim(coalesce(d->>'payment_details',''))) < 10 THEN RAISE EXCEPTION 'Paid opportunities must state the pay rate and arrangements'; END IF;
  IF NEW.category IN ('shadowing','learning_project') AND coalesce((d->>'no_productive_work_confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Confirm that unpaid learning participants will not do work the company would otherwise pay for, or choose a paid category'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_opportunity BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.validate_opportunity();

CREATE TABLE public.job_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  version integer NOT NULL,
  saved_by uuid,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, version)
);
GRANT SELECT ON public.job_versions TO authenticated;
GRANT ALL ON public.job_versions TO service_role;
ALTER TABLE public.job_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorised readers see job versions" ON public.job_versions FOR SELECT TO authenticated USING (public.company_job_permission(job_id, auth.uid(), 'read'));

CREATE FUNCTION public.record_job_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE snap jsonb; last job_versions%ROWTYPE;
BEGIN
  snap := jsonb_build_object('title',NEW.title,'category',NEW.category,'description',NEW.description,'location',NEW.location,'location_type',NEW.location_type,'duration',NEW.duration,'hours_per_week',NEW.hours_per_week,'what_you_will_learn',NEW.what_you_will_learn,'responsibilities',NEW.responsibilities,'mentorship_details',NEW.mentorship_details,'expires_at',NEW.expires_at,'status',NEW.status,'opportunity_details',NEW.opportunity_details);
  SELECT * INTO last FROM job_versions WHERE job_id=NEW.id ORDER BY version DESC LIMIT 1;
  IF FOUND AND last.snapshot - 'status' = snap - 'status' AND last.snapshot->>'status' = snap->>'status' THEN RETURN NEW; END IF;
  IF FOUND AND last.saved_by IS NOT DISTINCT FROM auth.uid() AND last.updated_at > now() - interval '10 minutes' AND last.snapshot->>'status' = snap->>'status' THEN
    UPDATE job_versions SET snapshot=snap, updated_at=now() WHERE id=last.id;
  ELSE
    INSERT INTO job_versions(job_id,version,saved_by,snapshot) VALUES (NEW.id, coalesce(last.version,0)+1, auth.uid(), snap);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_job_version() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_job_version AFTER INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.record_job_version();