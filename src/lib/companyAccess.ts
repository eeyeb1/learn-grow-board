import type { EmployeeIdentity } from './employeeIdentity';
export type CompanyState = 'company_admin' | 'employee' | 'draft_only' | 'email_pending' | 'company_pending' | 'membership_pending' | 'access_denied';
export type StaffScope = 'company_admin' | 'opportunity_manager' | 'supervisor' | 'approved_employee' | 'draft_contributor';
export interface CompanyContext { company_id: string; company_name: string; state: CompanyState; scope?: StaffScope; can_draft?: boolean; manage_placements: boolean; membership_approved?: boolean; authorised_to_publish?: boolean }
export interface CompanyAccess { email_verified: boolean; employee?: EmployeeIdentity | null; contexts: CompanyContext[]; requests: { id: string; status: string; pathway: string; company_id: string | null }[] }
export function companyDestination(context: CompanyContext): string {
  const section = context.state === 'company_admin' ? 'dashboard' : context.state === 'employee' ? 'employee' : context.state === 'draft_only' ? 'drafts' : 'status';
  return `/employer/${section}?company=${encodeURIComponent(context.company_id)}`;
}
export function workspacePermitted(state: CompanyState, section: string): boolean {
  if (section === 'status') return true;
  if (section === 'dashboard') return state === 'company_admin';
  if (section === 'profile') return state === 'company_admin';
  if (section === 'employee') return state === 'employee';
  return section === 'drafts' && ['company_admin', 'employee', 'draft_only'].includes(state);
}