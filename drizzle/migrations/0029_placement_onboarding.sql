ALTER TABLE public.placements DROP CONSTRAINT placements_status_check;
ALTER TABLE public.placements ADD CONSTRAINT placements_status_check CHECK (status IN ('upcoming','active','completed','cancelled','disputed'));
ALTER TABLE public.placements
  ADD COLUMN supervisor_id uuid,
  ADD COLUMN schedule text CHECK (char_length(schedule) <= 1000),
  ADD COLUMN location text CHECK (char_length(location) <= 300),
  ADD COLUMN expected_duration text CHECK (char_length(expected_duration) <= 200),
  ADD COLUMN safeguarding text CHECK (char_length(safeguarding) <= 2000),
  ADD COLUMN expectations text CHECK (char_length(expectations) <= 3000),
  ADD COLUMN induction_checklist jsonb NOT NULL DEFAULT '[{"label":"Welcome and introductions arranged","done":false},{"label":"First-day arrival time, place and contact shared","done":false},{"label":"Health, safety and emergency procedures explained","done":false},{"label":"Safeguarding and reporting contacts shared","done":false},{"label":"Learning objectives agreed with the seeker","done":false}]'::jsonb,
  ADD COLUMN completion_checklist jsonb NOT NULL DEFAULT '[{"label":"Final hours reviewed and approved","done":false},{"label":"Skills observed have been confirmed or declined","done":false},{"label":"End-of-placement feedback discussed","done":false},{"label":"Equipment and access returned","done":false}]'::jsonb,
  ADD COLUMN seeker_confirmed_at timestamptz,
  ADD COLUMN activated_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN disputed_at timestamptz,
  ADD COLUMN dispute_reason text,
  ADD COLUMN status_before_dispute text;

CREATE OR REPLACE FUNCTION public._checklist_ok(_c jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(_c)='array' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(_c) e WHERE coalesce((e->>'done')::boolean,false)=false) $$;

-- Supervisor: approved company member holding the Supervisor scope, assigned via the audited assignment RPC.
CREATE OR REPLACE FUNCTION public.assign_placement_supervisor(_placement_id uuid, _user_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p placements; nm text;
BEGIN
  SELECT * INTO p FROM placements WHERE id=_placement_id FOR UPDATE;
  IF p.id IS NULL OR auth.uid() IS NULL OR NOT public.company_permission(p.company_id, auth.uid(), 'admin') THEN RAISE EXCEPTION 'Company administrator required'; END IF;
  IF p.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'This placement is closed'; END IF;
  IF _user_id = p.user_id THEN RAISE EXCEPTION 'A seeker cannot supervise their own placement'; END IF;
  IF NOT public.company_permission(p.company_id, _user_id, 'member')
     OR NOT EXISTS(SELECT 1 FROM company_staff_scopes WHERE company_id=p.company_id AND user_id=_user_id AND scope='supervisor') THEN
    RAISE EXCEPTION 'Only approved company members with Supervisor permission can be assigned';
  END IF;
  IF p.supervisor_id IS NOT NULL AND p.supervisor_id <> _user_id
     AND EXISTS(SELECT 1 FROM company_staff_scopes WHERE company_id=p.company_id AND user_id=p.supervisor_id) THEN
    PERFORM public.set_company_resource_assignment(p.company_id, p.supervisor_id, NULL, p.id, ARRAY[]::text[], _note);
  END IF;
  PERFORM public.set_company_resource_assignment(p.company_id, _user_id, NULL, p.id, ARRAY['manage'], _note);
  SELECT full_name INTO nm FROM employee_identities WHERE user_id=_user_id;
  UPDATE placements SET supervisor_id=_user_id, supervisor_name=coalesce(nullif(nm,''), supervisor_name) WHERE id=p.id;
  INSERT INTO placement_events(placement_id, actor_id, actor_role, action, note) VALUES (p.id, auth.uid(), 'employer', 'supervisor_assigned', left(btrim(_note),500));
END $$;

CREATE OR REPLACE FUNCTION public.update_placement_onboarding(_placement_id uuid, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p placements; ic jsonb; cc jsonb;
BEGIN
  SELECT * INTO p FROM placements WHERE id=_placement_id FOR UPDATE;
  IF p.id IS NULL OR auth.uid() IS NULL OR NOT public.can_manage_placement(p.id, auth.uid()) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF p.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'This placement is closed'; END IF;
  -- Checklist edits may only toggle existing items; done_at/by are stamped server-side.
  SELECT coalesce(jsonb_agg(jsonb_build_object('label', o->>'label', 'done', coalesce((n->>'done')::boolean, (o->>'done')::boolean, false),
      'done_at', CASE WHEN coalesce((n->>'done')::boolean,false) AND NOT coalesce((o->>'done')::boolean,false) THEN to_jsonb(now()) WHEN coalesce((n->>'done')::boolean,(o->>'done')::boolean,false) THEN o->'done_at' ELSE NULL END,
      'done_by', CASE WHEN coalesce((n->>'done')::boolean,false) AND NOT coalesce((o->>'done')::boolean,false) THEN to_jsonb(auth.uid()) WHEN coalesce((n->>'done')::boolean,(o->>'done')::boolean,false) THEN o->'done_by' ELSE NULL END) ORDER BY i), '[]')
    INTO ic FROM jsonb_array_elements(p.induction_checklist) WITH ORDINALITY AS t(o,i) LEFT JOIN LATERAL (SELECT _data->'induction_checklist'->(i::int-1) n) x ON true;
  SELECT coalesce(jsonb_agg(jsonb_build_object('label', o->>'label', 'done', coalesce((n->>'done')::boolean, (o->>'done')::boolean, false),
      'done_at', CASE WHEN coalesce((n->>'done')::boolean,false) AND NOT coalesce((o->>'done')::boolean,false) THEN to_jsonb(now()) WHEN coalesce((n->>'done')::boolean,(o->>'done')::boolean,false) THEN o->'done_at' ELSE NULL END,
      'done_by', CASE WHEN coalesce((n->>'done')::boolean,false) AND NOT coalesce((o->>'done')::boolean,false) THEN to_jsonb(auth.uid()) WHEN coalesce((n->>'done')::boolean,(o->>'done')::boolean,false) THEN o->'done_by' ELSE NULL END) ORDER BY i), '[]')
    INTO cc FROM jsonb_array_elements(p.completion_checklist) WITH ORDINALITY AS t(o,i) LEFT JOIN LATERAL (SELECT _data->'completion_checklist'->(i::int-1) n) x ON true;
  UPDATE placements SET
    schedule = CASE WHEN _data ? 'schedule' THEN nullif(btrim(_data->>'schedule'),'') ELSE schedule END,
    location = CASE WHEN _data ? 'location' THEN nullif(btrim(_data->>'location'),'') ELSE location END,
    expected_duration = CASE WHEN _data ? 'expected_duration' THEN nullif(btrim(_data->>'expected_duration'),'') ELSE expected_duration END,
    safeguarding = CASE WHEN _data ? 'safeguarding' THEN nullif(btrim(_data->>'safeguarding'),'') ELSE safeguarding END,
    expectations = CASE WHEN _data ? 'expectations' THEN nullif(btrim(_data->>'expectations'),'') ELSE expectations END,
    induction_checklist = ic, completion_checklist = cc,
    -- Material onboarding changes require the seeker to re-confirm.
    seeker_confirmed_at = CASE WHEN (_data ? 'schedule' AND (_data->>'schedule') IS DISTINCT FROM schedule) OR (_data ? 'location' AND (_data->>'location') IS DISTINCT FROM location) OR (_data ? 'expectations' AND (_data->>'expectations') IS DISTINCT FROM expectations) OR (_data ? 'safeguarding' AND (_data->>'safeguarding') IS DISTINCT FROM safeguarding) THEN NULL ELSE seeker_confirmed_at END
  WHERE id=p.id;
  INSERT INTO placement_events(placement_id, actor_id, actor_role, action) VALUES (p.id, auth.uid(), 'employer', 'onboarding_updated');
END $$;

CREATE OR REPLACE FUNCTION public.confirm_placement_onboarding(_placement_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p placements;
BEGIN
  SELECT * INTO p FROM placements WHERE id=_placement_id FOR UPDATE;
  IF p.id IS NULL OR p.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Placement not found'; END IF;
  IF p.status NOT IN ('upcoming','active') THEN RAISE EXCEPTION 'This placement cannot be confirmed now'; END IF;
  UPDATE placements SET seeker_confirmed_at=now() WHERE id=p.id;
  INSERT INTO placement_events(placement_id, actor_id, actor_role, action) VALUES (p.id, auth.uid(), 'seeker', 'onboarding_confirmed');
END $$;

CREATE OR REPLACE FUNCTION public.placement_action(_placement_id uuid, _action text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p placements; new_status text; role_label text; is_seeker boolean; n text := nullif(btrim(coalesce(_note,'')),'');
BEGIN
  SELECT * INTO p FROM placements WHERE id=_placement_id FOR UPDATE;
  IF p.id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Placement not found'; END IF;
  is_seeker := p.user_id = auth.uid();
  IF n IS NOT NULL AND char_length(n) > 500 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  IF NOT is_seeker AND NOT public.can_manage_placement(p.id, auth.uid()) THEN RAISE EXCEPTION 'Only the company or assigned supervisor can do this'; END IF;
  IF is_seeker AND _action <> 'dispute' THEN RAISE EXCEPTION 'Seekers can only raise a dispute'; END IF;
  role_label := CASE WHEN is_seeker THEN 'seeker' WHEN public.has_role(auth.uid(),'admin') THEN 'admin' ELSE 'employer' END;

  IF _action = 'activate' AND p.status = 'upcoming' THEN
    IF NOT (public.company_permission(p.company_id, auth.uid(), 'admin')
       OR (p.supervisor_id = auth.uid() AND EXISTS(SELECT 1 FROM company_staff_scopes WHERE company_id=p.company_id AND user_id=auth.uid() AND scope='supervisor'))) THEN
      RAISE EXCEPTION 'Only a company administrator or the assigned supervisor can activate a placement';
    END IF;
    IF p.supervisor_id IS NULL OR NOT public.can_manage_placement(p.id, p.supervisor_id) THEN RAISE EXCEPTION 'Assign an approved supervisor first'; END IF;
    IF p.schedule IS NULL OR p.location IS NULL OR p.expected_duration IS NULL OR cardinality(p.learning_objectives)=0 OR p.expectations IS NULL THEN RAISE EXCEPTION 'Complete the schedule, location, duration, learning objectives and expectations first'; END IF;
    IF NOT public._checklist_ok(p.induction_checklist) THEN RAISE EXCEPTION 'Complete the initial instructions checklist first'; END IF;
    IF p.seeker_confirmed_at IS NULL THEN RAISE EXCEPTION 'The seeker must confirm the placement details first'; END IF;
    new_status := 'active';
    UPDATE placements SET status=new_status, activated_at=now(), start_date=coalesce(start_date,current_date) WHERE id=p.id;
  ELSIF _action = 'complete' AND p.status = 'active' THEN
    IF NOT public._checklist_ok(p.completion_checklist) THEN RAISE EXCEPTION 'Complete the completion checklist first'; END IF;
    new_status := 'completed';
    UPDATE placements SET status=new_status, completed_at=now(), end_date=coalesce(end_date,current_date), certificate_issued_at=now() WHERE id=p.id;
    PERFORM set_config('app.placement_action','on',true);
    UPDATE applications SET status='completed' WHERE id=p.application_id;
    PERFORM set_config('app.placement_action','off',true);
  ELSIF _action = 'cancel' AND p.status IN ('upcoming','active','disputed') THEN
    IF n IS NULL OR char_length(n) < 10 THEN RAISE EXCEPTION 'Give a reason of at least 10 characters'; END IF;
    new_status := 'cancelled';
    UPDATE placements SET status=new_status, cancelled_at=now() WHERE id=p.id;
  ELSIF _action = 'dispute' AND p.status IN ('upcoming','active') THEN
    IF n IS NULL OR char_length(n) < 10 THEN RAISE EXCEPTION 'Describe the issue in at least 10 characters'; END IF;
    new_status := 'disputed';
    UPDATE placements SET status=new_status, disputed_at=now(), dispute_reason=n, status_before_dispute=p.status WHERE id=p.id;
  ELSIF _action = 'resolve' AND p.status = 'disputed' THEN
    IF NOT (public.company_permission(p.company_id, auth.uid(), 'admin') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Only a company or platform administrator can resolve a dispute'; END IF;
    IF n IS NULL OR char_length(n) < 10 THEN RAISE EXCEPTION 'Record how the dispute was resolved'; END IF;
    new_status := coalesce(p.status_before_dispute,'upcoming');
    UPDATE placements SET status=new_status WHERE id=p.id;
  ELSE
    RAISE EXCEPTION 'Action "%" is not allowed while the placement is %', _action, p.status;
  END IF;
  INSERT INTO placement_events(placement_id, actor_id, actor_role, action, from_status, to_status, note)
  VALUES (p.id, auth.uid(), role_label, _action, p.status, new_status, n);
END $$;

-- Assignable supervisors for a company admin (approved members with Supervisor scope only).
CREATE OR REPLACE FUNCTION public.list_placement_supervisors(_placement_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', s.user_id, 'name', coalesce(nullif(e.full_name,''),'Staff member'), 'job_title', e.job_title)), '[]'::jsonb)
  FROM placements p JOIN company_staff_scopes s ON s.company_id=p.company_id AND s.scope='supervisor'
  LEFT JOIN employee_identities e ON e.user_id=s.user_id
  WHERE p.id=_placement_id AND public.company_permission(p.company_id, auth.uid(), 'admin')
    AND public.company_permission(p.company_id, s.user_id, 'member') AND s.user_id<>p.user_id $$;

REVOKE ALL ON FUNCTION public.assign_placement_supervisor(uuid,uuid,text), public.update_placement_onboarding(uuid,jsonb), public.confirm_placement_onboarding(uuid), public.list_placement_supervisors(uuid), public.placement_action(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_placement_supervisor(uuid,uuid,text), public.update_placement_onboarding(uuid,jsonb), public.confirm_placement_onboarding(uuid), public.list_placement_supervisors(uuid), public.placement_action(uuid,text,text) TO authenticated;