ALTER TABLE public.job_publication_requests ADD COLUMN IF NOT EXISTS self_authored_approval boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.requires_second_authoriser(_category text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT coalesce(_category,'') IN ('shadowing','learning_project') $$;

CREATE OR REPLACE FUNCTION public.guard_self_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cat text;
BEGIN
  IF NEW.status='approved' AND OLD.status='pending' AND NEW.reviewed_by=NEW.requested_by THEN
    SELECT category INTO cat FROM jobs WHERE id=NEW.job_id;
    IF public.requires_second_authoriser(cat) THEN RAISE EXCEPTION 'This category needs a second authoriser: another company administrator must approve it'; END IF;
    NEW.self_authored_approval := true;
    NEW.platform_review_required := true;
    NEW.platform_status := 'pending';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_self_approval ON public.job_publication_requests;
CREATE TRIGGER guard_self_approval BEFORE UPDATE ON public.job_publication_requests FOR EACH ROW EXECUTE FUNCTION public.guard_self_approval();

CREATE OR REPLACE FUNCTION public.list_company_approval_requests(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.company_permission(_company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator access required'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
    SELECT jsonb_build_object(
      'id',r.id,'job_id',r.job_id,'revision',r.revision,'status',r.status,'created_at',r.created_at,'requested_by',r.requested_by,
      'author_name',coalesce(nullif(ei.full_name,''),nullif(p.full_name,''),'Company staff member'),'author_title',ei.job_title,
      'reviewed_at',r.reviewed_at,'reviewer_name',coalesce(nullif(rp.full_name,''),CASE WHEN r.reviewed_by IS NOT NULL THEN 'Company administrator' END),'note',r.note,
      'self_authored_approval',r.self_authored_approval,'platform_review_required',r.platform_review_required,'platform_status',r.platform_status,'platform_note',r.platform_note,
      'job_status',j.status,'category',j.category,'second_authoriser_required',public.requires_second_authoriser(j.category),
      'current',public.job_material(j),
      'previous',(SELECT x.approved_snapshot FROM job_publication_requests x WHERE x.job_id=r.job_id AND x.status='approved' AND x.created_at<r.created_at AND x.approved_snapshot IS NOT NULL ORDER BY x.created_at DESC LIMIT 1),
      'approved',r.approved_snapshot) x
    FROM job_publication_requests r JOIN jobs j ON j.id=r.job_id
    LEFT JOIN employee_identities ei ON ei.user_id=r.requested_by
    LEFT JOIN profiles p ON p.user_id=r.requested_by
    LEFT JOIN profiles rp ON rp.user_id=r.reviewed_by
    WHERE r.company_id=_company_id ORDER BY r.created_at DESC LIMIT 200) s),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_company_approval_requests(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_company_approval_requests(uuid) TO authenticated;