# API — endpoints that actually exist today

All under `/api/v1`. This lists what's *built*, current as of phase 11 — for the full planned
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

No role-assignment endpoint exists yet (`POST /members/{id}/roles` is planned, phase 13 —
see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)).

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

## Not built yet — needed but currently only reachable via direct SQL

- Any role-assignment endpoint (staff roles are currently granted via `INSERT INTO user_roles`
  directly against the dev DB — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)).
- Everything under secretary ops (meetings/documents/announcements), organization administration,
  backups, platform Super Admin, and notifications — see [FEATURES.md](FEATURES.md) for the full
  roadmap status.
