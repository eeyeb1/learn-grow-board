CREATE OR REPLACE FUNCTION public.get_company_analytics(
  _company_id uuid,
  _job_id uuid DEFAULT NULL,
  _department text DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _from IS NOT NULL AND _to IS NOT NULL AND _from > _to THEN
    RAISE EXCEPTION 'The start date must be on or before the end date';
  END IF;
  IF char_length(coalesce(_department, '')) > 100 THEN RAISE EXCEPTION 'Department filter is too long'; END IF;
  IF NOT public.company_permission(_company_id, _uid, 'member') THEN
    RAISE EXCEPTION 'Approved company membership and an analytics assignment are required';
  END IF;
  _is_admin := public.company_permission(_company_id, _uid, 'admin');

  RETURN (
    WITH scoped_jobs AS MATERIALIZED (
      SELECT j.id, j.title, j.status, nullif(btrim(j.opportunity_details->>'department'), '') AS department
      FROM jobs j
      WHERE j.company_id = _company_id
        AND (
          _is_admin
          OR public.company_job_permission(j.id, _uid, 'read')
          OR EXISTS (SELECT 1 FROM placements p WHERE p.job_id = j.id AND public.can_manage_placement(p.id, _uid))
        )
    ), selected_jobs AS MATERIALIZED (
      SELECT * FROM scoped_jobs j
      WHERE (_job_id IS NULL OR j.id = _job_id)
        AND (_department IS NULL OR coalesce(j.department, '') = _department)
    ), application_rows AS (
      SELECT a.*
      FROM applications a JOIN selected_jobs j ON j.id::text = a.job_id
      WHERE public.company_application_read(a.id, _uid)
        AND (_from IS NULL OR a.submitted_at::date >= _from)
        AND (_to IS NULL OR a.submitted_at::date <= _to)
    ), application_totals AS (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE a.status = 'accepted' OR a.status = 'completed' OR EXISTS (SELECT 1 FROM placements p WHERE p.application_id = a.id)) AS accepted,
        count(*) FILTER (WHERE a.status = 'submitted') AS current_submitted,
        count(*) FILTER (WHERE a.status = 'reviewed') AS current_under_review,
        count(*) FILTER (WHERE a.status = 'accepted') AS current_accepted,
        count(*) FILTER (WHERE a.status = 'completed') AS current_completed,
        count(*) FILTER (WHERE a.status = 'rejected') AS current_declined,
        count(*) FILTER (WHERE a.status = 'withdrawn') AS current_withdrawn
      FROM application_rows a
    ), scoped_placements AS MATERIALIZED (
      SELECT p.*
      FROM placements p JOIN selected_jobs j ON j.id = p.job_id
      WHERE public.can_manage_placement(p.id, _uid)
    ), placement_totals AS (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE p.status = 'upcoming') AS upcoming,
        count(*) FILTER (WHERE p.status = 'active') AS active,
        count(*) FILTER (WHERE p.status = 'completed') AS completed,
        count(*) FILTER (WHERE p.status = 'cancelled') AS cancelled,
        count(*) FILTER (WHERE p.status = 'disputed') AS disputed
      FROM scoped_placements p
      WHERE (_from IS NULL OR p.created_at::date >= _from)
        AND (_to IS NULL OR p.created_at::date <= _to)
    ), hour_rows AS (
      SELECT h.*
      FROM hour_entries h JOIN scoped_placements p ON p.application_id = h.application_id
      WHERE (_from IS NULL OR h.work_date >= _from)
        AND (_to IS NULL OR h.work_date <= _to)
    ), hour_totals AS (
      SELECT
        count(*) AS entries,
        coalesce(sum(h.minutes), 0) AS submitted_minutes,
        coalesce(sum(h.minutes) FILTER (WHERE h.status = 'approved'), 0) AS verified_minutes,
        coalesce(sum(h.minutes) FILTER (WHERE h.status = 'pending'), 0) AS pending_minutes,
        coalesce(sum(h.minutes) FILTER (WHERE h.status = 'correction_requested'), 0) AS correction_minutes,
        coalesce(sum(h.minutes) FILTER (WHERE h.status = 'rejected'), 0) AS rejected_minutes
      FROM hour_rows h
    ), pending_waits AS (
      SELECT greatest(0, extract(epoch FROM (now() - coalesce(e.submitted_at, h.created_at))) / 3600.0) AS wait_hours
      FROM hour_rows h
      LEFT JOIN LATERAL (
        SELECT ev.created_at AS submitted_at
        FROM hour_entry_events ev
        WHERE ev.entry_id = h.id AND ev.action IN ('submitted', 'resubmitted', 'edited')
        ORDER BY ev.created_at DESC LIMIT 1
      ) e ON true
      WHERE h.status = 'pending'
    ), wait_totals AS (
      SELECT count(*) AS pending_entries,
        round(avg(wait_hours)::numeric, 1) AS average_hours,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY wait_hours)::numeric, 1) AS median_hours,
        round(max(wait_hours)::numeric, 1) AS oldest_hours
      FROM pending_waits
    ), skill_rows AS (
      SELECT s.*
      FROM skill_verifications s JOIN scoped_placements p ON p.id = s.placement_id
      WHERE s.status = 'active'
        AND (_from IS NULL OR s.verified_at::date >= _from)
        AND (_to IS NULL OR s.verified_at::date <= _to)
    ), skill_categories AS (
      SELECT s.category, count(*) AS verifications, count(DISTINCT s.user_id) AS seekers
      FROM skill_rows s
      GROUP BY s.category
      HAVING count(DISTINCT s.user_id) >= 5
    ), skill_totals AS (
      SELECT count(*) AS verifications, count(DISTINCT s.user_id) AS seekers FROM skill_rows s
    )
    SELECT jsonb_build_object(
      'company_id', _company_id,
      'generated_at', now(),
      'scope', CASE WHEN _is_admin THEN 'company' ELSE 'assigned' END,
      'privacy_threshold', 5,
      'filters', jsonb_build_object('job_id', _job_id, 'department', _department, 'from', _from, 'to', _to),
      'listings', coalesce((SELECT jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'department', j.department, 'status', j.status) ORDER BY j.title) FROM scoped_jobs j), '[]'::jsonb),
      'views', jsonb_build_object('available', false, 'total', NULL),
      'applications', (SELECT to_jsonb(a) FROM application_totals a),
      'placements', (SELECT to_jsonb(p) FROM placement_totals p),
      'hours', (SELECT to_jsonb(h) FROM hour_totals h),
      'review_wait', (SELECT to_jsonb(w) FROM wait_totals w),
      'skills', jsonb_build_object(
        'verifications', (SELECT verifications FROM skill_totals),
        'seekers', (SELECT seekers FROM skill_totals),
        'categories', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.verifications DESC, c.category) FROM skill_categories c), '[]'::jsonb),
        'suppressed', (SELECT verifications > 0 AND seekers < 5 FROM skill_totals)
      )
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.get_company_analytics(uuid, uuid, text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_analytics(uuid, uuid, text, date, date) TO authenticated;
COMMENT ON FUNCTION public.get_company_analytics(uuid, uuid, text, date, date) IS 'Aggregate-only, role-scoped company analytics. Dates apply to application submission, placement creation, worked date and skill verification respectively. Rates require five records; skill categories require five distinct seekers. No seeker identifiers or row-level records are returned.';