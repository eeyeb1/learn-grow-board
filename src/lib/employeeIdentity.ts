import { z } from 'zod';

export const employeeEmail = z.string().trim().toLowerCase().max(254).refine(email => {
  const [local, domain, extra] = email.split('@');
  return !extra && !!local && local.length <= 64 && !!domain &&
    /^[a-z0-9][a-z0-9._-]*$/.test(local) && !local.endsWith('.') &&
    !email.includes('..') && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain);
}, 'Use a full work email without plus aliases, display names or international characters.');
export const employeeSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  job_title: z.string().trim().min(2).max(100),
  claimed_company: z.string().trim().min(2).max(160),
  work_email: employeeEmail,
});
export interface EmployeeIdentity {
  full_name: string; job_title: string; claimed_company: string; work_email: string;
  work_email_verified_at: string | null; matched_company_id: string | null;
}