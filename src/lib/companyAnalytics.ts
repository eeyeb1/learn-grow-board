export const ANALYTICS_MIN_SAMPLE = 5;

export type AnalyticsListing = {
  id: string;
  title: string;
  department: string | null;
  status: string;
};

export type CompanyAnalytics = {
  company_id: string;
  generated_at: string;
  scope: 'company' | 'assigned';
  privacy_threshold: number;
  filters: { job_id: string | null; department: string | null; from: string | null; to: string | null };
  listings: AnalyticsListing[];
  views: { available: boolean; total: number | null };
  applications: {
    total: number;
    accepted: number;
    current_submitted: number;
    current_under_review: number;
    current_accepted: number;
    current_completed: number;
    current_declined: number;
    current_withdrawn: number;
  };
  placements: { total: number; upcoming: number; active: number; completed: number; cancelled: number; disputed: number };
  hours: {
    entries: number;
    submitted_minutes: number;
    verified_minutes: number;
    pending_minutes: number;
    correction_minutes: number;
    rejected_minutes: number;
  };
  review_wait: { pending_entries: number; average_hours: number | null; median_hours: number | null; oldest_hours: number | null };
  skills: {
    verifications: number;
    seekers: number;
    categories: { category: string; verifications: number; seekers: number }[];
    suppressed: boolean;
  };
};

/** Rates are intentionally unavailable for small cohorts, not rounded or replaced with zero. */
export function sampleRatio(numerator: number, denominator: number, sampleSize: number, minimum = ANALYTICS_MIN_SAMPLE): number | null {
  if (sampleSize < minimum || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function hoursLabel(minutes: number): string {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

export function waitLabel(hours: number | null): string {
  if (hours === null) return 'No pending entries';
  if (hours < 48) return `${hours.toFixed(1)} hours`;
  return `${(hours / 24).toFixed(1)} days`;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? 'Not available' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Aggregate-only export: this deliberately has no row-level or seeker-identifying input. */
export function companyAnalyticsCsv(data: CompanyAnalytics, companyName: string): string {
  const acceptance = sampleRatio(data.applications.accepted, data.applications.total, data.applications.total);
  const completion = sampleRatio(data.placements.completed, data.placements.total, data.placements.total);
  const verifiedShare = sampleRatio(data.hours.verified_minutes, data.hours.submitted_minutes, data.hours.entries);
  const rows: (string | number | null)[][] = [
    ['Company analytics export', companyName, '', ''],
    ['Generated', data.generated_at, '', ''],
    ['Scope', data.scope === 'company' ? 'Whole authorised company' : 'Assigned listings and placements only', '', ''],
    ['Listing filter', data.filters.job_id ?? 'All authorised listings', '', ''],
    ['Department filter', data.filters.department ?? 'All departments', '', ''],
    ['Date from', data.filters.from ?? 'No start limit', '', ''],
    ['Date to', data.filters.to ?? 'No end limit', '', ''],
    [],
    ['Section', 'Metric', 'Value', 'Definition'],
    ['Opportunities', 'Views', null, 'View tracking is not available; no figure is reported'],
    ['Applications', 'Submitted', data.applications.total, 'Applications submitted within the selected dates'],
    ['Applications', 'Ever accepted', data.applications.accepted, 'Submitted applications with a placement or current accepted/completed status'],
    ['Applications', 'Acceptance rate', acceptance === null ? null : `${acceptance}%`, 'Ever accepted divided by submitted; hidden below five applications'],
    ['Placements', 'Placement records', data.placements.total, 'Placements created within the selected dates'],
    ['Placements', 'Completed', data.placements.completed, 'Completed placements in that creation-date cohort'],
    ['Placements', 'Completion rate', completion === null ? null : `${completion}%`, 'Completed divided by all placements in the cohort; hidden below five placements'],
    ['Hours', 'Submitted', hoursLabel(data.hours.submitted_minutes), 'All logged minutes by worked date, including every review status'],
    ['Hours', 'Verified', hoursLabel(data.hours.verified_minutes), 'Approved minutes only'],
    ['Hours', 'Pending', hoursLabel(data.hours.pending_minutes), 'Minutes currently awaiting supervisor review'],
    ['Hours', 'Correction requested', hoursLabel(data.hours.correction_minutes), 'Minutes awaiting seeker correction'],
    ['Hours', 'Rejected', hoursLabel(data.hours.rejected_minutes), 'Minutes rejected during review'],
    ['Hours', 'Verified share', verifiedShare === null ? null : `${verifiedShare}%`, 'Approved minutes divided by all logged minutes; hidden below five entries'],
    ['Supervisor review', 'Pending entries', data.review_wait.pending_entries, 'Current pending entries in the worked-date selection'],
    ['Supervisor review', 'Average wait', data.review_wait.average_hours === null ? null : waitLabel(data.review_wait.average_hours), 'Elapsed time since latest submission or resubmission'],
    ['Supervisor review', 'Median wait', data.review_wait.median_hours === null ? null : waitLabel(data.review_wait.median_hours), 'Median elapsed wait for current pending entries'],
    ['Supervisor review', 'Oldest wait', data.review_wait.oldest_hours === null ? null : waitLabel(data.review_wait.oldest_hours), 'Longest elapsed wait among current pending entries'],
    ['Skills', 'Active verifications', data.skills.verifications, 'Active supervisor-confirmed skills by verification date'],
    ...(data.skills.categories.length ? data.skills.categories.map(c => ['Skill category', c.category, c.verifications, `At least five distinct seekers; ${c.seekers} seekers in this category`] as (string | number | null)[]) : [['Skill category', 'Category breakdown', data.skills.verifications ? null : 'No verified skills', data.skills.verifications ? 'Hidden until a category represents at least five distinct seekers' : 'No active supervisor-verified skills in this selection']]),
    [],
    ['Privacy', 'Contents', 'Aggregates only', 'No seeker names, user IDs, contact details, statements, individual dates or row-level records'],
    ['Privacy', 'Small samples', 'Rates hidden below five', 'Skill categories require at least five distinct seekers'],
  ];
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
}
