import { describe, expect, test } from 'bun:test';
import { messageProblem, containsContactDetails } from './messaging';

describe('message checks', () => {
  test('under-18 conversations block email addresses', () => {
    expect(messageProblem('email me at sam@example.com', true)).toContain('cannot be shared');
  });
  test('under-18 conversations block phone numbers', () => {
    expect(containsContactDetails('call 07700 900123')).toBe(true);
    expect(messageProblem('call 07700 900123', true)).not.toBeNull();
  });
  test('adult conversations allow contact details', () => {
    expect(messageProblem('email me at sam@example.com', false)).toBeNull();
  });
  test('more than three links is rejected', () => {
    expect(messageProblem('http://a http://b http://c http://d', false)).toContain('3 links');
    expect(messageProblem('http://a http://b http://c', false)).toBeNull();
  });
  test('length limit is 4000 characters', () => {
    expect(messageProblem('a'.repeat(4001), false)).not.toBeNull();
    expect(messageProblem('a'.repeat(4000), false)).toBeNull();
  });
  test('dates and times are not mistaken for phone numbers', () => {
    expect(containsContactDetails('Start Monday 9:30, 12/05/2026')).toBe(false);
  });
});
