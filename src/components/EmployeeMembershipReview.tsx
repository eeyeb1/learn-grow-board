import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type Request = { id: string; employee_name: string | null; job_title: string | null; work_email: string | null; requested_company: string | null; status: string; work_email_verified: boolean; created_at: string; reviewed_at: string | null };
type Company = { id: string; company_name: string; status: string };
export default function EmployeeMembershipReview({ companyId }: { companyId?: string }) {
  const [rows, setRows] = useState<Request[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    const result = await supabase.rpc('list_employee_membership_requests', { _company_id: companyId ?? null });
    if (result.error) { setError(result.error.message); setRows([]); }
    else setRows((result.data ?? []) as unknown as Request[]);
    if (!companyId && !result.error) {
      const options = await supabase.rpc('list_company_review_candidates');
      if (options.error) setError(options.error.message); else setCompanies((options.data as unknown as Company[]).filter(c => c.status === 'verified'));
    }
    setLoading(false);
  }
  useEffect(() => { void load(); }, [companyId]);
  return <section className="border-t border-border py-7 space-y-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">{companyId ? 'Employee membership requests' : 'Manual employee review'}</h2><Button variant="outline" onClick={() => void load()}>Refresh requests</Button></div>{error && <p role="alert" className="text-destructive">{error}</p>}{loading ? <p role="status" className="text-muted-foreground">Loading requests…</p> : rows.length ? rows.map(r => <ReviewRow key={`${r.id}:${r.status}:${r.reviewed_at}`} request={r} companies={companies} manual={!companyId} reload={load} />) : <p className="text-sm text-muted-foreground">No membership requests recorded.</p>}</section>;
}
function ReviewRow({ request: r, companies, manual, reload }: { request: Request; companies: Company[]; manual: boolean; reload: () => Promise<void> }) {
  const [note, setNote] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function decide(decision: 'approved' | 'rejected' | 'route') {
    if (busy) return; setBusy(true); setError('');
    try {
      const result = decision === 'route'
        ? await supabase.rpc('route_manual_employee_request', { _request_id: r.id, _company_id: company, _note: note.trim() })
        : await supabase.rpc('review_employee_membership', { _request_id: r.id, _decision: decision, _note: note.trim() });
      if (result.error) throw new Error(result.error.message);
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this decision.'); }
    finally { setBusy(false); }
  }
  return <article className="border-b border-border py-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold break-words">{r.employee_name ?? 'Employee request'}</h3><p className="text-sm text-muted-foreground break-words">{r.job_title} · {r.requested_company}</p><p className="text-sm break-all">{r.work_email}</p></div><div className="flex flex-wrap items-start gap-2"><Badge variant="outline">{r.status}</Badge><Badge variant="outline">Work email {r.work_email_verified ? 'verified' : 'not verified'}</Badge></div></div><p className="text-xs text-muted-foreground">Requested {new Date(r.created_at).toLocaleString()}{r.reviewed_at ? ` · Reviewed ${new Date(r.reviewed_at).toLocaleString()}` : ''}</p>{r.status === 'pending' && <>
    {manual && <div className="space-y-2"><Label htmlFor={`company-${r.id}`}>Independently confirmed company</Label><Select value={company} onValueChange={setCompany}><SelectTrigger id={`company-${r.id}`}><SelectValue placeholder="Select verified company" /></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>}
    <div className="space-y-2"><Label htmlFor={`note-${r.id}`}>{manual ? 'Private association evidence' : 'Private membership review notes'}</Label><Textarea id={`note-${r.id}`} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></div>{error && <p role="alert" className="text-destructive text-sm">{error}</p>}
    <div className="flex flex-wrap gap-3">{manual ? <Button disabled={busy || !company || note.trim().length < 10} onClick={() => void decide('route')}>Refer to company administrator</Button> : <><Button disabled={busy || !r.work_email_verified || note.trim().length < 10} onClick={() => void decide('approved')}>Approve employee membership</Button><Button variant="destructive" disabled={busy || note.trim().length < 10} onClick={() => void decide('rejected')}>Reject request</Button></>}</div><p className="text-sm text-muted-foreground">{manual ? 'Referral does not grant drafting permission or membership.' : 'Approval grants employee membership only, not publication authority or access to seeker operational records.'}</p>
  </>}</article>;
}