import { describe, expect, test } from 'bun:test';
import { isAuthorEditable, isPubliclyVisible, isUnderReview, STATUS_LABELS } from '../opportunityStatus';

describe('opportunity approval states', () => {
  test('only Published (active) listings are publicly visible', () => {
    const visible = Object.keys(STATUS_LABELS).filter(isPubliclyVisible);
    expect(visible).toEqual(['active']);
  });
  test('authors can edit only Draft and Changes Requested', () => {
    expect(Object.keys(STATUS_LABELS).filter(isAuthorEditable)).toEqual(['draft', 'changes_requested']);
  });
  test('pending company and platform reviews are read-only', () => {
    expect(isUnderReview('pending_company')).toBe(true);
    expect(isUnderReview('pending_platform')).toBe(true);
    expect(isUnderReview('company_approved')).toBe(false);
  });
});
