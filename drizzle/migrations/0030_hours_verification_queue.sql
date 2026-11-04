ALTER TABLE public.hour_entries
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.hour_entries DROP CONSTRAINT IF EXISTS hour_entries_status_check;
ALTER TABLE public.hour_entries ADD CONSTRAINT hour_entries_status_check CHECK (status IN ('pending','approved','rejected','correction_requested'));
ALTER TABLE public.hour_entries ADD CONSTRAINT hour_entries_break_check CHECK (break_minutes >= 0 AND break_minutes <= 720);
ALTER TABLE public.hour_entries ADD CONSTRAINT hour_entries_times_check CHECK ((start_time IS NULL) = (end_time IS NULL));

CREATE TABLE public.hour_entry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL,
  seeker_id uuid NOT NULL,
  application_id uuid NOT NULL,
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  note text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hour_entry_events_entry_idx ON public.hour_entry_events(entry_id, created_at);
GRANT SELECT ON public.hour_entry_events TO authenticated;
GRANT ALL ON public.hour_entry_events TO service_role;
ALTER TABLE public.hour_entry_events ENABLE ROW LEVEL SECURITY;

-- Only the currently assigned supervisor with an active Supervisor scope may verify.
CREATE OR REPLACE FUNCTION public.can_verify_hours(_application_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM placements p
    WHERE p.application_id = _application_id
      AND p.supervisor_id = _uid
      AND p.user_id <> _uid
      AND public.company_permission(p.company_id, _uid, 'member')
      AND EXISTS(SELECT 1 FROM company_staff_scopes s WHERE s.company_id = p.company_id AND s.user_id = _uid AND s.scope = 'supervisor')
      AND public.can_manage_placement(p.id, _uid))
$$;
REVOKE EXECUTE ON FUNCTION public.can_verify_hours(uuid, uuid) FROM anon;

CREATE POLICY "Seekers and supervisors read hour history" ON public.hour_entry_events
  FOR SELECT TO authenticated
  USING (seeker_id = auth.uid() OR public.can_verify_hours(application_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_hour_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Hour history is append-only'; END $$;
CREATE TRIGGER hour_entry_events_immutable BEFORE UPDATE OR DELETE ON public.hour_entry_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_hour_events();

-- Employers no longer write entries directly; reviews go through review_hour_entry.
DROP POLICY IF EXISTS "Employers review hours" ON public.hour_entries;
DROP POLICY IF EXISTS "Seekers edit own pending hours" ON public.hour_entries;
CREATE POLICY "Seekers edit own pending or correction hours" ON public.hour_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','correction_requested'))
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Employers view hours for their placements" ON public.hour_entries;
CREATE POLICY "Employers view hours for their placements" ON public.hour_entries
  FOR SELECT TO authenticated
  USING (public.is_placement_employer(application_id, auth.uid()) OR public.can_verify_hours(application_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_hour_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app record; span int;
BEGIN
  IF TG_OP = 'UPDATE' AND current_setting('app.hour_review', true) = 'on' THEN
    -- Supervisor review via RPC: entry content is preserved.
    NEW.user_id := OLD.user_id; NEW.application_id := OLD.application_id;
    NEW.work_date := OLD.work_date; NEW.minutes := OLD.minutes; NEW.description := OLD.description;
    NEW.start_time := OLD.start_time; NEW.end_time := OLD.end_time; NEW.break_minutes := OLD.break_minutes;
    NEW.revision := OLD.revision; NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT * INTO app FROM applications WHERE id = NEW.application_id;
    IF app IS NULL OR app.user_id <> NEW.user_id OR NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'You can only log hours against your own placement';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM placements WHERE application_id = NEW.application_id AND status = 'active') THEN
      RAISE EXCEPTION 'Hours can only be logged once your employer has activated the placement';
    END IF;
    NEW.revision := 1;
  ELSE
    IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Only the assigned supervisor can review hours, through the verification queue';
    END IF;
    IF OLD.status NOT IN ('pending','correction_requested') THEN
      RAISE EXCEPTION 'Reviewed entries cannot be changed';
    END IF;
    NEW.user_id := OLD.user_id; NEW.application_id := OLD.application_id;
    NEW.revision := OLD.revision + 1; NEW.updated_at := now();
  END IF;

  IF NEW.work_date > current_date THEN RAISE EXCEPTION 'Hours cannot be logged for a future date'; END IF;
  NEW.break_minutes := COALESCE(NEW.break_minutes, 0);
  IF NEW.start_time IS NOT NULL THEN
    IF NEW.end_time <= NEW.start_time THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
    span := (EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60)::int;
    IF NEW.break_minutes >= span THEN RAISE EXCEPTION 'Break must be shorter than the time worked'; END IF;
    NEW.minutes := span - NEW.break_minutes;  -- duration is always derived server-side
  END IF;
  NEW.status := 'pending';
  NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.reviewer_note := NULL;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.log_hour_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snap_old jsonb; snap_new jsonb; act text; role text;
BEGIN
  snap_new := jsonb_build_object('work_date',NEW.work_date,'start_time',NEW.start_time,'end_time',NEW.end_time,
    'break_minutes',NEW.break_minutes,'minutes',NEW.minutes,'description',NEW.description,'revision',NEW.revision);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO hour_entry_events(entry_id,seeker_id,application_id,actor_id,actor_role,action,to_status,after_state)
    VALUES (NEW.id,NEW.user_id,NEW.application_id,auth.uid(),'seeker','submitted',NEW.status,snap_new);
    RETURN NEW;
  END IF;
  snap_old := jsonb_build_object('work_date',OLD.work_date,'start_time',OLD.start_time,'end_time',OLD.end_time,
    'break_minutes',OLD.break_minutes,'minutes',OLD.minutes,'description',OLD.description,'revision',OLD.revision);
  IF current_setting('app.hour_review', true) = 'on' THEN
    role := 'supervisor';
    act := CASE NEW.status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' ELSE 'correction_requested' END;
    INSERT INTO hour_entry_events(entry_id,seeker_id,application_id,actor_id,actor_role,action,from_status,to_status,note,before_state,after_state)
    VALUES (NEW.id,NEW.user_id,NEW.application_id,auth.uid(),role,act,OLD.status,NEW.status,NEW.reviewer_note,snap_old,snap_old);
  ELSE
    INSERT INTO hour_entry_events(entry_id,seeker_id,application_id,actor_id,actor_role,action,from_status,to_status,before_state,after_state)
    VALUES (NEW.id,NEW.user_id,NEW.application_id,auth.uid(),'seeker',
      CASE WHEN OLD.status='correction_requested' THEN 'resubmitted' ELSE 'edited' END,OLD.status,NEW.status,snap_old,snap_new);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hour_entries_audit AFTER INSERT OR UPDATE ON public.hour_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_hour_event();

CREATE OR REPLACE FUNCTION public.review_hour_entry(_entry_id uuid, _decision text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e hour_entries; n text := nullif(btrim(coalesce(_note,'')),'');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO e FROM hour_entries WHERE id = _entry_id FOR UPDATE;
  IF e.id IS NULL OR NOT public.can_verify_hours(e.application_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the assigned supervisor for this placement can review these hours';
  END IF;
  IF e.user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot verify your own hours'; END IF;
  IF e.status <> 'pending' THEN RAISE EXCEPTION 'This entry has already been reviewed or is awaiting correction'; END IF;
  IF _decision NOT IN ('approve','reject','request_correction') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF _decision <> 'approve' AND (n IS NULL OR char_length(n) < 5) THEN
    RAISE EXCEPTION 'Please give a reason (at least 5 characters)';
  END IF;
  IF char_length(coalesce(n,'')) > 500 THEN RAISE EXCEPTION 'Reason is too long'; END IF;
  PERFORM set_config('app.hour_review','on',true);
  UPDATE hour_entries SET
    status = CASE _decision WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'correction_requested' END,
    reviewer_note = n, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _entry_id;
  PERFORM set_config('app.hour_review','off',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.review_hour_entry(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.review_hour_entry(uuid, text, text) TO authenticated;

-- Supervisor queue with server-computed anomaly flags and per-placement totals.
CREATE OR REPLACE FUNCTION public.list_hour_review_queue()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH mine AS (
    SELECT p.id placement_id, p.application_id, p.start_date, p.end_date, p.activated_at, p.status placement_status,
           j.title job_title, c.company_name, a.form_data->>'fullName' seeker_name, p.user_id seeker_id
    FROM placements p JOIN jobs j ON j.id = p.job_id JOIN company_profiles c ON c.id = p.company_id
    JOIN applications a ON a.id = p.application_id
    WHERE public.can_verify_hours(p.application_id, auth.uid())
  ), entries AS (
    SELECT h.*, m.placement_id, m.job_title, m.company_name, m.seeker_name, m.start_date, m.end_date, m.activated_at
    FROM hour_entries h JOIN mine m ON m.application_id = h.application_id
  ), flagged AS (
    SELECT e.*, array_remove(ARRAY[
      CASE WHEN EXISTS(SELECT 1 FROM hour_entries o WHERE o.user_id=e.user_id AND o.id<>e.id AND o.work_date=e.work_date
        AND o.status<>'rejected' AND o.start_time IS NOT NULL AND e.start_time IS NOT NULL
        AND o.start_time < e.end_time AND e.start_time < o.end_time) THEN 'overlap' END,
      CASE WHEN EXISTS(SELECT 1 FROM hour_entries o WHERE o.user_id=e.user_id AND o.id<>e.id AND o.work_date=e.work_date
        AND o.status<>'rejected' AND o.minutes=e.minutes AND lower(btrim(o.description))=lower(btrim(e.description))) THEN 'duplicate' END,
      CASE WHEN e.minutes > 720 THEN 'long_shift' END,
      CASE WHEN (SELECT sum(o.minutes) FROM hour_entries o WHERE o.user_id=e.user_id AND o.work_date=e.work_date AND o.status<>'rejected') > 720 THEN 'daily_total_over_12h' END,
      CASE WHEN e.minutes > 360 AND e.start_time IS NOT NULL AND e.break_minutes = 0 THEN 'no_break_long_shift' END,
      CASE WHEN (e.start_date IS NOT NULL AND e.work_date < e.start_date) OR (e.activated_at IS NOT NULL AND e.work_date < e.activated_at::date)
             OR (e.end_date IS NOT NULL AND e.work_date > e.end_date) THEN 'outside_placement_dates' END,
      CASE WHEN e.created_at::date - e.work_date > 30 THEN 'logged_late' END
    ], NULL) flags FROM entries e
  )
  SELECT jsonb_build_object(
    'entries', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',f.id,'placement_id',f.placement_id,'application_id',f.application_id,'seeker_name',coalesce(nullif(f.seeker_name,''),'Participant'),
      'job_title',f.job_title,'company_name',f.company_name,'work_date',f.work_date,'start_time',f.start_time,'end_time',f.end_time,
      'break_minutes',f.break_minutes,'minutes',f.minutes,'description',f.description,'status',f.status,'reviewer_note',f.reviewer_note,
      'reviewed_at',f.reviewed_at,'revision',f.revision,'created_at',f.created_at,'flags',to_jsonb(f.flags))
      ORDER BY f.work_date DESC, f.created_at DESC) FROM flagged f), '[]'::jsonb),
    'placements', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'placement_id',m.placement_id,'job_title',m.job_title,'seeker_name',coalesce(nullif(m.seeker_name,''),'Participant'),'status',m.placement_status,
      'approved_minutes',(SELECT COALESCE(sum(minutes),0) FROM hour_entries h WHERE h.application_id=m.application_id AND h.status='approved'),
      'pending_minutes',(SELECT COALESCE(sum(minutes),0) FROM hour_entries h WHERE h.application_id=m.application_id AND h.status='pending')))
      FROM mine m), '[]'::jsonb))
$$;
REVOKE EXECUTE ON FUNCTION public.list_hour_review_queue() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_hour_review_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_hours_summary()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'verified_minutes', COALESCE(SUM(minutes) FILTER (WHERE status='approved'),0),
    'pending_minutes', COALESCE(SUM(minutes) FILTER (WHERE status='pending'),0),
    'pending_count', COUNT(*) FILTER (WHERE status='pending'),
    'rejected_count', COUNT(*) FILTER (WHERE status='rejected'),
    'correction_count', COUNT(*) FILTER (WHERE status='correction_requested')
  ) FROM hour_entries WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.notify_hour_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; p text; b text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','correction_requested') THEN
    IF NEW.status = 'approved' THEN
      t := 'Hours approved'; p := 'Your supervisor approved some of your logged hours.';
      b := 'Your hours for ' || to_char(NEW.work_date, 'DD Mon YYYY') || ' were approved.';
    ELSIF NEW.status = 'correction_requested' THEN
      t := 'Correction requested'; p := 'Your supervisor asked you to correct a time entry.';
      b := 'Your supervisor asked for a correction to your hours for ' || to_char(NEW.work_date, 'DD Mon YYYY') || ': ' || coalesce(NEW.reviewer_note,'');
    ELSE
      t := 'Hours not approved'; p := 'Your supervisor did not approve a time entry.';
      b := 'Your hours for ' || to_char(NEW.work_date, 'DD Mon YYYY') || ' were not approved: ' || coalesce(NEW.reviewer_note,'');
    END IF;
    PERFORM _notify(NEW.user_id, 'hours', 'hour:' || NEW.id || ':' || NEW.status || ':' || COALESCE(NEW.reviewed_at::text, now()::text),
      t, p, b, '/dashboard/hours');
  END IF;
  RETURN NEW;
END $$;