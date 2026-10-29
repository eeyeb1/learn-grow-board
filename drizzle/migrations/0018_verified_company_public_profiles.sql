CREATE TABLE public.company_page_settings (
 company_id uuid PRIMARY KEY REFERENCES public.company_profiles(id),
 is_public boolean NOT NULL DEFAULT false,
 general_location text NOT NULL DEFAULT '',
 work_environment text NOT NULL DEFAULT '',
 learning_opportunities text NOT NULL DEFAULT '',
 accessibility_information text NOT NULL DEFAULT '',
 public_contact_email text NOT NULL DEFAULT '',
 public_contact_url text NOT NULL DEFAULT '',
 logo_path text,
 show_verified_impact boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_page_settings TO authenticated;
GRANT ALL ON public.company_page_settings TO service_role;
ALTER TABLE public.company_page_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company administrators read page settings" ON public.company_page_settings FOR SELECT TO authenticated USING(public.company_permission(company_id,auth.uid(),'admin'));

CREATE FUNCTION public.save_company_page(_company_id uuid, _data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; v text; p text;
BEGIN
 PERFORM 1 FROM company_profiles WHERE id=_company_id FOR UPDATE;
 IF NOT public.company_permission(_company_id,auth.uid(),'admin') THEN RAISE EXCEPTION 'Only an authorised company administrator can edit this profile'; END IF;
 IF length(btrim(coalesce(_data->>'company_name','')))<2 OR length(_data->>'company_name')>160 THEN RAISE EXCEPTION 'Enter a company display name between 2 and 160 characters'; END IF;
 FOREACH k IN ARRAY ARRAY['company_description','work_environment','learning_opportunities','accessibility_information'] LOOP
 IF length(coalesce(_data->>k,''))>5000 THEN RAISE EXCEPTION 'Profile text is too long'; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['industry','general_location','public_contact_email'] LOOP
 IF length(coalesce(_data->>k,''))>250 THEN RAISE EXCEPTION 'Profile field is too long'; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['company_website','public_contact_url'] LOOP
 v:=coalesce(_data->>k,'');
 IF v<>'' AND (length(v)>2000 OR v !~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?([/?#][^[:space:]]*)?$' OR v ~ '@') THEN RAISE EXCEPTION 'Website and contact links must be valid HTTPS URLs'; END IF;
 END LOOP;
 v:=coalesce(_data->>'public_contact_email','');
 IF v<>'' AND v !~ '^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'Enter a valid public contact email'; END IF;
 p:=nullif(_data->>'logo_path','');
 IF p IS NOT NULL AND (p !~ ('^'||_company_id::text||'/[a-f0-9-]+\.png$') OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='company-logos' AND name=p)) THEN RAISE EXCEPTION 'Upload a company logo first'; END IF;
 UPDATE company_profiles SET company_name=btrim(_data->>'company_name'),company_description=btrim(coalesce(_data->>'company_description','')),company_website=coalesce(_data->>'company_website',''),industry=btrim(coalesce(_data->>'industry','')) WHERE id=_company_id;
 INSERT INTO company_page_settings(company_id,is_public,general_location,work_environment,learning_opportunities,accessibility_information,public_contact_email,public_contact_url,logo_path,show_verified_impact)
 VALUES(_company_id,coalesce((_data->>'is_public')::boolean,false),btrim(coalesce(_data->>'general_location','')),btrim(coalesce(_data->>'work_environment','')),btrim(coalesce(_data->>'learning_opportunities','')),btrim(coalesce(_data->>'accessibility_information','')),btrim(v),coalesce(_data->>'public_contact_url',''),p,coalesce((_data->>'show_verified_impact')::boolean,false))
 ON CONFLICT(company_id) DO UPDATE SET is_public=EXCLUDED.is_public,general_location=EXCLUDED.general_location,work_environment=EXCLUDED.work_environment,learning_opportunities=EXCLUDED.learning_opportunities,accessibility_information=EXCLUDED.accessibility_information,public_contact_email=EXCLUDED.public_contact_email,public_contact_url=EXCLUDED.public_contact_url,logo_path=EXCLUDED.logo_path,show_verified_impact=EXCLUDED.show_verified_impact,updated_at=now();
 INSERT INTO company_permission_events(company_id,actor_id,action,resource_id,after_state) VALUES(_company_id,auth.uid(),'company_profile:updated',_company_id,jsonb_build_object('is_public',coalesce((_data->>'is_public')::boolean,false)));
END $$;
REVOKE ALL ON FUNCTION public.save_company_page(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_company_page(uuid,jsonb) TO authenticated;

CREATE FUNCTION public.get_public_company(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; impact jsonb;
BEGIN
 SELECT jsonb_build_object('company_id',c.id,'company_name',c.company_name,'company_description',c.company_description,'company_website',c.company_website,'industry',c.industry,'verified',true,'general_location',s.general_location,'work_environment',s.work_environment,'learning_opportunities',s.learning_opportunities,'accessibility_information',s.accessibility_information,'public_contact_email',s.public_contact_email,'public_contact_url',s.public_contact_url,'logo_path',s.logo_path) INTO result
 FROM company_profiles c JOIN company_page_settings s ON s.company_id=c.id JOIN company_verifications v ON v.company_id=c.id WHERE c.id=_company_id AND s.is_public AND v.status='verified';
 IF result IS NULL THEN RETURN NULL; END IF;
 result:=result||jsonb_build_object('opportunities',coalesce((SELECT jsonb_agg(jsonb_build_object('id',j.id,'title',j.title,'location',j.location,'location_type',j.location_type,'duration',j.duration,'skills',j.skills) ORDER BY j.created_at DESC) FROM jobs j WHERE j.company_id=_company_id AND j.status='active' AND (j.expires_at IS NULL OR j.expires_at>now())),'[]'::jsonb));
 IF EXISTS(SELECT 1 FROM company_page_settings WHERE company_id=_company_id AND show_verified_impact) THEN
 SELECT CASE WHEN count(DISTINCT p.user_id)>=5 THEN jsonb_build_object('completed_experiences',count(*),'approved_minutes',coalesce((SELECT sum(h.minutes) FROM hour_entries h JOIN placements x ON x.application_id=h.application_id WHERE x.company_id=_company_id AND x.status='completed' AND h.status='approved'),0)) ELSE NULL END INTO impact FROM placements p WHERE p.company_id=_company_id AND p.status='completed';
 END IF;
 RETURN result||jsonb_build_object('impact',impact);
END $$;
REVOKE ALL ON FUNCTION public.get_public_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_company(uuid) TO anon,authenticated,service_role;

CREATE POLICY "Admin uploads company logo" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='company-logos' AND name ~ '^[a-f0-9-]{36}/[a-f0-9-]+\.png$' AND public.company_permission(split_part(name,'/',1)::uuid,auth.uid(),'admin'));
CREATE POLICY "Published or administered company logo" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='company-logos' AND (EXISTS(SELECT 1 FROM public.company_page_settings s JOIN public.company_verifications v ON v.company_id=s.company_id WHERE s.logo_path=name AND s.is_public AND v.status='verified') OR public.company_permission(CASE WHEN split_part(name,'/',1) ~ '^[a-f0-9-]{36}$' THEN split_part(name,'/',1)::uuid ELSE NULL END,auth.uid(),'admin')));
CREATE POLICY "Admin deletes company logo" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='company-logos' AND public.company_permission(CASE WHEN split_part(name,'/',1) ~ '^[a-f0-9-]{36}$' THEN split_part(name,'/',1)::uuid ELSE NULL END,auth.uid(),'admin'));
