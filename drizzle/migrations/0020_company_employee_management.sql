CREATE TABLE public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id uuid,
  invited_email text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('opportunity_manager','supervisor','approved_employee')),
  draft boolean NOT NULL DEFAULT false,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX company_invitations_one_pending ON public.company_invitations(company_id, invited_email) WHERE status='pending';
GRANT ALL ON public.company_invitations TO service_role;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER audit_company_invitation AFTER INSERT OR UPDATE OR DELETE ON public.company_invitations FOR EACH ROW EXECUTE FUNCTION public.audit_company_permission();

CREATE TABLE public.company_admin_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  appointed_user_id uuid NOT NULL,
  platform_admin_id uuid NOT NULL,
  legitimacy_evidence text NOT NULL,
  authority_evidence text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_admin_recoveries TO authenticated;
GRANT ALL ON public.company_admin_recoveries TO service_role;
ALTER TABLE public.company_admin_recoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read recoveries" ON public.company_admin_recoveries FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.list_company_staff(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.company_permission(_company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 RETURN jsonb_build_object(
  'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'status',m.status,'approved_at',m.approved_at,'approved_work_email',m.approved_work_email,'name',coalesce(e.full_name,p.full_name),'job_title',e.job_title,'scope',s.scope,'draft',coalesce('draft'=ANY(s.permissions),false),'access_active',public.company_permission(m.company_id,m.user_id,'member'),'is_self',m.user_id=auth.uid()) ORDER BY m.role, m.approved_at) FROM company_memberships m LEFT JOIN employee_identities e ON e.user_id=m.user_id LEFT JOIN profiles p ON p.user_id=m.user_id LEFT JOIN company_staff_scopes s ON s.company_id=m.company_id AND s.user_id=m.user_id WHERE m.company_id=_company_id AND m.status IN ('approved','revoked')),'[]'::jsonb),
  'invitations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',i.id,'invited_email',i.invited_email,'scope',i.scope,'draft',i.draft,'status',CASE WHEN i.status='pending' AND i.expires_at<=now() THEN 'expired' ELSE i.status END,'expires_at',i.expires_at,'created_at',i.created_at,'responded_at',i.responded_at) ORDER BY i.created_at DESC) FROM company_invitations i WHERE i.company_id=_company_id),'[]'::jsonb),
  'active_admins',(SELECT count(*) FROM company_memberships m WHERE m.company_id=_company_id AND m.role='company_admin' AND m.status='approved'));
END $$;

CREATE OR REPLACE FUNCTION public.invite_company_staff(_company_id uuid, _email text, _scope text, _draft boolean, _note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE em text:=lower(btrim(coalesce(_email,''))); iid uuid; target uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.company_permission(_company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 IF _scope NOT IN ('opportunity_manager','supervisor','approved_employee') OR _draft IS NULL OR length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Choose an allowed role and document the reason'; END IF;
 IF NOT public.employee_email_valid(em) OR public.employee_domain_company(em) IS DISTINCT FROM _company_id THEN RAISE EXCEPTION 'Invitations can only be sent to an address at one of this company''s approved email domains'; END IF;
 UPDATE company_invitations SET status='expired' WHERE company_id=_company_id AND invited_email=em AND status='pending' AND expires_at<=now();
 SELECT e.user_id INTO target FROM employee_identities e WHERE e.work_email=em AND e.work_email_verified_at IS NOT NULL LIMIT 1;
 IF target=auth.uid() OR EXISTS(SELECT 1 FROM company_memberships m WHERE m.company_id=_company_id AND m.user_id=target AND m.status='approved') THEN RAISE EXCEPTION 'This person already has approved company membership'; END IF;
 PERFORM set_config('app.permission_note',btrim(_note),true);
 INSERT INTO company_invitations(company_id,user_id,invited_email,scope,draft,invited_by) VALUES(_company_id,target,em,_scope,_draft,auth.uid()) RETURNING id INTO iid;
 IF target IS NOT NULL THEN PERFORM public._notify(target,'company','invitation:'||iid::text,'Company invitation','You have a new company invitation.','A company administrator invited your verified work email to join their company. Review it in your company workspace.','/employer/status'); END IF;
 RETURN iid;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_company_invitation(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i company_invitations%ROWTYPE;
BEGIN
 SELECT * INTO i FROM company_invitations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT public.company_permission(i.company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 IF i.status<>'pending' THEN RAISE EXCEPTION 'Only pending invitations can be cancelled'; END IF;
 UPDATE company_invitations SET status='cancelled',responded_at=now() WHERE id=_id;
END $$;

CREATE OR REPLACE FUNCTION public.list_my_company_invitations() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'company_name',c.company_name,'scope',i.scope,'expires_at',i.expires_at) ORDER BY i.created_at DESC),'[]'::jsonb)
 FROM company_invitations i JOIN company_profiles c ON c.id=i.company_id JOIN employee_identities e ON e.user_id=auth.uid()
 WHERE i.status='pending' AND i.expires_at>now() AND e.work_email_verified_at IS NOT NULL AND e.work_email=i.invited_email
$$;

CREATE OR REPLACE FUNCTION public.respond_company_invitation(_id uuid, _accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); i company_invitations%ROWTYPE; e employee_identities%ROWTYPE;
BEGIN
 SELECT * INTO i FROM company_invitations WHERE id=_id FOR UPDATE;
 SELECT * INTO e FROM employee_identities WHERE user_id=uid;
 IF uid IS NULL OR NOT FOUND OR i.status<>'pending' OR e.work_email_verified_at IS NULL OR e.work_email IS DISTINCT FROM i.invited_email OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=uid AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'This invitation is not available to your verified work email'; END IF;
 IF i.expires_at<=now() THEN UPDATE company_invitations SET status='expired' WHERE id=_id; RAISE EXCEPTION 'This invitation has expired'; END IF;
 IF _accept AND (public.employee_domain_company(e.work_email) IS DISTINCT FROM i.company_id OR NOT public.company_permission(i.company_id,i.invited_by,'admin')) THEN RAISE EXCEPTION 'This invitation is no longer valid. Ask a company administrator for a new one'; END IF;
 IF _accept AND EXISTS(SELECT 1 FROM company_memberships WHERE company_id=i.company_id AND user_id=uid AND role='company_admin') THEN RAISE EXCEPTION 'Invitations cannot alter an administrator appointment'; END IF;
 PERFORM set_config('app.permission_note','Invitation '||CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,true);
 UPDATE company_invitations SET status=CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,user_id=uid,responded_at=now() WHERE id=_id;
 IF _accept THEN
  INSERT INTO company_memberships(company_id,user_id,role,status,manage_placements,approved_by,approved_at,approved_work_email) VALUES(i.company_id,uid,'employee','approved',false,i.invited_by,now(),e.work_email)
   ON CONFLICT(company_id,user_id) DO UPDATE SET status='approved',manage_placements=false,approved_by=i.invited_by,approved_at=now(),approved_work_email=excluded.approved_work_email;
  INSERT INTO company_staff_scopes(company_id,user_id,scope,permissions) VALUES(i.company_id,uid,i.scope,CASE WHEN i.draft THEN ARRAY['draft'] ELSE '{}' END) ON CONFLICT(company_id,user_id) DO UPDATE SET scope=excluded.scope,permissions=excluded.permissions;
  UPDATE company_access_requests SET status='approved',reviewed_by=i.invited_by,reviewed_at=now(),review_note='Accepted company invitation' WHERE user_id=uid AND company_id=i.company_id AND pathway='join' AND status='pending';
 END IF;
 PERFORM public._notify(i.invited_by,'company','invitation-response:'||i.id::text,'Invitation '||CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,'A staff invitation was answered.','An invitation you sent to '||i.invited_email||' was '||CASE WHEN _accept THEN 'accepted' ELSE 'declined' END||'.','/employer/employees?company='||i.company_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.set_company_admin_role(_company_id uuid, _user_id uuid, _promote boolean, _confirm_email text, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m company_memberships%ROWTYPE; e employee_identities%ROWTYPE;
BEGIN
 PERFORM 1 FROM company_verifications WHERE company_id=_company_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.company_permission(_company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 IF _user_id=auth.uid() OR length(btrim(coalesce(_note,''))) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'Document your authority checks (at least 20 characters); you cannot change your own role'; END IF;
 SELECT * INTO m FROM company_memberships WHERE company_id=_company_id AND user_id=_user_id FOR UPDATE;
 IF NOT FOUND OR m.status<>'approved' THEN RAISE EXCEPTION 'Only approved members can be changed'; END IF;
 PERFORM set_config('app.permission_note',btrim(_note),true);
 IF _promote THEN
  SELECT * INTO e FROM employee_identities WHERE user_id=_user_id;
  IF m.role='company_admin' THEN RAISE EXCEPTION 'Already a company administrator'; END IF;
  IF NOT public.company_permission(_company_id,_user_id,'member') OR e.work_email_verified_at IS NULL OR e.work_email IS DISTINCT FROM m.approved_work_email OR public.employee_domain_company(e.work_email) IS DISTINCT FROM _company_id THEN RAISE EXCEPTION 'The member needs active membership with a currently verified work email at an approved company domain'; END IF;
  IF lower(btrim(coalesce(_confirm_email,''))) <> e.work_email THEN RAISE EXCEPTION 'Type the member''s verified work email to confirm'; END IF;
  IF m.approved_at > now() - interval '24 hours' THEN RAISE EXCEPTION 'Members must hold approved membership for at least 24 hours before promotion'; END IF;
  UPDATE company_memberships SET role='company_admin' WHERE id=m.id;
  DELETE FROM company_resource_assignments WHERE company_id=_company_id AND user_id=_user_id;
  DELETE FROM company_staff_scopes WHERE company_id=_company_id AND user_id=_user_id;
 ELSE
  IF m.role<>'company_admin' THEN RAISE EXCEPTION 'Not a company administrator'; END IF;
  UPDATE company_memberships SET role='employee' WHERE id=m.id;
  INSERT INTO company_staff_scopes(company_id,user_id,scope,permissions) VALUES(_company_id,_user_id,'approved_employee','{}') ON CONFLICT(company_id,user_id) DO NOTHING;
 END IF;
 PERFORM public._notify(_user_id,'company','admin-role:'||gen_random_uuid()::text,'Company role updated','Your company access status has changed.',CASE WHEN _promote THEN 'You are now a company administrator.' ELSE 'Your company administrator role was removed.' END,'/employer/workspace');
END $$;

CREATE OR REPLACE FUNCTION public.revoke_company_admin(_company_id uuid, _user_id uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m company_memberships%ROWTYPE;
BEGIN
 PERFORM 1 FROM company_verifications WHERE company_id=_company_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.company_permission(_company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 IF _user_id=auth.uid() OR length(btrim(coalesce(_note,''))) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Document the reason; you cannot revoke yourself'; END IF;
 SELECT * INTO m FROM company_memberships WHERE company_id=_company_id AND user_id=_user_id AND role='company_admin' AND status='approved' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active company administrator not found'; END IF;
 PERFORM set_config('app.permission_note',btrim(_note),true);
 UPDATE company_memberships SET status='revoked',manage_placements=false WHERE id=m.id;
 PERFORM public._notify(_user_id,'company','admin-revoked:'||gen_random_uuid()::text,'Company access revoked','Your company access status has changed.','Your company access was revoked.','/employer/status');
END $$;

CREATE OR REPLACE FUNCTION public.list_companies_without_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'company_name',c.company_name,'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',e.full_name,'work_email',e.work_email,'work_email_verified',e.work_email_verified_at IS NOT NULL AND public.employee_domain_company(e.work_email)=c.id)),'[]'::jsonb) FROM company_memberships m LEFT JOIN employee_identities e ON e.user_id=m.user_id WHERE m.company_id=c.id AND m.status='approved'))) FROM company_profiles c JOIN company_verifications v ON v.company_id=c.id AND v.status='verified' WHERE NOT EXISTS(SELECT 1 FROM company_memberships m JOIN auth.users u ON u.id=m.user_id WHERE m.company_id=c.id AND m.role='company_admin' AND m.status='approved' AND u.email_confirmed_at IS NOT NULL)),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.recover_company_admin(_company_id uuid, _user_id uuid, _legitimacy text, _authority text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; e employee_identities%ROWTYPE;
BEGIN
 PERFORM 1 FROM company_verifications WHERE company_id=_company_id AND status='verified' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Company must be verified'; END IF;
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Platform administrator required'; END IF;
 IF _user_id=auth.uid() THEN RAISE EXCEPTION 'Platform administrators cannot appoint themselves'; END IF;
 IF length(btrim(coalesce(_legitimacy,''))) NOT BETWEEN 20 AND 4000 OR length(btrim(coalesce(_authority,''))) NOT BETWEEN 20 AND 4000 THEN RAISE EXCEPTION 'Document legitimacy and authority evidence (at least 20 characters each)'; END IF;
 IF EXISTS(SELECT 1 FROM company_memberships m JOIN auth.users u ON u.id=m.user_id WHERE m.company_id=_company_id AND m.role='company_admin' AND m.status='approved' AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Recovery is only available when the company has no active administrator'; END IF;
 SELECT * INTO e FROM employee_identities WHERE user_id=_user_id;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=_user_id AND u.email_confirmed_at IS NOT NULL) OR e.work_email_verified_at IS NULL OR public.employee_domain_company(e.work_email) IS DISTINCT FROM _company_id THEN RAISE EXCEPTION 'The appointee needs a confirmed account and a verified work email at an approved company domain'; END IF;
 PERFORM set_config('app.permission_note','Platform administrator recovery appointment',true);
 INSERT INTO company_memberships(company_id,user_id,role,status,manage_placements,approved_by,approved_at,approved_work_email) VALUES(_company_id,_user_id,'company_admin','approved',false,auth.uid(),now(),e.work_email)
  ON CONFLICT(company_id,user_id) DO UPDATE SET role='company_admin',status='approved',approved_by=auth.uid(),approved_at=now(),approved_work_email=excluded.approved_work_email;
 DELETE FROM company_resource_assignments WHERE company_id=_company_id AND user_id=_user_id;
 DELETE FROM company_staff_scopes WHERE company_id=_company_id AND user_id=_user_id;
 INSERT INTO company_admin_recoveries(company_id,appointed_user_id,platform_admin_id,legitimacy_evidence,authority_evidence) VALUES(_company_id,_user_id,auth.uid(),btrim(_legitimacy),btrim(_authority)) RETURNING id INTO rid;
 PERFORM public._notify(_user_id,'company','admin-recovery:'||rid::text,'Company administrator appointed','Your company access status has changed.','A platform administrator appointed you company administrator after a documented recovery review.','/employer/workspace');
 RETURN rid;
END $$;

-- Prevent removing the last admin via the existing staff function path is already blocked (it rejects admins).
REVOKE ALL ON FUNCTION public.list_company_staff(uuid), public.invite_company_staff(uuid,text,text,boolean,text), public.cancel_company_invitation(uuid), public.list_my_company_invitations(), public.respond_company_invitation(uuid,boolean), public.set_company_admin_role(uuid,uuid,boolean,text,text), public.revoke_company_admin(uuid,uuid,text), public.list_companies_without_admin(), public.recover_company_admin(uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_company_staff(uuid), public.invite_company_staff(uuid,text,text,boolean,text), public.cancel_company_invitation(uuid), public.list_my_company_invitations(), public.respond_company_invitation(uuid,boolean), public.set_company_admin_role(uuid,uuid,boolean,text,text), public.revoke_company_admin(uuid,uuid,text), public.list_companies_without_admin(), public.recover_company_admin(uuid,uuid,text,text) TO authenticated;