# Integrated seeker, employer and employee audit

## Test setup

- No test companies, accounts, listings or role grants were added to the live backend.
- A temporary local database was recreated from the live schema only: 57 tables, 162 functions, 101 row-level policies and 57 triggers. No live rows were copied.
- Fixtures covered two unrelated companies and all nine requested roles. Every fixture transaction rolled back.

## Passed automated tests

### Unit tests

- **72 tests passed, 0 failed**, with 147 assertions across 14 files.
- Coverage included opportunity states, recommendations, application transitions, approval rules, company access, employee identity, hours, completion, analytics, messaging and safety.

### Isolated database and direct-permission tests

**132 checks passed, 0 failed:**

- `registrationWorkflow.sql`: **30** — company registration, duplicate and takeover prevention, independent admin review, exact-domain work-email proof, account-bound single-use/expiring challenges, replay and alias denial, pending and approved membership, email-change revocation, manual review and notifications.
- `employerPermissions.sql`: **50** — all nine roles, two companies, public visibility, draft ownership, scoped managers/supervisors, duplicate applications/acceptances/submissions, one placement per acceptance, shared application status, private-field exclusion, escalation and cross-company denial, revoked access, self-verification prevention and notifications.
- `opportunityApproval.sql`: **15** — submit, lock while pending, changes requested, company approval, platform review, material-change reapproval, author notices and immutable history.
- `companyProfiles.sql`: **14** — admin-only editing, public whitelist, open-only opportunities and small-cohort privacy.
- `placementCompletion.sql`: **17** — assigned completion, approved-hour totals, observed skill snapshot, one certificate, privacy, revocation/reissue, reference consent, edit re-approval, public display and moderation.
- `placementFeedback.sql`: **5** — assigned-supervisor checks, no direct writes, private defaults and public/certificate filtering.
- `completionSafeguards.sql`: **1** grouped structural check covering eight completion/certificate safeguards.

### Live read-only API checks

- Anonymous requests for non-published listings returned **0 rows**.
- Anonymous reads of company submissions, review evidence, email challenges, memberships, applications, hours, certificates and certificate revisions returned **0 rows or a permission denial**.

### Live Chromium UI checks

**14 checks passed** at the user's 836×756 viewport:

- Home and opportunity navigation loaded.
- Both employer registration pathways and company-email labeling worked.
- Employer workspace, platform administration and seeker dashboard redirected signed-out visitors appropriately.
- Invalid employer sign-in showed the safe generic error.
- Apply Now opened sign-in; seeker email sign-up remained available.
- The unsupported phone option was absent.
- Unknown certificate references showed “No certificate found”.
- No unexpected page exception occurred. The intentional invalid sign-in produced the expected HTTP 400 resource entry.

### Static checks

- Authentication lint: **0 errors**; one existing Fast Refresh warning in `AuthContext.tsx`.
- Latest preview build: **passed**.

## Confirmed issues fixed

1. The shared authentication modal simulated phone verification without an authentication provider. That path was removed; seeker email and Google authentication remain.
2. The legacy modal attempted a direct company-profile insert that current protected registration rules forbid. Company users now use the dedicated verified onboarding flow instead.
3. The client updated `profiles.user_type` after sign-up. This write was removed; account type is presentation only and protected company records remain the authority.
4. Outdated test fixtures were updated to use guided opportunity fields, protected application/status actions, supervisor hour review and required platform review. These were test-setup failures, not database-policy failures.

## Failed or unresolved automated checks

- **No requested automated test remains failing.**
- Initial failures were corrected fixture assumptions or incorrectly scoped assertions; each was rerun to a passing result.

## Requires manual review

- A genuine signed-in UI round-trip for seeker, draft contributor, unapproved employee, approved employee, supervisor, opportunity manager, company admin and platform admin. These were tested against the real database rules in isolation, not against live role accounts, respecting the choice to use isolated tests only.
- Real email delivery and links for account confirmation, work-email verification and password recovery. Token hashing, account binding, expiry, replay prevention and email-change invalidation passed isolated database tests.
- Google/Lovable OAuth and external provider consent round-trips.
- Genuine company evidence and administrator authority decisions. The live backend had no verified company or platform administrator when audited.
- Certificate PDF/QR visual rendering and downloaded-file inspection. Certificate data integrity, privacy, verification status, revocation and reissue passed automated tests.
- In-app notification creation was tested; external email notification delivery was not tested.
