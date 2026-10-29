-- Run only against a disposable schema-only clone with deployed grants. Fixtures roll back.
BEGIN;
CREATE FUNCTION public.profile_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('90000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'profile'||n||'@example.org',now() FROM generate_series(1,7) n;
INSERT INTO company_profiles(id,user_id,company_name) VALUES('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','Profile test company');
INSERT INTO company_verifications(company_id,status) VALUES('91000000-0000-0000-0000-000000000001','verified');
INSERT INTO company_memberships(company_id,user_id,role,status) VALUES('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','company_admin','approved');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT save_company_page('91000000-0000-0000-0000-000000000001','{"company_name":"Edited company","company_description":"Real test description","is_public":false,"show_verified_impact":true}');
SELECT profile_assert((SELECT company_name='Edited company' FROM company_profiles WHERE id='91000000-0000-0000-0000-000000000001'),'Authorised administrator edits profile');
RESET ROLE;
SELECT profile_assert(get_public_company('91000000-0000-0000-0000-000000000001') IS NULL,'Private company page is unavailable publicly');
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM save_company_page('91000000-0000-0000-0000-000000000001','{"company_name":"Impostor edit"}'); RAISE EXCEPTION 'FAIL: unauthorised edit accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END; RAISE NOTICE 'PASS: Non-admin direct profile edit denied'; END $$;
SELECT profile_assert((SELECT count(*) FROM company_page_settings)=0,'Non-admin cannot read private page settings');
DO $$ BEGIN BEGIN UPDATE company_page_settings SET is_public=true; RAISE EXCEPTION 'FAIL: direct publication accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; RAISE NOTICE 'PASS: Direct settings writes denied'; END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT save_company_page('91000000-0000-0000-0000-000000000001','{"company_name":"Edited company","is_public":true,"show_verified_impact":true}');
RESET ROLE;
INSERT INTO jobs(id,company_id,created_by,title,description,status,expires_at) VALUES
('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','Open role','Open role fixture','active',now()+interval '1 day'),
('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','Expired role','Expired role fixture','active',now()-interval '1 day'),
('92000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','Private draft','Private draft fixture','draft',NULL);
SET LOCAL ROLE anon;
SELECT profile_assert(jsonb_array_length(get_public_company('91000000-0000-0000-0000-000000000001')->'opportunities')=1,'Public page includes only published open opportunities');
SELECT profile_assert((get_public_company('91000000-0000-0000-0000-000000000001')->>'verified')::boolean,'Verified badge comes from platform verification');
SELECT profile_assert(NOT (get_public_company('91000000-0000-0000-0000-000000000001') ?| ARRAY['user_id','applications','employees','verification_evidence']),'Public response excludes private employee and seeker records');
SELECT profile_assert(get_public_company('91000000-0000-0000-0000-000000000001')->'impact'='null'::jsonb,'Small-cohort impact remains hidden');
RESET ROLE;
INSERT INTO applications(id,user_id,job_id,status) SELECT ('93000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,('90000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'92000000-0000-0000-0000-000000000001','submitted' FROM generate_series(3,7) n;
UPDATE applications SET status='accepted' WHERE id::text LIKE '93000000%';
UPDATE placements SET status='active' WHERE company_id='91000000-0000-0000-0000-000000000001';
INSERT INTO hour_entries(user_id,application_id,work_date,minutes,description,status) SELECT user_id,id,current_date,60,'Pending hours fixture','pending' FROM applications WHERE id::text LIKE '93000000%';
UPDATE hour_entries SET status='approved';
INSERT INTO hour_entries(user_id,application_id,work_date,minutes,description,status) SELECT user_id,id,current_date,120,'Unverified hours fixture','pending' FROM applications WHERE id='93000000-0000-0000-0000-000000000003';
UPDATE placements SET status='completed' WHERE company_id='91000000-0000-0000-0000-000000000001';
SELECT profile_assert((get_public_company('91000000-0000-0000-0000-000000000001')->'impact'->>'completed_experiences')::int=5,'Impact counts completed experiences accurately');
SELECT profile_assert((get_public_company('91000000-0000-0000-0000-000000000001')->'impact'->>'approved_minutes')::int=300,'Verified impact uses approved hours only');
UPDATE company_page_settings SET show_verified_impact=false;
SELECT profile_assert(get_public_company('91000000-0000-0000-0000-000000000001')->'impact'='null'::jsonb,'Impact publication is optional');
UPDATE company_verifications SET status='suspended';
SELECT profile_assert(get_public_company('91000000-0000-0000-0000-000000000001') IS NULL,'Suspended companies lose public verified pages');
SELECT profile_assert((SELECT count(*) FROM company_permission_events WHERE action='company_profile:updated')=2,'Profile edits leave an audit trail');
ROLLBACK;