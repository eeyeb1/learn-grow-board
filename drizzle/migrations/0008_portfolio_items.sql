CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  placement_id uuid REFERENCES public.placements(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_summary text,
  outcomes text,
  skills text[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  link_url text,
  file_path text,
  file_name text,
  file_mime text,
  file_size integer,
  is_public boolean NOT NULL DEFAULT false,
  permission_confirmed boolean NOT NULL DEFAULT false,
  permission_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removal_requested','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portfolio_items_user_idx ON public.portfolio_items(user_id);
CREATE INDEX portfolio_items_placement_idx ON public.portfolio_items(placement_id);

CREATE TABLE public.portfolio_removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.portfolio_items(id) ON DELETE SET NULL,
  item_title text NOT NULL,
  owner_id uuid NOT NULL,
  placement_id uuid,
  requester_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('confidential','unauthorised','personal_data','inaccurate','other')),
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','dismissed','item_deleted')),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_profiles ADD COLUMN show_portfolio boolean NOT NULL DEFAULT true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
GRANT SELECT ON public.portfolio_removal_requests TO authenticated;
GRANT ALL ON public.portfolio_removal_requests TO service_role;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read portfolio" ON public.portfolio_items FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (placement_id IS NOT NULL AND public.can_manage_placement(placement_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners add portfolio" ON public.portfolio_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners edit portfolio" ON public.portfolio_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners delete portfolio" ON public.portfolio_items FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Parties read removal requests" ON public.portfolio_removal_requests FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validate_portfolio_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s text; privileged boolean := coalesce(current_setting('app.portfolio_action', true),'') = 'on';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    IF NOT privileged THEN NEW.status := OLD.status; END IF;
    IF NEW.file_path IS DISTINCT FROM OLD.file_path AND NEW.file_path IS NOT NULL AND NOT privileged THEN
      NULL; -- replacing a file is allowed; validated below
    END IF;
  ELSE
    NEW.status := 'active';
  END IF;
  NEW.title := btrim(coalesce(NEW.title,''));
  IF char_length(NEW.title) < 2 OR char_length(NEW.title) > 120 THEN RAISE EXCEPTION 'Title must be 2–120 characters'; END IF;
  IF char_length(coalesce(NEW.description,'')) > 2000 THEN RAISE EXCEPTION 'Description must be 2000 characters or fewer'; END IF;
  IF char_length(coalesce(NEW.task_summary,'')) > 1500 THEN RAISE EXCEPTION 'Task summary must be 1500 characters or fewer'; END IF;
  IF char_length(coalesce(NEW.outcomes,'')) > 1500 THEN RAISE EXCEPTION 'Outcomes must be 1500 characters or fewer'; END IF;
  IF coalesce(array_length(NEW.skills,1),0) > 15 THEN RAISE EXCEPTION 'Up to 15 skills per item'; END IF;
  FOREACH s IN ARRAY NEW.skills LOOP
    IF char_length(btrim(s)) < 1 OR char_length(s) > 40 THEN RAISE EXCEPTION 'Skills must be 1–40 characters'; END IF;
  END LOOP;
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN RAISE EXCEPTION 'End date must be on or after the start date'; END IF;
  IF NEW.link_url IS NOT NULL AND NEW.link_url !~ '^https://[^\s<>"]{3,500}$' THEN RAISE EXCEPTION 'Links must start with https://'; END IF;
  IF NEW.file_path IS NOT NULL THEN
    IF NEW.file_path NOT LIKE NEW.user_id::text || '/%' THEN RAISE EXCEPTION 'Invalid file location'; END IF;
    IF NEW.file_mime NOT IN ('image/jpeg','image/png','image/webp','application/pdf') THEN RAISE EXCEPTION 'Only JPG, PNG, WebP images or PDF files are allowed'; END IF;
    IF NEW.file_size IS NULL OR NEW.file_size <= 0 OR NEW.file_size > 10485760 THEN RAISE EXCEPTION 'Files must be 10 MB or smaller'; END IF;
  ELSE
    NEW.file_name := NULL; NEW.file_mime := NULL; NEW.file_size := NULL;
  END IF;
  IF NEW.placement_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.placement_id IS DISTINCT FROM OLD.placement_id) THEN
    IF NOT EXISTS (SELECT 1 FROM placements WHERE id = NEW.placement_id AND user_id = NEW.user_id AND status IN ('active','completed')) THEN
      RAISE EXCEPTION 'You can only link items to your own active or completed placements';
    END IF;
  END IF;
  IF NOT NEW.permission_confirmed THEN
    RAISE EXCEPTION 'Please confirm you own this work or have permission to share it';
  END IF;
  IF TG_OP = 'INSERT' OR NOT OLD.permission_confirmed OR NEW.file_path IS DISTINCT FROM OLD.file_path OR NEW.link_url IS DISTINCT FROM OLD.link_url THEN
    NEW.permission_confirmed_at := now();
  END IF;
  IF NEW.status <> 'active' THEN NEW.is_public := false; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER validate_portfolio_item BEFORE INSERT OR UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_portfolio_item();

CREATE OR REPLACE FUNCTION public.portfolio_item_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE portfolio_removal_requests SET status = 'item_deleted', resolved_at = now() WHERE item_id = OLD.id AND status = 'open';
  RETURN OLD;
END $$;
CREATE TRIGGER portfolio_item_deleted BEFORE DELETE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.portfolio_item_deleted();

CREATE OR REPLACE FUNCTION public.request_portfolio_removal(_item_id uuid, _reason text, _details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE it portfolio_items; nid uuid;
BEGIN
  SELECT * INTO it FROM portfolio_items WHERE id = _item_id;
  IF it.id IS NULL OR auth.uid() IS NULL OR it.placement_id IS NULL
     OR NOT (public.can_manage_placement(it.placement_id, auth.uid())) THEN
    RAISE EXCEPTION 'Only the employer for the linked placement can request removal';
  END IF;
  IF _reason NOT IN ('confidential','unauthorised','personal_data','inaccurate','other') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
  IF EXISTS (SELECT 1 FROM portfolio_removal_requests WHERE item_id = _item_id AND status = 'open') THEN
    RAISE EXCEPTION 'A removal request is already open for this item';
  END IF;
  INSERT INTO portfolio_removal_requests (item_id, item_title, owner_id, placement_id, requester_id, reason, details)
  VALUES (it.id, it.title, it.user_id, it.placement_id, auth.uid(), _reason, public._ref_check(_details,'Details',0,1000))
  RETURNING id INTO nid;
  PERFORM set_config('app.portfolio_action','on',true);
  UPDATE portfolio_items SET status = 'removal_requested', is_public = false WHERE id = it.id;
  PERFORM set_config('app.portfolio_action','off',true);
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note)
  VALUES (it.placement_id, auth.uid(), public._ref_actor_role(it.placement_id), 'portfolio_removal_requested', it.title);
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_portfolio_removal(_request_id uuid, _decision text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rq portfolio_removal_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only moderators can resolve removal requests'; END IF;
  IF _decision NOT IN ('upheld','dismissed') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO rq FROM portfolio_removal_requests WHERE id = _request_id;
  IF rq.id IS NULL OR rq.status <> 'open' THEN RAISE EXCEPTION 'Request is not open'; END IF;
  UPDATE portfolio_removal_requests SET status = _decision, resolved_by = auth.uid(), resolved_at = now(),
    resolution_note = public._ref_check(_note,'Note',0,1000) WHERE id = _request_id;
  PERFORM set_config('app.portfolio_action','on',true);
  UPDATE portfolio_items SET status = CASE WHEN _decision = 'upheld' THEN 'removed' ELSE 'active' END, is_public = false WHERE id = rq.item_id;
  PERFORM set_config('app.portfolio_action','off',true);
  IF rq.placement_id IS NOT NULL THEN
    INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note)
    VALUES (rq.placement_id, auth.uid(), 'admin', CASE WHEN _decision='upheld' THEN 'portfolio_removed' ELSE 'portfolio_request_dismissed' END, rq.item_title);
  END IF;
END $$;

-- Storage: owners manage files in their own folder; nobody gets public reads (files are served through a checked function)
CREATE POLICY "Portfolio owners upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','pdf'));
CREATE POLICY "Portfolio owners read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Portfolio owners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

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
      SELECT json_agg(json_build_object('author_name', r.author_name, 'author_role', r.author_role, 'content', r.content,
        'duties', r.duties, 'strengths', r.strengths, 'skills_demonstrated', r.skills_demonstrated,
        'company', c.company_name, 'role_title', j.title, 'created_at', r.created_at) ORDER BY r.created_at DESC)
      FROM placement_references r JOIN placements pl ON pl.id = r.placement_id JOIN company_profiles c ON c.id = pl.company_id JOIN jobs j ON j.id = pl.job_id
      WHERE pl.user_id = p.user_id AND r.seeker_approved AND r.status = 'published' AND pl.status = 'completed'), '[]'::json) ELSE '[]'::json END,
    'portfolio', CASE WHEN p.show_portfolio THEN COALESCE((
      SELECT json_agg(json_build_object('id', pi.id, 'title', pi.title, 'description', pi.description,
        'task_summary', pi.task_summary, 'outcomes', pi.outcomes, 'skills', pi.skills,
        'start', to_char(pi.start_date,'YYYY-MM'), 'end', to_char(pi.end_date,'YYYY-MM'),
        'link_url', pi.link_url,
        'file_kind', CASE WHEN pi.file_mime LIKE 'image/%' THEN 'image' WHEN pi.file_mime = 'application/pdf' THEN 'pdf' END,
        'company', CASE WHEN pl.status = 'completed' THEN c.company_name END,
        'role_title', CASE WHEN pl.status = 'completed' THEN j.title END
      ) ORDER BY COALESCE(pi.end_date, pi.start_date) DESC NULLS LAST, pi.created_at DESC)
      FROM portfolio_items pi LEFT JOIN placements pl ON pl.id = pi.placement_id
      LEFT JOIN company_profiles c ON c.id = pl.company_id LEFT JOIN jobs j ON j.id = pl.job_id
      WHERE pi.user_id = p.user_id AND pi.is_public AND pi.status = 'active'), '[]'::json) ELSE '[]'::json END
  )
  FROM public_profiles p LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.slug = lower(_slug) AND p.is_public = true
$function$;