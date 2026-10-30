CREATE OR REPLACE FUNCTION public.guard_application_open() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- Non-UUID ids are the built-in sample listings, which have no database row.
  IF NEW.job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND NOT EXISTS(SELECT 1 FROM jobs j WHERE j.id::text=lower(NEW.job_id) AND j.status='active' AND (j.expires_at IS NULL OR j.expires_at>now())) THEN
    RAISE EXCEPTION 'This opportunity is not accepting applications';
  END IF;
  RETURN NEW;
END $$;