-- Roles (for administrators)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Placements: created only by the server when an employer accepts an application
CREATE TABLE public.placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed','cancelled')),
  start_date date,
  end_date date,
  learning_objectives text[] NOT NULL DEFAULT '{}',
  supervisor_name text CHECK (char_length(supervisor_name) <= 100),
  supervisor_contact text CHECK (char_length(supervisor_contact) <= 200),
  confirmed_skills text[] NOT NULL DEFAULT '{}',
  employer_feedback text CHECK (char_length(employer_feedback) <= 3000),
  certificate_issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (cardinality(learning_objectives) <= 20 AND cardinality(confirmed_skills) <= 30)
);
CREATE INDEX placements_user_idx ON public.placements(user_id);
CREATE INDEX placements_company_idx ON public.placements(company_id);
GRANT SELECT ON public.placements TO authenticated;
GRANT ALL ON public.placements TO service_role;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_placement(_placement_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin') OR EXISTS (
    SELECT 1 FROM placements p JOIN company_profiles c ON c.id = p.company_id
    WHERE p.id = _placement_id AND c.user_id = _uid)
$$;

CREATE POLICY "Seekers view own placements" ON public.placements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Employers and admins view placements" ON public.placements FOR SELECT TO authenticated USING (public.can_manage_placement(id, auth.uid()));
-- No INSERT/UPDATE/DELETE policies: all changes go through audited server functions.

CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON public.placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trail
CREATE TABLE public.placement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX placement_events_p_idx ON public.placement_events(placement_id);
GRANT SELECT ON public.placement_events TO authenticated;
GRANT ALL ON public.placement_events TO service_role;
ALTER TABLE public.placement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers view own placement events" ON public.placement_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM placements p WHERE p.id = placement_id AND p.user_id = auth.uid()));
CREATE POLICY "Employers and admins view placement events" ON public.placement_events FOR SELECT TO authenticated
  USING (public.can_manage_placement(placement_id, auth.uid()));

-- Seeker diary
CREATE TABLE public.placement_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  content text NOT NULL CHECK (char_length(content) BETWEEN 3 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_diary TO authenticated;
GRANT ALL ON public.placement_diary TO service_role;
ALTER TABLE public.placement_diary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers read own diary" ON public.placement_diary FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Seekers write diary for own placements" ON public.placement_diary FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM placements p WHERE p.id = placement_id AND p.user_id = auth.uid() AND p.status IN ('upcoming','active','completed')));
CREATE POLICY "Seekers edit own diary" ON public.placement_diary FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Seekers delete own diary" ON public.placement_diary FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_placement_diary_updated_at BEFORE UPDATE ON public.placement_diary
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Applications: seekers can never self-accept; completion only via placement action
CREATE OR REPLACE FUNCTION public.guard_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'submitted';
    RETURN NEW;
  END IF;
  IF NEW.status = 'completed' AND OLD.status <> 'completed'
     AND coalesce(current_setting('app.placement_action', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Use the placement "Mark completed" action to complete a placement';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_application_status BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_status();

-- Create / cancel placement when an employer accepts or withdraws acceptance
CREATE OR REPLACE FUNCTION public.sync_placement_from_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j record; pid uuid; prev text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT id, company_id INTO j FROM jobs WHERE id::text = NEW.job_id;
    IF j.id IS NULL THEN RETURN NEW; END IF;
    SELECT id, status INTO pid, prev FROM placements WHERE application_id = NEW.id;
    IF pid IS NULL THEN
      INSERT INTO placements (application_id, user_id, job_id, company_id)
      VALUES (NEW.id, NEW.user_id, j.id, j.company_id) RETURNING id INTO pid;
      INSERT INTO placement_events (placement_id, actor_id, actor_role, action, to_status, note)
      VALUES (pid, auth.uid(), 'employer', 'created', 'upcoming', 'Application accepted');
    ELSIF prev = 'cancelled' THEN
      UPDATE placements SET status = 'upcoming' WHERE id = pid;
      INSERT INTO placement_events (placement_id, actor_id, actor_role, action, from_status, to_status, note)
      VALUES (pid, auth.uid(), 'employer', 'reinstated', 'cancelled', 'upcoming', 'Application accepted again');
    END IF;
  ELSIF OLD.status = 'accepted' AND NEW.status NOT IN ('accepted','completed') THEN
    FOR pid, prev IN SELECT id, status FROM placements WHERE application_id = NEW.id AND status IN ('upcoming','active') LOOP
      UPDATE placements SET status = 'cancelled' WHERE id = pid;
      INSERT INTO placement_events (placement_id, actor_id, actor_role, action, from_status, to_status, note)
      VALUES (pid, auth.uid(), 'employer', 'cancelled', prev, 'cancelled', 'Application status changed to ' || NEW.status);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_placement_from_application AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.sync_placement_from_application();

-- Backfill placements for applications already accepted/completed on platform jobs
INSERT INTO public.placements (application_id, user_id, job_id, company_id, status, certificate_issued_at)
SELECT a.id, a.user_id, j.id, j.company_id,
       CASE WHEN a.status = 'completed' THEN 'completed' ELSE 'upcoming' END,
       CASE WHEN a.status = 'completed' THEN now() END
FROM public.applications a JOIN public.jobs j ON j.id::text = a.job_id
WHERE a.status IN ('accepted','completed')
ON CONFLICT (application_id) DO NOTHING;
INSERT INTO public.placement_events (placement_id, actor_role, action, to_status, note)
SELECT id, 'system', 'created', status, 'Created from existing application' FROM public.placements;

-- Documented employer/admin actions
CREATE OR REPLACE FUNCTION public.placement_action(_placement_id uuid, _action text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; new_status text; role_label text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_placement(_placement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the employer for this placement or an administrator can do this';
  END IF;
  IF _note IS NOT NULL AND char_length(_note) > 500 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  SELECT * INTO p FROM placements WHERE id = _placement_id FOR UPDATE;
  role_label := CASE WHEN public.has_role(auth.uid(), 'admin') THEN 'admin' ELSE 'employer' END;

  IF _action = 'activate' AND p.status = 'upcoming' THEN
    new_status := 'active';
    UPDATE placements SET status = new_status, start_date = coalesce(start_date, current_date) WHERE id = p.id;
  ELSIF _action = 'complete' AND p.status = 'active' THEN
    new_status := 'completed';
    UPDATE placements SET status = new_status, end_date = coalesce(end_date, current_date), certificate_issued_at = now() WHERE id = p.id;
    PERFORM set_config('app.placement_action', 'on', true);
    UPDATE applications SET status = 'completed' WHERE id = p.application_id;
    PERFORM set_config('app.placement_action', 'off', true);
  ELSIF _action = 'cancel' AND p.status IN ('upcoming','active') THEN
    new_status := 'cancelled';
    UPDATE placements SET status = new_status WHERE id = p.id;
  ELSE
    RAISE EXCEPTION 'Action "%" is not allowed while the placement is %', _action, p.status;
  END IF;

  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, from_status, to_status, note)
  VALUES (p.id, auth.uid(), role_label, _action, p.status, new_status, nullif(trim(_note), ''));
END;
$$;
REVOKE ALL ON FUNCTION public.placement_action(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.placement_action(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_placement_details(
  _placement_id uuid, _start_date date, _end_date date, _learning_objectives text[],
  _supervisor_name text, _supervisor_contact text, _confirmed_skills text[], _employer_feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_placement(_placement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the employer for this placement or an administrator can do this';
  END IF;
  UPDATE placements SET
    start_date = _start_date, end_date = _end_date,
    learning_objectives = coalesce(_learning_objectives, '{}'),
    supervisor_name = nullif(trim(_supervisor_name), ''),
    supervisor_contact = nullif(trim(_supervisor_contact), ''),
    confirmed_skills = coalesce(_confirmed_skills, '{}'),
    employer_feedback = nullif(trim(_employer_feedback), '')
  WHERE id = _placement_id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note)
  VALUES (_placement_id, auth.uid(), CASE WHEN public.has_role(auth.uid(), 'admin') THEN 'admin' ELSE 'employer' END, 'details_updated', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.update_placement_details(uuid, date, date, text[], text, text, text[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_placement_details(uuid, date, date, text[], text, text, text[], text) TO authenticated;

-- Server-side hour totals per placement
CREATE OR REPLACE FUNCTION public.get_placement_hours(_placement_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'verified_minutes', COALESCE(SUM(h.minutes) FILTER (WHERE h.status='approved'),0),
    'pending_minutes', COALESCE(SUM(h.minutes) FILTER (WHERE h.status='pending'),0))
  FROM placements p LEFT JOIN hour_entries h ON h.application_id = p.application_id
  WHERE p.id = _placement_id AND (p.user_id = auth.uid() OR public.can_manage_placement(p.id, auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.get_placement_hours(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_placement_hours(uuid) TO authenticated;

-- Hours can now only be logged against an ACTIVE placement
CREATE OR REPLACE FUNCTION public.validate_hour_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app record; is_employer boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO app FROM applications WHERE id = NEW.application_id;
    IF app IS NULL OR app.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'You can only log hours against your own placement';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM placements WHERE application_id = NEW.application_id AND status = 'active') THEN
      RAISE EXCEPTION 'Hours can only be logged once your employer has activated the placement';
    END IF;
    IF NEW.work_date > current_date THEN
      RAISE EXCEPTION 'Hours cannot be logged for a future date';
    END IF;
    NEW.status := 'pending';
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.reviewer_note := NULL;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  NEW.user_id := OLD.user_id;
  NEW.application_id := OLD.application_id;
  is_employer := public.is_placement_employer(OLD.application_id, auth.uid());
  IF is_employer AND auth.uid() <> OLD.user_id THEN
    NEW.work_date := OLD.work_date; NEW.minutes := OLD.minutes; NEW.description := OLD.description;
    IF NEW.status NOT IN ('approved','rejected') THEN
      RAISE EXCEPTION 'Invalid review status';
    END IF;
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  ELSE
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Reviewed entries cannot be changed';
    END IF;
    IF NEW.work_date > current_date THEN
      RAISE EXCEPTION 'Hours cannot be logged for a future date';
    END IF;
    NEW.status := 'pending';
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.reviewer_note := NULL;
  END IF;
  RETURN NEW;
END;
$$;