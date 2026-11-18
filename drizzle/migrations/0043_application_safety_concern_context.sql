DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.submit_safety_report(text,uuid,uuid,text,text,boolean)'::regprocedure) INTO d;
  d:=replace(d,'IF _subject_id IS NOT NULL THEN',E'IF _subject_id IS NULL AND _context_id IS NOT NULL THEN\n      SELECT * INTO a FROM applications WHERE id=_context_id;\n      IF a.id IS NULL OR NOT (a.user_id=uid OR public.company_application_permission(a.id,uid) OR public.can_verify_hours(a.id,uid) OR public.approved_guardian(a.user_id)=uid) THEN RAISE EXCEPTION ''Application not found or not available to report''; END IF;\n      SELECT * INTO j FROM jobs WHERE id::text=a.job_id;\n      aid:=a.id; jid:=j.id; cid:=j.company_id; SELECT id INTO pid FROM placements WHERE application_id=a.id;\n    END IF;\n    IF _subject_id IS NOT NULL THEN');
  IF d NOT LIKE '%Application not found or not available to report%' THEN RAISE EXCEPTION 'Could not add application report context'; END IF;
  EXECUTE d;
END $$;
