// One shared vocabulary for the single `applications` record seen by seekers and employers.
export type ApplicationStatus = 'submitted' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';

export const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  reviewed: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
  completed: 'Completed',
};

export const applicationLabel = (s: string) => APPLICATION_LABELS[s as ApplicationStatus] ?? s;

/** Moves an authorised manager may make (mirrors set_application_status on the server). */
export function employerTransitions(status: string): ApplicationStatus[] {
  if (status === 'submitted') return ['reviewed', 'accepted', 'rejected'];
  if (status === 'reviewed') return ['accepted', 'rejected'];
  if (status === 'accepted') return ['rejected'];
  return [];
}

export const reasonRequired = (to: string) => to === 'rejected';

export const seekerCanWithdraw = (status: string) => status === 'submitted' || status === 'reviewed' || status === 'accepted';
