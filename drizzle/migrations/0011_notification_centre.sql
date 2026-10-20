CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('application','placement','hours','feedback','deadline')),
  title text NOT NULL,
  preview text NOT NULL,
  body text,
  link text,
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Only read_at may change from the client
CREATE OR REPLACE FUNCTION public.guard_notification_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id OR NEW.category <> OLD.category OR NEW.title <> OLD.title OR NEW.preview <> OLD.preview
     OR NEW.body IS DISTINCT FROM OLD.body OR NEW.link IS DISTINCT FROM OLD.link OR NEW.dedupe_key <> OLD.dedupe_key OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only read state can be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_guard BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  application boolean NOT NULL DEFAULT true,
  placement boolean NOT NULL DEFAULT true,
  hours boolean NOT NULL DEFAULT true,
  feedback boolean NOT NULL DEFAULT true,
  deadline boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own prefs read" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own prefs insert" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own prefs update" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public._notify(_uid uuid, _category text, _key text, _title text, _preview text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE enabled boolean;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT CASE _category WHEN 'application' THEN application WHEN 'placement' THEN placement WHEN 'hours' THEN hours
    WHEN 'feedback' THEN feedback WHEN 'deadline' THEN deadline END INTO enabled
  FROM notification_preferences WHERE user_id = _uid;
  IF enabled IS FALSE THEN RETURN; END IF;
  INSERT INTO notifications (user_id, category, dedupe_key, title, preview, body, link)
  VALUES (_uid, _category, _key, _title, _preview, _body, _link)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public._notify(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_application_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jt text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    BEGIN SELECT title INTO jt FROM jobs WHERE id::text = NEW.job_id; EXCEPTION WHEN others THEN jt := NULL; END;
    PERFORM _notify(NEW.user_id, 'application', 'app:' || NEW.id || ':' || NEW.status,
      'Application update', 'One of your applications has a new status.',
      'Your application' || COALESCE(' for ' || jt, '') || ' is now ' || NEW.status || '.', '/dashboard/applications');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER applications_notify AFTER UPDATE OF status ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application_status();

CREATE OR REPLACE FUNCTION public.notify_placement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jt text; cn text;
BEGIN
  SELECT j.title, c.company_name INTO jt, cn FROM jobs j JOIN company_profiles c ON c.id = j.company_id WHERE j.id = NEW.job_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM _notify(NEW.user_id, 'placement', 'placement:' || NEW.id || ':created',
      'Placement accepted', 'You have a new placement. Open it to see the details.',
      'You were accepted for ' || COALESCE(jt, 'a role') || COALESCE(' at ' || cn, '') || '.', '/placements/' || NEW.id);
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM _notify(NEW.user_id, 'placement', 'placement:' || NEW.id || ':' || NEW.status,
        'Placement update', 'One of your placements has changed status.',
        'Your placement ' || COALESCE(jt, '') || ' is now ' || NEW.status || '.', '/placements/' || NEW.id);
    END IF;
    IF NEW.employer_feedback IS NOT NULL AND btrim(NEW.employer_feedback) <> '' AND NEW.employer_feedback IS DISTINCT FROM OLD.employer_feedback THEN
      PERFORM _notify(NEW.user_id, 'feedback', 'pfb:' || NEW.id || ':' || md5(NEW.employer_feedback),
        'New feedback', 'You have new feedback from an employer.',
        'Your supervisor added feedback on ' || COALESCE(jt, 'your placement') || '.', '/placements/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER placements_notify AFTER INSERT OR UPDATE ON public.placements FOR EACH ROW EXECUTE FUNCTION public.notify_placement();

CREATE OR REPLACE FUNCTION public.notify_hour_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; p text; b text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    IF NEW.status = 'approved' THEN
      t := 'Hours approved'; p := 'Your supervisor approved some of your logged hours.';
      b := 'Your hours for ' || to_char(NEW.work_date, 'DD Mon YYYY') || ' were approved.';
    ELSIF NEW.reviewer_note IS NOT NULL AND btrim(NEW.reviewer_note) <> '' THEN
      t := 'Correction requested'; p := 'Your supervisor asked you to correct a time entry.';
      b := 'Your supervisor asked for a correction to your hours for ' || to_char(NEW.work_date, 'DD Mon YYYY') || ': ' || NEW.reviewer_note;
    ELSE
      t := 'Hours not approved'; p := 'Your supervisor did not approve a time entry.';
      b := 'Your hours for ' || to_char(NEW.work_date, 'DD Mon YYYY') || ' were not approved.';
    END IF;
    PERFORM _notify(NEW.user_id, 'hours', 'hour:' || NEW.id || ':' || NEW.status || ':' || COALESCE(NEW.reviewed_at::text, now()::text),
      t, p, b, '/dashboard/hours');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hour_entries_notify AFTER UPDATE OF status ON public.hour_entries FOR EACH ROW EXECUTE FUNCTION public.notify_hour_review();

CREATE OR REPLACE FUNCTION public.notify_reference() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  SELECT user_id INTO uid FROM placements WHERE id = NEW.placement_id;
  IF TG_OP = 'INSERT' OR NEW.updated_at IS DISTINCT FROM OLD.updated_at AND (NEW.content IS DISTINCT FROM OLD.content OR NEW.duties IS DISTINCT FROM OLD.duties OR NEW.strengths IS DISTINCT FROM OLD.strengths) THEN
    PERFORM _notify(uid, 'feedback', 'ref:' || NEW.id || ':' || NEW.updated_at::text,
      CASE WHEN TG_OP = 'INSERT' THEN 'New reference' ELSE 'Reference updated' END,
      'You have a reference to review.',
      'A reference was written for your placement. Review it and choose whether it appears on your public profile.',
      '/dashboard/profile');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER references_notify AFTER INSERT OR UPDATE ON public.placement_references FOR EACH ROW EXECUTE FUNCTION public.notify_reference();

-- Deadline reminders, generated on demand for the caller only
CREATE OR REPLACE FUNCTION public.sync_my_deadline_notifications() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  FOR r IN SELECT p.id, p.status, p.start_date, p.end_date, j.title FROM placements p LEFT JOIN jobs j ON j.id = p.job_id
           WHERE p.user_id = auth.uid() AND p.status IN ('upcoming','active') LOOP
    IF r.status = 'upcoming' AND r.start_date BETWEEN current_date AND current_date + 3 THEN
      PERFORM _notify(auth.uid(), 'deadline', 'deadline:start:' || r.id || ':' || r.start_date,
        'Placement starting soon', 'A placement starts in the next few days.',
        COALESCE(r.title, 'Your placement') || ' starts on ' || to_char(r.start_date, 'DD Mon YYYY') || '.', '/placements/' || r.id);
    END IF;
    IF r.status = 'active' AND r.end_date BETWEEN current_date AND current_date + 7 THEN
      PERFORM _notify(auth.uid(), 'deadline', 'deadline:end:' || r.id || ':' || r.end_date,
        'Placement ending soon', 'A placement ends soon — log any remaining hours.',
        COALESCE(r.title, 'Your placement') || ' ends on ' || to_char(r.end_date, 'DD Mon YYYY') || '. Log any remaining hours so your supervisor can approve them.', '/placements/' || r.id);
    END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_my_deadline_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_deadline_notifications() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;