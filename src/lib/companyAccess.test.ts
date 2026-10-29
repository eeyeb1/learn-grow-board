// @ts-nocheck -- run with `bun test`; bun types are not part of the app build
import { describe, test, expect } from 'bun:test';
import { companyDestination, workspacePermitted } from './companyAccess';
const context = state => ({ company_id: 'company-a', company_name: 'Test company', state, manage_placements: false });
describe('Company authentication destinations', () => {
  test('Only company administrators can open the profile editor', () => {
    expect(workspacePermitted('company_admin', 'profile')).toBe(true);
    for (const state of ['employee', 'draft_only', 'email_pending', 'company_pending', 'membership_pending', 'access_denied']) expect(workspacePermitted(state, 'profile')).toBe(false);
  });
  test('Company administrators route to their company dashboard', () => expect(companyDestination(context('company_admin'))).toBe('/employer/dashboard?company=company-a'));
  test('Approved employees route to employee workspace, not administrator dashboard', () => {
    expect(companyDestination(context('employee'))).toBe('/employer/employee?company=company-a');
    expect(workspacePermitted('employee', 'dashboard')).toBe(false);
  });
  test('Verified domain alone permits restricted drafts only', () => {
    expect(companyDestination(context('draft_only'))).toBe('/employer/drafts?company=company-a');
    expect(workspacePermitted('draft_only', 'employee')).toBe(false);
    expect(workspacePermitted('draft_only', 'dashboard')).toBe(false);
  });
  for (const state of ['email_pending', 'company_pending', 'membership_pending', 'access_denied']) {
    test(`${state} cannot enter any unrestricted workspace`, () => {
      expect(companyDestination(context(state))).toBe('/employer/status?company=company-a');
      for (const section of ['dashboard', 'employee', 'drafts']) expect(workspacePermitted(state, section)).toBe(false);
    });
  }
});