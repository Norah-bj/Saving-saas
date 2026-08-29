# API — endpoints that actually exist today

All under `/api/v1`. This lists what's *built*, current through phases 1-16 plus the
exit/share-withdrawal-request completion of phase 13 — for the full planned
endpoint list (including future phases), see [BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md).
Concrete request/response JSON for the original vertical slice:
[backend/vertical-slice-api.md](backend/vertical-slice-api.md).

Role gate legend: **SELF_OR_STAFF** = the authenticated user themself, or ACCOUNTANT/SECRETARY/
ORG_ADMIN. Unmarked = any authenticated user of the org (no extra role check beyond login).

## Auth — `AuthController` (public, no token required for register/login/refresh)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Self-serve signup — always creates a **new** organization + its first ORG_ADMIN, and logs them in immediately (instant, no manual review). Cannot attach a new user to an existing org (no invite flow yet). The new admin starts `email_verified: false` and gets a verification email — see below and [BUSINESS_RULES.md](BUSINESS_RULES.md). |
| POST | `/auth/login` | |
| POST | `/auth/refresh` | Rotates the refresh token; rejects reuse of an old one. |
| POST | `/auth/logout` | Revokes the refresh token. |
| POST | `/auth/verify-email` | Body `{"token": "..."}`. No auth required — the token itself proves identity. 403 if invalid/expired/already used. |
| POST | `/auth/resend-verification` | Authenticated (the only `/auth/*` endpoint that is — needs to know *whose* verification to resend). 409 if already verified. |
| GET | `/me` | Authenticated. Includes `dateJoined` (added for `Profile.tsx`), `emailVerified`. One of the few endpoints reachable by an unverified user — see [BUSINESS_RULES.md](BUSINESS_RULES.md). |
| POST | `/auth/bootstrap-super-admin` | Public, but gated by a bootstrap token (not a JWT) — body includes `token`, checked against `app.super-admin-bootstrap-token` (`SUPER_ADMIN_BOOTSTRAP_TOKEN` env var, blank/disabled by default). 403 if the token is missing/wrong. 409 `"A platform super-admin already exists."` if one already exists — succeeds at most once, ever. On success, provisions a SUPER_ADMIN (`organizationId: null`) and returns the same `AuthResponse` shape as login/register (real access + refresh tokens). Body: `{token, fullName, nationalId, employeeId, email, phone, password}`. Not exposed in the frontend — a one-time operational action; see [DEVELOPMENT.md](DEVELOPMENT.md). |
| POST | `/auth/login` (organization-suspension note) | Also 403s with `"Your organization's account is suspended. Contact the platform administrator."` if the logging-in user's organization has `status: suspended`. `trial` never blocks login (billing signal only); a SUPER_ADMIN has no organization and can't be blocked by one. |

**Every endpoint below requires `email_verified: true`** (except for staff-created members and
super-admins, who are never gated) — an authenticated-but-unverified caller gets `403
{"error": "email_not_verified"}`. See [BUSINESS_RULES.md](BUSINESS_RULES.md) for the full rule.

## Members — `MemberController`

| Method | Path | Role |
|---|---|---|
| GET | `/members` | SECRETARY, ORG_ADMIN, HR. Paginated (`?search=`, standard `page`/`size`) — no "get all" mode; large-fetch callers pass a high `size`. `MemberSummary` includes `roles`, `monthlySalaryRwf`, `committeeChair`. HR was added alongside SECRETARY/ORG_ADMIN — it already had `GET /members/{id}` access but not the list, an inconsistency from before HR's own dashboard/reports pages needed a roster at all. |
| POST | `/members` | SECRETARY, ORG_ADMIN |
| GET | `/members/{id}` | self, or SECRETARY/ACCOUNTANT/ORG_ADMIN |
| GET | `/members/guarantor-candidates` | any authenticated user. Deliberately minimal — `{id, fullName, department}` only, excludes the caller. Added for the frontend's loan-application guarantor picker, which needs a member list but shouldn't get the staff-only `GET /members`'s sensitive fields (national ID, savings balance). |
| PUT | `/members/{id}/roles` | ORG_ADMIN. Replaces the member's full role set; MEMBER is always kept even if omitted. Does not touch committee-chair status — use the endpoint below instead. |
| PUT | `/members/{id}/committee-chair` | ORG_ADMIN. Body `{"chair": true\|false}`. Promoting (`true`) 409s unless the member already holds `loan-committee`, and 409s if they're already chair; demoting (`false`) 409s if they aren't currently chair. At most one chair per organization — promoting someone auto-demotes whoever currently holds it (both changes audited separately). See [DECISIONS.md](DECISIONS.md). |
| POST | `/members/{id}/status` | ORG_ADMIN. Body `{"status": "active"\|"suspended"}` only — the transition must be the opposite of the member's current status (409 otherwise); `exited`/`pending` aren't reachable through this endpoint. |
| GET | `/members/{id}/exit-eligibility` | self, or SECRETARY/ORG_ADMIN. Returns `{eligible, outstandingLoans: [{id, contractNumber, remainingBalance}], activeGuarantees: [{guaranteeId, loanContractNumber, amountGuaranteed}]}` — restructured from plain contract-number-string lists to these nested records so `Profile.tsx` can render real IDs/amounts, not just names. |

## Savings — `SavingsController` (`SELF_OR_STAFF`: self, or ACCOUNTANT/SECRETARY/ORG_ADMIN)

| Method | Path |
|---|---|
| GET | `/members/{memberId}/savings-ledger` |
| POST | `/members/{memberId}/savings/voluntary` |
| POST | `/members/{memberId}/shares/buy` |

## Payroll — `PayrollController` (HR, ACCOUNTANT)

| Method | Path |
|---|---|
| POST | `/payroll/import` (multipart/form-data, .xlsx) |
| GET | `/payroll/imports` |
| GET | `/payroll/imports/{id}` |

## Loans — `LoanController`

| Method | Path | Role |
|---|---|---|
| POST | `/loans/calculate` | any authenticated user |
| POST | `/loans` (apply) | any authenticated user |
| GET | `/loans` | any authenticated user (scoped server-side — staff see every org loan, a plain member sees only their own). `LoanSummaryDto` includes `decidedDate`: the approval date for approved-or-later loans, an `updatedAt`-derived approximation for rejected ones (no dedicated rejected-date column), `null` while undecided. Also includes `remainingBalance`/`monthlyInstallment` so a list of *every* active loan (not just one highlighted item) can render without a per-row detail fetch — see `accountant/Disbursement.tsx`. |
| GET | `/loans/{id}` | any authenticated user (scoped server-side). `LoanDetailDto` includes `guaranteeStatus` (the single guarantor's `pending`/`accepted`/`rejected`/`released`, or `null` if none required) — added since `GET /guarantees` is deliberately a personal "my requests as guarantor" inbox, unusable by staff reviewing someone else's loan. |
| POST | `/loans/{id}/start-review` | LOAN_COMMITTEE |
| POST | `/loans/{id}/committee-decision` | LOAN_COMMITTEE (chair-only for guaranteed loans — see [BUSINESS_RULES.md](BUSINESS_RULES.md)) |
| POST | `/loans/{id}/generate-contract` | ACCOUNTANT, ORG_ADMIN |
| GET | `/loans/{id}/contract` | any authenticated user (renders live PDF, no status gate) |
| POST | `/loans/{id}/disburse` | ACCOUNTANT, ORG_ADMIN |
| POST | `/loans/{id}/record-repayment` | ACCOUNTANT, ORG_ADMIN |

## Guarantees — `GuaranteeController`

| Method | Path | Notes |
|---|---|---|
| GET | `/guarantees` | Always "my requests as guarantor" — a personal inbox, not org-wide. |
| POST | `/guarantees/{id}/respond` | Only the named guarantor may respond (403 for anyone else, including the borrower); responding twice is rejected (409). |

## Ledger — `LedgerController` (ACCOUNTANT, ORG_ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/ledger` | Filterable by `type`, `method`, `memberId`; paginated. |

## Reporting — `ReportingController` (ACCOUNTANT, ORG_ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/reports/accountant-dashboard` | `AccountantDashboardDto` includes `totalSharesValueRwf` (`totalShares × organizations.share_value_rwf`, summed org-wide) — added for `org-admin/Dashboard.tsx`'s "Total Shares Value" stat; `accountant/Dashboard.tsx` has no shares stat and simply doesn't use the field. |
| GET | `/reports/financial` | |

## Meetings — `MeetingController`

| Method | Path | Role |
|---|---|---|
| GET | `/meetings` | any authenticated user of the org |
| POST | `/meetings` | SECRETARY, ORG_ADMIN |
| POST | `/meetings/{id}/minutes` | SECRETARY, ORG_ADMIN. Sets `minutesSummary` and moves status to `completed` — the only supported meeting update. |

## Announcements — `AnnouncementController`

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/announcements` | any authenticated user | A plain member (no role beyond MEMBER) never receives `audience: "admins"` rows — filtered server-side. Added beyond the frontend mock, which shows every announcement to every viewer regardless of audience. |
| POST | `/announcements` | SECRETARY, ORG_ADMIN | |

## Documents — `DocumentController`

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/documents` | any authenticated user | A plain member never receives `visibility: "admins"` rows — filtered server-side (the mock only hid these client-side). Metadata only — no real file storage or download endpoint exists; see [KNOWN_ISSUES.md](KNOWN_ISSUES.md). |
| POST | `/documents` | SECRETARY, ORG_ADMIN | |

## Organizations — `OrganizationController` (path is always the caller's own org — `#id == authentication.principal.organizationId()`, enforced on every method)

| Method | Path | Role |
|---|---|---|
| GET | `/organizations/{id}` | any authenticated user of that org. Now also returns `shareValueRwf`, `loanInterestRate`, `loanInsuranceRate`, `minMonthsBeforeEligible`, `allowedRepaymentPeriods` — needed by `member/Shares.tsx` and `member/LoanApply.tsx` once wired to real data. |
| PATCH | `/organizations/{id}/profile` | ORG_ADMIN only. Branding/contact fields (`org-admin/Settings.tsx`). |
| PATCH | `/organizations/{id}/loan-policy` | ORG_ADMIN or LOAN_COMMITTEE. Interest/insurance rates, eligibility window, repayment periods (`loan-committee/Policy.tsx`). Rates are fractions (`0.05` = 5%), matching how this backend stores them everywhere — not the frontend mock's whole-percentage UI convention; see [DECISIONS.md](DECISIONS.md). |

Split into two endpoints (rather than BACKEND_CONTRACT.md's single suggested `PATCH
/organizations/{id}`) specifically so each field group can carry its own authorization — ORG_ADMIN
shouldn't need loan-policy access to update branding, and LOAN_COMMITTEE shouldn't be able to touch
branding/contact fields just because it can edit loan policy.

## Platform organizations — `PlatformOrganizationsController` (SUPER_ADMIN only)

| Method | Path | Notes |
|---|---|---|
| GET | `/organizations` | Every organization on the platform — not scoped to the caller's own, unlike `OrganizationController` above. `OrganizationDto` includes `createdAt` and `memberCount` (a single grouped query across every org, not one count query per org) — added for `super-admin/Organizations.tsx` and `Analytics.tsx`. Analytics and Billing's plan display derive entirely from this response client-side, same as the frontend mock. |
| POST | `/organizations/{id}/status` | Body `{"status": "active"\|"suspended"\|"trial"}`. 409 on a no-op (already at that status) — no other transition restriction, since organization status doesn't gate anything yet (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)). |
| POST | `/organizations/{id}/plan` | Body `{"plan": "starter"\|"growth"\|"enterprise"}`. |

Separate controller/base path from `OrganizationController` (`/organizations` vs.
`/organizations/{id}`, no `#id == my org` check) — a platform view has no self-scoping to enforce,
so it doesn't share the self-scoped controller's `@PreAuthorize` shape.

## Audit log — `AuditLogController` (SUPER_ADMIN, ORG_ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/audit-logs` | SUPER_ADMIN sees every audit entry across every org, plus platform-level (`organizationId: null`) rows, and may narrow to one org with `?organizationId={uuid}`. ORG_ADMIN is always forced to their own org server-side regardless of that query param — an org-admin can never see another tenant's trail or platform-level rows. Used by `org-admin/Dashboard.tsx`'s "Recent Activity". |

## Backups — `BackupController` (ORG_ADMIN, SUPER_ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/backups` | ORG_ADMIN sees only their own org's records; SUPER_ADMIN sees every record, including platform-wide ones (works automatically since a super-admin's JWT already carries a null `organizationId`). |
| POST | `/backups` | Creates a record scoped to the caller — ORG_ADMIN's own org, or platform-wide (`organizationId: null`) for SUPER_ADMIN. Metadata only, no real backup file — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md). |

## Notifications — `NotificationController`

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | Always the caller's own inbox (scoped by `userId`, no organization-level view). |
| POST | `/notifications/{id}/read` | 404 if the notification belongs to someone else — never a 403 that would reveal it exists. |
| POST | `/notifications/read-all` | |

No endpoint creates a notification — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Policies — `PolicyController`

| Method | Path | Notes |
|---|---|---|
| GET | `/policies` | Any authenticated member of the org. Read-only reference/constitution text — 8 documents (membership, savings, shares, loan, guarantor, suspension, exit, privacy), seeded identically for every organization (`V9__policy_documents.sql` for pre-existing orgs, `PolicyDocumentSeeder` in `AuthService.register()` for new ones). No update endpoint exists. |

## Exit requests — `ExitRequestController`

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/exit-requests` | SELF_OR_STAFF | SECRETARY/ORG_ADMIN see every request in the org; a plain member sees only their own. |
| POST | `/exit-requests` | any authenticated user | Self only — the caller's own `userId` is always the target, there's no way to submit on someone else's behalf. 409 if the caller already has a pending request. |
| POST | `/exit-requests/{id}/decision` | SECRETARY, ORG_ADMIN | Body `{"decision": "approve"\|"reject"}`. Approving re-checks eligibility server-side (409 if the member has since become ineligible) and sets the member's status to `exited`; 409 if the request was already decided. |

## Share withdrawals — `ShareWithdrawalRequestController`

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/share-withdrawals` | SELF_OR_STAFF | SECRETARY/ORG_ADMIN see every request in the org; a plain member sees only their own. |
| POST | `/share-withdrawals` | any authenticated user | Self only. 409 if the requested share count exceeds the member's current holding. |
| POST | `/share-withdrawals/{id}/decision` | SECRETARY, ORG_ADMIN | Body `{"decision": "approve"\|"reject"}`. Approving actually moves the shares and money — decrements `share_holdings`, writes a `WITHDRAWAL` `savings_transactions` row reducing the running balance — genuinely more than the frontend mock does (its `decideShareWithdrawal` only flips a status flag); see [BUSINESS_RULES.md](BUSINESS_RULES.md). |

## Not built yet — needed but currently only reachable via direct SQL

- Anything creating a notification (nothing does yet, anywhere).
- Backup restore (no endpoint — the frontend mock doesn't implement it either; see
  [DECISIONS.md](DECISIONS.md) for why restore is deliberately out of scope even once real backups
  ship).
- Platform Super Admin's Monitoring, Settings (API keys), and Support — deliberately not built;
  see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for why.
