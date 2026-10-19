CREATE TABLE public.skill_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (char_length(btrim(skill)) BETWEEN 1 AND 60),
  category text NOT NULL CHECK (category IN ('communication','teamwork','problem_solving','digital_technical','customer_service','organisation','leadership','creativity','industry_specific')),
  example text CHECK (example IS NULL OR char_length(example) <= 300),
  verified_by uuid NOT NULL,
  verifier_name text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  show_on_profile boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX skill_verifications_unique ON public.skill_verifications (placement_id, lower(skill));
CREATE INDEX skill_verifications_user ON public.skill_verifications (user_id);
GRANT SELECT ON public.skill_verifications TO authenticated;
GRANT ALL ON public.skill_verifications TO service_role;
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seeker or placement manager can view" ON public.skill_verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_placement(placement_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.verify_placement_skill(_placement_id uuid, _skill text, _category text, _example text, _directly_observed boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl placements; vname text; new_id uuid; s text := btrim(_skill); ex text := NULLIF(btrim(coalesce(_example,'')),'');
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_placement(_placement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only an authorised supervisor for this placement can confirm skills';
  END IF;
  IF NOT coalesce(_directly_observed,false) THEN
    RAISE EXCEPTION 'You can only confirm skills you directly observed';
  END IF;
  SELECT * INTO pl FROM placements WHERE id = _placement_id;
  IF pl.status NOT IN ('active','completed') THEN
    RAISE EXCEPTION 'Skills can be confirmed once the placement is active or completed';
  END IF;
  IF s IS NULL OR char_length(s) < 1 OR char_length(s) > 60 THEN RAISE EXCEPTION 'Skill must be 1–60 characters'; END IF;
  IF ex IS NOT NULL AND char_length(ex) > 300 THEN RAISE EXCEPTION 'Example must be 300 characters or fewer'; END IF;
  SELECT coalesce(NULLIF(btrim(full_name),''), 'Supervisor') INTO vname FROM profiles WHERE user_id = auth.uid();
  INSERT INTO skill_verifications (placement_id, user_id, company_id, skill, category, example, verified_by, verifier_name)
  VALUES (_placement_id, pl.user_id, pl.company_id, s, _category, ex, auth.uid(), coalesce(vname,'Supervisor'))
  RETURNING id INTO new_id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note)
  VALUES (_placement_id, auth.uid(), CASE WHEN public.has_role(auth.uid(),'admin') THEN 'admin' ELSE 'employer' END, 'skill_verified', s);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_skill_verification(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sv skill_verifications;
BEGIN
  SELECT * INTO sv FROM skill_verifications WHERE id = _id;
  IF sv.id IS NULL OR auth.uid() IS NULL OR NOT public.can_manage_placement(sv.placement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  DELETE FROM skill_verifications WHERE id = _id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note)
  VALUES (sv.placement_id, auth.uid(), CASE WHEN public.has_role(auth.uid(),'admin') THEN 'admin' ELSE 'employer' END, 'skill_revoked', sv.skill);
END $$;

CREATE OR REPLACE FUNCTION public.set_skill_visibility(_id uuid, _visible boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE skill_verifications SET show_on_profile = coalesce(_visible,false) WHERE id = _id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorised'; END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.verify_placement_skill(uuid,text,text,text,boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revoke_skill_verification(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_skill_visibility(uuid,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.verify_placement_skill(uuid,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_skill_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_skill_visibility(uuid,boolean) TO authenticated;

COMMENT ON COLUMN public.placements.confirmed_skills IS 'DEPRECATED: replaced by skill_verifications';

CREATE OR REPLACE FUNCTION public.get_public_profile(_slug text)
 RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'display_name', p.display_name,
    'headline', p.headline,
    'is_minor', p.is_minor,
    'published_at', p.published_at,
    'bio', CASE WHEN p.show_summary THEN p.bio END,
    'skills', CASE WHEN p.show_self_skills THEN p.skills ELSE '{}' END,
    'career_interests', CASE WHEN p.show_interests THEN p.career_interests ELSE '{}' END,
    'preferred_industries', CASE WHEN p.show_interests THEN p.preferred_industries ELSE '{}' END,
    'work_preference', CASE WHEN p.show_interests THEN p.work_preference END,
    'location', CASE WHEN p.show_location AND NOT p.is_minor THEN p.location END,
    'education_level', CASE WHEN p.show_education THEN p.education_level END,
    'availability', CASE WHEN p.show_availability THEN p.availability END,
    'links', CASE WHEN p.show_links THEN p.links ELSE '[]'::jsonb END,
    'avatar_url', CASE WHEN p.show_avatar AND NOT p.is_minor THEN pr.avatar_url END,
    'verified_minutes', CASE WHEN p.show_hours THEN (
      SELECT COALESCE(SUM(h.minutes),0) FROM hour_entries h WHERE h.user_id = p.user_id AND h.status='approved') END,
    'verified_skills', CASE WHEN p.show_verified_skills THEN COALESCE((
      SELECT json_agg(json_build_object('skill', sv.skill, 'category', sv.category, 'example', sv.example,
        'company', c.company_name, 'verified_at', sv.verified_at) ORDER BY sv.verified_at DESC)
      FROM skill_verifications sv JOIN placements pl ON pl.id = sv.placement_id JOIN company_profiles c ON c.id = sv.company_id
      WHERE sv.user_id = p.user_id AND sv.show_on_profile AND pl.status = 'completed'), '[]'::json) ELSE '[]'::json END,
    'experiences', CASE WHEN p.show_experiences THEN COALESCE((
      SELECT json_agg(json_build_object(
        'title', j.title, 'company', c.company_name,
        'start', to_char(pl.start_date, 'YYYY-MM'), 'end', to_char(pl.end_date, 'YYYY-MM'),
        'verified_minutes', CASE WHEN p.show_hours THEN (SELECT COALESCE(SUM(h.minutes),0) FROM hour_entries h WHERE h.application_id = pl.application_id AND h.status='approved') END
      ) ORDER BY pl.end_date DESC NULLS LAST)
      FROM placements pl JOIN jobs j ON j.id = pl.job_id JOIN company_profiles c ON c.id = pl.company_id
      WHERE pl.user_id = p.user_id AND pl.status = 'completed'), '[]'::json) ELSE '[]'::json END,
    'references', CASE WHEN p.show_references THEN COALESCE((
      SELECT json_agg(json_build_object('author_name', r.author_name, 'author_role', r.author_role, 'content', r.content, 'company', c.company_name) ORDER BY r.created_at DESC)
      FROM placement_references r JOIN placements pl ON pl.id = r.placement_id JOIN company_profiles c ON c.id = pl.company_id
      WHERE pl.user_id = p.user_id AND r.seeker_approved), '[]'::json) ELSE '[]'::json END
  )
  FROM public_profiles p LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.slug = lower(_slug) AND p.is_public = true
$function$;