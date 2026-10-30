export type ApprovalFilter = 'awaiting' | 'changes' | 'approved' | 'rejected' | 'published';

export const FILTERS: { value: ApprovalFilter; label: string }[] = [
  { value: 'awaiting', label: 'Awaiting Review' },
  { value: 'changes', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
];

/** Buckets a publication request by its own decision and the listing's current state. */
export function approvalFilter(r: { status: string; job_status: string }): ApprovalFilter | null {
  if (r.status === 'pending') return r.job_status === 'pending_company' ? 'awaiting' : null;
  if (r.status === 'changes_requested') return 'changes';
  if (r.status === 'rejected') return 'rejected';
  if (r.status === 'approved') return r.job_status === 'active' ? 'published' : 'approved';
  return null;
}

const show = (v: unknown) => (v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 1));
const flat = (o: Record<string, unknown> | null) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) out[`${k}.${k2}`] = v2;
    else out[k] = v;
  }
  return out;
};

export function diffSnapshots(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const a = flat(before), b = flat(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
    .filter(k => show(a[k]) !== show(b[k]))
    .map(k => ({ key: k.replace(/^opportunity_details\./, '').replace(/_/g, ' '), before: show(a[k]), after: show(b[k]) }));
}
