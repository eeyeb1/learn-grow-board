ALTER TABLE public.placement_references
  ADD COLUMN duties text,
  ADD COLUMN strengths text,
  ADD COLUMN skills_demonstrated text,
  ADD COLUMN improvement_areas text,
  ADD COLUMN company_id uuid REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  ADD COLUMN status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','withdrawn')),
  ADD COLUMN moderated_by uuid,
  ADD COLUMN moderated_at timestamptz,
  ADD COLUMN moderation_note text;
UPDATE public.placement_references r SET company_id = p.company_id FROM public.placements p WHERE p.id = r.placement_id;

-- all writes go through audited RPCs
DROP POLICY IF EXISTS "Employers delete own references" ON public.placement_references;
DROP POLICY IF EXISTS "Employers edit own references" ON public.placement_references;
DROP POLICY IF EXISTS "Employers write references" ON public.placement_references;
DROP POLICY IF EXISTS "Seekers approve references" ON public.placement_references;
CREATE POLICY "Admins view all references" ON public.placement_references FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reference_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.placement_references(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('abusive','inaccurate','not_my_placement','personal_information','other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reference_reports_ref ON public.reference_reports(reference_id);
GRANT SELECT ON public.reference_reports TO authenticated;
GRANT ALL ON public.reference_reports TO service_role;
ALTER TABLE public.reference_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters view own reports" ON public.reference_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admins view all reports" ON public.reference_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public._ref_actor_role(_placement_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(),'admin') THEN 'admin'
              WHEN EXISTS (SELECT 1 FROM placements WHERE id=_placement_id AND user_id=auth.uid()) THEN 'seeker'
              ELSE 'employer' END
$$;

CREATE OR REPLACE FUNCTION public._ref_check(_v text, _label text, _min int, _max int) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE t text := NULLIF(btrim(coalesce(_v,'')),'');
BEGIN
  IF _min > 0 AND (t IS NULL OR char_length(t) < _min) THEN RAISE EXCEPTION '% must be at least % characters', _label, _min; END IF;
  IF t IS NOT NULL AND char_length(t) > _max THEN RAISE EXCEPTION '% must be % characters or fewer', _label, _max; END IF;
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.submit_reference(_placement_id uuid, _author_name text, _author_role text, _duties text, _strengths text, _skills text, _improvements text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl placements; nid uuid; d text; s text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM placements p JOIN company_profiles c ON c.id=p.company_id WHERE p.id=_placement_id AND c.user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Only an authorised representative of this placement''s company can write a reference';
  END IF;
  SELECT * INTO pl FROM placements WHERE id=_placement_id;
  IF pl.status <> 'completed' THEN RAISE EXCEPTION 'References can only be written for completed placements'; END IF;
  d := public._ref_check(_duties,'Duties',10,1000);
  s := public._ref_check(_strengths,'Strengths',10,1000);
  INSERT INTO placement_references (placement_id, author_id, author_name, author_role, content, duties, strengths, skills_demonstrated, improvement_areas, company_id)
  VALUES (_placement_id, auth.uid(), public._ref_check(_author_name,'Reviewer name',2,100), public._ref_check(_author_role,'Reviewer role',2,100),
          d || E'\n\n' || s, d, s, public._ref_check(_skills,'Skills demonstrated',0,1000), public._ref_check(_improvements,'Improvement areas',0,1000), pl.company_id)
  RETURNING id INTO nid;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note) VALUES (_placement_id, auth.uid(), 'employer', 'reference_submitted', NULL);
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.update_reference(_id uuid, _author_name text, _author_role text, _duties text, _strengths text, _skills text, _improvements text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r placement_references; d text; s text;
BEGIN
  SELECT * INTO r FROM placement_references WHERE id=_id;
  IF r.id IS NULL OR r.author_id <> auth.uid() THEN RAISE EXCEPTION 'Only the author can edit this reference'; END IF;
  IF r.status <> 'published' THEN RAISE EXCEPTION 'This reference can no longer be edited'; END IF;
  d := public._ref_check(_duties,'Duties',10,1000);
  s := public._ref_check(_strengths,'Strengths',10,1000);
  UPDATE placement_references SET author_name=public._ref_check(_author_name,'Reviewer name',2,100), author_role=public._ref_check(_author_role,'Reviewer role',2,100),
    duties=d, strengths=s, content=d || E'\n\n' || s, skills_demonstrated=public._ref_check(_skills,'Skills demonstrated',0,1000),
    improvement_areas=public._ref_check(_improvements,'Improvement areas',0,1000), seeker_approved=false
  WHERE id=_id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note) VALUES (r.placement_id, auth.uid(), 'employer', 'reference_edited', 'Seeker approval reset');
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_reference(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r placement_references;
BEGIN
  SELECT * INTO r FROM placement_references WHERE id=_id;
  IF r.id IS NULL OR r.author_id <> auth.uid() THEN RAISE EXCEPTION 'Only the author can withdraw this reference'; END IF;
  UPDATE placement_references SET status='withdrawn', seeker_approved=false WHERE id=_id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action) VALUES (r.placement_id, auth.uid(), 'employer', 'reference_withdrawn');
END $$;

CREATE OR REPLACE FUNCTION public.set_reference_approval(_id uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r placement_references;
BEGIN
  SELECT * INTO r FROM placement_references WHERE id=_id;
  IF r.id IS NULL OR NOT EXISTS (SELECT 1 FROM placements WHERE id=r.placement_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _approved AND r.status <> 'published' THEN RAISE EXCEPTION 'This reference is not available to show'; END IF;
  UPDATE placement_references SET seeker_approved=coalesce(_approved,false) WHERE id=_id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action) VALUES (r.placement_id, auth.uid(), 'seeker', CASE WHEN _approved THEN 'reference_approved' ELSE 'reference_unapproved' END);
END $$;

CREATE OR REPLACE FUNCTION public.report_reference(_id uuid, _reason text, _details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r placement_references; nid uuid;
BEGIN
  SELECT * INTO r FROM placement_references WHERE id=_id;
  IF r.id IS NULL OR auth.uid() IS NULL OR NOT (EXISTS (SELECT 1 FROM placements WHERE id=r.placement_id AND user_id=auth.uid()) OR public.can_manage_placement(r.placement_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF EXISTS (SELECT 1 FROM reference_reports WHERE reference_id=_id AND reporter_id=auth.uid() AND status='open') THEN
    RAISE EXCEPTION 'You already have an open report for this reference';
  END IF;
  INSERT INTO reference_reports (reference_id, reporter_id, reason, details)
  VALUES (_id, auth.uid(), _reason, public._ref_check(_details,'Details',0,1000)) RETURNING id INTO nid;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note) VALUES (r.placement_id, auth.uid(), public._ref_actor_role(r.placement_id), 'reference_reported', _reason);
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.moderate_reference_report(_report_id uuid, _decision text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rp reference_reports; r placement_references;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only moderators can resolve reports'; END IF;
  IF _decision NOT IN ('upheld','dismissed') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO rp FROM reference_reports WHERE id=_report_id;
  IF rp.id IS NULL OR rp.status <> 'open' THEN RAISE EXCEPTION 'Report is not open'; END IF;
  SELECT * INTO r FROM placement_references WHERE id=rp.reference_id;
  UPDATE reference_reports SET status=_decision, resolved_by=auth.uid(), resolved_at=now(), resolution_note=public._ref_check(_note,'Note',0,1000) WHERE id=_report_id;
  IF _decision='upheld' THEN
    UPDATE placement_references SET status='hidden', seeker_approved=false, moderated_by=auth.uid(), moderated_at=now(), moderation_note=public._ref_check(_note,'Note',0,1000) WHERE id=r.id;
  END IF;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note) VALUES (r.placement_id, auth.uid(), 'admin', CASE WHEN _decision='upheld' THEN 'reference_hidden' ELSE 'reference_report_dismissed' END, _note);
END $$;

CREATE OR REPLACE FUNCTION public.restore_reference(_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r placement_references;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only moderators can restore references'; END IF;
  SELECT * INTO r FROM placement_references WHERE id=_id;
  IF r.id IS NULL OR r.status <> 'hidden' THEN RAISE EXCEPTION 'Reference is not hidden'; END IF;
  UPDATE placement_references SET status='published', moderated_by=auth.uid(), moderated_at=now(), moderation_note=_note WHERE id=_id;
  INSERT INTO placement_events (placement_id, actor_id, actor_role, action, note) VALUES (r.placement_id, auth.uid(), 'admin', 'reference_restored', _note);
END $$;

REVOKE EXECUTE ON FUNCTION public.submit_reference(uuid,text,text,text,text,text,text), public.update_reference(uuid,text,text,text,text,text,text),
  public.withdraw_reference(uuid), public.set_reference_approval(uuid,boolean), public.report_reference(uuid,text,text),
  public.moderate_reference_report(uuid,text,text), public.restore_reference(uuid,text), public._ref_actor_role(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_reference(uuid,text,text,text,text,text,text), public.update_reference(uuid,text,text,text,text,text,text),
  public.withdraw_reference(uuid), public.set_reference_approval(uuid,boolean), public.report_reference(uuid,text,text),
  public.moderate_reference_report(uuid,text,text), public.restore_reference(uuid,text) TO authenticated;

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
      WHERE pl.user_id = p.user_id AND r.seeker_approved AND r.status = 'published' AND pl.status = 'completed'), '[]'::json) ELSE '[]'::json END
  )
  FROM public_profiles p LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.slug = lower(_slug) AND p.is_public = true
$function$;