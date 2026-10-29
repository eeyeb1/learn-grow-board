import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EVENT_LABELS, statusLabel } from '@/lib/opportunityStatus';

type Event = { id: string; action: string; actor_role: string; from_status: string | null; to_status: string | null; revision: number; note: string | null; created_at: string };

const ROLE: Record<string, string> = { author: 'Author', company_admin: 'Company administrator', platform_admin: 'Platform administrator', editor: 'Editor', system: 'System' };

export default function OpportunityReviewHistory({ jobId, title, open, onOpenChange }: { jobId: string | null; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [rows, setRows] = useState<Event[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !jobId) return;
    setRows(null); setError('');
    void supabase.from('job_review_events').select('id,action,actor_role,from_status,to_status,revision,note,created_at').eq('job_id', jobId).order('created_at', { ascending: false })
      .then(r => { if (r.error) setError('Could not load the review history.'); else setRows(r.data as Event[]); });
  }, [open, jobId]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
    <DialogHeader><DialogTitle>Review history</DialogTitle><DialogDescription>{title}. Every step is permanently recorded and cannot be edited.</DialogDescription></DialogHeader>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !rows ? <p role="status" className="text-sm text-muted-foreground">Loading…</p> : rows.length ? <ol className="space-y-4">{rows.map(e => <li key={e.id} className="border-l-2 border-primary/40 pl-4 text-sm">
      <p className="font-medium">{EVENT_LABELS[e.action] ?? e.action}</p>
      <p className="text-muted-foreground">{ROLE[e.actor_role] ?? e.actor_role} · Revision {e.revision} · {new Date(e.created_at).toLocaleString()}</p>
      {e.to_status && <p className="text-muted-foreground">{e.from_status ? `${statusLabel(e.from_status)} → ` : ''}{statusLabel(e.to_status)}</p>}
      {e.note && <p className="mt-1 whitespace-pre-wrap break-words">{e.note}</p>}
    </li>)}</ol> : <p className="text-sm text-muted-foreground">No review steps yet.</p>}
  </DialogContent></Dialog>;
}
