// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, expect, test } from 'bun:test';
import { approvalFilter, diffSnapshots } from './approvalCentre';

describe('approval centre', () => {
  test('approved but not yet live is Approved, live is Published', () => {
    expect(approvalFilter({ status: 'approved', job_status: 'pending_platform' })).toBe('approved');
    expect(approvalFilter({ status: 'approved', job_status: 'active' })).toBe('published');
  });
  test('withdrawn pending request is hidden', () => {
    expect(approvalFilter({ status: 'pending', job_status: 'draft' })).toBeNull();
  });
  test('diff reports only changed fields', () => {
    const d = diffSnapshots({ title: 'A', opportunity_details: { supervision: 'x' } }, { title: 'A', opportunity_details: { supervision: 'y' } });
    expect(d).toEqual([{ key: 'supervision', before: 'x', after: 'y' }]);
  });
});
