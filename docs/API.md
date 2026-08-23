# API — endpoints that actually exist today

All under `/api/v1`. This lists what's *built*, current as of phase 13 — for the full planned
endpoint list (including future phases), see [BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md).
Concrete request/response JSON for the original vertical slice:
[backend/vertical-slice-api.md](backend/vertical-slice-api.md).

Role gate legend: **SELF_OR_STAFF** = the authenticated user themself, or ACCOUNTANT/SECRETARY/
ORG_ADMIN. Unmarked = any authenticated user of the org (no extra role check beyond login).

## Auth — `AuthController` (public, no token required for register/login/refresh)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Self-serve signup — always creates a **new** organization + its first ORG_ADMIN. Cannot attach a new user to an existing org (no invite flow yet). |
| POST | `/auth/login` | |
| POST | `/auth/refresh` | Rotates the refresh token; rejects reuse of an old one. |
| POST | `/auth/logout` | Revokes the refresh token. |
| GET | `/me` | Authenticated. |

## Members — `MemberController`

| Method | Path | Role |
|---|---|---|
| GET | `/members` | SECRETARY, ORG_ADMIN |
| POST | `/members` | SECRETARY, ORG_ADMIN |
| GET | `/members/{id}` | self, or SECRETARY/ACCOUNTANT/ORG_ADMIN |
| PUT | `/members/{id}/roles` | ORG_ADMIN. Replaces the member's full role set; MEMBER is always kept even if omitted. Does not touch committee-chair status (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)). |
| POST | `/members/{id}/status` | ORG_ADMIN. Body `{"status": "active"\|"suspended"}` only — the transition must be the opposite of the member's current status (409 otherwise); `exited`/`pending` aren't reachable through this endpoint. |

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
| GET | `/loans` | any authenticated user (scoped server-side) |
| GET | `/loans/{id}` | any authenticated user (scoped server-side) |
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

| Method | Path |
|---|---|
| GET | `/reports/accountant-dashboard` |
| GET | `/reports/financial` |

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
| GET | `/organizations/{id}` | any authenticated user of that org |
| PATCH | `/organizations/{id}/profile` | ORG_ADMIN only. Branding/contact fields (`org-admin/Settings.tsx`). |
| PATCH | `/organizations/{id}/loan-policy` | ORG_ADMIN or LOAN_COMMITTEE. Interest/insurance rates, eligibility window, repayment periods (`loan-committee/Policy.tsx`). Rates are fractions (`0.05` = 5%), matching how this backend stores them everywhere — not the frontend mock's whole-percentage UI convention; see [DECISIONS.md](DECISIONS.md). |

Split into two endpoints (rather than BACKEND_CONTRACT.md's single suggested `PATCH
/organizations/{id}`) specifically so each field group can carry its own authorization — ORG_ADMIN
shouldn't need loan-policy access to update branding, and LOAN_COMMITTEE shouldn't be able to touch
branding/contact fields just because it can edit loan policy.

## Not built yet — needed but currently only reachable via direct SQL

- Committee-chair assignment (still only settable via `UPDATE user_roles SET is_committee_chair
  = true` directly against the dev DB — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)).
- Exit requests and share-withdrawal requests (remaining phase-13 scope).
- Backups, platform Super Admin, and notifications — see [FEATURES.md](FEATURES.md) for the full
  roadmap status.
