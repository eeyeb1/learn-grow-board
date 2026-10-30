import { describe, expect, test } from 'bun:test';
import { employerTransitions, reasonRequired, seekerCanWithdraw, applicationLabel } from './applicationStatus';

describe('application workflow', () => {
  test('withdrawn, declined and completed applications are closed to employers', () => {
    expect(employerTransitions('withdrawn')).toEqual([]);
    expect(employerTransitions('rejected')).toEqual([]);
    expect(employerTransitions('completed')).toEqual([]);
  });
  test('accepted applications cannot be accepted twice, only rescinded', () => {
    expect(employerTransitions('accepted')).toEqual(['rejected']);
  });
  test('declining needs a reason', () => {
    expect(reasonRequired('rejected')).toBe(true);
    expect(reasonRequired('reviewed')).toBe(false);
  });
  test('seekers cannot withdraw closed applications', () => {
    expect(seekerCanWithdraw('rejected')).toBe(false);
    expect(seekerCanWithdraw('submitted')).toBe(true);
  });
  test('stored values map to shared labels', () => {
    expect(applicationLabel('reviewed')).toBe('Under Review');
    expect(applicationLabel('rejected')).toBe('Declined');
  });
});
