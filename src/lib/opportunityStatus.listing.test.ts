// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, expect, test } from 'bun:test';
import { acceptsApplications, listingGroup } from './opportunityStatus';

describe('My Opportunities rules', () => {
  test('closed and suspended listings cannot accept applications', () => {
    expect(acceptsApplications('closed', null)).toBe(false);
    expect(acceptsApplications('suspended', null)).toBe(false);
    expect(acceptsApplications('paused', null)).toBe(false);
    expect(acceptsApplications('archived', null)).toBe(false);
  });
  test('published listing past its closing date cannot accept applications', () => {
    expect(acceptsApplications('active', '2026-01-01T00:00:00Z', new Date('2026-02-01'))).toBe(false);
    expect(acceptsApplications('active', null)).toBe(true);
  });
  test('statuses group into Draft, In Review, Live, Closed, Archived', () => {
    expect(listingGroup('changes_requested')).toBe('draft');
    expect(listingGroup('pending_platform')).toBe('review');
    expect(listingGroup('paused')).toBe('live');
    expect(listingGroup('suspended')).toBe('closed');
    expect(listingGroup('archived')).toBe('archived');
  });
});
