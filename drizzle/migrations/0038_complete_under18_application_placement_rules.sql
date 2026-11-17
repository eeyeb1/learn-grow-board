CREATE OR REPLACE FUNCTION public.set_application_status(_application_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a applications; j jobs; cap int; taken int; r text := nullif(btrim(coalesce(_reason,'')),'');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO a FROM applications WHERE id=_application_id FOR UPDATE;
  IF a.id IS NULL OR NOT public.company_application_permission(a.id, auth.uid()) THEN RAISE EXCEPTION 'Application not found or not permitted'; END IF;
  IF a.user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot review your own application'; END IF;
  IF _status NOT IN ('reviewed','accepted','rejected') THEN RAISE EXCEPTION 'Unsupported status'; END IF;
  IF a.status = _status THEN RAISE EXCEPTION 'The application is already in this stage'; END IF;
  IF a.status IN ('withdrawn','completed','rejected') THEN RAISE EXCEPTION 'This application is closed (%) and cannot be changed', a.status; END IF;
  IF a.status='accepted' AND _status<>'rejected' THEN RAISE EXCEPTION 'An accepted application can only be rescinded (declined with a reason)'; END IF;
  IF _status='rejected' AND (r IS NULL OR length(r) < 10) THEN RAISE EXCEPTION 'Give a reason of at least 10 characters when declining'; END IF;
  IF r IS NOT NULL AND length(r) > 2000 THEN RAISE EXCEPTION 'Reason is too long'; END IF;
  IF _status='accepted' THEN
    SELECT * INTO j FROM jobs WHERE id::text=a.job_id FOR UPDATE;
    IF j.status IN ('suspended') THEN RAISE EXCEPTION 'This listing is suspended; applications cannot be accepted'; END IF;
    IF coalesce((SELECT is_minor FROM public_profiles WHERE user_id=a.user_id),false) AND coalesce(j.opportunity_details->>'under_18_policy','')<>'safeguarded' THEN RAISE EXCEPTION 'Under-18s cannot be accepted for this opportunity'; END IF;
    cap := CASE WHEN (j.opportunity_details->>'openings') ~ '^\d+$' THEN (j.opportunity_details->>'openings')::int ELSE NULL END;
    IF cap IS NOT NULL THEN
      SELECT count(*) INTO taken FROM applications WHERE job_id=a.job_id AND status IN ('accepted','completed');
      IF taken >= cap THEN RAISE EXCEPTION 'All % opening(s) for this opportunity are filled', cap; END IF;
    END IF;
  END IF;
  PERFORM set_config('app.application_action','on',true);
  UPDATE applications SET status=_status, status_reason=r, status_changed_at=now(), status_changed_by=auth.uid() WHERE id=a.id;
  PERFORM set_config('app.application_action','',true);
  INSERT INTO application_events(application_id, actor_id, actor_role, from_status, to_status, reason)
  VALUES (a.id, auth.uid(), 'employer', a.status, _status, r);
END $$;

DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.placement_action(uuid,text,text)'::regprocedure) INTO d;
  d:=replace(d,'new_status := ''active'';',E'IF coalesce((SELECT is_minor FROM public_profiles WHERE user_id=p.user_id),false) THEN\n      IF NOT EXISTS(SELECT 1 FROM jobs j WHERE j.id=p.job_id AND j.opportunity_details->>''under_18_policy''=''safeguarded'') THEN RAISE EXCEPTION ''This placement is not approved for under-18s''; END IF;\n      IF p.safeguarding IS NULL OR length(btrim(p.safeguarding))<20 THEN RAISE EXCEPTION ''Record detailed under-18 safeguarding arrangements first''; END IF;\n      IF public.approved_guardian(p.user_id) IS NULL THEN RAISE EXCEPTION ''An approved parent or guardian is required before this under-18 placement starts''; END IF;\n    END IF;\n    new_status := ''active'';');
  IF d NOT LIKE '%approved parent or guardian is required%' OR d NOT LIKE '%issue_certificate%' THEN RAISE EXCEPTION 'Could not add placement guardian gate while preserving completion'; END IF;
  EXECUTE d;
END $$;

REVOKE ALL ON FUNCTION public.guard_application_open(), public.set_application_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid,text,text) TO authenticated;
