ALTER TABLE public.public_profiles
  ADD COLUMN is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN guardian_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN show_summary boolean NOT NULL DEFAULT true,
  ADD COLUMN show_self_skills boolean NOT NULL DEFAULT true,
  ADD COLUMN show_interests boolean NOT NULL DEFAULT true,
  ADD COLUMN show_experiences boolean NOT NULL DEFAULT true,
  ADD COLUMN show_hours boolean NOT NULL DEFAULT true,
  ADD COLUMN show_verified_skills boolean NOT NULL DEFAULT true,
  ADD COLUMN show_references boolean NOT NULL DEFAULT false;

-- Publishing rules + stronger safeguards for under-18s, enforced on the server
CREATE OR REPLACE FUNCTION public.guard_public_profile_publish()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_minor THEN
    NEW.show_location := false;
    NEW.show_avatar := false;
    IF TG_OP = 'INSERT' OR NOT OLD.is_minor THEN
      NEW.show_links := false;
    END IF;
    IF NEW.is_public AND NOT NEW.guardian_acknowledged THEN
      RAISE EXCEPTION 'Under-18s must confirm a parent, guardian or school contact knows before publishing';
    END IF;
  END IF;
  IF NEW.is_public AND (TG_OP = 'INSERT' OR NOT OLD.is_public) THEN
    NEW.published_at := now();
  ELSIF NOT NEW.is_public THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_public_profile_publish BEFORE INSERT OR UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_public_profile_publish();

-- Employer-written references the seeker must approve before they can be shown
CREATE TABLE public.placement_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 2 AND 100),
  author_role text CHECK (char_length(author_role) <= 100),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 2000),
  seeker_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX placement_references_p_idx ON public.placement_references(placement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_references TO authenticated;
GRANT ALL ON public.placement_references TO service_role;
ALTER TABLE public.placement_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers view references for own placements" ON public.placement_references FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM placements p WHERE p.id = placement_id AND p.user_id = auth.uid()));
CREATE POLICY "Employers view references they manage" ON public.placement_references FOR SELECT TO authenticated
  USING (public.can_manage_placement(placement_id, auth.uid()));
CREATE POLICY "Employers write references" ON public.placement_references FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.can_manage_placement(placement_id, auth.uid())
    AND EXISTS (SELECT 1 FROM placements p WHERE p.id = placement_id AND p.status = 'completed'));
CREATE POLICY "Employers edit own references" ON public.placement_references FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Seekers approve references" ON public.placement_references FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM placements p WHERE p.id = placement_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM placements p WHERE p.id = placement_id AND p.user_id = auth.uid()));
CREATE POLICY "Employers delete own references" ON public.placement_references FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION public.guard_reference_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.placement_id := OLD.placement_id;
  NEW.author_id := OLD.author_id;
  IF auth.uid() = OLD.author_id THEN
    -- editing the text resets approval
    IF NEW.content IS DISTINCT FROM OLD.content OR NEW.author_name IS DISTINCT FROM OLD.author_name OR NEW.author_role IS DISTINCT FROM OLD.author_role THEN
      NEW.seeker_approved := false;
    ELSE
      NEW.seeker_approved := OLD.seeker_approved;
    END IF;
  ELSE
    -- the seeker can only change approval
    NEW.content := OLD.content; NEW.author_name := OLD.author_name; NEW.author_role := OLD.author_role;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_reference_update BEFORE UPDATE ON public.placement_references
FOR EACH ROW EXECUTE FUNCTION public.guard_reference_update();

CREATE OR REPLACE FUNCTION public.guard_reference_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.seeker_approved := false; RETURN NEW; END;
$$;
CREATE TRIGGER guard_reference_insert BEFORE INSERT ON public.placement_references
FOR EACH ROW EXECUTE FUNCTION public.guard_reference_insert();

-- Public profile: published only, per-section controls, verified vs self-reported separated
CREATE OR REPLACE FUNCTION public.get_public_profile(_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      SELECT array_agg(DISTINCT s ORDER BY s) FROM placements pl, unnest(pl.confirmed_skills) s
      WHERE pl.user_id = p.user_id AND pl.status = 'completed'), '{}') ELSE '{}' END,
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
$$;