ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('draft','pending_company','changes_requested','company_approved','pending_platform','active','rejected','closed','suspended'));
COMMENT ON COLUMN public.jobs.status IS 'active = Published; only active listings are public/searchable';

ALTER TABLE public.job_publication_requests DROP CONSTRAINT job_publication_requests_status_check;
ALTER TABLE public.job_publication_requests ADD CONSTRAINT job_publication_requests_status_check CHECK (status IN ('pending','approved','rejected','superseded','changes_requested','withdrawn'));
ALTER TABLE public.job_publication_requests
  ADD COLUMN approved_snapshot jsonb,
  ADD COLUMN platform_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN platform_status text CHECK (platform_status IN ('pending','approved','rejected')),
  ADD COLUMN platform_reviewed_by uuid,
  ADD COLUMN platform_reviewed_at timestamptz,
  ADD COLUMN platform_note text;

CREATE TABLE public.job_review_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.company_profiles(id),
  request_id uuid REFERENCES public.job_publication_requests(id),
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  revision integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_review_events_job_idx ON public.job_review_events(job_id, created_at);
GRANT SELECT ON public.job_review_events TO authenticated;
GRANT ALL ON public.job_review_events TO service_role;
ALTER TABLE public.job_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors, company admins and platform admins read review history" ON public.job_review_events FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.created_by=auth.uid()) OR public.company_permission(company_id,auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.guard_job_review_events() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Review history is append-only'; END $$;
CREATE TRIGGER job_review_events_immutable BEFORE UPDATE ON public.job_review_events FOR EACH ROW EXECUTE FUNCTION public.guard_job_review_events();

CREATE FUNCTION public.job_material(j public.jobs) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
SELECT jsonb_build_object('title',j.title,'category',j.category,'description',j.description,'location',j.location,'location_type',j.location_type,'duration',j.duration,'hours_per_week',j.hours_per_week,'skill_level',j.skill_level,'industry',j.industry,'skills',j.skills,'requirements',j.requirements,'what_you_will_learn',j.what_you_will_learn,'responsibilities',j.responsibilities,'mentorship_details',j.mentorship_details,'expires_at',j.expires_at,'opportunity_details',j.opportunity_details) $$;

CREATE FUNCTION public._job_event(_job public.jobs, _request uuid, _role text, _action text, _from text, _to text, _note text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
INSERT INTO job_review_events(job_id,company_id,request_id,actor_id,actor_role,action,from_status,to_status,revision,note) VALUES(_job.id,_job.company_id,_request,auth.uid(),_role,_action,_from,_to,_job.publication_revision,_note) $$;
REVOKE ALL ON FUNCTION public._job_event(public.jobs,uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.job_material(public.jobs) FROM PUBLIC, anon;

CREATE FUNCTION public._notify_company_admins(_company uuid, _except uuid, _key text, _title text, _preview text, _body text, _link text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid; BEGIN FOR u IN SELECT m.user_id FROM company_memberships m WHERE m.company_id=_company AND m.role='company_admin' AND m.status='approved' AND m.user_id IS DISTINCT FROM _except LOOP
  IF public.company_permission(_company,u,'admin') THEN PERFORM public._notify(u,'company',_key||':'||u::text,_title,_preview,_body,_link); END IF; END LOOP; END $$;
REVOKE ALL ON FUNCTION public._notify_company_admins(uuid,uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_company_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
    IF OLD.status IN ('rejected','suspended') AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Rejected or suspended opportunities cannot be edited; duplicate it to start a new draft'; END IF;
    NEW.publication_revision := OLD.publication_revision + 1;
    IF OLD.status IN ('company_approved','active','closed') THEN
      NEW.status := 'draft'; auto := true;
      INSERT INTO job_review_events(job_id,company_id,actor_id,actor_role,action,from_status,to_status,revision,note) VALUES(OLD.id,OLD.company_id,auth.uid(),'editor','material_change',OLD.status,'draft',NEW.publication_revision,'Material details changed after approval; renewed approval required');
      IF OLD.created_by IS NOT NULL AND OLD.created_by IS DISTINCT FROM auth.uid() THEN PERFORM public._notify(OLD.created_by,'company','job-material:'||OLD.id::text||':'||NEW.publication_revision,'Opportunity needs renewed approval','An approved opportunity was edited.','Material details changed, so it has returned to Draft and must be approved again before publication.','/employer/drafts?company='||OLD.company_id::text); END IF;
    END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT auto AND auth.uid() IS NOT NULL AND coalesce(current_setting('app.job_transition',true),'') <> '1' THEN
    RAISE EXCEPTION 'Status changes must go through the approval process';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.company_job_permission(_job_id uuid, _uid uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM jobs j WHERE j.id=_job_id AND (
 (public.company_permission(j.company_id,_uid,'admin') AND (j.status<>'draft' OR j.created_by=_uid OR EXISTS(SELECT 1 FROM job_publication_requests r WHERE r.job_id=j.id AND r.revision=j.publication_revision)))
 OR (_permission='read' AND j.created_by=_uid AND public.company_can_draft(j.company_id,_uid))
 OR (_permission='edit' AND j.created_by=_uid AND j.status IN ('draft','changes_requested') AND public.company_can_draft(j.company_id,_uid))
 OR (public.company_permission(j.company_id,_uid,'member') AND EXISTS(SELECT 1 FROM company_resource_assignments a JOIN company_staff_scopes s ON s.company_id=a.company_id AND s.user_id=a.user_id WHERE a.company_id=j.company_id AND a.job_id=j.id AND a.user_id=_uid AND s.scope IN ('opportunity_manager','approved_employee') AND (_permission=ANY(a.permissions) OR (_permission='read' AND a.permissions && ARRAY['edit','applications']))))))
$$;

DROP POLICY "Company authorised job deletes" ON public.jobs;
CREATE POLICY "Company authorised job deletes" ON public.jobs FOR DELETE TO authenticated USING ((public.company_permission(company_id,auth.uid(),'admin') AND status IN ('draft','changes_requested','rejected')) OR (created_by=auth.uid() AND status IN ('draft','changes_requested') AND public.company_can_draft(company_id,auth.uid())));

CREATE FUNCTION public.submit_job_for_approval(_job_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jobs%ROWTYPE; rid uuid; prev text;
BEGIN
  SELECT * INTO j FROM jobs WHERE id=_job_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT FOUND OR j.status NOT IN ('draft','changes_requested') OR NOT public.company_job_permission(j.id,auth.uid(),'edit') THEN RAISE EXCEPTION 'Only an editable draft you are authorised to edit can be submitted'; END IF;
  PERFORM public.check_opportunity(j, true);
  prev := j.status;
  INSERT INTO job_publication_requests(company_id,job_id,requested_by,revision) VALUES(j.company_id,j.id,auth.uid(),j.publication_revision)
   ON CONFLICT(job_id,revision) DO UPDATE SET status='pending',requested_by=excluded.requested_by,reviewed_by=NULL,reviewed_at=NULL,note=NULL,approved_snapshot=NULL,platform_review_required=false,platform_status=NULL,platform_reviewed_by=NULL,platform_reviewed_at=NULL,platform_note=NULL,created_at=now()
   RETURNING id INTO rid;
  PERFORM set_config('app.job_transition','1',true);
  UPDATE jobs SET status='pending_company' WHERE id=j.id RETURNING * INTO j;
  PERFORM set_config('app.job_transition','',true);
  PERFORM public._job_event(j,rid,'author','submitted',prev,'pending_company',NULL);
  PERFORM public._notify_company_admins(j.company_id,auth.uid(),'job-submitted:'||rid::text||':'||j.publication_revision,'Opportunity awaiting approval','A draft opportunity was submitted for company approval.',NULL,'/employer/approvals?company='||j.company_id::text);
  PERFORM public._notify(auth.uid(),'company','job-submitted-author:'||rid::text||':'||j.publication_revision,'Submitted for company approval','Your opportunity is pending company approval.','It is read-only while under review. You can withdraw it to make changes.','/employer/drafts?company='||j.company_id::text);
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.request_job_publication(_job_id uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.submit_job_for_approval(_job_id) $$;

CREATE FUNCTION public.withdraw_job_submission(_job_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jobs%ROWTYPE; rid uuid;
BEGIN
  SELECT * INTO j FROM jobs WHERE id=_job_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT FOUND OR j.status<>'pending_company' THEN RAISE EXCEPTION 'Only a submission pending company approval can be withdrawn'; END IF;
  SELECT id INTO rid FROM job_publication_requests WHERE job_id=j.id AND revision=j.publication_revision AND status='pending' AND requested_by=auth.uid();
  IF rid IS NULL OR NOT public.company_can_draft(j.company_id,auth.uid()) AND NOT public.company_permission(j.company_id,auth.uid(),'member') THEN RAISE EXCEPTION 'Only the submitter can withdraw this request'; END IF;
  UPDATE job_publication_requests SET status='withdrawn' WHERE id=rid;
  PERFORM set_config('app.job_transition','1',true);
  UPDATE jobs SET status='draft' WHERE id=j.id RETURNING * INTO j;
  PERFORM set_config('app.job_transition','',true);
  PERFORM public._job_event(j,rid,'author','withdrawn','pending_company','draft',NULL);
END $$;

CREATE FUNCTION public.review_job_submission(_request_id uuid, _decision text, _note text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r job_publication_requests%ROWTYPE; j jobs%ROWTYPE; nxt text; platform boolean; others int; msg text;
BEGIN
  SELECT * INTO r FROM job_publication_requests WHERE id=_request_id FOR UPDATE;
  IF auth.uid() IS NULL OR r.id IS NULL OR NOT public.company_permission(r.company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator approval required'; END IF;
  SELECT * INTO j FROM jobs WHERE id=r.job_id FOR UPDATE;
  IF _decision NOT IN ('approve','reject','changes') OR r.status<>'pending' OR j.status<>'pending_company' OR r.revision<>j.publication_revision THEN RAISE EXCEPTION 'This submission is no longer awaiting company approval'; END IF;
  IF length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Record an explanation of 10 to 2000 characters'; END IF;
  SELECT count(*) INTO others FROM company_memberships m WHERE m.company_id=r.company_id AND m.role='company_admin' AND m.status='approved' AND m.user_id<>auth.uid() AND public.company_permission(r.company_id,m.user_id,'admin');
  IF r.requested_by=auth.uid() AND others>0 THEN RAISE EXCEPTION 'You cannot approve your own submission; another company administrator must review it'; END IF;
  IF _decision='approve' THEN
    IF r.requested_by<>auth.uid() AND NOT public.company_job_permission(j.id,r.requested_by,'read') THEN RAISE EXCEPTION 'The submitter no longer has access; ask for a fresh submission'; END IF;
    PERFORM public.check_opportunity(j, true);
    platform := j.category IN ('shadowing','learning_project') OR r.requested_by=auth.uid() OR NOT EXISTS(SELECT 1 FROM job_publication_requests x WHERE x.company_id=j.company_id AND x.status='approved' AND x.id<>r.id AND (NOT x.platform_review_required OR x.platform_status='approved'));
    nxt := CASE WHEN platform THEN 'pending_platform' ELSE 'active' END;
    UPDATE job_publication_requests SET status='approved',reviewed_by=auth.uid(),reviewed_at=now(),note=btrim(_note),approved_snapshot=public.job_material(j),platform_review_required=platform,platform_status=CASE WHEN platform THEN 'pending' END WHERE id=r.id;
    msg := CASE WHEN platform THEN 'Your company approved it. It now needs a platform safety review before publication.' ELSE 'Your company approved it and it is now published.' END;
  ELSE
    nxt := CASE WHEN _decision='reject' THEN 'rejected' ELSE 'changes_requested' END;
    UPDATE job_publication_requests SET status=CASE WHEN _decision='reject' THEN 'rejected' ELSE 'changes_requested' END,reviewed_by=auth.uid(),reviewed_at=now(),note=btrim(_note) WHERE id=r.id;
    msg := CASE WHEN _decision='reject' THEN 'Your company rejected it. Reason: ' ELSE 'Your company requested changes: ' END || btrim(_note);
  END IF;
  PERFORM set_config('app.job_transition','1',true);
  UPDATE jobs SET status=nxt WHERE id=j.id;
  PERFORM set_config('app.job_transition','',true);
  PERFORM public._job_event(j,r.id,'company_admin',CASE _decision WHEN 'approve' THEN 'company_approved' WHEN 'reject' THEN 'company_rejected' ELSE 'changes_requested' END,'pending_company',CASE WHEN _decision='approve' THEN 'company_approved' ELSE nxt END,btrim(_note));
  IF nxt<>'company_approved' AND _decision='approve' THEN PERFORM public._job_event(j,r.id,'system',CASE WHEN nxt='active' THEN 'published' ELSE 'sent_to_platform_review' END,'company_approved',nxt,NULL); END IF;
  PERFORM public._notify(r.requested_by,'company','job-review:'||r.id::text||':'||_decision,'Opportunity approval update','Your opportunity''s approval status has changed.',msg,'/employer/drafts?company='||r.company_id::text);
  IF nxt='pending_platform' THEN
    PERFORM public._notify(ur.user_id,'company','job-platform:'||r.id::text,'Opportunity awaiting safety review','A company-approved opportunity needs platform safety review.',NULL,'/admin/opportunities') FROM user_roles ur WHERE ur.role='admin';
  END IF;
  RETURN nxt;
END $$;

CREATE OR REPLACE FUNCTION public.review_job_publication(_request_id uuid, _approve boolean, _note text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.review_job_submission(_request_id, CASE WHEN _approve THEN 'approve' ELSE 'reject' END, _note); $$;

CREATE FUNCTION public.platform_review_job(_request_id uuid, _approve boolean, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r job_publication_requests%ROWTYPE; j jobs%ROWTYPE; nxt text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
  SELECT * INTO r FROM job_publication_requests WHERE id=_request_id FOR UPDATE;
  SELECT * INTO j FROM jobs WHERE id=r.job_id FOR UPDATE;
  IF r.id IS NULL OR _approve IS NULL OR r.platform_status IS DISTINCT FROM 'pending' OR j.status<>'pending_platform' OR r.revision<>j.publication_revision OR r.approved_snapshot IS DISTINCT FROM public.job_material(j) THEN RAISE EXCEPTION 'This opportunity is no longer awaiting platform review'; END IF;
  IF length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Record review notes of 10 to 2000 characters'; END IF;
  nxt := CASE WHEN _approve THEN 'active' ELSE 'rejected' END;
  UPDATE job_publication_requests SET platform_status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,platform_reviewed_by=auth.uid(),platform_reviewed_at=now(),platform_note=btrim(_note) WHERE id=r.id;
  PERFORM set_config('app.job_transition','1',true);
  UPDATE jobs SET status=nxt WHERE id=j.id;
  PERFORM set_config('app.job_transition','',true);
  PERFORM public._job_event(j,r.id,'platform_admin',CASE WHEN _approve THEN 'published' ELSE 'platform_rejected' END,'pending_platform',nxt,btrim(_note));
  PERFORM public._notify(r.requested_by,'company','job-platform-result:'||r.id::text,'Opportunity approval update','Your opportunity''s approval status has changed.',CASE WHEN _approve THEN 'It passed platform safety review and is now published.' ELSE 'It did not pass platform safety review. Reason: '||btrim(_note) END,'/employer/drafts?company='||r.company_id::text);
  PERFORM public._notify_company_admins(r.company_id,r.requested_by,'job-platform-result:'||r.id::text,'Opportunity safety review completed','A platform safety review decision was recorded.',NULL,'/employer/approvals?company='||r.company_id::text);
END $$;

CREATE FUNCTION public.set_job_listing_state(_job_id uuid, _action text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jobs%ROWTYPE; prev text; nxt text; role text;
BEGIN
  SELECT * INTO j FROM jobs WHERE id=_job_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  prev := j.status;
  IF _action='close' AND j.status='active' AND public.company_permission(j.company_id,auth.uid(),'admin') THEN nxt:='closed'; role:='company_admin';
  ELSIF _action='suspend' AND j.status NOT IN ('draft','suspended') AND public.has_role(auth.uid(),'admin') THEN nxt:='suspended'; role:='platform_admin';
  ELSIF _action='reinstate' AND j.status='suspended' AND public.has_role(auth.uid(),'admin') THEN nxt:='draft'; role:='platform_admin';
  ELSE RAISE EXCEPTION 'You are not authorised to make this change'; END IF;
  IF role='platform_admin' AND length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Record a reason of 10 to 2000 characters'; END IF;
  PERFORM set_config('app.job_transition','1',true);
  UPDATE jobs SET status=nxt WHERE id=j.id RETURNING * INTO j;
  PERFORM set_config('app.job_transition','',true);
  PERFORM public._job_event(j,NULL,role,CASE _action WHEN 'close' THEN 'closed' WHEN 'suspend' THEN 'suspended' ELSE 'reinstated_to_draft' END,prev,nxt,nullif(btrim(coalesce(_note,'')),''));
  PERFORM public._notify(j.created_by,'company','job-state:'||j.id::text||':'||gen_random_uuid()::text,'Opportunity status update','Your opportunity''s status has changed.',CASE _action WHEN 'close' THEN 'It has been closed to new applications.' WHEN 'suspend' THEN 'It was suspended by a platform administrator. Reason: '||btrim(_note) ELSE 'It was reinstated as a draft and needs fresh approval before publication.' END,'/employer/drafts?company='||j.company_id::text);
  IF role='platform_admin' THEN PERFORM public._notify_company_admins(j.company_id,j.created_by,'job-state:'||j.id::text||':'||nxt||':'||extract(epoch from now())::bigint,'Opportunity status update','A platform administrator changed an opportunity''s status.',NULL,'/employer/approvals?company='||j.company_id::text); END IF;
END $$;

CREATE FUNCTION public.list_platform_job_reviews() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
  RETURN jsonb_build_object(
   'pending',coalesce((SELECT jsonb_agg(jsonb_build_object('request_id',r.id,'job_id',j.id,'company_name',c.company_name,'revision',r.revision,'company_note',r.note,'company_reviewed_at',r.reviewed_at,'snapshot',r.approved_snapshot) ORDER BY r.reviewed_at) FROM job_publication_requests r JOIN jobs j ON j.id=r.job_id JOIN company_profiles c ON c.id=r.company_id WHERE r.platform_status='pending' AND j.status='pending_platform'),'[]'::jsonb),
   'listings',coalesce((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('job_id',j.id,'title',j.title,'status',j.status,'company_name',c.company_name,'updated_at',j.updated_at) x FROM jobs j JOIN company_profiles c ON c.id=j.company_id WHERE j.status IN ('active','closed','suspended','company_approved') ORDER BY j.updated_at DESC LIMIT 100) s),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.submit_job_for_approval(uuid), public.withdraw_job_submission(uuid), public.review_job_submission(uuid,text,text), public.platform_review_job(uuid,boolean,text), public.set_job_listing_state(uuid,text,text), public.list_platform_job_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_job_for_approval(uuid), public.withdraw_job_submission(uuid), public.review_job_submission(uuid,text,text), public.platform_review_job(uuid,boolean,text), public.set_job_listing_state(uuid,text,text), public.list_platform_job_reviews() TO authenticated;