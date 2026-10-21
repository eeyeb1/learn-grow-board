CREATE TABLE public.company_verifications (
 company_id uuid PRIMARY KEY REFERENCES public.company_profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','suspended')),
 reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_verifications TO authenticated;
GRANT ALL ON public.company_verifications TO service_role;
ALTER TABLE public.company_verifications ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.company_domains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
 domain text NOT NULL UNIQUE CHECK(domain = lower(domain) AND domain ~ '^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$'),
 approved boolean NOT NULL DEFAULT false, approved_by uuid, approved_at timestamptz
);
GRANT SELECT ON public.company_domains TO authenticated;
GRANT ALL ON public.company_domains TO service_role;
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.company_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
 user_id uuid NOT NULL, role text NOT NULL CHECK(role IN ('company_admin','employee')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revoked')),
 manage_placements boolean NOT NULL DEFAULT false, approved_by uuid, approved_at timestamptz,
 UNIQUE(company_id,user_id)
);
GRANT SELECT ON public.company_memberships TO authenticated;
GRANT ALL ON public.company_memberships TO service_role;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own company memberships" ON public.company_memberships FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.company_access_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, company_id uuid REFERENCES public.company_profiles(id),
 pathway text NOT NULL CHECK(pathway IN ('register','join')), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 job_title text, department text, requested_domain text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,company_id,pathway)
);
GRANT SELECT ON public.company_access_requests TO authenticated;
GRANT ALL ON public.company_access_requests TO service_role;
ALTER TABLE public.company_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own company requests" ON public.company_access_requests FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.company_permission(_company_id uuid, _uid uuid, _permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM company_memberships m JOIN company_verifications v ON v.company_id=m.company_id
 JOIN auth.users u ON u.id=m.user_id WHERE m.company_id=_company_id AND m.user_id=_uid
 AND u.email_confirmed_at IS NOT NULL AND m.status='approved' AND v.status='verified'
 AND CASE _permission WHEN 'admin' THEN m.role='company_admin' WHEN 'member' THEN true
 WHEN 'placements' THEN m.role='company_admin' OR m.manage_placements ELSE false END)
$$;
REVOKE ALL ON FUNCTION public.company_permission(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_permission(uuid,uuid,text) TO authenticated,service_role;
CREATE FUNCTION public.company_can_draft(_company_id uuid, _uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.company_permission(_company_id,_uid,'member') OR EXISTS(
 SELECT 1 FROM auth.users u JOIN company_domains d ON lower(split_part(u.email,'@',2))=d.domain
 JOIN company_verifications v ON v.company_id=d.company_id WHERE u.id=_uid AND u.email_confirmed_at IS NOT NULL
 AND d.company_id=_company_id AND d.approved AND v.status='verified'
 AND NOT EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=_company_id AND m.user_id=_uid AND m.status IN ('revoked','rejected'))
 AND NOT EXISTS(SELECT 1 FROM company_access_requests r WHERE r.company_id=_company_id AND r.user_id=_uid AND r.status='rejected'))
$$;
REVOKE ALL ON FUNCTION public.company_can_draft(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.company_can_draft(uuid,uuid) TO authenticated,service_role;
CREATE POLICY "Related company verification" ON public.company_verifications FOR SELECT TO authenticated USING(
 public.company_can_draft(company_id,auth.uid()) OR EXISTS(SELECT 1 FROM company_profiles c WHERE c.id=company_id AND c.user_id=auth.uid()));
CREATE POLICY "Related approved domains" ON public.company_domains FOR SELECT TO authenticated USING(public.company_can_draft(company_id,auth.uid()));
CREATE FUNCTION public.get_company_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); verified boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 SELECT email_confirmed_at IS NOT NULL INTO verified FROM auth.users WHERE id=uid;
 RETURN jsonb_build_object('email_verified',coalesce(verified,false),'contexts',coalesce((
 SELECT jsonb_agg(jsonb_build_object('company_id',c.id,'company_name',c.company_name,
 'state',CASE WHEN NOT coalesce(verified,false) THEN 'email_pending'
 WHEN public.company_permission(c.id,uid,'admin') THEN 'company_admin'
 WHEN public.company_permission(c.id,uid,'member') THEN 'employee'
 WHEN public.company_can_draft(c.id,uid) THEN 'draft_only'
 WHEN EXISTS(SELECT 1 FROM company_access_requests r WHERE r.company_id=c.id AND r.user_id=uid AND r.status='rejected') OR EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=c.id AND m.user_id=uid AND m.status IN ('rejected','revoked')) THEN 'access_denied'
 WHEN EXISTS(SELECT 1 FROM company_verifications v WHERE v.company_id=c.id AND v.status='verified') THEN 'membership_pending'
 ELSE 'company_pending' END,
 'manage_placements',public.company_permission(c.id,uid,'placements')))
 FROM company_profiles c WHERE c.user_id=uid OR public.company_can_draft(c.id,uid)
 OR EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=c.id AND m.user_id=uid)
 OR EXISTS(SELECT 1 FROM company_access_requests r WHERE r.company_id=c.id AND r.user_id=uid)), '[]'::jsonb),
 'requests',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'pathway',r.pathway,'company_id',r.company_id)) FROM company_access_requests r WHERE r.user_id=uid),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_company_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_company_access() TO authenticated;
CREATE FUNCTION public.request_company_access(_pathway text,_company_name text DEFAULT '',_website text DEFAULT '',_job_title text DEFAULT '',_department text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); cid uuid; rid uuid; em text; confirmed timestamptz;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 SELECT email,email_confirmed_at INTO em,confirmed FROM auth.users WHERE id=uid;
 IF confirmed IS NULL THEN RAISE EXCEPTION 'Verify your email before requesting company access'; END IF;
 IF _pathway NOT IN ('register','join') OR length(coalesce(_job_title,''))>100 OR length(coalesce(_department,''))>100 THEN RAISE EXCEPTION 'Invalid company details'; END IF;
 IF _pathway='register' THEN
 IF length(btrim(coalesce(_company_name,''))) NOT BETWEEN 2 AND 160 OR length(coalesce(_website,''))>300 OR (coalesce(_website,'')<>'' AND _website !~ '^https://') THEN RAISE EXCEPTION 'Enter a company name and a valid https website'; END IF;
 SELECT id INTO cid FROM company_profiles WHERE user_id=uid ORDER BY created_at LIMIT 1;
 IF cid IS NULL THEN
 INSERT INTO company_profiles(user_id,company_name,company_website) VALUES(uid,btrim(_company_name),nullif(_website,'')) RETURNING id INTO cid;
 END IF;
 INSERT INTO company_verifications(company_id) VALUES(cid) ON CONFLICT DO NOTHING;
 ELSE
 SELECT d.company_id INTO cid FROM company_domains d JOIN company_verifications v ON v.company_id=d.company_id
 WHERE d.domain=lower(split_part(em,'@',2)) AND d.approved AND v.status='verified';
 END IF;
 IF cid IS NULL THEN
 SELECT id INTO rid FROM company_access_requests WHERE user_id=uid AND pathway=_pathway AND company_id IS NULL;
 END IF;
 IF rid IS NULL THEN
 INSERT INTO company_access_requests(user_id,company_id,pathway,job_title,department,requested_domain)
 VALUES(uid,cid,_pathway,nullif(btrim(_job_title),''),nullif(btrim(_department),''),lower(split_part(em,'@',2)))
 ON CONFLICT(user_id,company_id,pathway) DO UPDATE SET job_title=excluded.job_title,department=excluded.department
 RETURNING id INTO rid;
 END IF;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.request_company_access(text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_company_access(text,text,text,text,text) TO authenticated;
ALTER TABLE public.jobs ADD COLUMN created_by uuid DEFAULT auth.uid();
UPDATE public.jobs j SET created_by=c.user_id FROM public.company_profiles c WHERE c.id=j.company_id AND j.created_by IS NULL;
CREATE FUNCTION public.guard_company_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (NEW.company_id<>OLD.company_id OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN RAISE EXCEPTION 'Job ownership cannot be changed'; END IF;
 IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); END IF;
 IF NEW.status='active' AND NOT public.company_permission(NEW.company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Only an authorised administrator of a verified company may publish'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_company_job BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.guard_company_job();
DROP POLICY "Companies can insert their own jobs" ON public.jobs;
DROP POLICY "Companies can update their own jobs" ON public.jobs;
DROP POLICY "Companies can delete their own jobs" ON public.jobs;
DROP POLICY "Companies view their own jobs" ON public.jobs;
CREATE POLICY "Company authorised job reads" ON public.jobs FOR SELECT TO authenticated USING(public.company_permission(company_id,auth.uid(),'member') OR (created_by=auth.uid() AND public.company_can_draft(company_id,auth.uid())));
CREATE POLICY "Company authorised job inserts" ON public.jobs FOR INSERT TO authenticated WITH CHECK(public.company_permission(company_id,auth.uid(),'admin') OR (public.company_can_draft(company_id,auth.uid()) AND created_by=auth.uid() AND status='draft'));
CREATE POLICY "Company authorised job updates" ON public.jobs FOR UPDATE TO authenticated USING(public.company_permission(company_id,auth.uid(),'admin') OR (created_by=auth.uid() AND status='draft' AND public.company_can_draft(company_id,auth.uid()))) WITH CHECK(public.company_permission(company_id,auth.uid(),'admin') OR (created_by=auth.uid() AND status='draft' AND public.company_can_draft(company_id,auth.uid())));
CREATE POLICY "Company authorised job deletes" ON public.jobs FOR DELETE TO authenticated USING(public.company_permission(company_id,auth.uid(),'admin') OR (created_by=auth.uid() AND status='draft' AND public.company_can_draft(company_id,auth.uid())));
DROP POLICY "Companies can view applications to their jobs" ON public.applications;
DROP POLICY "Companies can update applications to their jobs" ON public.applications;
DROP POLICY "Companies can delete applications to their jobs" ON public.applications;
CREATE POLICY "Company authorised application reads" ON public.applications FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM jobs j WHERE j.id::text=job_id AND public.company_permission(j.company_id,auth.uid(),'placements')));
CREATE POLICY "Company authorised application updates" ON public.applications FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM jobs j WHERE j.id::text=job_id AND public.company_permission(j.company_id,auth.uid(),'placements'))) WITH CHECK(EXISTS(SELECT 1 FROM jobs j WHERE j.id::text=job_id AND public.company_permission(j.company_id,auth.uid(),'placements')));
CREATE FUNCTION public.guard_company_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND auth.uid()<>OLD.user_id AND (NEW.user_id<>OLD.user_id OR NEW.job_id<>OLD.job_id OR NEW.form_data IS DISTINCT FROM OLD.form_data OR NEW.submitted_at<>OLD.submitted_at) THEN RAISE EXCEPTION 'Employers may change application status only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_company_application BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.guard_company_application();
CREATE OR REPLACE FUNCTION public.can_manage_placement(_placement_id uuid,_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(_uid,'admin') OR EXISTS(SELECT 1 FROM placements p WHERE p.id=_placement_id AND public.company_permission(p.company_id,_uid,'placements'))
$$;
CREATE OR REPLACE FUNCTION public.is_placement_employer(_application_id uuid,_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM applications a JOIN jobs j ON j.id::text=a.job_id WHERE a.id=_application_id AND public.company_permission(j.company_id,_user_id,'placements'))
$$;
DROP POLICY "Users can update their own company profile" ON public.company_profiles;
CREATE POLICY "Authorised administrators edit company profile" ON public.company_profiles FOR UPDATE TO authenticated USING(public.company_permission(id,auth.uid(),'admin')) WITH CHECK(public.company_permission(id,auth.uid(),'admin'));
COMMENT ON COLUMN public.profiles.user_type IS 'Presentation preference only; never a company permission or membership';
COMMENT ON TABLE public.company_verifications IS 'Trusted review only; registering a company does not verify it or authorise an administrator';
COMMENT ON TABLE public.company_memberships IS 'Explicit trusted approval only; email-domain matching never creates membership';