DO $$ DECLARE d text; BEGIN
  SELECT pg_get_functiondef('public.list_company_applications(uuid)'::regprocedure) INTO d;
  d:=replace(d,'''submitted_at'', a.submitted_at,','''submitted_at'', a.submitted_at, ''applicant_id'', a.user_id,');
  IF d NOT LIKE '%applicant_id%' THEN RAISE EXCEPTION 'Could not add applicant report subject'; END IF;
  EXECUTE d;
END $$;
