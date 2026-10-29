CREATE TABLE public.employee_identities (
 user_id uuid PRIMARY KEY, full_name text NOT NULL, job_title text NOT NULL, claimed_company text NOT NULL, work_email text NOT NULL UNIQUE, work_email_verified_at timestamptz, matched_company_id uuid REFERENCES public.company_profiles(id), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.employee_identities TO authenticated;
GRANT ALL ON public.employee_identities TO service_role;
ALTER TABLE public.employee_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own employee details" ON public.employee_identities FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.employee_email_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, work_email text NOT NULL, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes', consumed_at timestamptz, invalidated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.employee_email_challenges TO service_role;
ALTER TABLE public.employee_email_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX employee_email_challenges_user_idx ON public.employee_email_challenges(user_id,created_at);
ALTER TABLE public.company_access_requests ADD COLUMN employee_name text, ADD COLUMN work_email text, ADD COLUMN requested_company text, ADD COLUMN review_note text, ADD COLUMN reviewed_by uuid, ADD COLUMN reviewed_at timestamptz;
ALTER TABLE public.company_memberships ADD COLUMN approved_work_email text;
CREATE TABLE public.company_membership_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES public.company_access_requests(id), company_id uuid NOT NULL REFERENCES public.company_profiles(id), reviewer_id uuid NOT NULL, action text NOT NULL CHECK(action IN ('approved','rejected')), note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_membership_reviews TO authenticated;
GRANT ALL ON public.company_membership_reviews TO service_role;
ALTER TABLE public.company_membership_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company administrators read membership audit" ON public.company_membership_reviews FOR SELECT TO authenticated USING(public.company_permission(company_id,auth.uid(),'admin'));
CREATE FUNCTION public.employee_email_valid(_email text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT _email=lower(btrim(_email)) AND length(_email)<=254 AND length(split_part(_email,'@',1))<=64 AND _email ~ '^[a-z0-9][a-z0-9._-]*@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' AND _email !~ '\.\.' AND split_part(_email,'@',1) !~ '\.$'
$$;
CREATE FUNCTION public.employee_domain_company(_email text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT d.company_id FROM company_domains d JOIN company_verifications v ON v.company_id=d.company_id WHERE public.employee_email_valid(_email) AND d.domain=split_part(_email,'@',2) AND d.approved AND v.status='verified' AND public.company_domain_match_allowed(d.domain) AND d.domain !~ '(^|\.)xn--' LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.employee_domain_company(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.employee_domain_company(text) TO service_role;
CREATE OR REPLACE FUNCTION public.company_permission(_company_id uuid,_uid uuid,_permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM company_memberships m JOIN company_verifications v ON v.company_id=m.company_id JOIN auth.users u ON u.id=m.user_id WHERE m.company_id=_company_id AND m.user_id=_uid AND u.email_confirmed_at IS NOT NULL AND m.status='approved' AND v.status='verified' AND (m.role='company_admin' OR EXISTS(SELECT 1 FROM employee_identities e WHERE e.user_id=_uid AND e.work_email_verified_at IS NOT NULL AND e.work_email=m.approved_work_email)) AND CASE _permission WHEN 'admin' THEN m.role='company_admin' WHEN 'member' THEN true WHEN 'placements' THEN m.role='company_admin' OR m.manage_placements ELSE false END)
$$;
CREATE OR REPLACE FUNCTION public.company_can_draft(_company_id uuid,_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.company_permission(_company_id,_uid,'member') OR EXISTS(SELECT 1 FROM employee_identities e JOIN auth.users u ON u.id=e.user_id WHERE e.user_id=_uid AND u.email_confirmed_at IS NOT NULL AND e.work_email_verified_at IS NOT NULL AND public.employee_domain_company(e.work_email)=_company_id AND NOT EXISTS(SELECT 1 FROM company_memberships m WHERE m.user_id=_uid AND m.company_id=_company_id AND m.status IN ('rejected','revoked')) AND NOT EXISTS(SELECT 1 FROM company_access_requests r WHERE r.user_id=_uid AND r.company_id=_company_id AND r.status='rejected'))
$$;
CREATE FUNCTION public.save_employee_identity(_name text,_job_title text,_company text,_work_email text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); em text:=lower(btrim(_work_email)); previous employee_identities%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirm your platform account email first'; END IF;
 IF length(btrim(coalesce(_name,''))) NOT BETWEEN 2 AND 100 OR length(btrim(coalesce(_job_title,''))) NOT BETWEEN 2 AND 100 OR length(btrim(coalesce(_company,''))) NOT BETWEEN 2 AND 160 OR NOT coalesce(public.employee_email_valid(em),false) THEN RAISE EXCEPTION 'Enter your name, job title, company and a full work email without plus aliases'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,1));
 SELECT * INTO previous FROM employee_identities WHERE user_id=uid FOR UPDATE;
 INSERT INTO employee_identities(user_id,full_name,job_title,claimed_company,work_email) VALUES(uid,btrim(_name),btrim(_job_title),btrim(_company),em)
 ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,job_title=excluded.job_title,claimed_company=excluded.claimed_company,work_email=excluded.work_email,work_email_verified_at=CASE WHEN employee_identities.work_email=excluded.work_email THEN employee_identities.work_email_verified_at ELSE NULL END,matched_company_id=CASE WHEN employee_identities.work_email=excluded.work_email THEN employee_identities.matched_company_id ELSE NULL END,updated_at=now();
 IF previous.user_id IS NOT NULL AND previous.work_email<>em THEN
 UPDATE employee_email_challenges SET invalidated_at=now() WHERE user_id=uid AND consumed_at IS NULL AND invalidated_at IS NULL;
 UPDATE company_memberships SET status='pending',approved_work_email=NULL,manage_placements=false WHERE user_id=uid AND role='employee' AND status='approved';
 UPDATE company_access_requests SET status='pending',reviewed_at=NULL,reviewed_by=NULL,review_note=NULL WHERE user_id=uid AND pathway='join' AND status='approved';
 PERFORM public._notify(uid,'company','work-email-change:'||gen_random_uuid()::text,'Work email changed','Your company access status has changed.','Verify the new work email and request membership approval again. Previous employee access is paused.','/employer/employee-details');
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_employee_identity(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_employee_identity(text,text,text,text) TO authenticated;
CREATE FUNCTION public.begin_employee_email_challenge(_uid uuid,_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e employee_identities%ROWTYPE; cid uuid;
BEGIN
 IF _hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid verification request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text,1));
 SELECT * INTO e FROM employee_identities WHERE user_id=_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save employee details first'; END IF;
 IF EXISTS(SELECT 1 FROM employee_email_challenges WHERE user_id=_uid AND created_at>now()-interval '1 minute') OR (SELECT count(*) FROM employee_email_challenges WHERE user_id=_uid AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'Please wait before requesting another verification email'; END IF;
 UPDATE employee_email_challenges SET invalidated_at=now() WHERE user_id=_uid AND consumed_at IS NULL AND invalidated_at IS NULL;
 INSERT INTO employee_email_challenges(user_id,work_email,token_hash) VALUES(_uid,e.work_email,_hash) RETURNING id INTO cid;
 RETURN jsonb_build_object('id',cid,'email',e.work_email,'name',e.full_name);
END $$;
REVOKE ALL ON FUNCTION public.begin_employee_email_challenge(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_employee_email_challenge(uuid,text) TO service_role;
CREATE FUNCTION public.confirm_employee_email(_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); c employee_email_challenges%ROWTYPE; em text; matched uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in with the platform account that requested this link'; END IF;
 IF _hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid verification link'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,1));
 SELECT * INTO c FROM employee_email_challenges WHERE token_hash=_hash AND user_id=uid FOR UPDATE;
 IF NOT FOUND OR c.consumed_at IS NOT NULL OR c.invalidated_at IS NOT NULL OR c.expires_at<=now() THEN RAISE EXCEPTION 'This verification link is invalid, expired or already used'; END IF;
 SELECT work_email INTO em FROM employee_identities WHERE user_id=uid FOR UPDATE;
 IF em IS DISTINCT FROM c.work_email THEN RAISE EXCEPTION 'Your work email changed. Request a new verification link'; END IF;
 matched:=public.employee_domain_company(em);
 UPDATE employee_email_challenges SET consumed_at=now() WHERE id=c.id;
 UPDATE employee_identities SET work_email_verified_at=now(),matched_company_id=matched,updated_at=now() WHERE user_id=uid;
 PERFORM public._notify(uid,'company','work-email-verified:'||c.id::text,'Work email verified','Your company access status has changed.',CASE WHEN matched IS NULL THEN 'Your work email is verified. Request a manual membership review; no company drafting permission has been granted.' ELSE 'Your work email is verified. Personal draft access is available; membership and publication require separate company approval.' END,'/employer/status');
END $$;
REVOKE ALL ON FUNCTION public.confirm_employee_email(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_employee_email(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.request_company_access(_pathway text,_company_name text DEFAULT '',_website text DEFAULT '',_job_title text DEFAULT '',_department text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); e employee_identities%ROWTYPE; cid uuid; rid uuid;
BEGIN
 IF uid IS NULL OR _pathway IS DISTINCT FROM 'join' THEN RAISE EXCEPTION 'Sign in and use the employee membership request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,1));
 SELECT * INTO e FROM employee_identities WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save your employee details first'; END IF;
 cid:=CASE WHEN e.work_email_verified_at IS NOT NULL THEN public.employee_domain_company(e.work_email) ELSE NULL END;
 IF (SELECT count(*) FROM company_access_requests WHERE user_id=uid AND pathway='join' AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'Too many membership requests. Try again tomorrow'; END IF;
 SELECT id INTO rid FROM company_access_requests WHERE user_id=uid AND pathway='join' AND status='pending' AND company_id IS NOT DISTINCT FROM cid AND work_email=e.work_email AND requested_company=e.claimed_company LIMIT 1;
 IF rid IS NOT NULL THEN RETURN rid; END IF;
 IF cid IS NULL THEN
 INSERT INTO company_access_requests(user_id,company_id,pathway,job_title,employee_name,work_email,requested_company,requested_domain) VALUES(uid,NULL,'join',e.job_title,e.full_name,e.work_email,e.claimed_company,split_part(e.work_email,'@',2)) RETURNING id INTO rid;
 ELSE
 INSERT INTO company_access_requests(user_id,company_id,pathway,job_title,employee_name,work_email,requested_company,requested_domain) VALUES(uid,cid,'join',e.job_title,e.full_name,e.work_email,e.claimed_company,split_part(e.work_email,'@',2)) ON CONFLICT(user_id,company_id,pathway) DO UPDATE SET status='pending',job_title=excluded.job_title,employee_name=excluded.employee_name,work_email=excluded.work_email,requested_company=excluded.requested_company,review_note=NULL,reviewed_at=NULL,reviewed_by=NULL RETURNING id INTO rid;
 END IF;
 PERFORM public._notify(uid,'company','membership-request:'||rid::text||':'||gen_random_uuid()::text,'Membership request received','Your company access status has changed.','Your membership request is pending review. This does not grant company authority.','/employer/status');
 RETURN rid;
END $$;
CREATE FUNCTION public.list_employee_membership_requests(_company_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR (_company_id IS NULL AND NOT public.has_role(auth.uid(),'admin')) OR (_company_id IS NOT NULL AND NOT public.company_permission(_company_id,auth.uid(),'admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'company_id',r.company_id,'employee_name',r.employee_name,'job_title',r.job_title,'work_email',r.work_email,'requested_company',r.requested_company,'status',r.status,'review_note',r.review_note,'created_at',r.created_at,'reviewed_at',r.reviewed_at,'work_email_verified',e.work_email_verified_at IS NOT NULL AND e.work_email=r.work_email)) FROM company_access_requests r LEFT JOIN employee_identities e ON e.user_id=r.user_id WHERE r.pathway='join' AND CASE WHEN _company_id IS NULL THEN r.company_id IS NULL ELSE r.company_id=_company_id END),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_employee_membership_requests(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_employee_membership_requests(uuid) TO authenticated;
CREATE FUNCTION public.route_manual_employee_request(_request_id uuid,_company_id uuid,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r company_access_requests%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 IF length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Document independent company association checks'; END IF;
 SELECT * INTO r FROM company_access_requests WHERE id=_request_id AND pathway='join' FOR UPDATE;
 IF NOT FOUND OR r.company_id IS NOT NULL OR r.status<>'pending' THEN RAISE EXCEPTION 'Pending manual request required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM company_verifications WHERE company_id=_company_id AND status='verified') THEN RAISE EXCEPTION 'Choose an independently verified company'; END IF;
 IF EXISTS(SELECT 1 FROM company_access_requests WHERE company_id=_company_id AND user_id=r.user_id AND pathway='join') THEN RAISE EXCEPTION 'A request already exists for this company; review it instead'; END IF;
 UPDATE company_access_requests SET company_id=_company_id,review_note=_note,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=r.id;
 PERFORM public._notify(r.user_id,'company','manual-route:'||r.id::text,'Membership review update','Your company access status has changed.','Your request has been referred to a verified company administrator. No membership or drafting access has been granted.','/employer/status');
END $$;
REVOKE ALL ON FUNCTION public.route_manual_employee_request(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.route_manual_employee_request(uuid,uuid,text) TO authenticated;
CREATE FUNCTION public.review_employee_membership(_request_id uuid,_decision text,_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); r company_access_requests%ROWTYPE; e employee_identities%ROWTYPE; rev uuid;
BEGIN
 SELECT * INTO r FROM company_access_requests WHERE id=_request_id AND pathway='join' FOR UPDATE;
 IF NOT FOUND OR r.company_id IS NULL OR uid IS NULL OR NOT public.company_permission(r.company_id,uid,'admin') THEN RAISE EXCEPTION 'Authorised company administrator required'; END IF;
 IF r.user_id=uid OR r.status<>'pending' OR _decision NOT IN ('approved','rejected') OR length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Review a pending employee request and record your checks'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.user_id::text,1));
 SELECT * INTO e FROM employee_identities WHERE user_id=r.user_id FOR UPDATE;
 IF _decision='approved' AND (e.work_email_verified_at IS NULL OR e.work_email IS DISTINCT FROM r.work_email) THEN RAISE EXCEPTION 'The employee must verify the current requested work email before approval'; END IF;
 IF EXISTS(SELECT 1 FROM company_memberships WHERE company_id=r.company_id AND user_id=r.user_id AND role='company_admin') THEN RAISE EXCEPTION 'Employee requests cannot alter an administrator appointment'; END IF;
 INSERT INTO company_memberships(company_id,user_id,role,status,manage_placements,approved_by,approved_at,approved_work_email) VALUES(r.company_id,r.user_id,'employee',_decision,false,uid,now(),CASE WHEN _decision='approved' THEN e.work_email ELSE NULL END) ON CONFLICT(company_id,user_id) DO UPDATE SET status=excluded.status,manage_placements=false,approved_by=uid,approved_at=now(),approved_work_email=excluded.approved_work_email;
 UPDATE company_access_requests SET status=_decision,review_note=_note,reviewed_by=uid,reviewed_at=now() WHERE id=r.id;
 INSERT INTO company_membership_reviews(request_id,company_id,reviewer_id,action,note) VALUES(r.id,r.company_id,uid,_decision,_note) RETURNING id INTO rev;
 PERFORM public._notify(r.user_id,'company','membership-review:'||rev::text,'Company membership update','Your company access status has changed.',CASE WHEN _decision='approved' THEN 'Company membership approved. Publication and access to seeker operational records are not authorised.' ELSE 'Your company membership request was rejected.' END,'/employer/status');
END $$;
REVOKE ALL ON FUNCTION public.review_employee_membership(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_employee_membership(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_company_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); verified boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 SELECT email_confirmed_at IS NOT NULL INTO verified FROM auth.users WHERE id=uid;
 RETURN jsonb_build_object('email_verified',coalesce(verified,false),'employee',(SELECT jsonb_build_object('full_name',e.full_name,'job_title',e.job_title,'claimed_company',e.claimed_company,'work_email',e.work_email,'work_email_verified_at',e.work_email_verified_at,'matched_company_id',CASE WHEN e.work_email_verified_at IS NOT NULL THEN public.employee_domain_company(e.work_email) ELSE NULL END) FROM employee_identities e WHERE e.user_id=uid),'contexts',coalesce((SELECT jsonb_agg(jsonb_build_object('company_id',c.id,'company_name',c.company_name,'state',CASE WHEN NOT coalesce(verified,false) THEN 'email_pending' WHEN public.company_permission(c.id,uid,'admin') THEN 'company_admin' WHEN public.company_permission(c.id,uid,'member') THEN 'employee' WHEN public.company_can_draft(c.id,uid) THEN 'draft_only' WHEN EXISTS(SELECT 1 FROM company_access_requests r WHERE r.company_id=c.id AND r.user_id=uid AND r.status='rejected') OR EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=c.id AND m.user_id=uid AND m.status IN ('rejected','revoked')) THEN 'access_denied' WHEN EXISTS(SELECT 1 FROM company_verifications v WHERE v.company_id=c.id AND v.status='verified') THEN 'membership_pending' ELSE 'company_pending' END,'manage_placements',public.company_permission(c.id,uid,'placements'),'membership_approved',public.company_permission(c.id,uid,'member'),'authorised_to_publish',public.company_permission(c.id,uid,'admin'))) FROM company_profiles c WHERE c.user_id=uid OR public.company_can_draft(c.id,uid) OR EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=c.id AND m.user_id=uid) OR EXISTS(SELECT 1 FROM company_access_requests r WHERE r.company_id=c.id AND r.user_id=uid)),'[]'::jsonb),'requests',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'pathway',r.pathway,'company_id',r.company_id,'review_note',CASE WHEN r.pathway='join' THEN NULL ELSE r.review_note END)) FROM company_access_requests r WHERE r.user_id=uid),'[]'::jsonb));
END $$;
COMMENT ON TABLE public.employee_email_challenges IS 'Service-only hashed 256-bit email challenges; 30-minute expiry, per-user binding and atomic single-use confirmation';
COMMENT ON TABLE public.employee_identities IS 'Private work identity distinct from auth email; changes pause employee permissions pending new proof and approval';