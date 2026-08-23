# Changelog

Dated log of what changed and why. One entry per merged PR/phase. See [DECISIONS.md](DECISIONS.md)
for the reasoning behind significant choices, and [TESTING.md](TESTING.md) for what was actually
verified.

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

**Result**: not yet pushed/PR'd as of this entry — see git history for the actual PR.

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
