CREATE OR REPLACE FUNCTION public.guard_application_open() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jobs;
BEGIN
  IF NEW.job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO j FROM jobs WHERE id::text=lower(NEW.job_id) AND status='active' AND (expires_at IS NULL OR expires_at>now());
    IF j.id IS NULL THEN RAISE EXCEPTION 'This opportunity is not accepting applications'; END IF;
    IF coalesce((SELECT is_minor FROM public_profiles WHERE user_id=NEW.user_id),false) AND coalesce(j.opportunity_details->>'under_18_policy','')<>'safeguarded' THEN RAISE EXCEPTION 'This opportunity has not been approved for under-18s'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_application_status(_application_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a applications; j jobs; cap int; taken int; r text := nullif(btrim(coalesce(_reason,'')),' UNNECESSARY');
BEGIN
  RAISE EXCEPTION 'placeholder';
END $$;
