# Employer role integration

Reuse existing authentication identities, protected company memberships, verification/domain records, jobs, applications, placements, hour approvals, skills and administrator safety reviews.

- Add protected staff scopes and explicit opportunity/placement assignments; approved employees receive no operational access by default.
- Replace broad employer access with resource-specific server checks and row restrictions. Verified contributors remain non-members with personal drafts and requests only.
- Add version-bound publication requests and company-administrator approval; manager edits never publish automatically.
- Add company staff/assignment controls and a private append-only permission history.
- Test real database restrictions for cross-company access, escalation, account switching, revocation, changed work addresses/domains and direct requests; preserve seeker tests and dashboard access.

## Dependencies
Genuine company approval workflows require a verified company and trusted administrator. Work-email delivery still requires a configured sender. Isolated, rolled-back security fixtures can test permissions without granting any real account authority.

## Technical details
Use additive tables, SECURITY DEFINER permission/action functions, RLS and explicit grants. Existing company-admin appointments remain protected; operational staff roles do not confer administrator authority. Audit membership, scope, assignment, domain and publication changes.