# Company registration and verification

## Integration
- Reuse company profiles, access requests, verifications, approved domains, memberships and the existing platform `admin` role.
- Keep seeker sign-in, profiles, applications, placements and notifications intact.

## Build
1. Expand company registration with the requested business details, verified account email and private supporting evidence descriptions/links. Consumer or disposable email users can request manual review without domain-based privileges.
2. Add an administrator-only company review queue with separate legitimacy and authority evidence, private notes, timestamped immutable review history, and Pending Review, Verified, Rejected and Suspended states.
3. Approve atomically: reuse or explicitly link an existing company, approve only independently verified business domains, and appoint the confirmed applicant without replacing an existing administrator. Reject conflicting claims; suspension immediately removes company access.
4. Show applicants their own status and safe decision message; send an in-app approval notification linking to their permitted dashboard.

## Technical safeguards
- Private submission/review records use owner/admin-only reads and protected server functions for writes. No evidence enters public company profiles.
- Approval requires documented legitimacy and authority checks, confirmed applicant email, conflict checks and an explicit canonical company selection when records overlap.
- Domain eligibility remains separate from membership; consumer/disposable domains are blocked from automatic matching using a maintained denylist.
- Validate inputs in the form and on the server. Serialize reviews and enforce record uniqueness to prevent duplicate claims and concurrent takeovers.

## Verification and dependencies
- Run existing tests plus focused validation, domain, permission and workflow checks; exercise signed-in registration/status and direct unauthorised review attempts.
- Real approval requires a platform-administrator account and genuine evidence. No role will be self-assigned and no company will be falsely verified for testing.
- Notifications are in-app; email delivery remains unavailable until an email provider is configured.