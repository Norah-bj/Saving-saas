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
| 14 | Backups | ⬜ Not started | — | — |
| 15 | Platform Super Admin | ⬜ Not started | — | `super-admin/` |
| 16 | Notifications | ⬜ Not started | — | — |
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
