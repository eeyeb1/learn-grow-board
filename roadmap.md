# Roadmap

## Employer integration
- [ ] Add separate employee details and secure work-email verification/re-verification.
- [ ] Match exact verified company domains for restricted personal drafts; provide unmatched manual requests.
- [ ] Add company-admin membership decisions, status notices and server isolation tests.
- [ ] Verify employee request/status and security rules end-to-end; email delivery requires a configured sender domain.
- [x] Add private company registration details, evidence and applicant status tracking.
- [x] Add platform-administrator review, authority checks, audit history and safe approval/suspension.
- [x] Verify signed-in registration submission and pending read-back without authority, consumer/disposable domain denial, unauthorised review/candidate denial, private history isolation and seeker access; 16 unit tests passed; temporary submission removed.
- [ ] Verify genuine administrator approval/rejection/suspension, takeover conflicts and approval notification/dashboard end-to-end (blocker: no platform administrator is assigned and genuine company authority evidence is required; no company was falsely verified).
- [x] Inspect existing features and prepare the short integration plan without changing application functionality.
- [x] Add separate employer/employee sign-in, registration and password recovery using existing identities.
- [x] Add verified-company membership, draft eligibility and server-enforced access routing without changing seeker data.
- [x] Check sign-in errors, mobile presentation, signed-in seeker switching, unknown-company rejection, legacy posting rejection and direct publication/self-appointment denial; 11 unit tests passed.
- [ ] Verify approved administrator/employee/domain-only workspaces end-to-end (blocker: genuine company verification and trusted administrator appointment are still needed).
- [ ] Verify email confirmation, social-provider consent and completed password recovery end-to-end (blocker: these require the real email/identity-provider round-trip; invalid recovery links were checked).

## Before publishing
- [ ] Assign a moderator account so reference reports can be reviewed (blocker: Emmanuel must name which account gets the moderator role). Until then, /moderation/references shows "Only moderators can view this page" to everyone.
