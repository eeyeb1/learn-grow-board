# Roadmap

## Employer integration
- [x] Add private employee details and service-issued, hashed, account-bound single-use work-email confirmation; email changes pause employee access.
- [x] Match exact verified company domains for restricted personal drafts; provide unmatched manual requests and platform-admin referral without automatic company identity.
- [x] Add company-admin employee approval/rejection, private audit notes and existing company status notifications, without publication or operational-record authority.
- [x] Verify signed-in employee save, pending manual request read-back, delivered in-app request notification, fabricated-link denial, mobile layout and seeker dashboard; 20 unit tests passed. Direct checks deny self-approval, company/manual queue access, challenge issuance, token disclosure and verification writes. Temporary records removed.
- [ ] Enable and verify actual work-email delivery, expiry/replay/re-verification round-trip (blocker: sender domain must be configured; then scaffold shared app emails and employee-work-email template, configure trusted app origin, and enable delivery. No work address was falsely verified).
- [ ] Verify genuine matched-company drafting and company-admin approval/rejection end-to-end (blocker: no verified company or trusted company administrator exists).
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
