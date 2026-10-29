import { z } from 'zod';

export const registrationSchema = z.object({
  legal_name: z.string().trim().min(2).max(160),
  trading_name: z.string().trim().max(160),
  website: z.string().trim().max(300).regex(/^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}([/?#][^\s]*)?$/, 'Use a valid https business website'),
  industry: z.string().trim().min(2).max(100),
  business_location: z.string().trim().min(2).max(300),
  registration_identifier: z.string().trim().max(100),
  work_email: z.string().trim().email().max(255),
  relationship: z.string().trim().min(5).max(1000),
  submitted_evidence: z.string().trim().min(20, 'Describe supporting evidence in at least 20 characters').max(5000),
});
export type RegistrationDetails = z.infer<typeof registrationSchema>;
export const reviewSchema = z.object({
  decision: z.enum(['note', 'verified', 'rejected', 'suspended']),
  legitimacy: z.string().trim().max(5000), authority: z.string().trim().max(5000),
  notes: z.string().trim().min(5).max(5000), message: z.string().trim().max(1000),
  domains: z.array(z.string().regex(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/, 'Enter domains without https or paths')).max(10),
}).superRefine((v, ctx) => {
  if (v.decision === 'verified') {
    for (const key of ['legitimacy', 'authority'] as const) if (v[key].length < 20) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Document independent evidence in at least 20 characters' });
  }
  if (v.decision !== 'note' && v.message.length < 5) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['message'], message: 'Enter a safe message for the applicant' });
});
export const registrationStatus = { pending: 'Pending Review', verified: 'Verified', rejected: 'Rejected', suspended: 'Suspended' } as const;