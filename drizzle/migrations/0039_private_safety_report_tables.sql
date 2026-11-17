CREATE TABLE public.safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('listing','employer','employee','seeker','safety_concern')),
  subject_id uuid,
  context_id uuid,
  company_id uuid REFERENCES public.company_profiles(id),
  job_id uuid REFERENCES public.jobs(id),
  application_id uuid REFERENCES public.applications(id),
  placement_id uuid REFERENCES public.placements(id),
  reason text NOT NULL CHECK (reason IN ('misleading','unpaid_work','discrimination','harassment','unsafe_tasks','safeguarding','payment','privacy','retaliation','other')),
  details text NOT NULL CHECK (char_length(details) BETWEEN 20 AND 5000),
  urgent boolean NOT NULL DEFAULT false,
  priority text NOT NULL CHECK (priority IN ('standard','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','escalated','resolved','dismissed')),
  assigned_to uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT ALL ON public.safety_reports TO service_role;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX safety_reports_queue_idx ON public.safety_reports(status, priority, created_at DESC);
CREATE INDEX safety_reports_reporter_idx ON public.safety_reports(reporter_id, created_at DESC);
CREATE UNIQUE INDEX safety_reports_open_dedupe ON public.safety_reports(reporter_id, subject_type, coalesce(subject_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(context_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status IN ('open','investigating','escalated');

CREATE TABLE public.safety_report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.safety_reports(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  note text,
  from_status text,
  to_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.safety_report_events TO service_role;
ALTER TABLE public.safety_report_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX safety_report_events_report_idx ON public.safety_report_events(report_id, created_at);
CREATE FUNCTION public.guard_safety_report_events() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Safety investigation history is append-only'; END $$;
CREATE TRIGGER safety_report_events_immutable BEFORE UPDATE OR DELETE ON public.safety_report_events FOR EACH ROW EXECUTE FUNCTION public.guard_safety_report_events();
REVOKE ALL ON FUNCTION public.guard_safety_report_events() FROM PUBLIC, anon, authenticated;
