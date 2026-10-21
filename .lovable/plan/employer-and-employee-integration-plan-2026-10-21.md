# Employer and Employee Integration Plan

## Scope
Extend the existing website incrementally, preserving the seeker experience and existing sign-in. This is an integration review only: no application code, permissions, live records, or database structure have been changed. Approval of this plan does not start the whole feature set; implementation waits for your next specific feature request.

## What already exists
- **Accounts and company profiles:** existing sign-in, applicant/company account selection, and one owner per company profile.
- **Opportunities and applications:** company owners can post roles and review applications. Listings already have creation and expiry dates.
- **Placements and evidence:** accepting an application creates its placement; employer actions manage activation/completion and record history. Hours, skills, references, certificates, diary entries, and portfolio items connect to those real records.
- **Seeker profiles:** editable private profiles and opt-in public profiles, with section visibility and stronger privacy settings for minors.
- **Notifications:** seeker notification history, unread counts, preferences, event notifications, and duplicate prevention already exist.
- **Reusable interface:** existing navigation, sign-in popup, role-posting form, application review dialogs, placement tabs, hour review page, profile controls, and shared buttons/forms. Keep the current colours, typography, and layouts.

## Main gap
Today, creating a company account establishes a single company owner who can publish directly. There is no verified-company/domain process, separate employee drafting eligibility, protected company-team membership, or company-administrator publication approval. Existing global administrator roles are not company administrator roles.

## Required authority rule
1. A company must be properly verified and have an approved email domain.
2. An employee must verify control of an address on that approved domain before drafting for that company or requesting approval.
3. Drafting eligibility grants **no active membership, applicant access, placement access, company representation, or publication rights**.
4. Only an explicitly authorised company administrator may approve public publication. Domain matching or mailbox verification never creates that authority.
5. Enforce these rules in the database as well as the interface, including direct requests that bypass buttons.

## Missing dependencies
- **Company verification:** a trustworthy review process, approved domains, verification status/history, and a controlled way to appoint the first company administrator. Existing owners must not automatically be treated as verified administrators.
- **Separate drafting eligibility and membership:** confirmed mailbox checks tied to a verified company domain; independently approved company memberships with explicit permissions and revocation. Neither may come from user-editable account choices.
- **Draft approval lifecycle:** private drafts, submission, review, changes requested/rejection, approval, and publication history. Specify treatment of edits to an already published opportunity when that feature is requested.
- **Company context and isolation:** select the relevant company where needed; restrict drafts, team information, applicants, and placement evidence to the appropriate company and permission. A domain-eligible drafter must not gain access to those private records.
- **Safe transition for existing owners/listings:** preserve existing published records and seeker links, while replacing unrestricted future publication with administrator approval. The verification process and transition must be defined before changing live publishing behaviour.
- **Testing:** verified/unverified mailbox cases, unverified companies, employee publication denial, authorised approval, cross-company access denial, removed membership/domain access, and seeker regression checks.

## Incremental approach
When you name the next feature, implement only that feature and its minimum prerequisites:
1. Reuse the existing accounts, company records, opportunities, and seeker relationships; add only missing verified-company or authority records needed by that request.
2. Add safe, additive changes with explicit access grants, company-scoped permissions, and audit records. Keep drafting eligibility distinct from company membership.
3. Connect the requested interface to real records using existing forms and navigation; no invented live data or non-working controls.
4. Run targeted permission tests and the relevant signed-in flow, then report exactly what was tested and any remaining blockers.

## Technical integration map
| Existing models | Relationship / extension point |
| --- | --- |
| `profiles`, `company_profiles`, `user_roles` | Private account details, single company owner, and global roles. Retain them; company-scoped authority requires separate protected records. |
| `jobs`, `applications` | `jobs.company_id` links to the company; `applications.job_id` is currently text. Existing owner-based posting/review permissions need permission-specific integration. |
| `placements`, `placement_events` | One placement per accepted application, linked to the seeker, job, and company; keep trigger creation and audited action functions. |
| `hour_entries` | Links to the application; employer review records reviewer identity. Approved totals remain server-derived. |
| `skill_verifications`, `placement_references`, `certificates` | Linked to real placements and companies; preserve trusted verification and seeker visibility controls. |
| `public_profiles`, `portfolio_items` | Preserve opt-in public projections and private file delivery. Drafting rights must not broaden access. |
| `notifications`, `notification_preferences` | Reuse the server-created, user-owned notification system; company approval recipients/events are not implemented yet. |

Reuse `AuthContext`, `AuthModal`, `useCompanyProfile`, `useJobs`, `PostRole`, `Archive`, and shared design components. Audit all owner checks together before introducing team access: application policies, `can_manage_placement`, `is_placement_employer`, reference author rights, certificate actions, and portfolio-file access do not share one complete permission model today. Do not simply broaden the placement-manager helper to every employee.

## What was actually checked
- Inspected authentication, employer posting/review, seeker features, shared styling/components, routes, and both migration folders.
- Read the current database columns, relationship constraints, selected access policies/grants, and key ownership/placement/notification functions. Confirmed the single-owner and direct-publication gaps against the current database.
- Ran all four existing recommendation tests: **4 passed**. They cover recommendation rules, not employer authorisation.
- No signed-in employer workflow, cross-company access attempt, email-provider configuration, or new permission tests were exercised in this review. Full employer-to-certificate behaviour remains unverified.
- Moderator assignment remains outstanding before publishing; it is separate from company-administrator authority.

## Next step
Choose the first employer/employee feature to implement. A safe starting point is company verification and company-administrator authority, but nothing will be implemented until you specifically request it.