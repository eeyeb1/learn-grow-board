-- Run ONLY against a disposable schema-only clone. All fixtures roll back.
BEGIN;
CREATE FUNCTION pg_temp.ok(c boolean,l text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF c IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',l; END IF; RAISE NOTICE 'PASS: %',l; END $$;
CREATE FUNCTION pg_temp.as_user(n int) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-00000000000'||n,true),set_config('request.jwt.claims',json_build_object('sub','d0000000-0000-0000-0000-00000000000'||n,'role','authenticated')::text,true) $$;
INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('d0000000-0000-0000-0000-00000000000'||n)::uuid,email,now() FROM (VALUES
(1,'alpha-admin@alpha-example.org'),(2,'platform@review-example.org'),(3,'beta-admin@beta-example.org'),(4,'employee@alpha-example.org'),(5,'employee@beta-example.org'),(6,'impostor@attacker-example.org'),(7,'worker@staff.alpha-example.org')) v(n,email);
INSERT INTO public.user_roles(user_id,role) VALUES('d0000000-0000-0000-0000-000000000002','admin');

SELECT pg_temp.as_user(1); SET LOCAL ROLE authenticated;
SELECT set_config('test.subA',public.submit_company_registration(jsonb_build_object('legal_name','Isolated Alpha Ltd','trading_name','Isolated Alpha','website','https://alpha-example.org','industry','Education','business_location','Leeds, UK','registration_identifier','IA-TEST-001','work_email','alpha-admin@alpha-example.org','relationship','Director with documented authority','submitted_evidence','Private test evidence describing registry and authority documents for review'))::text,true);
DO $$ BEGIN BEGIN PERFORM public.submit_company_registration(jsonb_build_object('legal_name','Isolated Alpha Ltd','trading_name','','website','https://alpha-example.org','industry','Education','business_location','Leeds, UK','registration_identifier','','work_email','alpha-admin@alpha-example.org','relationship','Director with documented authority','submitted_evidence','Duplicate private test evidence for the same registration')); RAISE EXCEPTION 'FAIL: duplicate company registration accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%already recorded%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Duplicate company registration denied'; END $$;
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM public.company_registration_submissions)=1,'Applicant can read only their own private submission');

SELECT pg_temp.as_user(3); SET LOCAL ROLE authenticated;
SELECT set_config('test.subB',public.submit_company_registration(jsonb_build_object('legal_name','Isolated Beta Ltd','trading_name','Isolated Beta','website','https://beta-example.org','industry','Technology','business_location','York, UK','registration_identifier','IB-TEST-002','work_email','beta-admin@beta-example.org','relationship','Managing director with documented authority','submitted_evidence','Private test evidence describing separate business and authority records'))::text,true);
RESET ROLE;

-- A platform administrator still cannot approve their own registration.
INSERT INTO public.user_roles(user_id,role) VALUES('d0000000-0000-0000-0000-000000000001','admin');
SELECT pg_temp.as_user(1); SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.review_company_registration(current_setting('test.subA')::uuid,'verified','Independent registry evidence reviewed','Independent authority evidence reviewed','Private checks','Approved',NULL,ARRAY['alpha-example.org']); RAISE EXCEPTION 'FAIL: self review accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%own company registration%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Applicant cannot review their own company'; END $$;
RESET ROLE;
DELETE FROM public.user_roles WHERE user_id='d0000000-0000-0000-0000-000000000001';

SELECT pg_temp.as_user(2); SET LOCAL ROLE authenticated;
SELECT public.review_company_registration(current_setting('test.subA')::uuid,'verified','Registry and official business records independently checked','Applicant authority independently confirmed with business evidence','Documented isolated test review','Company verified after independent review',NULL,ARRAY['alpha-example.org']);
SELECT public.review_company_registration(current_setting('test.subB')::uuid,'verified','Separate registry and official business records checked','Separate applicant authority evidence independently confirmed','Documented second isolated test review','Company verified after independent review',NULL,ARRAY['beta-example.org']);
RESET ROLE;
SELECT set_config('test.companyA',(SELECT company_id::text FROM public.company_registration_submissions WHERE id=current_setting('test.subA')::uuid),true);
SELECT set_config('test.companyB',(SELECT company_id::text FROM public.company_registration_submissions WHERE id=current_setting('test.subB')::uuid),true);
SELECT pg_temp.ok(current_setting('test.companyA') IS DISTINCT FROM current_setting('test.companyB'),'Two unrelated canonical companies remain distinct');
SELECT pg_temp.ok((SELECT count(*) FROM public.company_memberships WHERE role='company_admin' AND status='approved')=2,'Trusted review appoints exactly one administrator per company');
SELECT pg_temp.ok((SELECT count(*) FROM public.notifications WHERE user_id IN ('d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000003') AND dedupe_key LIKE 'company-review:%')=2,'Both applicants receive company review notifications');

SELECT pg_temp.as_user(6); SET LOCAL ROLE authenticated;
SELECT set_config('test.impostor',public.submit_company_registration(jsonb_build_object('legal_name','Isolated Alpha Ltd','trading_name','Alpha impostor','website','https://attacker-example.org','industry','Education','business_location','Unknown','registration_identifier','IA-TEST-001','work_email','impostor@attacker-example.org','relationship','Untrusted attempted claimant','submitted_evidence','Untrusted test submission used to verify takeover prevention controls'))::text,true);
RESET ROLE;
SELECT pg_temp.as_user(2); SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.review_company_registration(current_setting('test.impostor')::uuid,'verified','Attempted legitimacy evidence for takeover test','Attempted authority evidence for takeover test','Private takeover prevention check','Rejected',NULL,ARRAY['attacker-example.org']); RAISE EXCEPTION 'FAIL: duplicate identity accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%possible existing company%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Duplicate company identity requires canonical review'; END $$;
DO $$ BEGIN BEGIN PERFORM public.review_company_registration(current_setting('test.impostor')::uuid,'verified','Attempted legitimacy evidence for takeover test','Attempted authority evidence for takeover test','Private takeover prevention check','Rejected',current_setting('test.companyA')::uuid,ARRAY['attacker-example.org']); RAISE EXCEPTION 'FAIL: administrator takeover accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%administrator already exists%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Existing company administrator cannot be replaced'; END $$;
RESET ROLE;

SELECT pg_temp.as_user(4); SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.save_employee_identity('Alias Attempt','Coordinator','Isolated Alpha','employee+alias@alpha-example.org'); RAISE EXCEPTION 'FAIL: alias accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%without plus aliases%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Plus-alias work email denied'; END $$;
SELECT public.save_employee_identity('Alpha Employee','Coordinator','Isolated Alpha','employee@alpha-example.org');
DO $$ BEGIN BEGIN PERFORM public.begin_employee_email_challenge(auth.uid(),repeat('e',64)); RAISE EXCEPTION 'FAIL: client issued email challenge'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; RAISE NOTICE 'PASS: Client cannot issue its own email challenge'; END $$;
RESET ROLE;
SELECT set_config('test.hashA',repeat('a',64),true);
SELECT public.begin_employee_email_challenge('d0000000-0000-0000-0000-000000000004',current_setting('test.hashA'));
SELECT pg_temp.ok((SELECT token_hash=current_setting('test.hashA') AND expires_at>now() AND consumed_at IS NULL FROM public.employee_email_challenges WHERE user_id='d0000000-0000-0000-0000-000000000004'),'Service challenge is hashed expiring and unused');
SELECT pg_temp.as_user(5); SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.confirm_employee_email(current_setting('test.hashA')); RAISE EXCEPTION 'FAIL: cross-account token accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%invalid, expired or already used%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Verification link is bound to the requesting account'; END $$;
RESET ROLE;
SELECT pg_temp.as_user(4); SET LOCAL ROLE authenticated;
SELECT public.confirm_employee_email(current_setting('test.hashA'));
SELECT pg_temp.ok((SELECT matched_company_id=current_setting('test.companyA')::uuid AND work_email_verified_at IS NOT NULL FROM public.employee_identities WHERE user_id=auth.uid()),'Exact approved domain matches after work-email verification');
SELECT pg_temp.ok(public.company_can_draft(current_setting('test.companyA')::uuid,auth.uid()) AND NOT public.company_permission(current_setting('test.companyA')::uuid,auth.uid(),'member'),'Verified email grants drafting only not membership');
SELECT pg_temp.ok((SELECT count(*) FROM public.company_memberships)=0 AND (SELECT count(*) FROM public.applications)=0,'Verified email exposes no staff or seeker records');
DO $$ BEGIN BEGIN PERFORM public.confirm_employee_email(current_setting('test.hashA')); RAISE EXCEPTION 'FAIL: replay accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%invalid, expired or already used%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Verification link cannot be replayed'; END $$;
SELECT set_config('test.reqA',public.request_company_access('join')::text,true);
SELECT pg_temp.ok(public.request_company_access('join')=current_setting('test.reqA')::uuid,'Duplicate pending membership request is deduplicated');
SELECT pg_temp.ok((SELECT x->>'state'='draft_only' AND (x->>'membership_approved')::boolean=false FROM public.get_company_access() j CROSS JOIN LATERAL jsonb_array_elements(j->'contexts') x WHERE x->>'company_id'=current_setting('test.companyA')) AND (SELECT r->>'status'='pending' FROM public.get_company_access() j CROSS JOIN LATERAL jsonb_array_elements(j->'requests') r WHERE r->>'id'=current_setting('test.reqA')),'Unapproved employee sees draft-only access and a pending membership request');
RESET ROLE;

SELECT pg_temp.as_user(3); SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.review_employee_membership(current_setting('test.reqA')::uuid,'approved','Cross company approval attempt'); RAISE EXCEPTION 'FAIL: cross-company membership approval accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%company administrator required%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Unrelated company admin cannot approve membership'; END $$;
RESET ROLE;
SELECT pg_temp.as_user(1); SET LOCAL ROLE authenticated;
SELECT public.review_employee_membership(current_setting('test.reqA')::uuid,'approved','Verified current work address and documented company association');
SELECT pg_temp.ok(public.company_permission(current_setting('test.companyA')::uuid,'d0000000-0000-0000-0000-000000000004','member') AND NOT public.company_permission(current_setting('test.companyA')::uuid,'d0000000-0000-0000-0000-000000000004','admin'),'Approved employee gains membership only not publication authority');
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM public.company_membership_reviews WHERE request_id=current_setting('test.reqA')::uuid AND reviewer_id='d0000000-0000-0000-0000-000000000001')=1,'Membership decision records reviewer and audit history');
SELECT pg_temp.ok((SELECT count(*) FROM public.notifications WHERE user_id='d0000000-0000-0000-0000-000000000004' AND dedupe_key LIKE 'membership-review:%')=1,'Employee receives membership decision notification');

-- Second company's verified employee proves domain isolation in both directions.
SELECT pg_temp.as_user(5); SET LOCAL ROLE authenticated;
SELECT public.save_employee_identity('Beta Employee','Analyst','Isolated Beta','employee@beta-example.org');
RESET ROLE;
SELECT public.begin_employee_email_challenge('d0000000-0000-0000-0000-000000000005',repeat('b',64));
SELECT pg_temp.as_user(5); SET LOCAL ROLE authenticated;
SELECT public.confirm_employee_email(repeat('b',64));
SELECT pg_temp.ok(public.company_can_draft(current_setting('test.companyB')::uuid,auth.uid()) AND NOT public.company_can_draft(current_setting('test.companyA')::uuid,auth.uid()),'Second company employee cannot draft for unrelated company');
RESET ROLE;

-- Untrusted subdomains use the manual pathway and never inherit company identity.
SELECT pg_temp.as_user(7); SET LOCAL ROLE authenticated;
SELECT public.save_employee_identity('Subdomain Worker','Assistant','Isolated Alpha','worker@staff.alpha-example.org');
RESET ROLE;
SELECT public.begin_employee_email_challenge('d0000000-0000-0000-0000-000000000007',repeat('c',64));
SELECT pg_temp.as_user(7); SET LOCAL ROLE authenticated;
SELECT public.confirm_employee_email(repeat('c',64));
SELECT pg_temp.ok((SELECT matched_company_id IS NULL FROM public.employee_identities WHERE user_id=auth.uid()) AND NOT public.company_can_draft(current_setting('test.companyA')::uuid,auth.uid()),'Untrusted subdomain does not match approved company domain');
SELECT set_config('test.manual',public.request_company_access('join')::text,true);
RESET ROLE;
SELECT pg_temp.ok((SELECT company_id IS NULL AND status='pending' FROM public.company_access_requests WHERE id=current_setting('test.manual')::uuid),'Unmatched worker receives manual review only');

-- A work-address change pauses prior membership; expired proof cannot restore it.
SELECT pg_temp.as_user(4); SET LOCAL ROLE authenticated;
SELECT public.save_employee_identity('Alpha Employee','Coordinator','Isolated Alpha','newemployee@alpha-example.org');
SELECT pg_temp.ok(NOT public.company_permission(current_setting('test.companyA')::uuid,auth.uid(),'member'),'Changed work email immediately pauses approved membership');
SELECT pg_temp.ok((SELECT work_email_verified_at IS NULL AND matched_company_id IS NULL FROM public.employee_identities WHERE user_id=auth.uid()),'Changed work email clears previous verification');
RESET ROLE;
SELECT pg_temp.ok((SELECT status='pending' AND approved_work_email IS NULL FROM public.company_memberships WHERE company_id=current_setting('test.companyA')::uuid AND user_id='d0000000-0000-0000-0000-000000000004'),'Membership approval is reset pending new proof');
UPDATE public.employee_email_challenges SET created_at=now()-interval '2 hours' WHERE user_id='d0000000-0000-0000-0000-000000000004';
SELECT public.begin_employee_email_challenge('d0000000-0000-0000-0000-000000000004',repeat('d',64));
UPDATE public.employee_email_challenges SET expires_at=now()-interval '1 minute' WHERE token_hash=repeat('d',64);
SELECT pg_temp.as_user(4); SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.confirm_employee_email(repeat('d',64)); RAISE EXCEPTION 'FAIL: expired challenge accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%invalid, expired or already used%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Expired verification link denied'; END $$;
SELECT pg_temp.ok((SELECT count(*) FROM public.company_registration_reviews)=0,'Employee cannot read private company verification evidence');
RESET ROLE;
ROLLBACK;
