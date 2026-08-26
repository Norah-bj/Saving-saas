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
| 13 | Organization administration | ✅ Built & verified (see note) | `organization`, `member` (roles/status), `membership` | `org-admin/Users.tsx`, `Settings.tsx`, `Moderation.tsx`, `loan-committee/Policy.tsx`, `Profile.tsx`, `member/Shares.tsx`, `secretary/ExitRequests.tsx` |
| 14 | Backups (records only, no restore) | ✅ Built & verified | `backup` | `org-admin/Backups.tsx`, `super-admin/Backups.tsx` |
| 15 | Platform Super Admin | 🟡 Partial by design — see note | `organization` (platform), `audit` (platform) | `super-admin/Organizations.tsx`, `Analytics.tsx`, `AuditLogs.tsx`, `Billing.tsx` (plan part) |
| 16 | Notifications (read side only) | ✅ Built & verified | `notification` | `Notifications.tsx`, topbar bell |
| 17 | Production deployment | ⬜ Not started | — | — |

"Built & verified" means: compiles, runs against real local Postgres, smoke-tested end-to-end via
real HTTP calls (curl) against real dev data, cross-checked against hand-run SQL or direct DB
inspection, and merged to `main` via reviewed PR. See [TESTING.md](TESTING.md) for what was
actually exercised per phase, and [CHANGELOG.md](CHANGELOG.md) for the dated history.

**Frontend integration is workspace-by-workspace**: member (dashboard, savings, shares, loans,
guarantors, meetings, announcements, documents, notifications, profile), secretary (dashboard,
members, exit requests, suspended members, meetings, announcements, documents), loan committee
(dashboard, pending applications, application review/decision, decision history, reports, loan
policy), and now accountant (dashboard, transactions, member statements, loan disbursement,
reports, Excel payroll import, exports) call the real backend. Every other workspace (HR, Org
Admin, Super Admin) still runs entirely on the zustand mock store. Wiring continues workspace by
workspace, same pattern — see [ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration) for
how it's structured and [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for what's explicitly still mock-only
within the wired workspaces (`member/Policies.tsx`, `LoanContract.tsx`, `ExitSettlement.tsx`,
`secretary/Members.tsx`'s "pre-fill from employee registry" picker,
`loan-committee/Policy.tsx`'s reference-policy list). `accountant/Import.tsx` is fully wired but
its UX changed from the mock's two-step client-parse-then-confirm to a one-step upload, since the
real backend validates the file atomically server-side with no non-committing preview — see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Phase 13 note**: role assignment (`org-admin/Users.tsx`), member suspend/activate
(`org-admin/Moderation.tsx`), org profile/branding (`org-admin/Settings.tsx`), loan policy
(`loan-committee/Policy.tsx`), and exit/share-withdrawal requests (`Profile.tsx`,
`member/Shares.tsx`, `secretary/ExitRequests.tsx`) are all built and verified — phase 13 is
complete. The exit/share-withdrawal work goes beyond what the frontend mock does in two real
ways: approving a share withdrawal actually moves the shares and money (the mock's
`decideShareWithdrawal` only ever flips a status flag), and both request types validate for real
server-side (share sufficiency, exit eligibility) rather than only disabling a button client-side
— see [BUSINESS_RULES.md](BUSINESS_RULES.md). Not built: `secretary/ExitRequests.tsx`'s "View
Settlement" link (a separate settlement-calculation page/feature, not requested).

**Phase 14 note**: `backup_records` is metadata tracking only (label, type, a row-count-based
size proxy) — there is no real `pg_dump`/restore automation, matching the frontend mock exactly
(it doesn't implement restore either, only local UI state). See
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Phase 15 note**: deliberately scoped to the parts of `super-admin/`'s 9 pages backed by real
data — organization list/status/plan management (`GET/POST /organizations`, `POST
/organizations/{id}/status`, `POST /organizations/{id}/plan`) and a platform-wide audit trail
(`GET /audit-logs`). Analytics and Billing's plan-price display need no new endpoint — both derive
entirely from the same `GET /organizations` response client-side, exactly like the frontend mock
already does (org growth by `createdAt`, plan-mix counts, MRR as a sum over static plan-price
reference data). Monitoring, Settings (platform API keys), and Support were **deliberately not
built** — the user chose "build only the real parts" when asked, since those three have no real
system behind them at all to port from (fabricated uptime/DB-size numbers, fabricated API keys, a
hardcoded ticket list not even wired to the mock's own data layer) — see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Phase 16 note**: read side only (list, mark-read, mark-all-read) — nothing in the frontend mock
ever dynamically creates a notification either (`NOTIFICATIONS` is static seed data), so no create
endpoint exists yet. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
