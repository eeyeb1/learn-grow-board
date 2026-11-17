// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, expect, test } from 'bun:test';
import { latestAssessmentClears, safetyAssessmentProblem, safetyReportProblem } from './safety';

const checks = { tasks_reviewed: true, employment_law_reviewed: true, safeguarding_reviewed: true };

describe('safety report validation', () => {
  test('requires a recognised reason and 20 characters of factual detail', () => {
    expect(safetyReportProblem('', 'A sufficiently detailed account')).toBeDefined();
    expect(safetyReportProblem('safeguarding', 'too short')).toBeDefined();
    expect(safetyReportProblem('safeguarding', 'A sufficiently detailed account')).toBeNull();
  });
});

describe('manual listing safety assessment', () => {
  test('a flagged listing cannot publish without a cleared human assessment', () => {
    expect(latestAssessmentClears(['unpaid_productive_work'], [])).toBe(false);
    expect(latestAssessmentClears(['unpaid_productive_work'], [{ decision: 'changes_required' }, { decision: 'cleared' }])).toBe(false);
    expect(latestAssessmentClears(['unpaid_productive_work'], [{ decision: 'cleared' }])).toBe(true);
    expect(latestAssessmentClears([], [])).toBe(true);
  });
  test('clearing requires all three human checks and documented reasoning', () => {
    expect(safetyAssessmentProblem('cleared', 'Reviewed the tasks, pay and safeguarding arrangements.', { ...checks, employment_law_reviewed: false })).toBeDefined();
    expect(safetyAssessmentProblem('cleared', 'short', checks)).toBeDefined();
    expect(safetyAssessmentProblem('cleared', 'Reviewed the tasks, pay and safeguarding arrangements.', checks)).toBeNull();
    expect(safetyAssessmentProblem('changes_required', 'Unpaid customer service appears productive and needs legal assessment.', { ...checks, employment_law_reviewed: false })).toBeNull();
  });
});
