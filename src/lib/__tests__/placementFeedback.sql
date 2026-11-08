-- Read-only permission checks; no live records, identities or authority are created.
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF public.can_confirm_placement_feedback('ffffffff-ffff-ffff-ffff-ffffffffffff', 'ffffffff-ffff-ffff-ffff-ffffffffffff') IS DISTINCT FROM false THEN RAISE EXCEPTION 'FAIL: unrelated reviewer gained permission'; END IF;
 RAISE NOTICE 'PASS: unrelated reviewer has no feedback authority';
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('skill_verifications','placement_references','placement_feedback_events','skill_reports') AND cmd IN ('INSERT','UPDATE','DELETE','ALL')) THEN RAISE EXCEPTION 'FAIL: direct feedback writes allowed'; END IF;
 RAISE NOTICE 'PASS: direct feedback and audit writes have no client policy';
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='skill_verifications' AND column_name='show_on_profile' AND column_default='false') THEN RAISE EXCEPTION 'FAIL: new confirmations are not private by default'; END IF;
 RAISE NOTICE 'PASS: new confirmations default to private';
 IF pg_get_functiondef('public.get_public_profile(text)'::regprocedure) NOT LIKE '%sv.status=''active''%' THEN RAISE EXCEPTION 'FAIL: hidden skills exposed'; END IF;
 RAISE NOTICE 'PASS: public profile excludes hidden/revoked confirmations';
 IF pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) NOT LIKE '%AND status=''active''%' THEN RAISE EXCEPTION 'FAIL: hidden skills certified'; END IF;
 RAISE NOTICE 'PASS: certificate snapshots exclude hidden/revoked confirmations';
 BEGIN PERFORM public.verify_placement_skill('ffffffff-ffff-ffff-ffff-ffffffffffff','Teamwork','teamwork','Observed collaboration',true); RAISE EXCEPTION 'FAIL: unauthorised confirmation'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS: unauthorised skill confirmation refused';
 BEGIN PERFORM public.update_placement_skill('ffffffff-ffff-ffff-ffff-ffffffffffff','Changed observation',true); RAISE EXCEPTION 'FAIL: unauthorised edit'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS: unauthorised skill edit refused';
 BEGIN PERFORM public.report_placement_skill('ffffffff-ffff-ffff-ffff-ffffffffffff','inaccurate','Not my placement'); RAISE EXCEPTION 'FAIL: unrelated report'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS: unrelated placement dispute refused';
 BEGIN PERFORM public.moderate_skill_report('ffffffff-ffff-ffff-ffff-ffffffffffff','upheld','Reviewed'); RAISE EXCEPTION 'FAIL: unauthorised moderation'; EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS: unauthorised moderation refused';
END $$;
ROLLBACK;