-- Run ONLY against a disposable schema-only clone, never against the app database.
-- psql -v ON_ERROR_STOP=1 -f employerPermissions.sql ; fixtures always roll back.
BEGIN;
-- Restore actual deployed grants with the schema; do not broaden them for tests.
CREATE FUNCTION public.test_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'test'||n||'@rbac-example.org',now() FROM generate_series(1,8) n;
INSERT INTO public.company_profiles(id,user_id,company_name) VALUES('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Isolated company A'),('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Isolated company B');
INSERT INTO public.company_verifications(company_id,status) SELECT id,'verified' FROM public.company_profiles;
INSERT INTO public.company_domains(company_id,domain,approved) VALUES('10000000-0000-0000-0000-000000000001','rbac-example.org',true),('10000000-0000-0000-0000-000000000002','other-example.org',true);
INSERT INTO public.employee_identities(user_id,full_name,job_title,claimed_company,work_email,work_email_verified_at,matched_company_id) SELECT id,'Test staff','Test role','Company A',email,now(),'10000000-0000-0000-0000-000000000001' FROM auth.users WHERE id::text IN ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006');
INSERT INTO public.company_memberships(company_id,user_id,role,status,approved_work_email) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','company_admin','approved',NULL),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','company_admin','approved',NULL);
INSERT INTO public.company_memberships(company_id,user_id,role,status,approved_work_email) SELECT '10000000-0000-0000-0000-000000000001',id,'employee','approved',email FROM auth.users WHERE id::text IN ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005');
INSERT INTO public.company_staff_scopes(company_id,user_id,scope) VALUES('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','opportunity_manager'),('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','supervisor'),('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','approved_employee');
INSERT INTO public.jobs(id,company_id,created_by,title,description,status) VALUES
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Assigned listing','Actual assigned listing fixture','active'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Other company','Other company fixture','draft'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','Personal draft','Contributor private draft','draft'),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Unassigned draft','Unassigned draft fixture','draft');
INSERT INTO public.company_resource_assignments(company_id,user_id,job_id,permissions) VALUES('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001',ARRAY['read','edit','applications']);
INSERT INTO public.applications(id,user_id,job_id) VALUES('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000001');
UPDATE public.applications SET status='accepted' WHERE id='30000000-0000-0000-0000-000000000001';
INSERT INTO public.company_resource_assignments(company_id,user_id,placement_id,permissions) SELECT company_id,'00000000-0000-0000-0000-000000000004',id,ARRAY['manage'] FROM public.placements;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
SET LOCAL ROLE authenticated;
SELECT public.placement_action(id,'activate',NULL) FROM placements;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000007',true);
SET LOCAL ROLE authenticated;
INSERT INTO hour_entries(application_id,user_id,work_date,minutes,description,status) VALUES('30000000-0000-0000-0000-000000000001',auth.uid(),current_date,60,'Observed work for isolated placement','approved');
SELECT public.test_assert((SELECT status='pending' FROM hour_entries),'Seeker cannot self-approve hours');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
SET LOCAL ROLE authenticated;
UPDATE hour_entries SET status='approved';
SELECT public.test_assert((SELECT status='approved' AND reviewed_by=auth.uid() FROM hour_entries),'Assigned supervisor approves relevant hours');
SELECT public.verify_placement_skill(id,'Teamwork','teamwork','Observed collaborative work',true) FROM placements;
SELECT public.test_assert((SELECT count(*) FROM skill_verifications)=1,'Assigned supervisor verifies observed skill');
RESET ROLE;
SELECT public.test_assert(public.company_job_permission('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','edit'),'Manager edits assigned listing');
SELECT public.test_assert(NOT public.company_job_permission('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','read'),'Cross-company read denied');
SELECT public.test_assert(NOT public.company_job_permission('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','edit'),'Unassigned listing denied');
SELECT public.test_assert(NOT public.company_job_permission('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','applications'),'Approved employee has no implicit applications permission');
SELECT public.test_assert(public.can_manage_placement(id,'00000000-0000-0000-0000-000000000004'),'Assigned supervisor manages placement') FROM public.placements;
SELECT public.test_assert(NOT public.can_manage_placement(id,'00000000-0000-0000-0000-000000000003'),'Opportunity manager cannot supervise placement') FROM public.placements;
SELECT public.test_assert(public.company_can_draft('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006') AND NOT public.company_permission('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','member'),'Draft contributor is not a member');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.jobs WHERE id='20000000-0000-0000-0000-000000000002')=0,'Direct RLS cross-company draft read denied');
DO $$ BEGIN BEGIN PERFORM public.set_company_staff_access('10000000-0000-0000-0000-000000000001',auth.uid(),'company_admin',true,false,'Escalation attempt fixture'); RAISE EXCEPTION 'FAIL: escalation succeeded'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Direct RPC role escalation denied'; END $$;
UPDATE public.jobs SET description='Edited manager listing fixture' WHERE id='20000000-0000-0000-0000-000000000001';
SELECT public.test_assert((SELECT status='draft' FROM jobs WHERE id='20000000-0000-0000-0000-000000000001'),'Manager editing public listing unpublishes revision');
DO $$ BEGIN BEGIN UPDATE jobs SET status='active' WHERE id='20000000-0000-0000-0000-000000000001'; RAISE EXCEPTION 'FAIL: manager published'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Direct manager publication denied'; END $$;
SELECT public.request_job_publication('20000000-0000-0000-0000-000000000001');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.review_job_publication(id,true,'Reviewed current revision for publication') FROM job_publication_requests WHERE job_id='20000000-0000-0000-0000-000000000001' AND status='pending';
SELECT public.test_assert((SELECT status='active' FROM jobs WHERE id='20000000-0000-0000-0000-000000000001'),'Company administrator approves public publication');
RESET ROLE;
UPDATE public.company_domains SET approved=false WHERE company_id='10000000-0000-0000-0000-000000000001';
SELECT public.test_assert(NOT public.company_job_permission('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','edit'),'Changed approved domain invalidates manager access');
UPDATE public.company_domains SET approved=true WHERE company_id='10000000-0000-0000-0000-000000000001';
UPDATE public.employee_identities SET work_email='changed@rbac-example.org' WHERE user_id='00000000-0000-0000-0000-000000000003';
SELECT public.test_assert(NOT public.company_job_permission('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','edit'),'Changed work email invalidates previous membership');
UPDATE public.employee_identities SET work_email='test3@rbac-example.org' WHERE user_id='00000000-0000-0000-0000-000000000003';
UPDATE public.company_memberships SET status='revoked' WHERE user_id='00000000-0000-0000-0000-000000000003';
SELECT public.test_assert(NOT public.company_job_permission('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','edit'),'Revoked membership invalidates assignments');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM jobs WHERE status='draft')=1,'Contributor sees only own private draft');
SELECT public.test_assert((SELECT count(*) FROM company_memberships)=0,'Contributor cannot read approved staff');
DO $$ BEGIN BEGIN INSERT INTO company_memberships(company_id,user_id,role,status) VALUES('10000000-0000-0000-0000-000000000001',auth.uid(),'company_admin','approved'); RAISE EXCEPTION 'FAIL: self-appointment succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; RAISE NOTICE 'PASS: Direct API self-appointment denied'; END $$;
SELECT public.test_assert((SELECT count(*) FROM applications)=0,'Contributor cannot read seeker applications');
SELECT public.request_job_publication('20000000-0000-0000-0000-000000000003');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000008',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM jobs WHERE status='draft')=0,'Account switching drops prior draft access');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000007',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM applications)=1,'Seeker still reads own application');
SELECT public.test_assert((SELECT count(*) FROM placements)=1,'Seeker still reads own placement');
SELECT public.test_assert((SELECT minutes FROM hour_entries WHERE status='approved')=60,'Seeker retains approved hours');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM company_permission_events WHERE action='company_resource_assignments:insert')=2,'Assignments create audit records');
DO $$ BEGIN BEGIN UPDATE company_permission_events SET note='tamper'; RAISE EXCEPTION 'FAIL: audit altered'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Permission history cannot be altered'; END $$;
SELECT set_config('test.placement_id',(SELECT id::text FROM placements WHERE application_id='30000000-0000-0000-0000-000000000001'),true);
UPDATE company_memberships SET status='revoked' WHERE user_id='00000000-0000-0000-0000-000000000004';
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
SET LOCAL ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM hour_entries)=0,'Revoked supervisor cannot read placement hours');
DO $$ BEGIN BEGIN PERFORM public.verify_placement_skill(current_setting('test.placement_id')::uuid,'Teamwork','teamwork','Observed work',true); RAISE EXCEPTION 'FAIL: revoked supervisor confirmed skill'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Revoked supervisor direct skill confirmation denied'; END $$;
RESET ROLE;
ROLLBACK;
