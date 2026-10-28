# Roadmap

## Employer integration
- [ ] Add private company registration details, evidence and applicant status tracking.
- [ ] Add platform-administrator review, authority checks, audit history and safe approval/suspension.
- [ ] Verify registration, isolation, takeover prevention and approval notification/access.
- [x] Inspect existing features and prepare the short integration plan without changing application functionality.
- [x] Add separate employer/employee sign-in, registration and password recovery using existing identities.
- [x] Add verified-company membership, draft eligibility and server-enforced access routing without changing seeker data.
- [x] Check sign-in errors, mobile presentation, signed-in seeker switching, unknown-company rejection, legacy posting rejection and direct publication/self-appointment denial; 11 unit tests passed.
- [ ] Verify approved administrator/employee/domain-only workspaces end-to-end (blocker: no verified company, approved domain or authorised membership exists; trusted review/appointment workflow is not part of this authentication request).
- [ ] Verify email confirmation, social-provider consent and completed password recovery end-to-end (blocker: these require the real email/identity-provider round-trip; invalid recovery links were checked).

## Before publishing
- [ ] Assign a moderator account so reference reports can be reviewed (blocker: Emmanuel must name which account gets the moderator role). Until then, /moderation/references shows "Only moderators can view this page" to everyone.
