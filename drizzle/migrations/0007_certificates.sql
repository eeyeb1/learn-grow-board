CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  placement_id uuid NOT NULL UNIQUE REFERENCES public.placements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.company_profiles(id),
  seeker_name text NOT NULL,
  company_name text NOT NULL,
  role_title text NOT NULL,
  start_date date,
  end_date date,
  approved_minutes integer NOT NULL DEFAULT 0,
  skills text[] NOT NULL DEFAULT '{}',
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  revocation_reason text,
  verification_enabled boolean NOT NULL DEFAULT true,
  show_name boolean NOT NULL DEFAULT true,
  show_hours boolean NOT NULL DEFAULT true,
  show_skills boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seeker or placement managers view certificates" ON public.certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_placement(placement_id, auth.uid()));

CREATE OR REPLACE FUNCTION public._new_certificate_code() RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE _c text; _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  LOOP
    _c := 'EXP-';
    FOR i IN 1..12 LOOP
      _c := _c || substr(_alphabet, 1 + floor(random()*32)::int, 1);
      IF i IN (4,8) THEN _c := _c || '-'; END IF;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE code = _c);
  END LOOP;
  RETURN _c;
END $$;

CREATE OR REPLACE FUNCTION public.issue_certificate(_placement_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; _uid uuid := auth.uid(); _mgr boolean; _existing record;
  _name text; _company text; _title text; _mins int; _skills text[]; _minor boolean; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.placements WHERE id = _placement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Placement not found'; END IF;
  _mgr := public.can_manage_placement(_placement_id, _uid);
  IF p.user_id <> _uid AND NOT _mgr THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p.status <> 'completed' THEN RAISE EXCEPTION 'Certificates are only available for completed placements'; END IF;

  SELECT * INTO _existing FROM public.certificates WHERE placement_id = _placement_id;
  IF FOUND AND _existing.revoked_at IS NOT NULL AND NOT _mgr THEN
    RAISE EXCEPTION 'This certificate has been revoked. Only the employer can reissue it.';
  END IF;

  SELECT COALESCE(SUM(minutes),0) INTO _mins FROM public.hour_entries
    WHERE application_id = p.application_id AND status = 'approved';
  IF _mins <= 0 THEN RAISE EXCEPTION 'A certificate needs at least some employer-approved hours'; END IF;

  SELECT COALESCE(NULLIF(trim(pp.display_name),''), NULLIF(trim(pr.full_name),''), 'Work experience participant'), COALESCE(pp.is_minor,false)
    INTO _name, _minor
    FROM (SELECT 1) x
    LEFT JOIN public.public_profiles pp ON pp.user_id = p.user_id
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id;
  SELECT company_name INTO _company FROM public.company_profiles WHERE id = p.company_id;
  SELECT title INTO _title FROM public.jobs WHERE id = p.job_id;
  SELECT COALESCE(array_agg(skill ORDER BY skill), '{}') INTO _skills FROM public.skill_verifications WHERE placement_id = _placement_id;

  IF FOUND AND _existing.id IS NOT NULL THEN
    UPDATE public.certificates SET
      code = CASE WHEN revoked_at IS NOT NULL THEN public._new_certificate_code() ELSE code END,
      issued_at = CASE WHEN revoked_at IS NOT NULL THEN now() ELSE issued_at END,
      revoked_at = NULL, revoked_by = NULL, revocation_reason = NULL,
      seeker_name = _name, company_name = COALESCE(_company,'Company'), role_title = COALESCE(_title,'Work experience'),
      start_date = p.start_date, end_date = p.end_date, approved_minutes = _mins, skills = _skills, updated_at = now()
    WHERE id = _existing.id RETURNING id INTO _id;
    IF _existing.revoked_at IS NOT NULL THEN
      INSERT INTO public.placement_events(placement_id, actor_id, actor_role, action, note)
      VALUES (_placement_id, _uid, public._ref_actor_role(_placement_id), 'certificate_reissued', NULL);
    END IF;
  ELSE
    INSERT INTO public.certificates(code, placement_id, user_id, company_id, seeker_name, company_name, role_title, start_date, end_date, approved_minutes, skills, show_name)
    VALUES (public._new_certificate_code(), _placement_id, p.user_id, p.company_id, _name, COALESCE(_company,'Company'), COALESCE(_title,'Work experience'), p.start_date, p.end_date, _mins, _skills, NOT _minor)
    RETURNING id INTO _id;
    INSERT INTO public.placement_events(placement_id, actor_id, actor_role, action, note)
    VALUES (_placement_id, _uid, public._ref_actor_role(_placement_id), 'certificate_issued', NULL);
  END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_certificate(_id uuid, _reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; _uid uuid := auth.uid();
BEGIN
  SELECT * INTO c FROM public.certificates WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificate not found'; END IF;
  IF NOT (public.can_manage_placement(c.placement_id, _uid) OR public.has_role(_uid,'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF c.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Already revoked'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 OR length(_reason) > 500 THEN RAISE EXCEPTION 'Please give a reason (5-500 characters)'; END IF;
  UPDATE public.certificates SET revoked_at = now(), revoked_by = _uid, revocation_reason = trim(_reason), updated_at = now() WHERE id = _id;
  INSERT INTO public.placement_events(placement_id, actor_id, actor_role, action, note)
  VALUES (c.placement_id, _uid, CASE WHEN public.can_manage_placement(c.placement_id,_uid) THEN public._ref_actor_role(c.placement_id) ELSE 'admin' END, 'certificate_revoked', trim(_reason));
END $$;

CREATE OR REPLACE FUNCTION public.set_certificate_privacy(_id uuid, _verification_enabled boolean, _show_name boolean, _show_hours boolean, _show_skills boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.certificates SET verification_enabled = _verification_enabled, show_name = _show_name,
    show_hours = _show_hours, show_skills = _show_skills, updated_at = now()
  WHERE id = _id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public.certificates WHERE code = upper(trim(_code));
  IF NOT FOUND THEN RETURN json_build_object('status','not_found'); END IF;
  IF c.revoked_at IS NOT NULL THEN
    RETURN json_build_object('status','revoked','code',c.code,'revoked_at',c.revoked_at);
  END IF;
  IF NOT c.verification_enabled THEN RETURN json_build_object('status','private','code',c.code); END IF;
  RETURN json_build_object('status','valid','code',c.code,
    'seeker_name', CASE WHEN c.show_name THEN c.seeker_name END,
    'company_name', c.company_name, 'role_title', c.role_title,
    'start_date', c.start_date, 'end_date', c.end_date, 'issued_at', c.issued_at,
    'approved_minutes', CASE WHEN c.show_hours THEN c.approved_minutes END,
    'skills', CASE WHEN c.show_skills THEN to_json(c.skills) END);
END $$;

REVOKE ALL ON FUNCTION public._new_certificate_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_certificate(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_certificate(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_certificate_privacy(uuid, boolean, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_certificate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_certificate_privacy(uuid, boolean, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;