export type OpportunityStatus = 'draft' | 'pending_company' | 'changes_requested' | 'company_approved' | 'pending_platform' | 'active' | 'paused' | 'rejected' | 'closed' | 'suspended' | 'archived';

/** `active` is the stored value for Published; only active listings are public. */
export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  pending_company: 'Pending Company Approval',
  changes_requested: 'Changes Requested',
  company_approved: 'Company Approved',
  pending_platform: 'Pending Platform Review',
  active: 'Published',
  paused: 'Paused',
  rejected: 'Rejected',
  closed: 'Closed',
  suspended: 'Suspended',
  archived: 'Archived',
};

export const statusLabel = (s: string) => STATUS_LABELS[s as OpportunityStatus] ?? s;

/** Authors may edit only drafts and drafts returned with requested changes. */
export const isAuthorEditable = (s: string) => s === 'draft' || s === 'changes_requested';

/** Records are locked (read-only) while a reviewer is looking at them. */
export const isUnderReview = (s: string) => s === 'pending_company' || s === 'pending_platform';

export const isPubliclyVisible = (s: string) => s === 'active';

export const EVENT_LABELS: Record<string, string> = {
  paused: 'Paused', resumed: 'Resumed', archived: 'Archived',
  submitted: 'Submitted for company approval',
  withdrawn: 'Submission withdrawn',
  company_approved: 'Approved by company administrator',
  company_rejected: 'Rejected by company administrator',
  changes_requested: 'Changes requested',
  sent_to_platform_review: 'Sent to platform safety review',
  published: 'Published',
  platform_rejected: 'Rejected in platform safety review',
  material_change: 'Edited after approval; renewed approval required',
  closed: 'Closed',
  suspended: 'Suspended by platform',
  reinstated_to_draft: 'Reinstated as draft',
};

export type ListingGroup = 'draft' | 'review' | 'live' | 'closed' | 'archived';
/** My Opportunities tabs. Rejected/suspended sit under Closed; paused stays under Live. */
export function listingGroup(s: string): ListingGroup {
  if (s === 'draft' || s === 'changes_requested') return 'draft';
  if (s === 'pending_company' || s === 'company_approved' || s === 'pending_platform') return 'review';
  if (s === 'active' || s === 'paused') return 'live';
  if (s === 'archived') return 'archived';
  return 'closed';
}
/** Only published listings take applications; mirrors the guard_application_open trigger. */
export const acceptsApplications = (s: string, expiresAt: string | null, now = new Date()) => s === 'active' && (!expiresAt || new Date(expiresAt) > now);
