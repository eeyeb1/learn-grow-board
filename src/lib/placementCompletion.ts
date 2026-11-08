export type CompletionReview = {
  can_complete: boolean;
  approved_minutes: number;
  outstanding_count: number;
  rejected_count: number;
  skills: { skill: string; example: string; verifier_name: string }[];
};

export function completionBlocker(status: string, outstanding: number, checklistDone: boolean, start: string | null, end: string, today: string): string | null {
  if (status !== "active") return "Only active placements can be completed.";
  if (outstanding > 0) return "Resolve pending hours and correction requests before completion.";
  if (!checklistDone) return "Save the completed completion checklist first.";
  if (!start || !end || end < start || end > today) return "Record actual placement dates ending no later than today.";
  return null;
}