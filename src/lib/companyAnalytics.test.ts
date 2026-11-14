// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, expect, test } from 'bun:test';
import { companyAnalyticsCsv, sampleRatio, type CompanyAnalytics } from './companyAnalytics';

const data: CompanyAnalytics = {
  company_id: 'company-1', generated_at: '2026-11-14T14:00:00Z', scope: 'assigned', privacy_threshold: 5,
  filters: { job_id: null, department: 'Engineering', from: '2026-01-01', to: '2026-11-14' }, listings: [],
  views: { available: false, total: null },
  applications: { total: 4, accepted: 4, current_submitted: 0, current_under_review: 0, current_accepted: 4, current_completed: 0, current_declined: 0, current_withdrawn: 0 },
  placements: { total: 5, upcoming: 0, active: 1, completed: 4, cancelled: 0, disputed: 0 },
  hours: { entries: 5, submitted_minutes: 600, verified_minutes: 300, pending_minutes: 300, correction_minutes: 0, rejected_minutes: 0 },
  review_wait: { pending_entries: 1, average_hours: 2.5, median_hours: 2.5, oldest_hours: 2.5 },
  skills: { verifications: 2, seekers: 2, categories: [], suppressed: true },
};

describe('company analytics safeguards', () => {
  test('acceptance and completion rates are unavailable below five records', () => {
    expect(sampleRatio(4, 4, 4)).toBeNull();
    expect(sampleRatio(4, 5, 5)).toBe(80);
  });

  test('a zero denominator never produces a misleading rate', () => {
    expect(sampleRatio(0, 0, 10)).toBeNull();
  });

  test('CSV hides a four-application acceptance rate and unavailable views', () => {
    const csv = companyAnalyticsCsv(data, 'Example Company');
    expect(csv).toContain('"Applications","Acceptance rate","Not available"');
    expect(csv).toContain('"Opportunities","Views","Not available"');
    expect(csv).toContain('"Placements","Completion rate","80%"');
    expect(csv).toContain('"Skill category","Category breakdown","Not available","Hidden until a category represents at least five distinct seekers"');
  });

  test('CSV is aggregate-only and cannot contain seeker identifiers from the analytics result', () => {
    const csv = companyAnalyticsCsv(data, 'Example Company');
    expect(csv).not.toContain('company-1');
    expect(csv).toContain('"No seeker names, user IDs, contact details, statements, individual dates or row-level records"');
    expect(csv).not.toContain('applicant_name');
    expect(csv).not.toContain('user_id');
  });

  test('CSV escapes company-provided text without breaking rows', () => {
    const csv = companyAnalyticsCsv(data, 'Example, "Quoted" Company');
    expect(csv).toContain('"Example, ""Quoted"" Company"');
  });
});
