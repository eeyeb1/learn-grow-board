// @ts-nocheck -- bun tests are outside the app's type environment
import { test, expect } from 'bun:test';
import { employeeSchema, employeeEmail } from './employeeIdentity';
test('Employee requires name, job title, company and work email', () => {
  const valid = { full_name: 'Sam Employee', job_title: 'Analyst', claimed_company: 'Example Company', work_email: 'sam@example.org' };
  expect(employeeSchema.safeParse(valid).success).toBe(true);
  for (const key of Object.keys(valid)) expect(employeeSchema.safeParse({ ...valid, [key]: '' }).success).toBe(false);
});
test('Plus aliases cannot be used as another employee identity', () => {
  expect(employeeEmail.safeParse('sam+admin@example.org').success).toBe(false);
});
test('Display names, extra at signs and spoofed unicode addresses are rejected', () => {
  for (const email of ['Sam <sam@example.org>', 'sam@example.org@evil.org', 'sam@exаmple.org', 'sam@example.org.', 'sam@a..org']) expect(employeeEmail.safeParse(email).success).toBe(false);
});
test('Email case is normalized without stripping dots or rewriting domains', () => {
  expect(employeeEmail.parse(' Sam.Employee@Sub.Example.org ')).toBe('sam.employee@sub.example.org');
});