ALTER TABLE public.applications ADD CONSTRAINT applications_status_check CHECK (status IN ('submitted','reviewed','accepted','rejected','withdrawn','completed')) NOT VALID;
ALTER TABLE public.applications ADD COLUMN status_reason text, ADD COLUMN status_changed_at timestamptz, ADD COLUMN status_changed_by uuid;

CREATE TABLE public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL CHECK (actor_role IN ('seeker','employer','system')),
  from_status text,
  to_status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_events_app_idx ON public.application_events(application_id, created_at);
GRANT SELECT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seekers and authorised staff read application history" ON public.application_events FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.applications a WHERE a.id=application_id AND (a.user_id=auth.uid() OR public.company_application_read(a.id, auth.uid()))));

CREATE OR REPLACE FUNCTION public.guard_application_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Application history cannot be changed'; END $$;
CREATE TRIGGER application_events_immutable BEFORE UPDATE ON public.application_events FOR EACH ROW EXECUTE FUNCTION public.guard_application_events();

-- Status may only change through the audited RPCs below (or placement completion).
CREATE OR REPLACE FUNCTION public.guard_application_status() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'submitted'; NEW.status_reason := NULL; NEW.status_changed_at := NULL; NEW.status_changed_by := NULL;
    RETURN NEW;
  END IF;
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    IF coalesce(current_setting('app.placement_action', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Use the placement "Mark completed" action to complete a placement';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.status_reason IS DISTINCT FROM OLD.status_reason
      OR NEW.status_changed_by IS DISTINCT FROM OLD.status_changed_by OR NEW.status_changed_at IS DISTINCT FROM OLD.status_changed_at)
     AND coalesce(current_setting('app.application_action', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Application status changes must use the application review actions';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_application_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE jt text; label text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn' THEN
    BEGIN SELECT title INTO jt FROM jobs WHERE id::text = NEW.job_id; EXCEPTION WHEN others THEN jt := NULL; END;
    label := CASE NEW.status WHEN 'reviewed' THEN 'under review' WHEN 'rejected' THEN 'declined' ELSE NEW.status END;
    PERFORM _notify(NEW.user_id, 'application', 'app:' || NEW.id || ':' || NEW.status || ':' || coalesce(extract(epoch FROM NEW.status_changed_at)::bigint::text, ''),
      'Application update', 'One of your applications has a new status.',
      'Your application' || COALESCE(' for ' || jt, '') || ' is now ' || label || '.', '/dashboard/applications');
  END IF;
  RETURN NEW;
END $$;

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

CREATE OR REPLACE FUNCTION public.withdraw_application(_application_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a applications; r text := left(nullif(btrim(coalesce(_reason,'')),''), 2000);
BEGIN
  SELECT * INTO a FROM applications WHERE id=_application_id FOR UPDATE;
  IF a.id IS NULL OR a.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF a.status IN ('withdrawn','completed','rejected') THEN RAISE EXCEPTION 'This application can no longer be withdrawn'; END IF;
  IF a.status='accepted' AND EXISTS(SELECT 1 FROM placements WHERE application_id=a.id AND status='active') THEN
    RAISE EXCEPTION 'Your placement has started; ask your supervisor to end it instead';
  END IF;
  PERFORM set_config('app.application_action','on',true);
  UPDATE applications SET status='withdrawn', status_reason=r, status_changed_at=now(), status_changed_by=auth.uid() WHERE id=a.id;
  PERFORM set_config('app.application_action','',true);
  INSERT INTO application_events(application_id, actor_id, actor_role, from_status, to_status, reason)
  VALUES (a.id, auth.uid(), 'seeker', a.status, 'withdrawn', r);
END $$;

-- Inbox: only applications the caller may manage; contact details and private records are never returned.
CREATE OR REPLACE FUNCTION public.list_company_applications(_company_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'submitted_at' DESC), '[]'::jsonb) FROM (
    SELECT jsonb_build_object(
      'id', a.id, 'job_id', j.id, 'job_title', j.title, 'job_status', j.status,
      'openings', j.opportunity_details->'openings',
      'status', a.status, 'status_reason', a.status_reason, 'status_changed_at', a.status_changed_at,
      'submitted_at', a.submitted_at,
      'applicant_name', coalesce(nullif(a.form_data->>'fullName',''), 'Applicant'),
      'statement', a.form_data->>'coverLetter',
      'links', jsonb_strip_nulls(jsonb_build_object('linkedin', nullif(a.form_data->>'linkedin',''), 'github', nullif(a.form_data->>'github',''), 'portfolio', nullif(a.form_data->>'portfolio',''))),
      'profile', (SELECT jsonb_build_object('slug', p.slug, 'headline', p.headline,
                    'skills', CASE WHEN p.show_self_skills THEN to_jsonb(p.skills) ELSE '[]'::jsonb END)
                  FROM public_profiles p WHERE p.user_id=a.user_id AND p.is_public AND p.published_at IS NOT NULL),
      'verified_skills', (SELECT coalesce(jsonb_agg(DISTINCT s.skill), '[]'::jsonb) FROM skill_verifications s WHERE s.user_id=a.user_id AND s.show_on_profile),
      'public_portfolio', (SELECT coalesce(jsonb_agg(jsonb_build_object('title', i.title, 'description', i.description) ORDER BY i.created_at DESC), '[]'::jsonb)
                  FROM portfolio_items i WHERE i.user_id=a.user_id AND i.is_public AND i.status='active'),
      'can_manage', public.company_application_permission(a.id, auth.uid()),
      'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('from', e.from_status, 'to', e.to_status, 'reason', e.reason, 'actor_role', e.actor_role, 'at', e.created_at) ORDER BY e.created_at), '[]'::jsonb) FROM application_events e WHERE e.application_id=a.id)
    ) x
    FROM applications a JOIN jobs j ON j.id::text=a.job_id
    WHERE j.company_id=_company_id AND auth.uid() IS NOT NULL AND a.user_id<>auth.uid()
      AND public.company_application_permission(a.id, auth.uid())
  ) s
$$;

REVOKE ALL ON FUNCTION public.set_application_status(uuid,text,text), public.withdraw_application(uuid,text), public.list_company_applications(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid,text,text), public.withdraw_application(uuid,text), public.list_company_applications(uuid) TO authenticated;