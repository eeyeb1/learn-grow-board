-- Read-only checks for environments that cannot create disposable auth fixtures.
BEGIN;
DO $$ BEGIN
 IF pg_get_functiondef('public.placement_action(uuid,text,text)'::regprocedure) NOT LIKE '%can_complete_placement(p.id,auth.uid())%' THEN RAISE EXCEPTION 'Completion scope missing'; END IF;
 IF pg_get_functiondef('public.placement_action(uuid,text,text)'::regprocedure) NOT LIKE '%Resolve outstanding hours%' THEN RAISE EXCEPTION 'Outstanding-hour guard missing'; END IF;
 IF pg_get_functiondef('public.placement_action(uuid,text,text)'::regprocedure) NOT LIKE '%issue_certificate(p.id)%' THEN RAISE EXCEPTION 'Automatic certificate issuance missing'; END IF;
 IF pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) NOT LIKE '%AND user_id=p.user_id AND status = ''approved''%' THEN RAISE EXCEPTION 'Approved owned hours only missing'; END IF;
 IF pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) NOT LIKE '%nullif(btrim(example),'''') IS NOT NULL%' THEN RAISE EXCEPTION 'Observed evidence guard missing'; END IF;
 IF pg_get_functiondef('public.issue_certificate(uuid)'::regprocedure) NOT LIKE '%_existing.revoked_at IS NULL THEN RETURN _existing.id%' THEN RAISE EXCEPTION 'Snapshot immutability missing'; END IF;
 IF pg_get_functiondef('public.verify_certificate(text)'::regprocedure) NOT LIKE '%certificate_revisions%' THEN RAISE EXCEPTION 'Superseded verification guard missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.certificate_revisions'::regclass AND tgname='certificate_revisions_immutable') THEN RAISE EXCEPTION 'Immutable history missing'; END IF;
 RAISE NOTICE 'PASS: eight completion and certificate structure safeguards';
END $$;
ROLLBACK;