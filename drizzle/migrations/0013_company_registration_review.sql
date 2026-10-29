CREATE TABLE public.company_registration_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, company_id uuid REFERENCES public.company_profiles(id), legal_name text NOT NULL, trading_name text NOT NULL DEFAULT '', website text NOT NULL, industry text NOT NULL, business_location text NOT NULL, registration_identifier text NOT NULL DEFAULT '', work_email text NOT NULL, relationship text NOT NULL, submitted_evidence text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','suspended')), decision_message text, submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid, UNIQUE(user_id,legal_name)
);
GRANT SELECT ON public.company_registration_submissions TO authenticated;
GRANT ALL ON public.company_registration_submissions TO service_role;
ALTER TABLE public.company_registration_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private company submissions" ON public.company_registration_submissions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.company_registration_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid NOT NULL REFERENCES public.company_registration_submissions(id), company_id uuid REFERENCES public.company_profiles(id), reviewer_id uuid NOT NULL, action text NOT NULL CHECK(action IN ('note','verified','rejected','suspended')), legitimacy_evidence text NOT NULL, authority_evidence text NOT NULL, private_notes text NOT NULL, applicant_message text NOT NULL, approved_domains text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_registration_reviews TO authenticated;
GRANT ALL ON public.company_registration_reviews TO service_role;
ALTER TABLE public.company_registration_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admin private review history" ON public.company_registration_reviews FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.company_domain_exclusions (domain text PRIMARY KEY CHECK(domain=lower(domain)), reason text NOT NULL);
GRANT SELECT ON public.company_domain_exclusions TO authenticated;
GRANT ALL ON public.company_domain_exclusions TO service_role;
ALTER TABLE public.company_domain_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators inspect excluded domains" ON public.company_domain_exclusions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.company_domain_match_allowed(_domain text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT lower(_domain) ~ '^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$' AND lower(_domain) !~ '(^|\.)(gmail\.com|googlemail\.com|outlook\.com|hotmail\.(com|co\.uk)|live\.(com|co\.uk)|msn\.com|yahoo\.(com|co\.uk)|ymail\.com|aol\.com|icloud\.com|me\.com|mac\.com|proton\.(me|mail)|protonmail\.com|pm\.me|mail\.com|gmx\.(com|net|de)|zoho\.com|yandex\.(com|ru)|mail\.ru|qq\.com|163\.com|fastmail\.com|hey\.com|tuta\.com|tutanota\.com|guerrillamail\.[a-z]+|sharklasers\.com|grr\.la|guerrillamailblock\.com|mailinator\.com|yopmail\.[a-z]+|tempmail\.[a-z]+|temp-mail\.[a-z]+|10minutemail\.[a-z]+|maildrop\.cc|dispostable\.com|trashmail\.[a-z]+|getnada\.com|throwawaymail\.com)$' AND NOT EXISTS(SELECT 1 FROM company_domain_exclusions e WHERE lower(_domain)=e.domain OR lower(_domain) LIKE '%.'||e.domain)
$$;
REVOKE ALL ON FUNCTION public.company_domain_match_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.company_domain_match_allowed(text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.company_can_draft(_company_id uuid,_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.company_permission(_company_id,_uid,'member') OR EXISTS(SELECT 1 FROM auth.users u JOIN company_domains d ON lower(split_part(u.email,'@',2))=d.domain JOIN company_verifications v ON v.company_id=d.company_id WHERE u.id=_uid AND u.email_confirmed_at IS NOT NULL AND d.company_id=_company_id AND d.approved AND v.status='verified' AND public.company_domain_match_allowed(d.domain) AND NOT EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=_company_id AND m.user_id=_uid AND m.status IN ('revoked','rejected')) AND NOT EXISTS(SELECT 1 FROM company_access_requests r WHERE r.company_id=_company_id AND r.user_id=_uid AND r.status='rejected'))
$$;
CREATE FUNCTION public.submit_company_registration(_details jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); em text; confirmed timestamptz; rid uuid; nm text:=btrim(coalesce(_details->>'legal_name','')); k text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 SELECT email,email_confirmed_at INTO em,confirmed FROM auth.users WHERE id=uid;
 IF confirmed IS NULL THEN RAISE EXCEPTION 'Verify your account email before submitting'; END IF;
 IF jsonb_typeof(_details)<>'object' THEN RAISE EXCEPTION 'Invalid registration details'; END IF;
 FOREACH k IN ARRAY ARRAY['legal_name','trading_name','website','industry','business_location','registration_identifier','work_email','relationship','submitted_evidence'] LOOP
 IF jsonb_typeof(_details->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Complete all registration fields'; END IF;
 END LOOP;
 IF length(nm) NOT BETWEEN 2 AND 160 OR length(_details->>'trading_name')>160 OR length(_details->>'industry') NOT BETWEEN 2 AND 100 OR length(_details->>'business_location') NOT BETWEEN 2 AND 300 OR length(_details->>'registration_identifier')>100 OR length(btrim(_details->>'relationship')) NOT BETWEEN 5 AND 1000 OR length(btrim(_details->>'submitted_evidence')) NOT BETWEEN 20 AND 5000 OR length(_details->>'website')>300 OR (_details->>'website') !~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}([/?#][^[:space:]]*)?$' OR lower(btrim(_details->>'work_email')) IS DISTINCT FROM lower(em) THEN RAISE EXCEPTION 'Enter valid business details and use your verified account email'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 IF EXISTS(SELECT 1 FROM company_registration_submissions WHERE user_id=uid AND lower(legal_name)=lower(nm)) THEN RAISE EXCEPTION 'A registration for this company is already recorded. View its status.'; END IF;
 IF (SELECT count(*) FROM company_registration_submissions WHERE user_id=uid AND submitted_at>now()-interval '24 hours')>=3 THEN RAISE EXCEPTION 'Too many registration requests. Please try again tomorrow.'; END IF;
 INSERT INTO company_registration_submissions(user_id,legal_name,trading_name,website,industry,business_location,registration_identifier,work_email,relationship,submitted_evidence) VALUES(uid,nm,btrim(_details->>'trading_name'),btrim(_details->>'website'),btrim(_details->>'industry'),btrim(_details->>'business_location'),btrim(_details->>'registration_identifier'),em,btrim(_details->>'relationship'),btrim(_details->>'submitted_evidence')) RETURNING id INTO rid;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.submit_company_registration(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_company_registration(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.request_company_access(_pathway text,_company_name text DEFAULT '',_website text DEFAULT '',_job_title text DEFAULT '',_department text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); cid uuid; rid uuid; em text; confirmed timestamptz;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 IF _pathway<>'join' THEN RAISE EXCEPTION 'Use the company verification registration form'; END IF;
 SELECT email,email_confirmed_at INTO em,confirmed FROM auth.users WHERE id=uid;
 IF confirmed IS NULL THEN RAISE EXCEPTION 'Verify your email before requesting company access'; END IF;
 IF length(coalesce(_job_title,''))>100 OR length(coalesce(_department,''))>100 THEN RAISE EXCEPTION 'Invalid company details'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT d.company_id INTO cid FROM company_domains d JOIN company_verifications v ON v.company_id=d.company_id WHERE d.domain=lower(split_part(em,'@',2)) AND d.approved AND v.status='verified' AND public.company_domain_match_allowed(d.domain);
 SELECT id INTO rid FROM company_access_requests WHERE user_id=uid AND pathway='join' AND company_id IS NOT DISTINCT FROM cid;
 IF rid IS NULL THEN INSERT INTO company_access_requests(user_id,company_id,pathway,job_title,department,requested_domain) VALUES(uid,cid,'join',nullif(btrim(_job_title),''),nullif(btrim(_department),''),lower(split_part(em,'@',2))) RETURNING id INTO rid; END IF;
 RETURN rid;
END $$;
DROP POLICY "Users can insert their own company profile" ON public.company_profiles;
CREATE FUNCTION public.guard_company_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Company identity cannot be transferred'; END IF; RETURN NEW; END $$;
CREATE TRIGGER company_identity_guard BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_company_identity();
ALTER TABLE public.notifications DROP CONSTRAINT notifications_category_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_category_check CHECK(category IN ('application','placement','hours','feedback','deadline','company'));
CREATE FUNCTION public.list_company_review_candidates() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'company_name',c.company_name,'website',c.company_website,'status',coalesce(v.status,'pending'),'registration_identifier',s.registration_identifier,'has_admin',EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=c.id AND m.role='company_admin' AND m.status='approved'))) FROM company_profiles c LEFT JOIN company_verifications v ON v.company_id=c.id LEFT JOIN LATERAL (SELECT registration_identifier FROM company_registration_submissions WHERE company_id=c.id AND status IN ('verified','suspended') ORDER BY reviewed_at DESC LIMIT 1) s ON true),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_company_review_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_company_review_candidates() TO authenticated;
CREATE FUNCTION public.review_company_registration(_submission_id uuid,_decision text,_legitimacy_evidence text,_authority_evidence text,_notes text,_message text,_company_id uuid DEFAULT NULL,_domains text[] DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); s company_registration_submissions%ROWTYPE; cid uuid; rev uuid; d text; candidate_count integer; confirmed timestamptz; current_email text;
BEGIN
 IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT * INTO s FROM company_registration_submissions WHERE id=_submission_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
 IF uid=s.user_id THEN RAISE EXCEPTION 'You cannot review your own company registration'; END IF;
 IF _decision NOT IN ('note','verified','rejected','suspended') OR length(btrim(coalesce(_notes,''))) NOT BETWEEN 5 AND 5000 OR length(coalesce(_legitimacy_evidence,''))>5000 OR length(coalesce(_authority_evidence,''))>5000 OR length(coalesce(_message,''))>1000 OR coalesce(cardinality(_domains),0)>10 THEN RAISE EXCEPTION 'Enter valid private review notes'; END IF;
 IF _decision<>'note' AND length(btrim(coalesce(_message,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Enter an applicant-safe decision message'; END IF;
 IF _decision='rejected' AND s.status<>'pending' THEN RAISE EXCEPTION 'Only pending registrations can be rejected'; END IF;
 IF _decision='suspended' AND s.status<>'verified' THEN RAISE EXCEPTION 'Only an approved registration can be suspended'; END IF;
 cid:=s.company_id;
 IF _decision='verified' THEN
 IF s.status NOT IN ('pending','suspended') THEN RAISE EXCEPTION 'This registration has already been decided'; END IF;
 IF length(btrim(coalesce(_legitimacy_evidence,'')))<20 OR length(btrim(coalesce(_authority_evidence,'')))<20 THEN RAISE EXCEPTION 'Document separate company legitimacy and applicant authority evidence; email, domain or registry records alone are insufficient'; END IF;
 SELECT email_confirmed_at,email INTO confirmed,current_email FROM auth.users WHERE id=s.user_id;
 IF confirmed IS NULL OR lower(current_email) IS DISTINCT FROM lower(s.work_email) THEN RAISE EXCEPTION 'Applicant must still control the verified submitted email'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('company-registration-review',0));
 IF s.status='suspended' AND _company_id IS DISTINCT FROM s.company_id THEN RAISE EXCEPTION 'Restoration must use the original company'; END IF;
 cid:=_company_id;
 IF cid IS NULL THEN
 SELECT count(*) INTO candidate_count FROM company_profiles c WHERE c.user_id=s.user_id OR lower(c.company_name)=lower(s.legal_name) OR (s.trading_name<>'' AND lower(c.company_name)=lower(s.trading_name)) OR lower(regexp_replace(coalesce(c.company_website,''),'/+$',''))=lower(regexp_replace(s.website,'/+$','')) OR EXISTS(SELECT 1 FROM company_registration_submissions prior WHERE prior.company_id=c.id AND prior.status IN ('verified','suspended') AND s.registration_identifier<>'' AND lower(prior.registration_identifier)=lower(s.registration_identifier));
 IF candidate_count>0 THEN RAISE EXCEPTION 'A possible existing company was found. Select the canonical company rather than creating a duplicate'; END IF;
 INSERT INTO company_profiles(user_id,company_name,company_website,industry) VALUES(s.user_id,coalesce(nullif(s.trading_name,''),s.legal_name),s.website,s.industry) RETURNING id INTO cid;
 ELSE
 PERFORM 1 FROM company_profiles WHERE id=cid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Select an existing company'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM company_memberships WHERE company_id=cid AND role='company_admin' AND status='approved' AND user_id<>s.user_id) THEN RAISE EXCEPTION 'An authorised administrator already exists. Registration cannot replace or add an administrator'; END IF;
 IF EXISTS(SELECT 1 FROM company_registration_submissions WHERE company_id=cid AND user_id<>s.user_id AND status IN ('verified','suspended')) THEN RAISE EXCEPTION 'This company has already been claimed and reviewed; do not transfer its administrator'; END IF;
 IF EXISTS(SELECT 1 FROM company_verifications v WHERE v.company_id=cid AND v.status IN ('verified','suspended')) AND NOT EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=cid AND m.user_id=s.user_id AND m.role='company_admin' AND m.status='approved') THEN RAISE EXCEPTION 'An established company requires a separate administrator recovery process'; END IF;
 FOREACH d IN ARRAY coalesce(_domains,'{}') LOOP
 IF d IS NULL OR d<>lower(btrim(d)) OR NOT public.company_domain_match_allowed(d) THEN RAISE EXCEPTION 'Consumer or disposable domains cannot be approved for automatic matching. Use manual membership approval'; END IF;
 IF EXISTS(SELECT 1 FROM company_domains WHERE domain=d AND company_id<>cid) THEN RAISE EXCEPTION 'Domain is already assigned to another company'; END IF;
 END LOOP;
 INSERT INTO company_verifications(company_id,status,reviewed_by,reviewed_at) VALUES(cid,'verified',uid,now()) ON CONFLICT(company_id) DO UPDATE SET status='verified',reviewed_by=uid,reviewed_at=now();
 INSERT INTO company_memberships(company_id,user_id,role,status,manage_placements,approved_by,approved_at) VALUES(cid,s.user_id,'company_admin','approved',true,uid,now()) ON CONFLICT(company_id,user_id) DO UPDATE SET role='company_admin',status='approved',manage_placements=true,approved_by=uid,approved_at=now();
 UPDATE company_domains SET approved=false WHERE company_id=cid;
 FOREACH d IN ARRAY coalesce(_domains,'{}') LOOP
 INSERT INTO company_domains(company_id,domain,approved,approved_by,approved_at) VALUES(cid,d,true,uid,now()) ON CONFLICT(domain) DO UPDATE SET approved=true,approved_by=uid,approved_at=now();
 END LOOP;
 INSERT INTO company_access_requests(user_id,company_id,pathway,status,requested_domain) VALUES(s.user_id,cid,'register','approved',lower(split_part(s.work_email,'@',2))) ON CONFLICT(user_id,company_id,pathway) DO UPDATE SET status='approved';
 ELSIF _decision='suspended' THEN
 UPDATE company_verifications SET status='suspended',reviewed_by=uid,reviewed_at=now() WHERE company_id=cid;
 UPDATE company_domains SET approved=false WHERE company_id=cid;
 END IF;
 INSERT INTO company_registration_reviews(submission_id,company_id,reviewer_id,action,legitimacy_evidence,authority_evidence,private_notes,applicant_message,approved_domains) VALUES(s.id,cid,uid,_decision,coalesce(_legitimacy_evidence,''),coalesce(_authority_evidence,''),_notes,coalesce(_message,''),coalesce(_domains,'{}')) RETURNING id INTO rev;
 IF _decision<>'note' THEN
 UPDATE company_registration_submissions SET company_id=cid,status=_decision,decision_message=_message,reviewed_by=uid,reviewed_at=now() WHERE id=s.id;
 PERFORM public._notify(s.user_id,'company','company-review:'||rev::text,'Company registration update','Your company access status has changed.',_message,CASE WHEN _decision='verified' THEN '/employer/dashboard?company='||cid::text ELSE '/employer/status' END);
 END IF;
 RETURN rev;
END $$;
REVOKE ALL ON FUNCTION public.review_company_registration(uuid,text,text,text,text,text,uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_company_registration(uuid,text,text,text,text,text,uuid,text[]) TO authenticated;
COMMENT ON TABLE public.company_registration_submissions IS 'Private registration evidence; no company identity or authority is created before trusted review';
COMMENT ON TABLE public.company_registration_reviews IS 'Append-only platform administrator review evidence; not exposed to applicants or public company pages';
COMMENT ON TABLE public.company_domain_exclusions IS 'Maintained consumer/disposable domain exclusions; domains additionally require independent administrator verification before automatic eligibility';