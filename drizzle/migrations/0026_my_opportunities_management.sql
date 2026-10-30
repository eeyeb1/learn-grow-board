ALTER TABLE public.jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('draft','pending_company','changes_requested','company_approved','pending_platform','active','paused','rejected','closed','suspended','archived'));

CREATE OR REPLACE FUNCTION public.guard_company_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE auto boolean := false;
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.publication_revision := 1;
    IF auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'New opportunities start as drafts and must go through company approval'; END IF; END IF;
    RETURN NEW;
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Job ownership cannot be changed'; END IF;
  IF public.job_material(NEW) IS DISTINCT FROM public.job_material(OLD) THEN
    IF OLD.status IN ('pending_company','pending_platform') THEN RAISE EXCEPTION 'This opportunity is locked while under review. Withdraw it to make changes'; END IF;
    IF OLD.status IN ('rejected','suspended','archived') AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Rejected, suspended or archived opportunities cannot be edited; duplicate it to start a new draft'; END IF;
    NEW.publication_revision := OLD.publication_revision + 1;
    IF OLD.status IN ('company_approved','active','paused','closed') THEN
      NEW.status := 'draft'; auto := true;
      INSERT INTO job_review_events(job_id,company_id,actor_id,actor_role,action,from_status,to_status,revision,note) VALUES(OLD.id,OLD.company_id,auth.uid(),'editor','material_change',OLD.status,'draft',NEW.publication_revision,'Material details changed after approval; renewed approval required');
      IF OLD.created_by IS NOT NULL AND OLD.created_by IS DISTINCT FROM auth.uid() THEN PERFORM public._notify(OLD.created_by,'company','job-material:'||OLD.id::text||':'||NEW.publication_revision,'Opportunity needs renewed approval','An approved opportunity was edited.','Material details changed, so it has returned to Draft and must be approved again before publication.','/employer/drafts?company='||OLD.company_id::text); END IF;
    END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT auto AND auth.uid() IS NOT NULL AND coalesce(current_setting('app.job_transition',true),'') <> '1' THEN
    RAISE EXCEPTION 'Status changes must go through the approval process';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.can_manage_listing(_job_id uuid, _uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM jobs j WHERE j.id=_job_id AND (public.company_permission(j.company_id,_uid,'admin')
    OR (public.company_permission(j.company_id,_uid,'member') AND EXISTS(SELECT 1 FROM company_resource_assignments a JOIN company_staff_scopes s ON s.company_id=a.company_id AND s.user_id=a.user_id WHERE a.job_id=j.id AND a.user_id=_uid AND s.scope='opportunity_manager' AND 'edit'=ANY(a.permissions)))))
$$;

CREATE OR REPLACE FUNCTION public.set_job_listing_state(_job_id uuid, _action text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE j jobs%ROWTYPE; prev text; nxt text; role text; mgr boolean; snap jsonb;
BEGIN
  SELECT * INTO j FROM jobs WHERE id=_job_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  prev := j.status; mgr := public.can_manage_listing(j.id,auth.uid());
  role := CASE WHEN public.company_permission(j.company_id,auth.uid(),'admin') THEN 'company_admin' ELSE 'opportunity_manager' END;
  IF _action='pause' AND j.status='active' AND mgr THEN nxt:='paused';
  ELSIF _action='resume' AND j.status='paused' AND mgr THEN
    SELECT approved_snapshot INTO snap FROM job_publication_requests WHERE job_id=j.id AND status='approved' AND revision=j.publication_revision AND (NOT platform_review_required OR platform_status='approved') ORDER BY created_at DESC LIMIT 1;
    IF snap IS NULL OR snap IS DISTINCT FROM public.job_material(j) THEN RAISE EXCEPTION 'This version has not been approved; submit it for approval'; END IF;
    IF j.expires_at IS NOT NULL AND j.expires_at<=now() THEN RAISE EXCEPTION 'The closing date has passed; close this listing or duplicate it'; END IF;
    nxt:='active';
  ELSIF _action='close' AND j.status IN ('active','paused') AND mgr THEN nxt:='closed';
  ELSIF _action='archive' AND j.status IN ('closed','rejected') AND public.company_permission(j.company_id,auth.uid(),'admin') THEN nxt:='archived';
  ELSIF _action='suspend' AND j.status NOT IN ('draft','suspended','archived') AND public.has_role(auth.uid(),'admin') THEN nxt:='suspended'; role:='platform_admin';
  ELSIF _action='reinstate' AND j.status='suspended' AND public.has_role(auth.uid(),'admin') THEN nxt:='draft'; role:='platform_admin';
  ELSE RAISE EXCEPTION 'You are not authorised to make this change'; END IF;
  IF role='platform_admin' AND length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Record a reason of 10 to 2000 characters'; END IF;
  PERFORM set_config('app.job_transition','1',true);
  UPDATE jobs SET status=nxt WHERE id=j.id RETURNING * INTO j;
  PERFORM set_config('app.job_transition','',true);
  PERFORM public._job_event(j,NULL,role,CASE _action WHEN 'close' THEN 'closed' WHEN 'suspend' THEN 'suspended' WHEN 'pause' THEN 'paused' WHEN 'resume' THEN 'resumed' WHEN 'archive' THEN 'archived' ELSE 'reinstated_to_draft' END,prev,nxt,nullif(btrim(coalesce(_note,'')),''));
  IF j.created_by IS DISTINCT FROM auth.uid() THEN
    PERFORM public._notify(j.created_by,'company','job-state:'||j.id::text||':'||gen_random_uuid()::text,'Opportunity status update','Your opportunity''s status has changed.',CASE _action WHEN 'close' THEN 'It has been closed to new applications.' WHEN 'pause' THEN 'It has been paused and is hidden from seekers.' WHEN 'resume' THEN 'It is live again.' WHEN 'archive' THEN 'It has been archived. Application and placement history is kept.' WHEN 'suspend' THEN 'It was suspended by a platform administrator. Reason: '||btrim(_note) ELSE 'It was reinstated as a draft and needs fresh approval before publication.' END,'/employer/opportunities?company='||j.company_id::text);
  END IF;
  IF role='platform_admin' THEN PERFORM public._notify_company_admins(j.company_id,j.created_by,'job-state:'||j.id::text||':'||nxt||':'||extract(epoch from now())::bigint,'Opportunity status update','A platform administrator changed an opportunity''s status.',NULL,'/employer/approvals?company='||j.company_id::text); END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.duplicate_job_as_draft(_job_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jobs%ROWTYPE; nid uuid;
BEGIN
  SELECT * INTO j FROM jobs WHERE id=_job_id;
  IF auth.uid() IS NULL OR NOT FOUND OR NOT (public.can_manage_listing(j.id,auth.uid()) OR (j.created_by=auth.uid() AND public.company_can_draft(j.company_id,auth.uid()))) THEN RAISE EXCEPTION 'You are not authorised to duplicate this opportunity'; END IF;
  IF NOT EXISTS(SELECT 1 FROM job_publication_requests WHERE job_id=j.id AND status='approved') THEN RAISE EXCEPTION 'Only previously approved opportunities can be duplicated here'; END IF;
  INSERT INTO jobs(company_id,title,description,location,location_type,duration,hours_per_week,skill_level,industry,skills,responsibilities,requirements,what_you_will_learn,mentorship_details,status,category,opportunity_details)
  VALUES(j.company_id,left('Copy of '||j.title,200),j.description,j.location,j.location_type,j.duration,j.hours_per_week,j.skill_level,j.industry,j.skills,j.responsibilities,j.requirements,j.what_you_will_learn,j.mentorship_details,'draft',j.category,j.opportunity_details - 'closing_date')
  RETURNING id INTO nid;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.list_managed_opportunities(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.company_permission(_company_id,auth.uid(),'member') THEN RAISE EXCEPTION 'Company staff access required'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x->>'updated_at' DESC) FROM (
    SELECT jsonb_build_object('id',j.id,'title',j.title,'category',j.category,'status',j.status,'created_at',j.created_at,'updated_at',j.updated_at,'expires_at',j.expires_at,
      'openings',j.opportunity_details->>'openings','start_date',j.opportunity_details->>'start_date','end_date',j.opportunity_details->>'end_date',
      'is_admin',public.company_permission(_company_id,auth.uid(),'admin'),'own',j.created_by=auth.uid(),
      'ever_approved',EXISTS(SELECT 1 FROM job_publication_requests r WHERE r.job_id=j.id AND r.status='approved'),
      'has_history',EXISTS(SELECT 1 FROM job_review_events e WHERE e.job_id=j.id),
      'managers',coalesce((SELECT jsonb_agg(coalesce(nullif(ei.full_name,''),nullif(p.full_name,''),'Staff member')) FROM company_resource_assignments a JOIN company_staff_scopes s ON s.company_id=a.company_id AND s.user_id=a.user_id AND s.scope='opportunity_manager' LEFT JOIN employee_identities ei ON ei.user_id=a.user_id LEFT JOIN profiles p ON p.user_id=a.user_id WHERE a.job_id=j.id),'[]'::jsonb),
      'applications',(SELECT count(*) FROM applications ap WHERE ap.job_id=j.id::text),
      'applications_pending',(SELECT count(*) FROM applications ap WHERE ap.job_id=j.id::text AND ap.status IN ('pending','submitted','under_review','reviewing')),
      'applications_accepted',(SELECT count(*) FROM applications ap WHERE ap.job_id=j.id::text AND ap.status='accepted'),
      'placements',(SELECT count(*) FROM placements pl WHERE pl.job_id=j.id),
      'placements_completed',(SELECT count(*) FROM placements pl WHERE pl.job_id=j.id AND pl.status='completed'),
      'saves',(SELECT count(*) FROM favorites f WHERE f.job_id=j.id::text)) x
    FROM jobs j WHERE j.company_id=_company_id AND (public.can_manage_listing(j.id,auth.uid()) OR (j.created_by=auth.uid() AND public.company_job_permission(j.id,auth.uid(),'read')))
      AND (j.status<>'draft' OR j.created_by=auth.uid() OR public.company_job_permission(j.id,auth.uid(),'read'))
    LIMIT 300) s),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.guard_application_open() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM jobs j WHERE j.id::text=NEW.job_id AND j.status='active' AND (j.expires_at IS NULL OR j.expires_at>now())) THEN
    RAISE EXCEPTION 'This opportunity is not accepting applications';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_application_open ON public.applications;
CREATE TRIGGER guard_application_open BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.guard_application_open();

REVOKE ALL ON FUNCTION public.duplicate_job_as_draft(uuid), public.list_managed_opportunities(uuid), public.can_manage_listing(uuid,uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_job_as_draft(uuid), public.list_managed_opportunities(uuid), public.can_manage_listing(uuid,uuid) TO authenticated;