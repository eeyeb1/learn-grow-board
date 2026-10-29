export type OpportunityCategory = 'shadowing' | 'learning_project' | 'paid_task' | 'paid_job';

export const CATEGORIES: { value: OpportunityCategory; label: string; paid: boolean; help: string }[] = [
  { value: 'shadowing', label: 'Shadowing / learning experience', paid: false, help: 'Observing and learning. Participants do not produce work the company relies on.' },
  { value: 'learning_project', label: 'Supervised learning project', paid: false, help: 'An educational exercise set for the participant’s learning, not a business deliverable.' },
  { value: 'paid_task', label: 'Paid task', paid: true, help: 'Genuine work the company would use or benefit from, paid at a stated rate.' },
  { value: 'paid_job', label: 'Paid job', paid: true, help: 'An ongoing paid role with real responsibilities.' },
];

export interface OpportunityForm {
  title: string; category: OpportunityCategory | ''; department: string;
  location_type: 'remote' | 'onsite' | 'hybrid'; location: string; remote_preference: string;
  schedule: string; hours_per_week: string; start_date: string; end_date: string;
  estimated_hours: string; openings: string; audience: string; eligibility: string;
  objectives: string; activities: string; supervision: string;
  payment_details: string; expense_details: string; closing_date: string; accessibility_notes: string;
  no_productive_work_confirmed: boolean;
}

export const emptyForm: OpportunityForm = {
  title: '', category: '', department: '', location_type: 'onsite', location: '', remote_preference: '',
  schedule: '', hours_per_week: '', start_date: '', end_date: '', estimated_hours: '', openings: '1',
  audience: '', eligibility: '', objectives: '', activities: '', supervision: '',
  payment_details: '', expense_details: '', closing_date: '', accessibility_notes: '', no_productive_work_confirmed: false,
};

const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === '' ? null : Number(s));
export const isPaid = (c: OpportunityForm['category']) => c === 'paid_task' || c === 'paid_job';

export type Errors = Partial<Record<keyof OpportunityForm, string>>;

/** Mirrors the server's submission checks (check_opportunity strict). */
export function validate(f: OpportunityForm, today = new Date().toISOString().slice(0, 10)): Errors {
  const e: Errors = {};
  if (f.title.trim().length < 5) e.title = 'Enter a title of at least 5 characters.';
  if (!f.category) e.category = 'Choose a category.';
  if (f.location_type !== 'remote' && f.location.trim().length < 2) e.location = 'Enter a location for on-site or hybrid work.';
  if (f.schedule.trim().length < 3) e.schedule = 'Describe the estimated schedule.';
  if (!f.start_date) e.start_date = 'Choose a start date.';
  if (!f.end_date) e.end_date = 'Choose an end date.';
  else if (f.start_date && f.end_date < f.start_date) e.end_date = 'End date must be on or after the start date.';
  if (!f.closing_date) e.closing_date = 'Choose an application closing date.';
  else if (f.closing_date < today) e.closing_date = 'The closing date has passed.';
  else if (f.start_date && f.closing_date > f.start_date) e.closing_date = 'Applications must close on or before the start date.';
  const h = num(f.estimated_hours);
  if (h === null || !Number.isFinite(h) || h <= 0 || h > 2000) e.estimated_hours = 'Enter estimated hours between 1 and 2000.';
  const o = num(f.openings);
  if (o === null || !Number.isInteger(o) || o < 1 || o > 100) e.openings = 'Enter a whole number of openings from 1 to 100.';
  if (f.audience.trim().length < 3) e.audience = 'Describe the intended audience.';
  if (f.eligibility.trim().length < 3) e.eligibility = 'Describe eligibility.';
  if (!lines(f.objectives).length) e.objectives = 'Add at least one learning objective.';
  if (f.activities.trim().length < 30) e.activities = 'Describe expected activities in at least 30 characters.';
  if (f.supervision.trim().length < 30) e.supervision = 'Describe who supervises and how, in at least 30 characters.';
  if (isPaid(f.category) && f.payment_details.trim().length < 10) e.payment_details = 'State the pay rate and how payment is made.';
  if ((f.category === 'shadowing' || f.category === 'learning_project') && !f.no_productive_work_confirmed) e.no_productive_work_confirmed = 'Confirm participants will not do work the company would otherwise pay for, or choose a paid category.';
  return e;
}

const PRODUCTIVE = /\b(customers?|clients?|sales?|sell|serv(e|ing)|deliver(ables?|y)?|production|shifts?|cover(ing)?|stock|cleaning|admin(istration)? tasks?|data entry|social media management|answer(ing)? phones|billable|revenue|campaign)\b/i;

export function warnings(f: OpportunityForm): string[] {
  const w: string[] = [];
  const unpaid = f.category === 'shadowing' || f.category === 'learning_project';
  if (unpaid && PRODUCTIVE.test(`${f.activities} ${f.title}`)) w.push('The activities describe work that may benefit the business (for example serving customers, sales, deliverables or covering shifts). Unpaid participants should only observe or do educational exercises; if this is genuine work, choose a paid category.');
  const h = num(f.estimated_hours);
  if (unpaid && h !== null && h > 80) w.push('Long unpaid placements carry a higher risk of being treated as work that should be paid. Check this is genuinely educational.');
  if (unpaid && f.payment_details.trim() === '' && f.expense_details.trim() === '') w.push('No expense reimbursement is described. Consider covering legitimate travel or lunch costs.');
  const s = f.supervision.trim();
  if (s && (s.length < 60 || !/\b(supervis|mentor|manager|lead|named|check[- ]?in|daily|weekly)\w*/i.test(s))) w.push('Supervision is unclear. Say who supervises, their role, how often they check in and who to contact if there is a problem.');
  return w;
}

export function toRow(f: OpportunityForm) {
  const details: Record<string, string | number | boolean | null> = {
    department: f.department, remote_preference: f.remote_preference, schedule: f.schedule,
    start_date: f.start_date, end_date: f.end_date, estimated_hours: num(f.estimated_hours), openings: num(f.openings),
    audience: f.audience, eligibility: f.eligibility, payment_details: f.payment_details, expense_details: f.expense_details,
    accessibility_notes: f.accessibility_notes, no_productive_work_confirmed: f.no_productive_work_confirmed,
  };
  for (const k of ['estimated_hours', 'openings']) if (details[k] !== null && !Number.isFinite(details[k] as number)) details[k] = null;
  return {
    title: f.title.trim() || 'Untitled draft', category: f.category || null, description: f.activities,
    location_type: f.location_type, location: f.location.trim() || null, duration: f.schedule || null,
    hours_per_week: f.hours_per_week || null, what_you_will_learn: lines(f.objectives), responsibilities: lines(f.activities),
    mentorship_details: f.supervision || null, expires_at: f.closing_date ? `${f.closing_date}T23:59:59Z` : null,
    skill_level: 'beginner', opportunity_details: details,
  };
}

type Row = { title: string; category: string | null; description: string; location_type: string; location: string | null; duration: string | null; hours_per_week: string | null; what_you_will_learn: string[] | null; mentorship_details: string | null; expires_at: string | null; opportunity_details: unknown };

export function fromRow(r: Row): OpportunityForm {
  const d = (r.opportunity_details ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
  const n = (k: string) => (typeof d[k] === 'number' ? String(d[k]) : '');
  return {
    title: r.title === 'Untitled draft' ? '' : r.title, category: (r.category ?? '') as OpportunityForm['category'], department: s('department'),
    location_type: (['remote', 'onsite', 'hybrid'].includes(r.location_type) ? r.location_type : 'onsite') as OpportunityForm['location_type'],
    location: r.location ?? '', remote_preference: s('remote_preference'), schedule: r.duration ?? '', hours_per_week: r.hours_per_week ?? '',
    start_date: s('start_date'), end_date: s('end_date'), estimated_hours: n('estimated_hours'), openings: n('openings'),
    audience: s('audience'), eligibility: s('eligibility'), objectives: (r.what_you_will_learn ?? []).join('\n'), activities: r.description,
    supervision: r.mentorship_details ?? '', payment_details: s('payment_details'), expense_details: s('expense_details'),
    closing_date: r.expires_at ? r.expires_at.slice(0, 10) : '', accessibility_notes: s('accessibility_notes'),
    no_productive_work_confirmed: d.no_productive_work_confirmed === true,
  };
}
