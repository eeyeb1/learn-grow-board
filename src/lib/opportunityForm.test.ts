// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, expect, test } from 'bun:test';
import { emptyForm, validate, warnings, toRow, fromRow, type OpportunityForm } from './opportunityForm';

const good: OpportunityForm = { ...emptyForm, title: 'Office shadowing week', category: 'shadowing', location: 'Leeds', schedule: 'Mon–Fri 10–3',
  start_date: '2030-06-01', end_date: '2030-06-05', closing_date: '2030-05-20', estimated_hours: '25', openings: '2', audience: 'Students 16+',
  eligibility: 'Living near Leeds', objectives: 'Understand how a design studio runs', activities: 'Observe team meetings and complete a practice brief set for learning.',
  supervision: 'Named mentor (senior designer) supervises daily with a check-in each morning.', no_productive_work_confirmed: true };
const today = '2030-01-01';

describe('opportunity validation', () => {
  test('complete learning opportunity passes', () => expect(validate(good, today)).toEqual({}));
  test('paid categories require payment details', () => expect(validate({ ...good, category: 'paid_task' }, today).payment_details).toBeDefined());
  test('unpaid learning requires no-productive-work confirmation', () => expect(validate({ ...good, no_productive_work_confirmed: false }, today).no_productive_work_confirmed).toBeDefined());
  test('applications must close on or before start', () => expect(validate({ ...good, closing_date: '2030-06-02' }, today).closing_date).toBeDefined());
  test('end date cannot precede start', () => expect(validate({ ...good, end_date: '2030-05-30' }, today).end_date).toBeDefined());
  test('openings must be whole 1–100', () => expect(validate({ ...good, openings: '1.5' }, today).openings).toBeDefined());
  test('warns on unpaid productive work', () => expect(warnings({ ...good, activities: 'Serve customers at the till and cover shifts' }).length).toBeGreaterThan(0));
  test('warns on unclear supervision', () => expect(warnings({ ...good, supervision: 'Someone will be around' }).some(w => w.startsWith('Supervision'))).toBe(true));
  test('round trips through stored row', () => {
    const row = toRow(good);
    expect(fromRow({ ...row, opportunity_details: row.opportunity_details } as never)).toEqual(good);
  });
});
