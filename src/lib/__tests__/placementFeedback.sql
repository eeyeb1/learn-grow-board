-- Read-only permission checks; no live records, identities or authority are created.
BEGIN;
DO $$
BEGIN
 IF pg_get_functiondef('public.can_confirm_placement_feedback(uuid,uuid)'::regprocedure) NOT LIKE '%can_verify_hours%' THEN RAISE EXCEPTION 'FAIL: assigned supervisor check missing'; END IF;
 RAISE NOTICE 'PASS: feedback uses assigned supervisor permission';
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('skill_verifications','placement_references','placement_feedback_events','skill_reports') AND cmd IN ('INSERT','UPDATE','DELETE','ALL')) THEN RAISE EXCEPTION 'FAIL: direct feedback writes allowed'; END IF;
 RAISE NOTICE 'PASS: direct feedback and audit writes have no client policy';
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='skill_verifications' AND column_name='show_on_profile' AND column_default='false') THEN RAISE EXCEPTION 'FAIL: new confirmations are not private by default'; END IF;
 RAISE NOTICE 'PASS: new confirmations default to private';
 IF pg_get_functiondef('public.get_public_profile(text)'::regprocedure) NOT LIKE '%sv.status=''active''%' THEN RAISE EXCEPTION 'FAIL: hidden skills exposed'; END IF;
 RAISE NOTICE 'PASS: public profile excludes hidden/revoked confirmations';
 IF pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) NOT LIKE '%AND status=''active''%' THEN RAISE EXCEPTION 'FAIL: hidden skills certified'; END IF;
 RAISE NOTICE 'PASS: certificate snapshots exclude hidden/revoked confirmations';
END $$;
ROLLBACK;
