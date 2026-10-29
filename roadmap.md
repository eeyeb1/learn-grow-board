# Roadmap

## Employer integration
- [x] Add guided Create Opportunity form (categories, all requested fields, autosave, preview, duplicate, delete, version history, unpaid-work/supervision warnings) with server-side validation; 9 unit tests and 6 server rule checks passed.
- [ ] Try the form with a genuine draft contributor or company admin (blocker: no verified company exists).
- [x] Add admin Employee Management page (members, requests, invitations, roles, assignments, revocation, history), exact-domain single-use 7-day invitations bound to the verified work email, checked admin promotion and platform-admin zero-admin recovery; direct calls by a non-admin account were refused.
- [ ] Try invitations, promotion and recovery with a genuine company admin (blocker: no verified company or administrator exists; invitation emails also wait on email sending setup).
- [x] Add admin-only company profile editing, optional verified public pages, open opportunity links and privacy-safe opt-in impact; 14 isolated privacy tests, 33 existing permission tests and 21 unit tests passed; signed-in seeker access and unknown-company editor denial checked.
- [ ] Verify company profile save, logo upload and public-page publication through a genuine company admin account (blocker: no verified company or trusted company administrator exists; isolated admin save/read-back passed without fabricating live authority).
- [x] Enforce scoped employer roles, explicit listing/placement assignments, administrator publication approval and immutable permission auditing; preserve seeker access.
- [x] Add authorised staff controls; 33 actual-policy tests passed in a disposable database with rolled-back fixtures, plus 20 existing unit tests. Checked real signed-in seeker dashboard, unknown-company denial, direct staff escalation/publication/membership-write denial and signed-out switching.
- [ ] Verify staff assignment and publication approval through a genuine company administrator's UI (blocker: no verified company or trusted company administrator exists; isolated database approval/read-back passed, no real authority was fabricated).
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
