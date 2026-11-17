CREATE OR REPLACE FUNCTION public.list_my_safety_reports() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'subject_type',r.subject_type,'reason',r.reason,'details',r.details,'urgent',r.urgent,'priority',r.priority,'status',r.status,'created_at',r.created_at,'updated_at',r.updated_at) ORDER BY r.created_at DESC),'[]'::jsonb) FROM safety_reports r WHERE r.reporter_id=auth.uid() $$;

CREATE OR REPLACE FUNCTION public.list_safety_reports() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN RAISE EXCEPTION 'Safety reviewer access required'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'subject_type',r.subject_type,'subject_id',r.subject_id,'context_id',r.context_id,'company_id',r.company_id,'job_id',r.job_id,'application_id',r.application_id,'placement_id',r.placement_id,'reporter_id',r.reporter_id,'reason',r.reason,'details',r.details,'urgent',r.urgent,'priority',r.priority,'status',r.status,'assigned_to',r.assigned_to,'resolution_note',r.resolution_note,'created_at',r.created_at,'updated_at',r.updated_at,'resolved_at',r.resolved_at,'target_label',coalesce(j.title,c.company_name,CASE WHEN r.placement_id IS NOT NULL THEN 'Placement' WHEN r.application_id IS NOT NULL THEN 'Application' ELSE 'General safety concern' END),'company_name',c.company_name,'events',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'actor_id',e.actor_id,'action',e.action,'note',e.note,'from_status',e.from_status,'to_status',e.to_status,'created_at',e.created_at) ORDER BY e.created_at) FROM safety_report_events e WHERE e.report_id=r.id),'[]'::jsonb)) ORDER BY CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, r.created_at DESC) FROM safety_reports r LEFT JOIN jobs j ON j.id=r.job_id LEFT JOIN company_profiles c ON c.id=r.company_id),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.review_safety_report(_report_id uuid, _action text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); r safety_reports; nxt text; adm uuid; n text:=btrim(coalesce(_note,''));
BEGIN
  IF uid IS NULL OR NOT (public.has_role(uid,'admin') OR public.has_role(uid,'moderator')) THEN RAISE EXCEPTION 'Safety reviewer access required'; END IF;
  IF _action NOT IN ('acknowledge','escalate','resolve','dismiss','note') THEN RAISE EXCEPTION 'Choose a valid investigation action'; END IF;
  IF length(n) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'Record an investigation note of 10 to 4000 characters'; END IF;
  SELECT * INTO r FROM safety_reports WHERE id=_report_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF r.reporter_id=uid THEN RAISE EXCEPTION 'Another reviewer must handle your own report'; END IF;
  IF r.status IN ('resolved','dismissed') AND _action<>'note' THEN RAISE EXCEPTION 'This report is already closed'; END IF;
  nxt:=CASE _action WHEN 'acknowledge' THEN 'investigating' WHEN 'escalate' THEN 'escalated' WHEN 'resolve' THEN 'resolved' WHEN 'dismiss' THEN 'dismissed' ELSE r.status END;
  UPDATE safety_reports SET status=nxt,assigned_to=coalesce(assigned_to,uid),resolution_note=CASE WHEN _action IN ('resolve','dismiss') THEN n ELSE resolution_note END,resolved_at=CASE WHEN _action IN ('resolve','dismiss') THEN now() ELSE resolved_at END,updated_at=now() WHERE id=r.id;
  INSERT INTO safety_report_events(report_id,actor_id,action,from_status,to_status,note) VALUES(r.id,uid,_action,r.status,nxt,n);
  IF _action='escalate' THEN
    FOR adm IN SELECT DISTINCT user_id FROM user_roles WHERE role IN ('admin','moderator') AND user_id<>uid LOOP PERFORM public._notify(adm,'company','safety-escalated:'||r.id||':'||extract(epoch FROM now())::bigint,'Safety report escalated','An escalated safety report needs attention.',NULL,'/admin/safety'); END LOOP;
  ELSIF _action IN ('resolve','dismiss') THEN PERFORM public._notify(r.reporter_id,'company','safety-report-reviewed:'||r.id,'Safety report update','A safety report you submitted has been reviewed.',NULL,'/guidelines#reporting'); END IF;
END $$;

REVOKE ALL ON FUNCTION public.list_my_safety_reports(), public.list_safety_reports(), public.review_safety_report(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_safety_reports(), public.list_safety_reports(), public.review_safety_report(uuid,text,text) TO authenticated;
