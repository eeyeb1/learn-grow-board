CREATE POLICY "Platform admins read disputed skills" ON public.skill_verifications FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) INTO d; d:=replace(d,'FROM public.skill_verifications WHERE placement_id = _placement_id','FROM public.skill_verifications WHERE placement_id = _placement_id AND status=''active'''); EXECUTE d; END $$;
CREATE FUNCTION public.notify_skill_feedback() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' OR (NEW.example,NEW.status) IS DISTINCT FROM (OLD.example,OLD.status) THEN
  PERFORM public._notify(NEW.user_id,'feedback','skill-feedback:'||NEW.id::text||':'||NEW.updated_at::text,'Placement skills updated','Your placement feedback has changed.',NULL,'/placements/'||NEW.placement_id::text);
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER notify_skill_feedback AFTER INSERT OR UPDATE ON public.skill_verifications FOR EACH ROW EXECUTE FUNCTION public.notify_skill_feedback();