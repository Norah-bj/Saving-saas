# Features — build status by phase

Build order is locked in (see [DECISIONS.md](DECISIONS.md)) — don't re-derive a different order.

| # | Phase | Status | Backend package | Frontend consumer |
|---|---|---|---|---|
| 1-3 | Auth/tenant foundation, member management, savings/shares ledger | ✅ Built & verified | `auth`, `member`, `savings`, `security`, `tenant` | login, member CRUD, member savings/shares pages |
| 4 | Payroll/HR Excel import | ✅ Built & verified | `payroll` | `hr/` |
| 5 | Loan applications | ✅ Built & verified | `loan` (application) | `member/` loan apply flow |
| 6 | Guarantors | ✅ Built & verified | `loan` (guarantee response) | `member/Guarantors.tsx` |
| 7 | Loan committee review | ✅ Built & verified | `loan` (review) | `loan-committee/` |
| 8 | Loan contracts (PDF) | ✅ Built & verified | `contract` | `LoanContract.tsx` |
| 9-10 | Disbursement, salary-based repayment | ✅ Built & verified | `loan` (disbursement), `ledger` | `accountant/` |
| 11 | Accountant reporting | ✅ Built & verified | `reporting`, `ledger` (read side) | `accountant/Dashboard.tsx`, `Reports.tsx`, `Transactions.tsx`, `Statements.tsx` |
| 12 | Secretary ops (meetings, documents, announcements) | ✅ Built & verified | `secretary` | `secretary/Meetings.tsx`, `Announcements.tsx`, `Documents.tsx`, `member/Meetings.tsx`, `Announcements.tsx`, `Documents.tsx` |
| 13 | Organization administration | 🟡 Partial — see note | `organization`, `member` (roles/status) | `org-admin/Users.tsx`, `Settings.tsx`, `Moderation.tsx`, `loan-committee/Policy.tsx` |
| 14 | Backups (records only, no restore) | ✅ Built & verified | `backup` | `org-admin/Backups.tsx`, `super-admin/Backups.tsx` |
| 15 | Platform Super Admin | ⬜ Not started — scope decision pending, see note | — | `super-admin/` |
| 16 | Notifications (read side only) | ✅ Built & verified | `notification` | `Notifications.tsx`, topbar bell |
| 17 | Production deployment | ⬜ Not started | — | — |

"Built & verified" means: compiles, runs against real local Postgres, smoke-tested end-to-end via
real HTTP calls (curl) against real dev data, cross-checked against hand-run SQL or direct DB
inspection, and merged to `main` via reviewed PR. See [TESTING.md](TESTING.md) for what was
actually exercised per phase, and [CHANGELOG.md](CHANGELOG.md) for the dated history.

**The frontend is not yet wired to the real backend** — every page above still runs on the
zustand mock store. Wiring is expected to happen once the roadmap's backend phases are complete
enough to cover a given page's needs (see the per-page notes in [API.md](API.md)).

**Phase 13 note**: role assignment (`org-admin/Users.tsx`), member suspend/activate
(`org-admin/Moderation.tsx`), org profile/branding (`org-admin/Settings.tsx`), and loan policy
(`loan-committee/Policy.tsx`) are all built and verified. Exit requests and share-withdrawal
requests (`secretary/ExitRequests.tsx`, the share-withdrawal approval flow) are the remaining
organization-administration scope, not yet built — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Phase 14 note**: `backup_records` is metadata tracking only (label, type, a row-count-based
size proxy) — there is no real `pg_dump`/restore automation, matching the frontend mock exactly
(it doesn't implement restore either, only local UI state). See
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Phase 15 note**: `super-admin/` has 9 pages of genuinely different maturity — Organizations,
Analytics, and AuditLogs are straightforwardly portable from real data already in the system;
Billing's plan/subscription part is too (`Organization.plan` already exists), but its revenue
figures are a derived sum, not real payment processing; Monitoring (system uptime/response-time/DB
size) and Settings (platform API keys) are entirely fabricated placeholder data with no real
backing system to port from; Support is a hardcoded ticket list not even wired to the mock's data
layer (`useDataStore`) — no ticketing system exists anywhere in the spec to port. Not started
pending a scope decision on which of these to build for real vs. defer — see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Phase 16 note**: read side only (list, mark-read, mark-all-read) — nothing in the frontend mock
ever dynamically creates a notification either (`NOTIFICATIONS` is static seed data), so no create
endpoint exists yet. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
