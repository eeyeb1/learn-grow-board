import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ExternalLink, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { prepareCompanyLogo } from '@/lib/companyPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const empty = { company_name: '', industry: '', company_website: '', company_description: '', general_location: '', work_environment: '', learning_opportunities: '', accessibility_information: '', public_contact_email: '', public_contact_url: '', logo_path: '', is_public: false, show_verified_impact: false };
type Fields = typeof empty;
const fields: { key: keyof Pick<Fields, 'company_name' | 'industry' | 'company_website' | 'general_location' | 'public_contact_email' | 'public_contact_url'>; label: string; type?: string }[] = [
  { key: 'company_name', label: 'Company display name' }, { key: 'industry', label: 'Industry' }, { key: 'general_location', label: 'General location' }, { key: 'company_website', label: 'Website', type: 'url' }, { key: 'public_contact_email', label: 'Public contact email', type: 'email' }, { key: 'public_contact_url', label: 'Public contact link', type: 'url' },
];
export default function CompanyProfileEditor({ companyId }: { companyId: string }) {
  const { user } = useAuth(); const client = useQueryClient();
  const [form, setForm] = useState<Fields>(empty); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [logo, setLogo] = useState('');
  const queryKey = ['company-profile-editor', user?.id, companyId];
  const query = useQuery({ queryKey, queryFn: async () => {
    const [company, settings] = await Promise.all([supabase.from('company_profiles').select('company_name,company_description,company_website,industry').eq('id', companyId).single(), supabase.from('company_page_settings').select('*').eq('company_id', companyId).maybeSingle()]);
    if (company.error) throw company.error; if (settings.error) throw settings.error;
    return { ...empty, ...company.data, ...(settings.data ?? {}), company_description: company.data.company_description ?? '', company_website: company.data.company_website ?? '', industry: company.data.industry ?? '', logo_path: settings.data?.logo_path ?? '' };
  } });
  useEffect(() => { setForm(query.data ?? empty); setError(''); setSaved(false); }, [query.data, companyId, user?.id]);
  useEffect(() => { let active = true; setLogo(''); if (form.logo_path) void supabase.storage.from('company-logos').createSignedUrl(form.logo_path, 60).then(r => { if (active) setLogo(r.data?.signedUrl ?? ''); }); return () => { active = false; }; }, [form.logo_path]);
  function change<K extends keyof Fields>(key: K, value: Fields[K]) { setForm(f => ({ ...f, [key]: value })); setSaved(false); }
  async function upload(file?: File) {
    if (!file) return; setUploading(true); setError('');
    try { const png = await prepareCompanyLogo(file); const path = `${companyId}/${crypto.randomUUID()}.png`; const r = await supabase.storage.from('company-logos').upload(path, png, { contentType: 'image/png', upsert: false }); if (r.error) throw r.error; change('logo_path', path); }
    catch (e) { setError(e instanceof Error ? e.message : 'Logo upload failed.'); } finally { setUploading(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSaved(false);
    const r = await supabase.rpc('save_company_page', { _company_id: companyId, _data: form }); setBusy(false);
    if (r.error) setError(r.error.message); else { setSaved(true); void client.invalidateQueries({ queryKey }); void client.invalidateQueries({ queryKey: ['public-company', companyId] }); }
  }
  if (query.isLoading) return <p role="status" className="py-8">Loading company profile…</p>;
  if (query.error) return <div className="py-8"><p role="alert">We couldn’t load your company profile.</p><Button className="mt-4" variant="outline" onClick={() => void query.refetch()}>Try again</Button></div>;
  return <section className="border-t border-border pt-7">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl font-bold">Company profile</h2><Badge variant="soft" className="mt-3"><ShieldCheck className="mr-1.5 h-4 w-4" />Platform verified</Badge></div>{query.data?.is_public && <Button asChild variant="outline"><Link to={`/companies/${companyId}`}>View public page<ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}</div>
    <form onSubmit={save} className="space-y-8">
      <div className="flex flex-wrap items-center gap-5"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">{logo ? <img src={logo} alt="Company logo" className="h-full w-full object-contain" /> : <Building2 className="h-10 w-10 text-muted-foreground" />}</div><div className="space-y-2"><Label htmlFor="company-logo" className="flex items-center gap-2"><Upload className="h-4 w-4" />Company logo</Label><Input id="company-logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || uploading} onChange={e => void upload(e.target.files?.[0])} className="max-w-xs" /><p className="text-xs text-muted-foreground">JPG, PNG or WebP · Up to 2 MB</p>{form.logo_path && <Button type="button" variant="ghost" size="sm" onClick={() => change('logo_path', '')}>Remove logo</Button>}</div></div>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(f => <div className="space-y-2" key={f.key}><Label htmlFor={`company-${f.key}`}>{f.label}</Label><Input id={`company-${f.key}`} type={f.type ?? 'text'} required={f.key === 'company_name'} maxLength={f.type === 'url' ? 2000 : f.key === 'company_name' ? 160 : 250} placeholder={f.type === 'url' ? 'https://' : undefined} value={form[f.key]} onChange={e => change(f.key, e.target.value)} /></div>)}</div>
      {(['company_description', 'work_environment', 'learning_opportunities', 'accessibility_information'] as const).map((key, i) => <div className="space-y-2" key={key}><Label htmlFor={`company-${key}`}>{['About the company', 'Work environment', 'Types of learning opportunities', 'Accessibility information'][i]}</Label><Textarea id={`company-${key}`} rows={4} maxLength={5000} value={form[key]} onChange={e => change(key, e.target.value)} /></div>)}
      <div className="space-y-5 border-y border-border py-6"><div className="flex items-center justify-between gap-5"><div><Label htmlFor="company-public">Publish company page</Label><p className="mt-1 text-sm text-muted-foreground">Your profile and public contact options will be visible to everyone.</p></div><Switch id="company-public" checked={form.is_public} onCheckedChange={v => change('is_public', v)} /></div><div className="flex items-center justify-between gap-5"><div><Label htmlFor="company-impact">Show verified experience impact</Label><p className="mt-1 text-sm text-muted-foreground">Completed experiences and approved hours only, once at least five participants have completed an experience.</p></div><Switch id="company-impact" checked={form.show_verified_impact} onCheckedChange={v => change('show_verified_impact', v)} /></div></div>
      {error && <p role="alert" className="text-destructive">{error}</p>}{saved && <p role="status" className="text-primary">Company profile saved.</p>}<Button type="submit" disabled={busy || uploading}>{busy || uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save company profile</Button>
    </form>
  </section>;
}