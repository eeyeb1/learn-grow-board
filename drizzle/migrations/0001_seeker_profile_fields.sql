ALTER TABLE public.public_profiles
  ADD COLUMN career_interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN education_level text,
  ADD COLUMN preferred_industries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN location text,
  ADD COLUMN work_preference text,
  ADD COLUMN availability text,
  ADD COLUMN links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN show_location boolean NOT NULL DEFAULT false,
  ADD COLUMN show_education boolean NOT NULL DEFAULT false,
  ADD COLUMN show_availability boolean NOT NULL DEFAULT false,
  ADD COLUMN show_links boolean NOT NULL DEFAULT true;

ALTER TABLE public.public_profiles
  ADD CONSTRAINT pp_work_pref_chk CHECK (work_preference IS NULL OR work_preference IN ('remote','in_person','hybrid','any')),
  ADD CONSTRAINT pp_lengths_chk CHECK (
    coalesce(char_length(display_name),0) <= 80 AND coalesce(char_length(headline),0) <= 120
    AND coalesce(char_length(bio),0) <= 1000 AND coalesce(char_length(location),0) <= 80
    AND coalesce(char_length(education_level),0) <= 80 AND coalesce(char_length(availability),0) <= 120
    AND cardinality(skills) <= 30 AND cardinality(career_interests) <= 15 AND cardinality(preferred_industries) <= 15
  );

CREATE OR REPLACE FUNCTION public.validate_public_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE l jsonb;
BEGIN
  IF jsonb_typeof(NEW.links) <> 'array' OR jsonb_array_length(NEW.links) > 6 THEN
    RAISE EXCEPTION 'Up to 6 links are allowed';
  END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(NEW.links) LOOP
    IF NOT (l ? 'url') OR (l->>'url') !~ '^https://[^\s<>"]{3,300}$' OR char_length(coalesce(l->>'label','')) > 40 THEN
      RAISE EXCEPTION 'Links must be https:// URLs with a short label';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_public_profile BEFORE INSERT OR UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_public_profile();

CREATE OR REPLACE FUNCTION public.get_public_profile(_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'display_name', p.display_name,
    'headline', p.headline,
    'bio', p.bio,
    'skills', p.skills,
    'career_interests', p.career_interests,
    'preferred_industries', p.preferred_industries,
    'work_preference', p.work_preference,
    'location', CASE WHEN p.show_location THEN p.location END,
    'education_level', CASE WHEN p.show_education THEN p.education_level END,
    'availability', CASE WHEN p.show_availability THEN p.availability END,
    'links', CASE WHEN p.show_links THEN p.links ELSE '[]'::jsonb END,
    'avatar_url', CASE WHEN p.show_avatar THEN pr.avatar_url END,
    'verified_minutes', (SELECT COALESCE(SUM(h.minutes),0) FROM hour_entries h WHERE h.user_id = p.user_id AND h.status='approved'),
    'experiences', COALESCE((
      SELECT json_agg(json_build_object(
        'title', j.title, 'company', c.company_name, 'industry', j.industry,
        'verified_minutes', (SELECT COALESCE(SUM(h.minutes),0) FROM hour_entries h WHERE h.application_id = a.id AND h.status='approved')
      ) ORDER BY a.submitted_at DESC)
      FROM applications a JOIN jobs j ON j.id::text = a.job_id JOIN company_profiles c ON c.id = j.company_id
      WHERE a.user_id = p.user_id AND a.status = 'completed'
    ), '[]'::json)
  )
  FROM public_profiles p LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.slug = lower(_slug) AND p.is_public = true
$$;