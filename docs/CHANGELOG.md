# Changelog

Dated log of what changed and why. One entry per merged PR/phase. See [DECISIONS.md](DECISIONS.md)
for the reasoning behind significant choices, and [TESTING.md](TESTING.md) for what was actually
verified.

---

## 2026-08-24 — Frontend wired to the real backend: foundation + member workspace

**Changed**: New frontend integration layer — `src/lib/api/client.ts` (shared `fetch` wrapper with
401-refresh-retry), `src/lib/store/auth-store.ts` (real JWT state, replacing the auth half of
`session-store.ts`), `src/lib/hooks/use-current-user.ts` (combines the auth store with a real
`GET /me` query), and one `src/lib/api/{resource}.ts` file per backend package (`organization.ts`,
`members.ts`, `savings.ts`, `loans.ts`, `guarantees.ts`, `membership.ts`, `notifications.ts`,
`secretary-ops.ts`). Added `@tanstack/react-query`. Every member-workspace page
(`member/Dashboard.tsx`, `Savings.tsx`, `SavingsStatement.tsx`, `Shares.tsx`, `Loans.tsx`,
`LoanApply.tsx`, `LoanDetail.tsx`, `Guarantors.tsx`, `Meetings.tsx`, `Announcements.tsx`,
`Documents.tsx`) plus `Profile.tsx` and `Notifications.tsx` now call the real API instead of the
zustand mock store. `Login.tsx` rewritten (real email/password form, demo-persona picker removed).
`Register.tsx` rewritten to submit all of `RegisterRequest`'s required fields (the old form was
missing over half of them) and its copy corrected — it previously claimed manual review ("verified
within one business day") when the real backend is instant self-service.

**Backend changes made to support this** (own PR, stacked on the exit/share-withdrawal-requests
PR): `GET /exit-requests` and `GET /share-withdrawals` changed from staff-only to
`SELF_OR_STAFF` (a plain member now sees their own requests, matching the pattern already used by
`SavingsController`/`GuaranteeController`) — `Profile.tsx` and `member/Shares.tsx` need this to
show a member their own pending/past requests. Also: `MeResponse` gained `dateJoined`,
`OrganizationDto` gained `shareValueRwf`/`loanInterestRate`/`loanInsuranceRate`/
`minMonthsBeforeEligible`/`allowedRepaymentPeriods`, a new minimal `GET
/members/guarantor-candidates` endpoint was added (open to any authenticated user, unlike the
staff-only `GET /members`), and `ExitEligibilityDto` was restructured from plain contract-number
strings to nested `{id, contractNumber, remainingBalance}`/`{guaranteeId, loanContractNumber,
amountGuaranteed}` records so `Profile.tsx` can render real data, not just names. See
[API.md](API.md).

**Why**: user asked directly whether the backend and frontend were actually connected and whether
they could test it end-to-end — the honest answer was no, the backend existed only in unmerged PRs
and the frontend had never called it. Chose to wire the foundation plus one complete, demoable
slice (the member workspace) first, rather than all 7 role workspaces at once; the remaining six
follow later using the same pattern.

**Adapter pattern, not redesign**: every converted page keeps its exact existing JSX — where a
backend DTO's shape or units differ from what the existing frontend types/components expect, the
API layer adapts, not the page. Two real examples, both in `src/lib/api/loans.ts`: backend
interest/insurance rates are fractions (`0.05`) but the frontend expects whole percentages (`5`);
the backend's savings ledger returns newest-first but every frontend consumer assumes oldest-first.
Both corrected once, in the adapter. Full detail in
[ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration).

**Explicitly not wired this round**: `member/Policies.tsx` (no backend exists for `RolePolicy`
content), `LoanContract.tsx`/`ExitSettlement.tsx` (real PDF generation exists server-side, but
swapping the current HTML rendering for a PDF embed is a design decision, not a data-source swap),
and all six non-member workspaces. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Testing**: no browser-automation tool exists in this environment. Verified: backend compiles and
runs on a local consolidated branch (`integration/frontend-wiring`, merging the previously-unmerged
phase-11 PR into the phase-12→phase-13-completion PR chain); frontend `tsc -b`/`vite build` clean;
every converted page's request/response shape manually cross-checked field-by-field against the
real endpoint contracts already proven correct by this session's curl-based backend testing; CORS
verified working with real `Origin`-header requests, not just same-origin curl. **Not verified**:
actually clicking through the running app in a real browser — that still needs a human.

**Result**: backend micro-fix as its own PR stacked on the exit/share-withdrawal-requests PR
(low risk — widens an existing staff-only list endpoint to also allow self-access, no behavior
change for staff callers); frontend foundation + member workspace as a separate PR based directly
on `origin/main` (frontend files, untouched by any backend PR) — additive/new-files plus
page-internal data-source swaps only, no shared component or route structure changed.

---

## 2026-08-23 — Phase 13 completion: Exit and share-withdrawal requests

**Changed**: New `membership` package (`ExitRequest`/`ShareWithdrawalRequest`,
`ExitRequestService`/`ShareWithdrawalRequestService`, `ExitRequestController`/
`ShareWithdrawalRequestController`/`ExitEligibilityController`) — `GET/POST /exit-requests`,
`POST /exit-requests/{id}/decision`, `GET/POST /share-withdrawals`,
`POST /share-withdrawals/{id}/decision`, `GET /members/{id}/exit-eligibility`. `AppUser` gained
`exit()`. `ShareHolding` gained `removeShares()`. `SavingsService` gained `withdrawShares()`.
`LoanRepository`/`GuaranteeRepository` gained the queries the eligibility check needs.

**Why**: user-requested — the largest remaining piece of phase 13, explicitly asked to be built
"end-to-end using real backend data... Do not use mock-only behavior," after being offered as one
of several flagged gaps to circle back to.

**Database**: `V7__exit_and_share_withdrawal_requests.sql` — two new tables.

**One correction to BACKEND_CONTRACT.md, not just the mock, ported**: its business-rules section
describes "outstanding loan" as blocking exit across a long list of statuses (submitted through
repaying); the actual `data-store.ts` code only ever checks `disbursed`/`repaying`. Ported the real
code — a loan that hasn't been disbursed yet isn't real financial exposure.

**Genuinely goes beyond the frontend mock, as asked**: approving a share withdrawal actually moves
the shares and money (decrements `share_holdings`, writes a `WITHDRAWAL` savings transaction) —
the mock's `decideShareWithdrawal` only ever flipped a status flag, never touching either. Share
sufficiency and exit eligibility are both validated server-side (409s), not just via a disabled
button client-side. Duplicate-pending-exit-request submission is rejected (409) — the mock's UI
prevents this but never enforces it server-side.

**Testing**: see [TESTING.md](TESTING.md#phase-13-completion). Full exit lifecycle verified
against real login behavior (not just DB state) — approved exit correctly blocks the member's next
real login attempt. Ineligibility-blocks-approval verified against both a real disbursed loan
(inserted via SQL for the test) and a real pre-existing active guarantee from earlier phase
testing. Share withdrawal approval cross-checked directly against the DB — shares and balance
matched hand computation exactly; rejection confirmed to leave both untouched.

**Result**: PR #12, targeting PR #11 as base (stacked, same reason as the prior PRs) — merge order
#7 → #8 → #9 → #10 → #11 → #12.

---

## 2026-08-23 — Phase 15: Platform Super Admin (scoped to the real parts)

**Changed**: New `PlatformOrganizationsController`/`AuditLogController` — `GET /organizations`
[platform], `POST /organizations/{id}/status`, `POST /organizations/{id}/plan`,
`GET /audit-logs` [platform, optional `?organizationId=`]. `Organization` gained `updateStatus`/
`updatePlan`. `AuditLogRepository` gained platform-wide and org-scoped list queries.

**Why**: next roadmap phase, but with an unusual wrinkle — `super-admin/` has 9 pages of wildly
different maturity (some real, some entirely fabricated placeholder data). Asked the user how to
scope it rather than guessing; they chose to build only the real parts.

**Scope decision** (asked, not assumed): built Organizations (list/status/plan — real
`Organization` data), and platform AuditLogs (real `audit_log` data). Analytics and Billing's
plan-price display needed no new endpoint — both derive from the same `GET /organizations`
response client-side, exactly like the frontend mock does today. **Deliberately not built**:
Monitoring (fabricated uptime/response-time/DB-size numbers — no real observability pipeline
exists), Settings (fabricated platform API keys — no API-key auth mechanism exists, this backend
is JWT-only), Support (a hardcoded ticket list not even wired to the mock's own data layer — no
ticketing spec exists to port). See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Database**: no migration — reuses `organizations` and `audit_log` as-is.

**New capability needed for testing, not previously possible**: no SUPER_ADMIN user existed
anywhere in the dev database, and no API path can create one (`/auth/register` only creates
ORG_ADMIN + a new org). Created one via direct SQL insert (`organization_id = NULL`,
`user_roles.role = 'super-admin'`) — confirmed it logs in correctly with a null `organizationId`
throughout the JWT/response chain.

**Testing**: see [TESTING.md](TESTING.md#phase-15). Real cross-org data (3 orgs) exercised
end-to-end; confirmed the new platform-wide controller and the existing self-scoped
`OrganizationController` correctly coexist on overlapping `/organizations` base paths without
routing conflicts; confirmed an ORG_ADMIN gets 403 on every platform endpoint.

**Real gap surfaced while testing (not introduced by this phase)**: `POST
/organizations/{id}/status` can mark an org `suspended`, but nothing in `AuthService.login` checks
an organization's own status — only the logging-in user's. Suspending an org currently has no
functional effect on its members' ability to log in. Documented, not fixed — touches already-shipped
phase-1 auth code without being asked.

**Result**: PR #11, targeting PR #10 as base (stacked, same reason as the prior two PRs) — merge
order #7 → #8 → #9 → #10 → #11.

---

## 2026-08-23 — Phases 14, 16: Backups (records only) + notifications (read side)

**Changed**: New `backup` package (`BackupRecord`, `BackupService`, `BackupController`) —
`GET/POST /backups`. New `notification` package (`AppNotification`, `NotificationService`,
`NotificationController`) — `GET /notifications`, `POST /notifications/{id}/read`,
`POST /notifications/read-all`.

**Why**: next two well-scoped roadmap phases. Bundled together since both are small
tracking/inbox-style features with no relationship to each other.

**Database**: `V6__backups_and_notifications.sql` — adds `backup_records` (`organization_id`
nullable, same platform-wide pattern as `audit_log`) and `notifications` (scoped by `user_id`
alone, no `organization_id` needed).

**Deliberate scope limits, not oversights**: `backup_records` is metadata only — `sizeMb` is a
real row-count-based proxy (not a random number, but also not an actual file size), and there is
no `pg_dump`/restore automation, matching the frontend mock exactly (it doesn't implement restore
either). `notifications` only has the read side — nothing creates a notification anywhere in the
system yet, same gap as the frontend mock. Both flagged in
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) rather than silently built halfway.

**Testing**: see [TESTING.md](TESTING.md#phases-14-16). Backup size cross-checked against hand-run
SQL (exact match). Notification cross-user isolation confirmed (404, not 403, on someone else's
notification). Role gates confirmed for both.

**Result**: PR #10, targeting PR #9 as base (stacked, same reason as #9 on #8) — merge order
#7 → #8 → #9 → #10.

---

## 2026-08-23 — Phases 12-13: Secretary ops + organization administration

**Changed**: New `secretary` package (`Meeting`/`Announcement`/`DocumentItem` entities,
`SecretaryOpsService`, `MeetingController`/`AnnouncementController`/`DocumentController`) —
`GET/POST /meetings`, `POST /meetings/{id}/minutes`, `GET/POST /announcements`, `GET/POST
/documents`. New `OrganizationController`/`OrganizationService`/`OrganizationDto` — `GET
/organizations/{id}`, `PATCH /organizations/{id}/profile`, `PATCH /organizations/{id}/loan-policy`.
`MemberController`/`MemberService` gained `PUT /members/{id}/roles` and `POST /members/{id}/status`.

**Why**: next two roadmap phases — secretary's meetings/documents/announcements pages and
org-admin's user/settings/moderation pages needed real endpoints. Bundled together since they're
both small and were built in the same session.

**Database**: `V5__secretary_ops_and_org_admin.sql` — adds `meetings`, `announcements`,
`documents`. Phase 13 needed no migration (reused existing `user_roles`/`users.status`/
`organizations` columns).

**Added beyond the frontend mock** (see [BUSINESS_RULES.md](BUSINESS_RULES.md) for detail):
server-side audience/visibility filtering on announcements and documents (the mock either didn't
filter at all or only filtered client-side); field-scoped authorization on organization settings
(the mock's single unrestricted `updateOrganization` action is split into an ORG_ADMIN-only
profile endpoint and an ORG_ADMIN-or-LOAN_COMMITTEE loan-policy endpoint); status-transition
validation on member suspend/activate (409 on anything other than active↔suspended).

**Testing**: see [TESTING.md](TESTING.md#phases-12-13). Full lifecycle tested for each new
resource against real dev data in the `tcs2` org — meeting create → record minutes; announcement
and document create with both `all` and `admins`-restricted visibility, verified a plain-member
account correctly can't see the restricted ones and gets 403 attempting to create; organization
profile and loan-policy updates, verified a loan-committee-only (non-admin) user gets 403 on
profile but 200 on loan-policy; member role replacement; member suspend → login correctly 403 →
reactivate → login correctly 200, with a real DB row and audit log entry checked at every step.

**Result**: PR #9, targeting `docs/project-documentation` (PR #8) as base since this phase's doc
edits build on that branch's new files — merge order noted in the PR: #7 (phase 11) → #8 (docs) →
#9 (this phase).

**Remaining issues found while testing**: newly created members are stuck `pending` forever (not
introduced by this phase — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)). Exit requests and
share-withdrawal requests remain unbuilt (also phase-13 roadmap scope).

---

## 2026-08-23 — Phase 11: Accountant reporting + ledger

**Changed**: New `reporting` package (`ReportingController`/`ReportingService`) —
`GET /reports/accountant-dashboard`, `GET /reports/financial`. Completed `LedgerController` —
`GET /ledger` (filter by type/method/memberId). New `common/WebConfig.java`.

**Why**: next roadmap phase — the accountant workspace's dashboard, reports, and transactions
pages needed real endpoints.

**Files/modules affected**: `reporting/*` (new), `ledger/LedgerController.java`,
`ledger/LedgerService.java`, `ledger/LedgerTransactionDto.java` (new), `ledger/
LedgerTransactionRepository.java`, `loan/LoanRepository.java`, `loan/LoanStatusCount.java` (new),
`member/MemberRepository.java`, `savings/SavingsTransactionRepository.java` (new query methods
added, no existing methods changed), `common/WebConfig.java` (new).

**Database**: no migration — purely new read queries against existing tables.

**Testing**: see [TESTING.md](TESTING.md#phase-11). All three endpoints hit against real dev data
in the `tcs2` org, every number cross-checked against hand-run SQL.

**Result**: merged via PR #7, low merge risk (additive/read-only, no existing endpoint changed).

**Remaining issues**: `totalInterestIncome`/`totalInsuranceCollected` always report zero — see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

---

## 2026-08-23 — Phases 9-10: Disbursement + salary-based repayment

**Changed**: `LoanDisbursementService` (disburse, record-repayment). New `ledger` package
(`LedgerTransaction` — the accountant-facing bookkeeping view, distinct from
`savings_transactions`).

**Why**: next roadmap phases; both share one frontend page (`accountant/`) so built together.

**Database**: `V4__disbursement_and_repayment.sql` — adds `ledger_transactions`.

**Testing**: full lifecycle — disburse → 6 (and separately 12) monthly repayments → `completed`
status, `remainingBalance = 0`; guarantee auto-release verified both in the DB and functionally.
20 ledger rows verified with exact amounts. Audit log confirmed for both actions (a gap vs. the
frontend mock, which only audits disbursement — fixed here per BACKEND_CONTRACT.md's "every
mutating endpoint" rule).

**Result**: merged via PR #6.

---

## 2026-08-23 — Phase 8: Loan contracts (PDF)

**Changed**: New `contract` package. `POST /loans/{id}/generate-contract`,
`GET /loans/{id}/contract` (renders live from current data, no stored snapshot — matches the
frontend). `LoanContractPdfGenerator` via OpenPDF, article-for-article port of
`LoanContract.tsx`.

**Testing**: generated PDF bytes read back and verified for both the guaranteed-loan branch (10
articles, "WISHINGIWE" title, guarantor clauses/signature, 2 pages) and self-covered branch (7
articles, "— ISANZWE" title, 1 page) — every interest/insurance amount and date matched hand
computation.

**Result**: merged via PR #5.

---

## 2026-08-23 — Phase 7: Loan committee review

**Changed**: `LoanReviewService` (start-review, committee-decision). **First phase to enforce the
committee-chair-only rule** for guaranteed loans (documented since planning, not implemented until
now — see [DECISIONS.md](DECISIONS.md)). Extracted `LoanDetailAssembler` as a shared component.

**Testing**: non-chair committee member correctly approved a self-covered loan, then correctly
403'd on a guaranteed loan; a chair user then correctly approved it.

**Result**: merged via PR #4.

---

## 2026-08-23 — Phase 6: Guarantors

**Changed**: `GuaranteeService`/`GuaranteeController` — accept/decline a guarantee request. Added
the guarantor-lock rule to `LoanApplicationService.apply()`.

**Result**: merged via PR #3.

---

## 2026-08-21 — Phase 5: Loan applications

**Changed**: New `loan` package — `LoanCalculator`, application submission, `guarantees` table.
Server-side loan eligibility (≥N months) and guarantor-requirement enforcement added beyond what
the frontend mock does.

**Database**: `V3__loans.sql`.

**Bugs found and fixed** (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the general pattern):
combining `@Enumerated` with an `autoApply` converter on `Loan.status`/`LoanTimelineEvent.stage`;
`GlobalExceptionHandler` missing a catch-all handler, causing unrelated 500s to masquerade as 401s.

**Result**: merged via PR #2.

---

## 2026-08-21 — Phase 4: Payroll/HR Excel import

**Changed**: New `payroll` package — Apache POI server-side `.xlsx` parsing, replacing the
frontend's SheetJS demo. Exact business rules ported from `importPayroll` (duplicate-detection
order preserved). `SavingsService` gained a generic `recordDeduction` method.

**Database**: `V2__payroll_import.sql`.

**Testing**: real generated `.xlsx` covering all four row outcomes plus the empty-sheet error
path.

**Result**: merged.

---

## 2026-08-20 — Phases 1-3: Vertical slice (auth, tenant, members, savings/shares)

**Changed**: First working backend — `auth`, `member`, `savings`, `security`, `tenant`,
`organization` packages. Org self-registration, login, JWT issuing, `/me`, member creation with
generated temp password, savings ledger with server-computed running balance, share purchases
priced from the org's own `share_value_rwf`, refresh-token rotation.

**Database**: `V1__vertical_slice.sql`.

**Testing**: RBAC correctly denies a plain member from listing/viewing others while allowing
self-access; genuine cross-tenant isolation verified across three separately-registered
organizations.

**Result**: merged via PR #1 (`feature/backend-foundation`).
