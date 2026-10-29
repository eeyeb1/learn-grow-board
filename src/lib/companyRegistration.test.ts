// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { test, expect } from 'bun:test';
import { registrationSchema, reviewSchema } from './companyRegistration';
const details = { legal_name: 'Example business', trading_name: '', website: 'https://example.org', industry: 'Technology', business_location: 'London, United Kingdom', registration_identifier: '', work_email: 'owner@gmail.com', relationship: 'Company director', submitted_evidence: 'Independent written authorisation reference for review.' };
test('Manual registration accepts consumer email without requiring registration identifier', () => expect(registrationSchema.safeParse(details).success).toBe(true));
test('Registration requires claimed relationship and private supporting evidence', () => {
  expect(registrationSchema.safeParse({ ...details, relationship: '' }).success).toBe(false);
  expect(registrationSchema.safeParse({ ...details, submitted_evidence: '' }).success).toBe(false);
});
test('Non-https and script websites are rejected', () => {
  expect(registrationSchema.safeParse({ ...details, website: 'http://example.org' }).success).toBe(false);
  expect(registrationSchema.safeParse({ ...details, website: 'javascript:alert(1)' }).success).toBe(false);
});
const review = { decision: 'verified', legitimacy: 'Independently checked trading business evidence.', authority: 'Independent signed director authorisation checked.', notes: 'Documented independent checks.', message: 'Your company registration is approved.', domains: [] };
test('Approval requires independent authority evidence as well as legitimacy', () => {
  expect(reviewSchema.safeParse(review).success).toBe(true);
  expect(reviewSchema.safeParse({ ...review, authority: '' }).success).toBe(false);
  expect(reviewSchema.safeParse({ ...review, legitimacy: '' }).success).toBe(false);
});
test('Reviews require private notes and applicant-safe decision messages', () => {
  expect(reviewSchema.safeParse({ ...review, notes: '' }).success).toBe(false);
  expect(reviewSchema.safeParse({ ...review, message: '' }).success).toBe(false);
});