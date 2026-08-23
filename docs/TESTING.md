# Testing

No automated test suite exists yet (`spring-boot-starter-test`/`spring-security-test` are
dependencies but no test classes have been written) — every phase so far has been verified
manually against a real running server and a real local Postgres database. This document records
the pattern used and what was actually exercised, so gaps are visible.

## Manual verification pattern (used for every phase)

1. `mvn compile` — must succeed cleanly before running anything.
2. Start the app in the background (`mvn spring-boot:run`), redirecting output to a log file;
   wait for `Started IkiminaConnectApplication` (or `APPLICATION FAILED TO START`) before testing.
3. Real `curl` calls against `localhost:8080` — never a mocked HTTP client.
4. Write JSON responses to a scratch file, parse with
   `node -e "...fs.readFileSync(process.argv[1],'utf8')..."` — never round-trip large JSON through
   a bash `$(...)` variable (loses/mangles content in this environment).
5. Independently verify results with a **separate, hand-written** read-only SQL query
   (`psql`) against the same tables — not just trusting the API's own success response. This is
   what catches logic bugs the endpoint itself wouldn't reveal.
6. For generated PDFs: read the file bytes back with the `Read` tool (confirmed capable of
   rendering PDF content) and check every computed figure against hand calculation.
7. Check `audit_log` rows exist for every mutating action.
8. JWT access tokens expire in 15 minutes — re-login between test steps if real wall-clock time
   has passed.

## What's been verified per phase

- **Phases 1-3**: org self-registration, login (right/wrong password), JWT claims, `/me`, member
  creation with generated temp password + login, savings ledger running balance, share purchase
  pricing, refresh-token rotation + old-token-reuse rejection, RBAC denying a plain member from
  listing/viewing others, cross-tenant isolation across three separately-registered orgs.
- **Phase 4**: a real generated `.xlsx` covering all four payroll-row outcomes (matched,
  duplicate, no matching member, invalid amount) plus the empty-sheet error path; ledger updates,
  audit log, RBAC.
- **Phase 5**: loan eligibility rejection, guarantor-requirement enforcement, contract-number
  generation.
- **Phase 6**: accept/decline guarantee flows, guarantor-lock enforcement, double-response
  rejection (409), non-guarantor rejection (403).
- **Phase 7**: non-chair committee member approving a self-covered loan, then 403 on a guaranteed
  loan; chair user approving the same guaranteed loan.
- **Phase 8**: generated PDF bytes read back and checked article-for-article against hand
  computation, for both the guaranteed-loan and self-covered-loan branches.
- **Phase 9-10**: full lifecycle (disburse → repeated `record-repayment` → completed,
  `remainingBalance = 0`), 20 ledger rows checked against exact expected amounts, guarantee
  auto-release verified both in the DB and functionally (freed guarantor's next application hits
  a *different* validation error, proving the lock cleared).
- **Phase 11**: all three new endpoints (`/reports/accountant-dashboard`, `/reports/financial`,
  `/ledger`) hit against real dev data in the `tcs2` org and cross-checked against hand-run SQL —
  every figure matched exactly. Found a real bug (query-param enum 500) via a filter test that
  failed, fixed it, re-verified. Confirmed 401 on all three with no auth token.
- **Phases 12-13**: meeting create → record minutes (verified status flips to `completed` and
  `minutesSummary` persists, both via the API response and a direct DB read). Announcement and
  document create with both `all` and `admins` visibility; confirmed a plain-member account's `GET`
  correctly omits the `admins`-only rows (server-side, not just hidden in a UI) and gets 403
  attempting to `POST`. Organization profile and loan-policy PATCH, each checked against a direct
  DB read; confirmed a loan-committee-only (non-ORG_ADMIN) user gets 403 on `/profile` but 200 on
  `/loan-policy`, and an ORG_ADMIN-only ledger-committee-non-member gets 403 attempting
  `PUT /members/{id}/roles`. Member role replacement verified (`MEMBER` always retained). Member
  suspend → real login attempt correctly 403 → reactivate → real login attempt correctly 200 — the
  actual login-time effect was checked, not just the DB row. A 409 was confirmed for an
  invalid status transition (suspending an already-`pending` member). Every mutating call checked
  against a corresponding `audit_log` row.
- **Phases 14, 16**: backup creation's row-count-based `sizeMb` cross-checked against a hand-run
  SQL query summing the same tables — matched exactly (103 rows / 50 = 2). Confirmed a plain
  member gets 403 on both `GET`/`POST /backups`. Notification list/mark-read/mark-all-read tested
  against rows seeded directly via SQL (no create endpoint exists to seed through the API — see
  [KNOWN_ISSUES.md](KNOWN_ISSUES.md)); confirmed a different user attempting to mark someone else's
  notification read gets 404, not 403 (so existence isn't leaked).
- **Phase 15**: since no SUPER_ADMIN user existed anywhere, one was created via direct SQL insert
  first (see [DEVELOPMENT.md](DEVELOPMENT.md)) — confirmed it logs in correctly with a null
  `organizationId` in both the JWT and the login response, with no NPE anywhere in that path.
  `GET /organizations`/`GET /audit-logs` [platform] confirmed working with real cross-org data (3
  orgs; audit log count cross-checked against a hand-run `GROUP BY organization_id` query — matched
  exactly after accounting for entries created mid-test). Confirmed an ORG_ADMIN (non-super-admin)
  gets 403 on all platform endpoints, while still getting 200 on their own org via the existing
  self-scoped `GET /organizations/{id}` — the two controllers correctly coexist on overlapping base
  paths. Status transition 409 confirmed on a same-status no-op; a genuine `trial → active`
  transition and a plan change both confirmed via the API response and cross-checked against the
  resulting `audit_log` rows.

## Known testing gaps

- No automated/CI test suite — every verification above is manual and was not re-run after later
  phases; regressions in earlier phases would not be caught automatically.
- No load/performance testing.
- No negative-path fuzzing beyond the specific cases listed above.
