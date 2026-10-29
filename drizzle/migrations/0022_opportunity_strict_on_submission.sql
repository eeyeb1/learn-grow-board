CREATE OR REPLACE FUNCTION public.check_opportunity(j public.jobs, strict boolean) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d jsonb := j.opportunity_details; k text; sd date; ed date; cd date; h numeric; o numeric;
BEGIN
  IF j.category IS NOT NULL AND j.category NOT IN ('shadowing','learning_project','paid_task','paid_job') THEN RAISE EXCEPTION 'Choose a valid opportunity category'; END IF;
  IF jsonb_typeof(d) <> 'object' THEN RAISE EXCEPTION 'Invalid opportunity details'; END IF;
  FOR k IN SELECT jsonb_object_keys(d) LOOP
    IF k NOT IN ('department','remote_preference','schedule','start_date','end_date','estimated_hours','openings','audience','eligibility','payment_details','expense_details','accessibility_notes','no_productive_work_confirmed') THEN RAISE EXCEPTION 'Unknown opportunity field: %', k; END IF;
    IF k IN ('estimated_hours','openings') AND jsonb_typeof(d->k) NOT IN ('number','null') THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
    IF k = 'no_productive_work_confirmed' AND jsonb_typeof(d->k) <> 'boolean' THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
    IF k NOT IN ('estimated_hours','openings','no_productive_work_confirmed') AND (jsonb_typeof(d->k) <> 'string' OR length(d->>k) > 3000) THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
  END LOOP;
  IF length(j.title) > 160 OR length(j.description) > 10000 OR length(coalesce(j.mentorship_details,'')) > 3000 OR length(coalesce(j.location,'')) > 200 THEN RAISE EXCEPTION 'A field is too long'; END IF;
  IF j.location_type NOT IN ('remote','onsite','hybrid') THEN RAISE EXCEPTION 'Invalid location type'; END IF;
  BEGIN sd := nullif(d->>'start_date','')::date; ed := nullif(d->>'end_date','')::date; cd := (j.expires_at AT TIME ZONE 'UTC')::date;
  EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid date'; END;
  IF sd IS NOT NULL AND ed IS NOT NULL AND ed < sd THEN RAISE EXCEPTION 'End date must be on or after the start date'; END IF;
  IF sd IS NOT NULL AND cd IS NOT NULL AND cd > sd THEN RAISE EXCEPTION 'Applications must close on or before the start date'; END IF;
  h := (d->>'estimated_hours')::numeric; o := (d->>'openings')::numeric;
  IF h IS NOT NULL AND (h <= 0 OR h > 2000) THEN RAISE EXCEPTION 'Estimated hours must be between 1 and 2000'; END IF;
  IF o IS NOT NULL AND (o < 1 OR o > 100 OR o <> trunc(o)) THEN RAISE EXCEPTION 'Openings must be a whole number from 1 to 100'; END IF;
  IF NOT strict THEN RETURN; END IF;
  IF j.category IS NULL THEN RAISE EXCEPTION 'Choose an opportunity category'; END IF;
  IF length(btrim(j.title)) < 5 THEN RAISE EXCEPTION 'Title must be at least 5 characters'; END IF;
  IF length(btrim(j.description)) < 30 THEN RAISE EXCEPTION 'Describe the expected activities in at least 30 characters'; END IF;
  IF j.location_type <> 'remote' AND length(btrim(coalesce(j.location,''))) < 2 THEN RAISE EXCEPTION 'Location is required for on-site or hybrid opportunities'; END IF;
  IF length(btrim(coalesce(j.mentorship_details,''))) < 30 THEN RAISE EXCEPTION 'Describe supervisor arrangements in at least 30 characters'; END IF;
  IF coalesce(array_length(j.what_you_will_learn,1),0) = 0 THEN RAISE EXCEPTION 'Add at least one learning objective'; END IF;
  IF sd IS NULL OR ed IS NULL OR cd IS NULL THEN RAISE EXCEPTION 'Start, end and application closing dates are required'; END IF;
  IF cd < current_date THEN RAISE EXCEPTION 'The application closing date has passed'; END IF;
  IF h IS NULL OR o IS NULL THEN RAISE EXCEPTION 'Estimated hours and openings are required'; END IF;
  IF length(btrim(coalesce(j.duration,''))) < 3 THEN RAISE EXCEPTION 'Add the estimated schedule'; END IF;
  IF length(btrim(coalesce(d->>'audience',''))) < 3 OR length(btrim(coalesce(d->>'eligibility',''))) < 3 THEN RAISE EXCEPTION 'Intended audience and eligibility are required'; END IF;
  IF j.category IN ('paid_task','paid_job') AND length(btrim(coalesce(d->>'payment_details',''))) < 10 THEN RAISE EXCEPTION 'Paid opportunities must state the pay rate and arrangements'; END IF;
  IF j.category IN ('shadowing','learning_project') AND coalesce((d->>'no_productive_work_confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Confirm that unpaid learning participants will not do work the company would otherwise pay for, or choose a paid category'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_opportunity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.category IS NULL AND NEW.opportunity_details = '{}'::jsonb THEN RETURN NEW; END IF;
  PERFORM public.check_opportunity(NEW, NEW.status <> 'draft');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.request_job_publication(_job_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE j jobs%ROWTYPE; rid uuid; BEGIN SELECT * INTO j FROM jobs WHERE id=_job_id FOR UPDATE; IF auth.uid() IS NULL OR NOT FOUND OR j.status<>'draft' OR NOT public.company_job_permission(j.id,auth.uid(),'edit') THEN RAISE EXCEPTION 'An authorised draft is required'; END IF; IF j.category IS NULL AND NOT public.company_permission(j.company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Complete the guided opportunity form before requesting review'; END IF; IF j.category IS NOT NULL THEN PERFORM public.check_opportunity(j, true); END IF; INSERT INTO job_publication_requests(company_id,job_id,requested_by,revision) VALUES(j.company_id,j.id,auth.uid(),j.publication_revision) ON CONFLICT(job_id,revision) DO UPDATE SET status='pending',requested_by=excluded.requested_by,reviewed_by=NULL,reviewed_at=NULL,note=NULL RETURNING id INTO rid; RETURN rid; END $$;
REVOKE ALL ON FUNCTION public.check_opportunity(public.jobs, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_opportunity(public.jobs, boolean) TO authenticated;