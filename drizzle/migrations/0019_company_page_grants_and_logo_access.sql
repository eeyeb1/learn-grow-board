REVOKE ALL ON public.company_page_settings FROM anon,authenticated;
GRANT SELECT ON public.company_page_settings TO authenticated;
GRANT ALL ON public.company_page_settings TO service_role;
CREATE FUNCTION public.company_logo_readable(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM company_page_settings s JOIN company_verifications v ON v.company_id=s.company_id WHERE s.logo_path=_path AND ((s.is_public AND v.status='verified') OR public.company_permission(s.company_id,auth.uid(),'admin'))) OR public.company_permission(CASE WHEN split_part(_path,'/',1) ~ '^[a-f0-9-]{36}$' THEN split_part(_path,'/',1)::uuid ELSE NULL END,auth.uid(),'admin') $$;
REVOKE ALL ON FUNCTION public.company_logo_readable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_logo_readable(text) TO anon,authenticated;
DROP POLICY "Published or administered company logo" ON storage.objects;
CREATE POLICY "Published or administered company logo" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='company-logos' AND public.company_logo_readable(name));