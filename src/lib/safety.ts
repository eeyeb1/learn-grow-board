export type SafetySubject = 'listing' | 'employer' | 'employee' | 'seeker' | 'safety_concern';
export type SafetyDecision = 'cleared' | 'changes_required' | 'escalated';

export const SAFETY_REASONS = [
  { value: 'misleading', label: 'Misleading or inaccurate information' },
  { value: 'unpaid_work', label: 'Possible unlawful unpaid work' },
  { value: 'discrimination', label: 'Discrimination or unfair treatment' },
  { value: 'harassment', label: 'Harassment or abusive behaviour' },
  { value: 'unsafe_tasks', label: 'Unsafe tasks or working conditions' },
  { value: 'safeguarding', label: 'Safeguarding concern' },
  { value: 'payment', label: 'Missing or incorrect payment' },
  { value: 'privacy', label: 'Privacy or personal-data concern' },
  { value: 'retaliation', label: 'Retaliation for raising a concern' },
  { value: 'other', label: 'Other safety concern' },
] as const;

export const SAFETY_SUBJECT_LABELS: Record<SafetySubject, string> = {
  listing: 'Report listing', employer: 'Report employer', employee: 'Report employee',
  seeker: 'Report seeker', safety_concern: 'Report safety concern',
};

export const SAFETY_FLAG_LABELS: Record<string, string> = {
  unpaid_productive_work: 'Possible unpaid productive work',
  extended_unpaid_hours: 'Extended unpaid hours need assessment',
  unclear_supervision: 'Supervision needs clarification',
  under18_safeguarding: 'Under-18 safeguarding needs more detail',
  potential_discrimination: 'Potentially discriminatory eligibility wording',
};

export function safetyReportProblem(reason: string, details: string): string | null {
  if (!SAFETY_REASONS.some((r) => r.value === reason)) return 'Choose a report reason.';
  const length = details.trim().length;
  if (length < 20) return 'Describe what happened in at least 20 characters.';
  if (length > 5000) return 'Keep the report to 5,000 characters or fewer.';
  return null;
}

export function safetyAssessmentProblem(decision: SafetyDecision, note: string, checks: Record<string, boolean>): string | null {
  if (note.trim().length < 20) return 'Record the evidence and reasoning in at least 20 characters.';
  if (note.trim().length > 4000) return 'Keep the assessment to 4,000 characters or fewer.';
  if (decision === 'cleared' && !(checks.tasks_reviewed && checks.employment_law_reviewed && checks.safeguarding_reviewed)) {
    return 'Complete the task, employment-law and safeguarding checks before clearing this listing.';
  }
  return null;
}

export function latestAssessmentClears(flags: string[], assessments: { decision: string }[]): boolean {
  return flags.length === 0 || assessments[0]?.decision === 'cleared';
}
