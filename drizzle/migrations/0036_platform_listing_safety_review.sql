ALTER TABLE public.jobs
  ADD COLUMN safety_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN safety_flags text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE public.listing_safety_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.job_publication_requests(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  revision integer NOT NULL,
  reviewer_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('cleared','changes_required','escalated')),
  note text NOT NULL CHECK (char_length(note) BETWEEN 20 AND 4000),
  checks jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.listing_safety_assessments TO service_role;
ALTER TABLE public.listing_safety_assessments ENABLE ROW LEVEL SECURITY;
CREATE INDEX listing_safety_assessments_request_idx ON public.listing_safety_assessments(request_id, created_at DESC);
CREATE FUNCTION public.guard_listing_safety_assessments() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Safety assessment history is append-only'; END $$;
CREATE TRIGGER listing_safety_assessments_immutable BEFORE UPDATE OR DELETE ON public.listing_safety_assessments FOR EACH ROW EXECUTE FUNCTION public.guard_listing_safety_assessments();
REVOKE ALL ON FUNCTION public.guard_listing_safety_assessments() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.opportunity_safety_flags(j public.jobs) RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE f text[] := '{}'::text[]; d jsonb := j.opportunity_details; txt text;
BEGIN
  txt := concat_ws(' ',j.title,j.description);
  IF j.category IN ('shadowing','learning_project') AND txt ~* '(customers?|clients?|sales?|sell|serving|deliverables?|production|shifts?|covering|stock|cleaning|data entry|billable|revenue|campaign)' THEN f:=array_append(f,'unpaid_productive_work'); END IF;
  IF j.category IN ('shadowing','learning_project') AND coalesce(nullif(d->>'estimated_hours','')::numeric,0)>80 THEN f:=array_append(f,'extended_unpaid_hours'); END IF;
  IF length(btrim(coalesce(j.mentorship_details,'')))<60 OR j.mentorship_details !~* '(supervis|mentor|manager|lead|named|check-in|daily|weekly)' THEN f:=array_append(f,'unclear_supervision'); END IF;
  IF d->>'under_18_policy'='safeguarded' AND length(btrim(coalesce(d->>'safeguarding_contact','')))<20 THEN f:=array_append(f,'under18_safeguarding'); END IF;
  IF coalesce(d->>'eligibility','') ~* '(no (women|men|disabled|foreigners|immigrants)|only (men|women|white)|must be (male|female))' THEN f:=array_append(f,'potential_discrimination'); END IF;
  RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.opportunity_safety_flags(public.jobs) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.opportunity_safety_flags(public.jobs) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_opportunity(j public.jobs, strict boolean) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d jsonb := j.opportunity_details; k text; sd date; ed date; cd date; h numeric; o numeric;
BEGIN
  IF j.category IS NOT NULL AND j.category NOT IN ('shadowing','learning_project','paid_task','paid_job') THEN RAISE EXCEPTION 'Choose a valid opportunity category'; END IF;
  IF jsonb_typeof(d) <> 'object' THEN RAISE EXCEPTION 'Invalid opportunity details'; END IF;
  FOR k IN SELECT jsonb_object_keys(d) LOOP
    IF k NOT IN ('department','remote_preference','schedule','start_date','end_date','estimated_hours','openings','audience','eligibility','payment_details','expense_details','accessibility_notes','no_productive_work_confirmed','safeguarding_contact','under_18_policy','workplace_arrangements') THEN RAISE EXCEPTION 'Unknown opportunity field: %', k; END IF;
    IF k IN ('estimated_hours','openings') AND jsonb_typeof(d->k) NOT IN ('number','null') THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
    IF k = 'no_productive_work_confirmed' AND jsonb_typeof(d->k) <> 'boolean' THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
    IF k NOT IN ('estimated_hours','openings','no_productive_work_confirmed') AND (jsonb_typeof(d->k) <> 'string' OR length(d->>k) > 3000) THEN RAISE EXCEPTION 'Invalid value for %', k; END IF;
  END LOOP;
  IF length(j.title) > 160 OR length(j.description) > 10000 OR length(coalesce(j.mentorship_details,'')) > 3000 OR length(coalesce(j.location,'')) > 200 THEN RAISE EXCEPTION 'A field is too long'; END IF;
  IF j.location_type NOT IN ('remote','onsite','hybrid') THEN RAISE EXCEPTION 'Invalid location type'; END IF;
  IF coalesce(d->>'under_18_policy','') NOT IN ('','safeguarded','adults_only') THEN RAISE EXCEPTION 'Choose a valid under-18 policy'; END IF;
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
  IF length(btrim(coalesce(j.hours_per_week,''))) < 1 THEN RAISE EXCEPTION 'Describe the expected hours per week'; END IF;
  IF length(btrim(coalesce(d->>'workplace_arrangements',''))) < 10 THEN RAISE EXCEPTION 'Describe the workplace arrangements'; END IF;
  IF length(btrim(coalesce(d->>'safeguarding_contact',''))) < 10 THEN RAISE EXCEPTION 'Name a safeguarding contact and how to raise a concern'; END IF;
  IF coalesce(d->>'under_18_policy','') NOT IN ('safeguarded','adults_only') THEN RAISE EXCEPTION 'Choose whether under-18s can take part with safeguards'; END IF;
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
  NEW.safety_flags := public.opportunity_safety_flags(NEW);
  NEW.safety_review_required := cardinality(NEW.safety_flags)>0;
  IF NEW.category IS NULL AND NEW.opportunity_details = '{}'::jsonb THEN RETURN NEW; END IF;
  PERFORM public.check_opportunity(NEW, NEW.status <> 'draft');
  RETURN NEW;
END $$;

UPDATE public.jobs SET safety_flags=public.opportunity_safety_flags(jobs), safety_review_required=cardinality(public.opportunity_safety_flags(jobs))>0;

CREATE OR REPLACE FUNCTION public.record_listing_safety_assessment(_request_id uuid, _decision text, _note text, _checks jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r job_publication_requests%ROWTYPE; j jobs%ROWTYPE; aid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
  SELECT * INTO r FROM job_publication_requests WHERE id=_request_id FOR UPDATE;
  SELECT * INTO j FROM jobs WHERE id=r.job_id FOR UPDATE;
  IF r.id IS NULL OR r.platform_status IS DISTINCT FROM 'pending' OR j.status<>'pending_platform' OR r.revision<>j.publication_revision OR r.approved_snapshot IS DISTINCT FROM public.job_material(j) THEN RAISE EXCEPTION 'This opportunity is no longer awaiting platform review'; END IF;
  IF _decision NOT IN ('cleared','changes_required','escalated') THEN RAISE EXCEPTION 'Choose a safety assessment outcome'; END IF;
  IF length(btrim(coalesce(_note,''))) NOT BETWEEN 20 AND 4000 THEN RAISE EXCEPTION 'Record a human assessment of 20 to 4000 characters'; END IF;
  IF _decision='cleared' AND NOT (coalesce((_checks->>'tasks_reviewed')::boolean,false) AND coalesce((_checks->>'employment_law_reviewed')::boolean,false) AND coalesce((_checks->>'safeguarding_reviewed')::boolean,false)) THEN RAISE EXCEPTION 'Confirm the task, employment-law and safeguarding checks before clearing this listing'; END IF;
  INSERT INTO listing_safety_assessments(request_id,job_id,revision,reviewer_id,decision,note,checks) VALUES(r.id,j.id,r.revision,auth.uid(),_decision,btrim(_note),coalesce(_checks,'{}'::jsonb)) RETURNING id INTO aid;
  PERFORM public._job_event(j,r.id,'platform_admin','safety_'||_decision,'pending_platform','pending_platform',btrim(_note));
  IF _decision<>'cleared' THEN PERFORM public._notify(r.requested_by,'company','job-safety-assessment:'||aid,'Opportunity safety assessment','Your opportunity needs further safety review.',CASE WHEN _decision='changes_required' THEN 'A platform reviewer requested changes: ' ELSE 'A platform reviewer escalated the listing for further assessment: ' END||btrim(_note),'/employer/drafts?company='||r.company_id::text); END IF;
  RETURN aid;
END $$;

DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.review_job_submission(uuid,text,text)'::regprocedure) INTO d;
  d:=replace(d,'platform := j.category IN (''shadowing'',''learning_project'') OR','platform := j.safety_review_required OR j.category IN (''shadowing'',''learning_project'') OR');
  IF d NOT LIKE '%j.safety_review_required%' THEN RAISE EXCEPTION 'Could not add listing safety gate'; END IF;
  EXECUTE d;
  SELECT pg_get_functiondef('public.platform_review_job(uuid,boolean,text)'::regprocedure) INTO d;
  d:=replace(d,'DECLARE r job_publication_requests%ROWTYPE; j jobs%ROWTYPE; nxt text;','DECLARE r job_publication_requests%ROWTYPE; j jobs%ROWTYPE; nxt text; assessment text;');
  d:=replace(d,'nxt := CASE WHEN _approve THEN ''active'' ELSE ''rejected'' END;',E'IF _approve AND j.safety_review_required THEN\n    SELECT a.decision INTO assessment FROM listing_safety_assessments a WHERE a.request_id=r.id AND a.revision=r.revision ORDER BY a.created_at DESC LIMIT 1;\n    IF assessment IS DISTINCT FROM ''cleared'' THEN RAISE EXCEPTION ''A documented human safety assessment must clear every flag before publication''; END IF;\n  END IF;\n  nxt := CASE WHEN _approve THEN ''active'' ELSE ''rejected'' END;');
  IF d NOT LIKE '%documented human safety assessment%' THEN RAISE EXCEPTION 'Could not add publication assessment gate'; END IF;
  EXECUTE d;
END $$;

CREATE OR REPLACE FUNCTION public.list_platform_job_reviews() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
  RETURN jsonb_build_object(
   'pending',coalesce((SELECT jsonb_agg(jsonb_build_object('request_id',r.id,'job_id',j.id,'company_name',c.company_name,'revision',r.revision,'company_note',r.note,'company_reviewed_at',r.reviewed_at,'snapshot',r.approved_snapshot,'safety_flags',j.safety_flags,'safety_review_required',j.safety_review_required,'assessments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'decision',a.decision,'note',a.note,'checks',a.checks,'created_at',a.created_at,'reviewer_id',a.reviewer_id) ORDER BY a.created_at DESC) FROM listing_safety_assessments a WHERE a.request_id=r.id),'[]'::jsonb)) ORDER BY r.reviewed_at) FROM job_publication_requests r JOIN jobs j ON j.id=r.job_id JOIN company_profiles c ON c.id=r.company_id WHERE r.platform_status='pending' AND j.status='pending_platform'),'[]'::jsonb),
   'listings',coalesce((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('job_id',j.id,'title',j.title,'status',j.status,'company_name',c.company_name,'updated_at',j.updated_at,'safety_flags',j.safety_flags) x FROM jobs j JOIN company_profiles c ON c.id=j.company_id WHERE j.status IN ('active','closed','suspended','company_approved') ORDER BY j.updated_at DESC LIMIT 100) s),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.check_opportunity(public.jobs,boolean), public.validate_opportunity(), public.record_listing_safety_assessment(uuid,text,text,jsonb), public.list_platform_job_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_opportunity(public.jobs,boolean), public.record_listing_safety_assessment(uuid,text,text,jsonb), public.list_platform_job_reviews() TO authenticated;
