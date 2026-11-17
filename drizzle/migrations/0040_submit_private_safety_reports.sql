CREATE OR REPLACE FUNCTION public.submit_safety_report(_subject_type text, _subject_id uuid, _context_id uuid, _reason text, _details text, _urgent boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); j jobs; c company_profiles; a applications; p placements; rid uuid; adm uuid; cid uuid; jid uuid; aid uuid; pid uuid; detail text:=btrim(coalesce(_details,'')); pri text; title text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to submit a private safety report'; END IF;
  IF _subject_type NOT IN ('listing','employer','employee','seeker','safety_concern') THEN RAISE EXCEPTION 'Choose a valid report type'; END IF;
  IF _reason NOT IN ('misleading','unpaid_work','discrimination','harassment','unsafe_tasks','safeguarding','payment','privacy','retaliation','other') THEN RAISE EXCEPTION 'Choose a report reason'; END IF;
  IF length(detail) NOT BETWEEN 20 AND 5000 THEN RAISE EXCEPTION 'Describe the concern in 20 to 5000 characters'; END IF;
  IF _subject_type='listing' THEN
    SELECT * INTO j FROM jobs WHERE id=_subject_id;
    IF j.id IS NULL OR NOT (j.status='active' OR public.company_job_permission(j.id,uid,'read')) THEN RAISE EXCEPTION 'Listing not found or not available to report'; END IF;
    jid:=j.id; cid:=j.company_id;
  ELSIF _subject_type='employer' THEN
    SELECT * INTO c FROM company_profiles WHERE id=_subject_id;
    IF c.id IS NULL OR NOT (public.company_permission(c.id,uid,'member') OR EXISTS(SELECT 1 FROM company_verifications v JOIN company_page_settings s ON s.company_id=v.company_id WHERE v.company_id=c.id AND v.status='verified' AND s.is_public) OR EXISTS(SELECT 1 FROM applications x JOIN jobs y ON y.id::text=x.job_id WHERE x.user_id=uid AND y.company_id=c.id) OR EXISTS(SELECT 1 FROM placements x WHERE x.user_id=uid AND x.company_id=c.id)) THEN RAISE EXCEPTION 'Company not found or not available to report'; END IF;
    cid:=c.id;
  ELSIF _subject_type='employee' THEN
    IF _subject_id=uid THEN RAISE EXCEPTION 'You cannot file an employee report about yourself'; END IF;
    SELECT * INTO p FROM placements WHERE id=_context_id;
    IF p.id IS NOT NULL AND (p.user_id=uid OR public.can_manage_placement(p.id,uid)) THEN
      IF p.user_id=uid AND p.supervisor_id IS DISTINCT FROM _subject_id THEN RAISE EXCEPTION 'You can report your assigned supervisor here'; END IF;
      IF NOT EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=p.company_id AND m.user_id=_subject_id) THEN RAISE EXCEPTION 'Employee is not associated with this placement'; END IF;
      cid:=p.company_id; pid:=p.id; aid:=p.application_id; jid:=p.job_id;
    ELSE
      SELECT * INTO c FROM company_profiles WHERE id=_context_id;
      IF c.id IS NULL OR NOT public.company_permission(c.id,uid,'admin') OR NOT EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=c.id AND m.user_id=_subject_id) THEN RAISE EXCEPTION 'Not authorised to report this employee'; END IF;
      cid:=c.id;
    END IF;
  ELSIF _subject_type='seeker' THEN
    SELECT * INTO a FROM applications WHERE id=_context_id;
    IF a.id IS NULL OR a.user_id IS DISTINCT FROM _subject_id OR NOT (public.company_application_permission(a.id,uid) OR public.can_verify_hours(a.id,uid)) THEN RAISE EXCEPTION 'Not authorised to report this applicant'; END IF;
    SELECT * INTO j FROM jobs WHERE id::text=a.job_id;
    aid:=a.id; jid:=j.id; cid:=j.company_id; SELECT id INTO pid FROM placements WHERE application_id=a.id;
  ELSE
    IF _subject_id IS NOT NULL THEN
      SELECT * INTO p FROM placements WHERE id=_subject_id;
      IF p.id IS NULL OR NOT (p.user_id=uid OR public.can_manage_placement(p.id,uid) OR public.approved_guardian(p.user_id)=uid) THEN RAISE EXCEPTION 'Placement not found or not available to report'; END IF;
      cid:=p.company_id; pid:=p.id; aid:=p.application_id; jid:=p.job_id;
    END IF;
  END IF;
  pri:=CASE WHEN coalesce(_urgent,false) THEN 'urgent' WHEN _reason IN ('safeguarding','unsafe_tasks','retaliation') THEN 'high' ELSE 'standard' END;
  INSERT INTO safety_reports(reporter_id,subject_type,subject_id,context_id,company_id,job_id,application_id,placement_id,reason,details,urgent,priority) VALUES(uid,_subject_type,_subject_id,_context_id,cid,jid,aid,pid,_reason,detail,coalesce(_urgent,false),pri) RETURNING id INTO rid;
  INSERT INTO safety_report_events(report_id,actor_id,action,from_status,to_status,note) VALUES(rid,uid,'submitted',NULL,'open',CASE WHEN coalesce(_urgent,false) THEN 'Reporter marked an immediate safety risk' ELSE NULL END);
  title:=CASE WHEN pri='urgent' THEN 'Urgent safety report' ELSE 'Safety report received' END;
  FOR adm IN SELECT DISTINCT user_id FROM user_roles WHERE role IN ('admin','moderator') LOOP
    PERFORM public._notify(adm,'company','safety-report:'||rid,title,'A private safety report needs review.',NULL,'/admin/safety');
  END LOOP;
  RETURN rid;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'You already have an open report about this record';
END $$;
REVOKE ALL ON FUNCTION public.submit_safety_report(text,uuid,uuid,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_safety_report(text,uuid,uuid,text,text,boolean) TO authenticated;
