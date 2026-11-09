CREATE OR REPLACE FUNCTION public.can_complete_placement(_placement_id uuid, _uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM placements p WHERE p.id=_placement_id AND p.user_id<>_uid AND (public.company_permission(p.company_id,_uid,'admin') OR public.can_verify_hours(p.application_id,_uid))) $$;
REVOKE ALL ON FUNCTION public.can_complete_placement(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_complete_placement(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_placement_completion_review(_placement_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE p placements; result jsonb; BEGIN
 SELECT * INTO p FROM placements WHERE id=_placement_id;
 IF auth.uid() IS NULL OR p.id IS NULL OR NOT public.can_complete_placement(p.id,auth.uid()) THEN RAISE EXCEPTION 'Only the assigned supervisor or company administrator can review completion'; END IF;
 SELECT jsonb_build_object('can_complete',true,'approved_minutes',coalesce(sum(minutes) FILTER(WHERE status='approved'),0),'outstanding_count',count(*) FILTER(WHERE status IN ('pending','correction_requested')),'rejected_count',count(*) FILTER(WHERE status='rejected')) INTO result FROM hour_entries WHERE application_id=p.application_id AND user_id=p.user_id;
 RETURN result || jsonb_build_object('skills',coalesce((SELECT jsonb_agg(jsonb_build_object('skill',skill,'example',example,'verifier_name',verifier_name) ORDER BY skill) FROM skill_verifications WHERE placement_id=p.id AND company_id=p.company_id AND user_id=p.user_id AND status='active' AND nullif(btrim(example),'') IS NOT NULL),'[]'::jsonb)); END $$;
REVOKE ALL ON FUNCTION public.get_placement_completion_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_placement_completion_review(uuid) TO authenticated;
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.validate_hour_entry()'::regprocedure) INTO d;
 d:=replace(d,'BEGIN', E'BEGIN\n  PERFORM 1 FROM public.placements WHERE application_id=NEW.application_id FOR UPDATE;'); EXECUTE d;
 SELECT pg_get_functiondef('public.placement_action(uuid,text,text)'::regprocedure) INTO d;
 d:=replace(d, 'ELSIF _action = ''complete'' AND p.status = ''active'' THEN', E'ELSIF _action = ''complete'' AND p.status = ''active'' THEN\n    IF NOT public.can_complete_placement(p.id,auth.uid()) THEN RAISE EXCEPTION ''Only the assigned supervisor or company administrator can complete a placement''; END IF;\n    IF p.start_date IS NULL OR p.end_date IS NULL OR p.end_date<p.start_date OR p.end_date>current_date THEN RAISE EXCEPTION ''Record actual placement dates ending no later than today''; END IF;\n    IF EXISTS(SELECT 1 FROM hour_entries WHERE application_id=p.application_id AND status IN (''pending'',''correction_requested'')) THEN RAISE EXCEPTION ''Resolve outstanding hours and correction requests first''; END IF;');
 d:=replace(d,'certificate_issued_at=now()','certificate_issued_at=NULL');
 d:=replace(d, 'PERFORM set_config(''app.placement_action'',''off'',true);', E'PERFORM set_config(''app.placement_action'',''off'',true);\n    IF EXISTS(SELECT 1 FROM hour_entries WHERE application_id=p.application_id AND user_id=p.user_id AND status=''approved'' AND minutes>0) THEN PERFORM public.issue_certificate(p.id); END IF;'); EXECUTE d;
END $$;
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) INTO d;
 d:=replace(d,'SELECT * INTO p FROM public.placements WHERE id = _placement_id;', 'SELECT * INTO p FROM public.placements WHERE id = _placement_id FOR UPDATE;');
 d:=replace(d,'_mgr := public.can_manage_placement(_placement_id, _uid);','_mgr := public.can_complete_placement(_placement_id, _uid);');
 d:=replace(d,'SELECT * INTO _existing FROM public.certificates WHERE placement_id = _placement_id;', E'IF p.start_date IS NULL OR p.end_date IS NULL OR p.end_date<p.start_date OR p.end_date>current_date THEN RAISE EXCEPTION ''Actual placement dates are required''; END IF;\n  IF EXISTS(SELECT 1 FROM hour_entries WHERE application_id=p.application_id AND status IN (''pending'',''correction_requested'')) THEN RAISE EXCEPTION ''Resolve outstanding hours first''; END IF;\n  SELECT * INTO _existing FROM public.certificates WHERE placement_id = _placement_id FOR UPDATE;\n  IF _existing.id IS NOT NULL AND _existing.revoked_at IS NULL THEN RETURN _existing.id; END IF;');
 d:=replace(d,'AND status = ''approved'';','AND user_id=p.user_id AND status = ''approved'';');
 d:=replace(d,'AND status=''active'';', 'AND status=''active'' AND company_id=p.company_id AND user_id=p.user_id AND nullif(btrim(example),'''') IS NOT NULL;');
 d:=replace(d,'IF FOUND AND _existing.id IS NOT NULL THEN','IF _existing.id IS NOT NULL THEN');
 d:=replace(d,'RETURN _id;', E'UPDATE placements SET certificate_issued_at=now() WHERE id=p.id;\n  PERFORM public._notify(p.user_id,''placement'',''certificate:''||_id||'':''||(SELECT code FROM certificates WHERE id=_id),''Experience certificate ready'',''Your recorded experience certificate is available.'',NULL,''/placements/''||p.id);\n  RETURN _id;'); EXECUTE d;
 SELECT pg_get_functiondef('public.revoke_certificate(uuid,text)'::regprocedure) INTO d;
 d:=replace(d,'public.can_manage_placement(c.placement_id, _uid)','public.can_complete_placement(c.placement_id, _uid)');
 d:=replace(d,'public.can_manage_placement(c.placement_id,_uid)','public.can_complete_placement(c.placement_id,_uid)');
 d:=replace(d,'SELECT * INTO c FROM public.certificates WHERE id = _id;','SELECT * INTO c FROM public.certificates WHERE id = _id FOR UPDATE;');
 d:=replace(d,'END $function$', E'  PERFORM public._notify(c.user_id,''placement'',''certificate-revoked:''||c.code,''Certificate update'',''A certificate has been updated. Open your placement for details.'',NULL,''/placements/''||c.placement_id);\nEND $function$'); EXECUTE d;
END $$;
CREATE TABLE public.certificate_revisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),certificate_id uuid NOT NULL REFERENCES public.certificates(id),placement_id uuid NOT NULL REFERENCES public.placements(id),actor_id uuid,before_state jsonb,after_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.certificate_revisions TO authenticated;
GRANT ALL ON public.certificate_revisions TO service_role;
ALTER TABLE public.certificate_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certificate participants read history" ON public.certificate_revisions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM placements p WHERE p.id=placement_id AND p.user_id=auth.uid()) OR public.can_complete_placement(placement_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.audit_certificate_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO certificate_revisions(certificate_id,placement_id,actor_id,after_state) VALUES(NEW.id,NEW.placement_id,auth.uid(),to_jsonb(NEW));
 ELSIF (to_jsonb(NEW)-ARRAY['verification_enabled','show_name','show_hours','show_skills','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['verification_enabled','show_name','show_hours','show_skills','updated_at']) THEN INSERT INTO certificate_revisions(certificate_id,placement_id,actor_id,before_state,after_state) VALUES(NEW.id,NEW.placement_id,auth.uid(),to_jsonb(OLD),to_jsonb(NEW)); END IF; RETURN NEW; END $$;
CREATE TRIGGER certificate_revision_audit AFTER INSERT OR UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.audit_certificate_revision();
CREATE TRIGGER certificate_revisions_immutable BEFORE UPDATE OR DELETE ON public.certificate_revisions FOR EACH ROW EXECUTE FUNCTION public.guard_feedback_history();
REVOKE ALL ON FUNCTION public.audit_certificate_revision() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.verify_certificate(text)'::regprocedure) INTO d;
 d:=replace(d,'IF NOT FOUND THEN RETURN json_build_object(''status'',''not_found''); END IF;','IF NOT FOUND THEN IF EXISTS(SELECT 1 FROM certificate_revisions WHERE before_state->>''code''=upper(trim(_code)) AND before_state->>''revoked_at'' IS NOT NULL) THEN RETURN json_build_object(''status'',''revoked'',''code'',upper(trim(_code))); END IF; RETURN json_build_object(''status'',''not_found''); END IF;'); EXECUTE d; END $$;