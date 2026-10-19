-- Hour entries logged by seekers against an accepted placement
CREATE TABLE public.hour_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  minutes integer NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
  description text NOT NULL CHECK (char_length(description) BETWEEN 3 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hour_entries_user_idx ON public.hour_entries(user_id);
CREATE INDEX hour_entries_app_idx ON public.hour_entries(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hour_entries TO authenticated;
GRANT ALL ON public.hour_entries TO service_role;
ALTER TABLE public.hour_entries ENABLE ROW LEVEL SECURITY;

-- Is the current user the employer that owns the job for this application?
CREATE OR REPLACE FUNCTION public.is_placement_employer(_application_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id::text = a.job_id
    JOIN company_profiles c ON c.id = j.company_id
    WHERE a.id = _application_id AND c.user_id = _user_id
  )
$$;

CREATE POLICY "Seekers view own hours" ON public.hour_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Employers view hours for their placements" ON public.hour_entries FOR SELECT TO authenticated USING (public.is_placement_employer(application_id, auth.uid()));
CREATE POLICY "Seekers log own hours" ON public.hour_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Seekers edit own pending hours" ON public.hour_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Employers review hours" ON public.hour_entries FOR UPDATE TO authenticated USING (public.is_placement_employer(application_id, auth.uid())) WITH CHECK (public.is_placement_employer(application_id, auth.uid()));
CREATE POLICY "Seekers delete own pending hours" ON public.hour_entries FOR DELETE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

-- Integrity rules enforced on the server
CREATE OR REPLACE FUNCTION public.validate_hour_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app record; is_employer boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO app FROM applications WHERE id = NEW.application_id;
    IF app IS NULL OR app.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'You can only log hours against your own placement';
    END IF;
    IF app.status NOT IN ('accepted') THEN
      RAISE EXCEPTION 'Hours can only be logged against an accepted, active placement';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE id::text = app.job_id) THEN
      RAISE EXCEPTION 'This placement has no employer who can verify hours';
    END IF;
    IF NEW.work_date > current_date THEN
      RAISE EXCEPTION 'Hours cannot be logged for a future date';
    END IF;
    NEW.status := 'pending';
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.reviewer_note := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE
  NEW.updated_at := now();
  NEW.user_id := OLD.user_id;
  NEW.application_id := OLD.application_id;
  is_employer := public.is_placement_employer(OLD.application_id, auth.uid());
  IF is_employer AND auth.uid() <> OLD.user_id THEN
    -- employers may only change review fields
    NEW.work_date := OLD.work_date; NEW.minutes := OLD.minutes; NEW.description := OLD.description;
    IF NEW.status NOT IN ('approved','rejected') THEN
      RAISE EXCEPTION 'Invalid review status';
    END IF;
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  ELSE
    -- seekers may edit details of pending entries but never the status
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
CREATE TRIGGER validate_hour_entry BEFORE INSERT OR UPDATE ON public.hour_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_hour_entry();

-- Public profile settings (opt-in)
CREATE TABLE public.public_profiles (
  user_id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  is_public boolean NOT NULL DEFAULT false,
  display_name text,
  headline text,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  show_avatar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages public profile select" ON public.public_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner manages public profile insert" ON public.public_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner manages public profile update" ON public.public_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner manages public profile delete" ON public.public_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_public_profiles_updated_at BEFORE UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-side verified hours summary for the signed-in seeker
CREATE OR REPLACE FUNCTION public.get_my_hours_summary()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'verified_minutes', COALESCE(SUM(minutes) FILTER (WHERE status='approved'),0),
    'pending_minutes', COALESCE(SUM(minutes) FILTER (WHERE status='pending'),0),
    'pending_count', COUNT(*) FILTER (WHERE status='pending'),
    'rejected_count', COUNT(*) FILTER (WHERE status='rejected')
  ) FROM hour_entries WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_hours_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hours_summary() TO authenticated;

-- Public profile: only opted-in fields, verified hours and completed experiences
CREATE OR REPLACE FUNCTION public.get_public_profile(_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'display_name', p.display_name,
    'headline', p.headline,
    'bio', p.bio,
    'skills', p.skills,
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
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;