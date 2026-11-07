ALTER TABLE public.skill_verifications ADD COLUMN status text NOT NULL DEFAULT 'active', ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.skill_verifications ALTER COLUMN show_on_profile SET DEFAULT false;
CREATE TABLE public.placement_feedback_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), placement_id uuid NOT NULL REFERENCES public.placements(id), resource_id uuid NOT NULL, resource_type text NOT NULL, actor_id uuid, action text NOT NULL, before_state jsonb, after_state jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.placement_feedback_events TO authenticated;
GRANT ALL ON public.placement_feedback_events TO service_role;
ALTER TABLE public.placement_feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Placement participants read feedback history" ON public.placement_feedback_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.placements p WHERE p.id=placement_id AND p.user_id=auth.uid()) OR public.can_manage_placement(placement_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.audit_placement_feedback() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO placement_feedback_events(placement_id,resource_id,resource_type,actor_id,action,before_state,after_state) VALUES(coalesce(NEW.placement_id,OLD.placement_id),coalesce(NEW.id,OLD.id),TG_TABLE_NAME,auth.uid(),TG_OP,CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER audit_skill_feedback AFTER INSERT OR UPDATE OR DELETE ON public.skill_verifications FOR EACH ROW EXECUTE FUNCTION public.audit_placement_feedback();
CREATE TRIGGER audit_reference_feedback AFTER INSERT OR UPDATE OR DELETE ON public.placement_references FOR EACH ROW EXECUTE FUNCTION public.audit_placement_feedback();
CREATE FUNCTION public.guard_feedback_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Feedback history is append-only'; END $$;
CREATE TRIGGER guard_feedback_history BEFORE UPDATE OR DELETE ON public.placement_feedback_events FOR EACH ROW EXECUTE FUNCTION public.guard_feedback_history();
CREATE FUNCTION public.can_confirm_placement_feedback(_placement_id uuid,_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM placements p WHERE p.id=_placement_id AND public.can_verify_hours(p.application_id,_uid)) $$;
REVOKE ALL ON FUNCTION public.can_confirm_placement_feedback(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_confirm_placement_feedback(uuid,uuid) TO authenticated;
CREATE FUNCTION public.guard_skill_feedback() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.status NOT IN ('active','hidden','revoked') THEN RAISE EXCEPTION 'Invalid skill status'; END IF;
 IF TG_OP='INSERT' OR (NEW.skill,NEW.category,NEW.example) IS DISTINCT FROM (OLD.skill,OLD.category,OLD.example) THEN
  IF NOT public.can_confirm_placement_feedback(NEW.placement_id,auth.uid()) THEN RAISE EXCEPTION 'Only the assigned authorised supervisor can confirm skills'; END IF;
  IF nullif(btrim(NEW.example),'') IS NULL THEN RAISE EXCEPTION 'Provide a directly observed example'; END IF;
  NEW.show_on_profile:=false;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER guard_skill_feedback BEFORE INSERT OR UPDATE ON public.skill_verifications FOR EACH ROW EXECUTE FUNCTION public.guard_skill_feedback();
CREATE FUNCTION public.update_placement_skill(_id uuid,_example text,_directly_observed boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s skill_verifications; BEGIN
 SELECT * INTO s FROM skill_verifications WHERE id=_id FOR UPDATE;
 IF s.id IS NULL OR s.verified_by<>auth.uid() OR NOT public.can_confirm_placement_feedback(s.placement_id,auth.uid()) OR s.status<>'active' THEN RAISE EXCEPTION 'Only the assigned original reviewer can edit an active confirmation'; END IF;
 IF NOT coalesce(_directly_observed,false) THEN RAISE EXCEPTION 'Confirm direct observation'; END IF;
 UPDATE skill_verifications SET example=public._ref_check(_example,'Observed example',1,300),show_on_profile=false WHERE id=_id;
 INSERT INTO placement_events(placement_id,actor_id,actor_role,action) VALUES(s.placement_id,auth.uid(),'employer','skill_edited');
END $$;
CREATE OR REPLACE FUNCTION public.revoke_skill_verification(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s skill_verifications; BEGIN
 SELECT * INTO s FROM skill_verifications WHERE id=_id FOR UPDATE;
 IF s.id IS NULL OR s.verified_by<>auth.uid() OR NOT public.can_confirm_placement_feedback(s.placement_id,auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 UPDATE skill_verifications SET status='revoked',show_on_profile=false WHERE id=_id;
 INSERT INTO placement_events(placement_id,actor_id,actor_role,action) VALUES(s.placement_id,auth.uid(),'employer','skill_revoked');
END $$;
CREATE OR REPLACE FUNCTION public.set_skill_visibility(_id uuid,_visible boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE skill_verifications SET show_on_profile=coalesce(_visible,false) WHERE id=_id AND user_id=auth.uid() AND (NOT coalesce(_visible,false) OR status='active');
 IF NOT FOUND THEN RAISE EXCEPTION 'Not authorised or skill unavailable'; END IF;
END $$;
CREATE FUNCTION public.guard_reference_reviewer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n text; BEGIN
 IF TG_OP='INSERT' OR (NEW.duties,NEW.strengths,NEW.skills_demonstrated,NEW.improvement_areas,NEW.content,NEW.author_name,NEW.author_role) IS DISTINCT FROM (OLD.duties,OLD.strengths,OLD.skills_demonstrated,OLD.improvement_areas,OLD.content,OLD.author_name,OLD.author_role) THEN
  IF NEW.author_id IS DISTINCT FROM auth.uid() OR NOT public.can_confirm_placement_feedback(NEW.placement_id,auth.uid()) THEN RAISE EXCEPTION 'Only the assigned authorised reviewer can write feedback'; END IF;
  SELECT coalesce(nullif(btrim(e.full_name),''),nullif(btrim(p.full_name),''),'Supervisor') INTO n FROM profiles p LEFT JOIN employee_identities e ON e.user_id=p.user_id WHERE p.user_id=auth.uid();
  NEW.author_name:=coalesce(n,'Supervisor'); NEW.seeker_approved:=false;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_reference_reviewer BEFORE INSERT OR UPDATE ON public.placement_references FOR EACH ROW EXECUTE FUNCTION public.guard_reference_reviewer();
CREATE TABLE public.skill_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),skill_id uuid NOT NULL REFERENCES public.skill_verifications(id),reporter_id uuid NOT NULL,reason text NOT NULL,details text,status text NOT NULL DEFAULT 'open',resolved_by uuid,resolved_at timestamptz,resolution_note text,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.skill_reports TO authenticated;
GRANT ALL ON public.skill_reports TO service_role;
ALTER TABLE public.skill_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters or admins read skill reports" ON public.skill_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX one_open_skill_report ON public.skill_reports(skill_id,reporter_id) WHERE status='open';
CREATE FUNCTION public.report_placement_skill(_id uuid,_reason text,_details text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s skill_verifications; nid uuid; BEGIN
 SELECT * INTO s FROM skill_verifications WHERE id=_id;
 IF auth.uid() IS NULL OR s.id IS NULL OR NOT(s.user_id=auth.uid() OR public.can_manage_placement(s.placement_id,auth.uid())) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF _reason NOT IN ('abusive','inaccurate','not_my_placement','personal_information','other') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
 INSERT INTO skill_reports(skill_id,reporter_id,reason,details) VALUES(_id,auth.uid(),_reason,public._ref_check(_details,'Details',0,1000)) RETURNING id INTO nid;
 INSERT INTO placement_feedback_events(placement_id,resource_id,resource_type,actor_id,action,after_state) VALUES(s.placement_id,s.id,'skill_verifications',auth.uid(),'reported',jsonb_build_object('report_id',nid,'reason',_reason)); RETURN nid;
END $$;
CREATE FUNCTION public.moderate_skill_report(_report_id uuid,_decision text,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r skill_reports; s skill_verifications; BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only platform administrators can moderate'; END IF;
 IF _decision NOT IN ('upheld','dismissed') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO r FROM skill_reports WHERE id=_report_id FOR UPDATE;
 IF r.id IS NULL OR r.status<>'open' THEN RAISE EXCEPTION 'Report is not open'; END IF;
 SELECT * INTO s FROM skill_verifications WHERE id=r.skill_id FOR UPDATE;
 UPDATE skill_reports SET status=_decision,resolved_by=auth.uid(),resolved_at=now(),resolution_note=public._ref_check(_note,'Decision reason',1,1000) WHERE id=r.id;
 IF _decision='upheld' THEN UPDATE skill_verifications SET status='hidden',show_on_profile=false WHERE id=s.id; END IF;
 INSERT INTO placement_feedback_events(placement_id,resource_id,resource_type,actor_id,action,after_state) VALUES(s.placement_id,s.id,'skill_verifications',auth.uid(),'report_'||_decision,jsonb_build_object('report_id',r.id,'note',_note));
END $$;
REVOKE ALL ON FUNCTION public.update_placement_skill(uuid,text,boolean),public.report_placement_skill(uuid,text,text),public.moderate_skill_report(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_placement_skill(uuid,text,boolean),public.report_placement_skill(uuid,text,text),public.moderate_skill_report(uuid,text,text) TO authenticated;
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.get_public_profile(text)'::regprocedure) INTO d;
 d:=replace(d,'sv.show_on_profile AND pl.status', 'sv.show_on_profile AND sv.status=''active'' AND pl.status'); EXECUTE d;
 SELECT pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) INTO d;
 d:=replace(d,'sv.placement_id=_placement_id','sv.placement_id=_placement_id AND sv.status=''active'''); EXECUTE d;
END $$;