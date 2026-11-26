# Testing

## End-to-end API smoke test (`scripts/api-smoke-test.mjs`)

Walks every endpoint as every role (admin, secretary, accountant, HR, committee chair and member,
borrower, guarantor, plain member, super admin) against a **running** backend: 140 checks covering
auth and sessions, invites, roles, organization settings, savings and shares, the full guaranteed
loan lifecycle and a rejection, ledger and reports, payroll import, meetings/announcements/
documents visibility, notifications, share withdrawal, exit, suspension, audit log, password
reset, platform administration and backups, plus error handling and CORS. It registers a fresh
"QA Checklist Coop …" organization each run, so existing data is untouched — but it does create
real rows, so never point it at a database holding real members unless you mean to keep that test
organization.

```bash
# Local backend with the console email provider (reads the verification link from its log):
SMOKE_BACKEND_LOG=/path/to/backend.log \
SMOKE_SUPERADMIN_EMAIL=superadmin@ikiminaconnect.rw SMOKE_SUPERADMIN_PASSWORD='...' \
node scripts/api-smoke-test.mjs

# A hosted server: point it at the API and use an existing, verified org admin instead.
SMOKE_API=https://api.example.com/api/v1 SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... \
node scripts/api-smoke-test.mjs
```

It prints PASS/FAIL per check and writes `smoke-test-results.json`. The backup check needs `pg_dump`
reachable by the backend (`PG_DUMP_PATH` locally). Last full run: 140/140 on 2026-11-25.

## Automated tests (since gap-closure phase 7)

Backend integration tests live in `backend/src/test/java/rw/ikiminaconnect/` and run the real
Spring context, the real security filter chain and the real Flyway migrations against a
**throwaway PostgreSQL 17 container** (Testcontainers) — never your local database.

```bash
cd backend
mvn test          # needs Docker Desktop running ("Engine running")
```

- `support/IntegrationTestBase` starts one container per test run and offers helpers
  (`registerVerifiedOrg`, `createMember`, `setRoles`, `superAdminToken`, `getJson`/`postJson`/...).
  Each test registers its **own** organization with unique emails, so tests never share data
  and can run in any order. Roles live in the JWT, so log in again after `setRoles`.
- `support/RecordingEmailService` captures verification links instead of sending email, so tests
  complete the real `POST /auth/verify-email` flow.
- Current coverage (10 tests): login and wrong password; unverified-admin gating; single-use
  verification tokens; organization suspension blocking login; cross-tenant isolation (member
  detail, org detail, member list, forced audit-log scope); staff-only endpoints and backup
  permissions; the full guaranteed-loan lifecycle (apply → review → guarantor → chair approval →
  contract → disbursement revenue ledger rows → every repayment → completed, guarantee released,
  notifications); payroll import row classification and crediting; non-Excel/corrupt uploads;
  share purchase → withdrawal request → approval moving shares and balance.
- Not covered yet: frontend (lint + build only), creating a real `pg_dump` backup in tests,
  meetings/announcements/documents, exit requests.

On slow connections the first run downloads `postgres:17-alpine` and `testcontainers/ryuk`; if
Testcontainers times out pulling them, run `docker pull postgres:17-alpine` and
`docker pull testcontainers/ryuk:0.12.0` first.

**CI** (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`: backend
`mvn verify` (these tests), frontend `npm run lint` + `npm run build`, and a production Docker
image build that also checks the image's `pg_dump` is version 17.

The manual pattern below is still how a new feature is first verified before tests are written
for it. This document records that pattern and what was exercised per phase, so gaps are visible.

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
- **Phase 13 completion (exit/share-withdrawal requests)**: full exit lifecycle tested against real
  login behavior, not just DB state — submitted, approved, then confirmed the exited member's next
  real login attempt is actually 403'd. Duplicate-pending-request rejection confirmed (409).
  Ineligibility correctly blocks approval (409) — verified against a real disbursed test loan
  (inserted via SQL) *and* a real active guarantee that already existed in the dev data from
  earlier phase testing, both surfaced correctly by the same eligibility check. Share withdrawal:
  insufficient-shares rejection confirmed at submission (409); approval cross-checked directly
  against the DB — `share_holdings.total_shares` decremented exactly, and the resulting
  `savings_transactions` row's `amount`/`balance_after` matched hand computation exactly (4 shares
  × 5000 RWF = 20,000; balance 100,000 → 80,000). Rejection confirmed to leave shares/balance
  untouched. Role gates re-verified with a genuinely plain-only test user after discovering the
  original "plain" fixture had been promoted to SECRETARY by earlier phase-13 testing — see
  [DEVELOPMENT.md](DEVELOPMENT.md).

- **Email verification**: registered a new org via the real API, confirmed the response's
  `emailVerified: false` and the console-logged verification link; confirmed `GET
  /members`/`GET /organizations/{id}` correctly 403 `email_not_verified` for the new, unverified
  admin while `GET /me` and `POST /auth/resend-verification` stayed reachable; confirmed a bad
  token 403s and the real one 204s; confirmed the *same, still-valid* access token immediately
  reached the previously-blocked endpoints right after verifying (no re-login/refresh needed) and
  cross-checked the resulting `audit_log` row. Confirmed the migration's backfill against an
  existing dev user (`admin2@tcs2.rw`), confirmed a staff-created member
  (`POST /members`) is `email_verified = true` immediately via a direct `psql` read, and confirmed
  a super-admin login is unaffected by the gate.

## Known testing gaps

- No automated/CI test suite — every verification above is manual and was not re-run after later
  phases; regressions in earlier phases would not be caught automatically.
- No load/performance testing.
- No negative-path fuzzing beyond the specific cases listed above.
