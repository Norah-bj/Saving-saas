# Backend Contract — IkiminaConnect

This document describes the REST API the future Java 21 / Spring Boot 3 / PostgreSQL
backend must expose to replace the current in-memory zustand mock (`src/lib/store/data-store.ts`)
without changing the frontend's data shapes. Entity fields below mirror
`src/lib/types.ts` exactly — that file is the source of truth for field names and types.

## Architecture

```
Vite + React + React Router frontend (this repo)
        │  REST + JSON, JWT bearer auth
        ▼
Spring Boot 3 API (Spring Security, Spring Data JPA/Hibernate)
        │
        ▼
PostgreSQL — single shared database, single schema, organization_id on every
             tenant-scoped row. NOT schema-per-tenant (see "Multi-tenancy" below
             for why, and how a tenant can still move to dedicated infrastructure
             later without an application rewrite).
```

IkiminaConnect is a platform for many SACCOs/cooperatives; APUPEKA is the first real customer, not
the owner of the platform. Nothing in the architecture or schema should assume APUPEKA's specific
values (5,000 RWF share value, 5% interest, etc.) — those are `organizations` row data, configurable
per tenant, not constants.

Cross-cutting requirements:
- **Auth**: JWT access (~15 min) + refresh tokens (rotated, stored server-side hashed), RBAC matching
  the `Role` union (`member`, `secretary`, `accountant`, `loan-committee`, `hr`, `org-admin`,
  `super-admin`). A user's `roles[]` can contain more than one — every non-`super-admin` role also
  implies `member`, and admins must be able to switch between their admin workspace and their member
  workspace (mirrors the frontend's existing workspace switcher). JWT claims: `sub` (user id),
  `organizationId` (null for `super-admin`), `roles: string[]`, `committeeChair: boolean` (see
  "Committee-chair-only approval" below). All authorization is enforced server-side — the frontend's
  role-based UI is a convenience, never the source of truth.
- **Multi-tenancy**: every entity except the platform-level ones (`Organization`, `AuditLogEntry` with
  a **nullable** `organizationId` — NULL means platform-level, not the mock's `"platform"` string
  sentinel — and platform `BackupRecord`s) is scoped to an `organizationId`. Enforced in two layers:
  1. **Application layer (day one, mandatory)**: a Hibernate `@FilterDef`/`@Filter` bound to the
     authenticated request's `organizationId`, enabled per-request via a servlet filter reading the
     JWT claim, so every JPA query is scoped automatically rather than depending on each repository
     method remembering a `WHERE organization_id = ?`. `super-admin` requests disable the filter
     explicitly, and that's logged.
  2. **Database layer (phase-2 hardening, after the vertical slice works)**: Postgres Row-Level
     Security policies as defense-in-depth, via a session GUC set per connection checkout. Not
     required to ship the first vertical slice.
  Because every table carries `organization_id` from day one, moving one tenant to dedicated
  infrastructure later is a data export/restore into an otherwise-identical single-tenant database
  behind a different connection string — no entity or application-code changes. That's the whole
  point of the shared-schema design: it keeps the dedicated-infrastructure option open without
  building the provisioning/custom-domain automation now, which nobody has asked for yet.
- **File handling**: Excel import/export uses Apache POI server-side (the frontend currently parses
  client-side with SheetJS as a demo stand-in). PDF generation (loan contracts, statements) uses
  OpenPDF/iText server-side (the frontend currently renders a print-styled HTML page as a stand-in).
- **Audit log**: every mutating endpoint below should write an `AuditLogEntry`.
- **Migrations**: Flyway, versioned SQL files under `src/main/resources/db/migration` — see
  `docs/backend/schema.sql` for the first migration's contents (vertical slice tables) and
  `docs/backend/folder-structure.md` for where it lives in the Maven layout.

## Entities

Each maps 1:1 to the TypeScript interface of the same name in `src/lib/types.ts`.

| Entity | Notes |
|---|---|
| `Organization` | Tenant record. `plan` drives `SubscriptionPlan` limits. All lending/savings policy — `loanInterestRate`, `loanInsuranceRate`, `minMonthsBeforeEligible`, `allowedRepaymentPeriods`, and **`shareValue`** — lives here, per organization. Different SACCOs can and will have different values; nothing should hardcode APUPEKA's (5,000 RWF share, 5% interest, 1% insurance, 3-month eligibility). |
| `AppUser` | A member/officer. `nationalId` is the platform-wide unique identifier; `employeeId` is unique within an organization. `roles: Role[]`. For `loan-committee` members, also track `isCommitteeChair: boolean` — see the committee-chair rule below; do **not** infer chair status from the free-text `position` string. |
| `SavingsTransaction` | Append-only ledger row per member. `balanceAfter` is a running balance — compute server-side on insert, never trust client-supplied balances. |
| `ShareHolding` | One row per member; `totalShares × organizations.shareValue` = share value. `shareValue` moved to `Organization` (see above) — the frontend mock currently duplicates a `shareValue` field per `ShareHolding` row defaulted to 5000 everywhere, which isn't actually constrained to match across members. The backend schema fixes that: one authoritative value per organization. |
| `Loan` | Core lending entity. `timeline: LoanTimelineEvent[]` should probably be a child table (`loan_id`, `stage`, `date`, `officer`, `notes`) rather than a JSON column, for queryability. |
| `Guarantee` | Links a `Loan` to a guarantor `AppUser`. |
| `Meeting`, `Announcement`, `DocumentItem` | Org operations content. `DocumentItem` needs real file storage (S3/R2/MinIO) behind `uploadedDate`/`sizeKb`/a new `fileUrl`. |
| `LedgerTransaction` | Accountant-facing financial ledger, distinct from `SavingsTransaction` (this is the org's own bookkeeping view: disbursements, repayments, fees, interest income). |
| `PayrollImportSummary` / `PayrollImportRecord` | One summary row per uploaded file; records are the per-row validation detail, not necessarily persisted long-term (or persisted for audit purposes). |
| `ExitRequest`, `ShareWithdrawalRequest` | Simple approval-workflow entities (`RequestStatus`). |
| `AppNotification` | Per-user notification feed. |
| `AuditLogEntry` | Append-only. `organizationId: "platform"` for platform-level actions. |
| `BackupRecord` | `organizationId: "platform"` for platform-wide backups. |
| `SubscriptionPlan` | Mostly static reference data; could be a simple enum/config table rather than fully dynamic. |
| `RolePolicy` | CMS-like content (policy text), editable by `org-admin`/`loan-committee`. |

## Business rules the API must enforce (not just the UI)

These currently live in `src/lib/loan-calculator.ts` and `src/lib/store/data-store.ts` — port them
to the backend as the source of truth, since a real system can't trust client-computed numbers:

- **Interest**: flat 5% of the loan principal, always.
- **Insurance**: flat 1% of the loan principal, **only** when `amount > member's current savings
  balance` — which is exactly the condition that requires a guarantor.
- **Loan eligibility**: a member needs ≥ 3 months of continuous savings history before they can apply.
- **Guarantor lock**: a member who is an active (`accepted`) guarantor on someone else's loan cannot
  submit a new loan application of their own until that guarantee is released.
- **Loan status pipeline** (`LoanStatus`, ordered): `submitted → under-review → guarantor-approval
  (conditional) → committee-review → approved → contract-generated → disbursed → repaying →
  completed`, with `rejected` reachable from `under-review`, `guarantor-approval`, or `committee-review`.
- **Committee-chair-only approval on guaranteed loans** (confirmed real APUPEKA rule — see
  `src/lib/store/data-store.ts` lines 296–301 and the `loan_approval_workflow` project memory): a
  **self-covered** loan (`amount ≤ member's savings`) goes straight to committee review and can be
  approved by **any** Loan Committee member. A **guaranteed** loan (`amount > savings`) must have its
  guarantor accept first, and the final committee decision may only be made by the **Committee
  Chair** (`AppUser.isCommitteeChair = true`), not just any loan-committee user. The frontend mock
  currently does *not* enforce the chair-only half of this — the backend's `committee-decision`
  endpoint is where this becomes real: check `isCommitteeChair` fresh from the DB (not from a
  possibly-stale JWT claim) whenever `loan.insuranceRequired` is true, and reject with 403 otherwise.
- **Risk score**: currently a deterministic heuristic (`riskScoreFor` in `loan-calculator.ts`) based
  on loan-to-savings ratio, membership tenure, guarantor presence, and debt-service ratio vs salary —
  port the same formula or replace with a real underwriting model, but keep the 0–100 scale and the
  three risk bands (`riskBand`: ≥75 Low, ≥50 Moderate, <50 High) the frontend already renders.
- **Exit eligibility**: a member cannot submit an exit request while they have an outstanding loan
  (any status in `submitted, under-review, guarantor-approval, committee-review, approved,
  contract-generated, disbursed, repaying`) or while they are an active (`accepted`, not yet
  `released`) guarantor on someone else's loan — port `exitEligibility`/`OUTSTANDING_LOAN_STATUSES`
  from `data-store.ts`.
- **National ID uniqueness**: `nationalId` must be globally unique across the platform (it's the
  cross-organization identity anchor); `employeeId` unique per organization only.

## Suggested endpoint groups

REST, versioned under `/api/v1`, resource-oriented, org-scoped via the JWT's organization claim
(except where noted `[platform]`):

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/register` (org self-signup), `POST /auth/forgot-password`
- `GET/POST /members`, `GET/PATCH /members/{id}`, `POST /members/{id}/roles`, `POST /members/{id}/status`
- `GET /members/{id}/savings-ledger`, `POST /members/{id}/savings/voluntary`, `POST /members/{id}/shares/buy`,
  `POST /members/{id}/shares/withdraw`
- `GET/POST /loans`, `GET /loans/{id}`, `POST /loans/{id}/start-review`, `POST /loans/{id}/committee-decision`,
  `POST /loans/{id}/generate-contract`, `POST /loans/{id}/disburse`, `POST /loans/{id}/record-repayment`,
  `GET /loans/{id}/contract` (PDF)
- `GET/POST /guarantees`, `POST /guarantees/{id}/respond`
- `GET/POST /meetings`, `PATCH /meetings/{id}`
- `GET/POST /announcements`
- `GET/POST /documents`, `GET /documents/{id}/download`
- `GET /transactions` (ledger), `GET /reports/*` (per-role report aggregates)
- `POST /payroll/import` (multipart file upload, Apache POI parses server-side), `GET /payroll/imports`
- `GET/POST /exit-requests`, `POST /exit-requests/{id}/decision`
- `GET/POST /share-withdrawals`, `POST /share-withdrawals/{id}/decision`
- `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`
- `GET /policies`, `PUT /policies/{id}`
- `GET /organizations/{id}`, `PATCH /organizations/{id}` (branding/settings)
- `GET /backups`, `POST /backups`, `POST /backups/{id}/restore`
- `[platform] GET/POST /organizations`, `POST /organizations/{id}/status`, `POST /organizations/{id}/plan`
- `[platform] GET /audit-logs`, `GET /plans`, `GET /analytics/platform`

## Phased implementation roadmap

Build one real vertical slice first — **auth/tenant foundation → member management → savings/shares
ledger** — end to end (real Postgres, real JWT auth, real API, frontend consuming it instead of the
mock store) before touching anything else. See `docs/backend/schema.sql` for that slice's schema and
`docs/backend/vertical-slice-api.md` for its API design. Everything after that, in order:

1. Auth & tenant foundation
2. Member management
3. Savings & shares ledger *(vertical slice ends here)*
4. Payroll / HR Excel import
5. Loan applications
6. Guarantors
7. Loan Committee review
8. Loan contracts
9. Disbursement
10. Salary-based repayment
11. Accountant / reporting
12. Secretary — meetings, documents, announcements
13. Organization administration
14. Backups
15. Platform Super Admin
16. Notifications
17. Production deployment

Do not start module 4 onward until the vertical slice (1–3) is reviewed and working end to end,
frontend included.

## Migration notes

- The frontend's `lib/mock-data/*` seed files are a reasonable source for initial PostgreSQL seed/fixture
  data (realistic Rwandan names, departments, RWF amounts) when standing up a staging environment.
- `MOCK_TODAY` (`src/lib/mock-data/financials.ts`) stands in for `now()` throughout the mock data — the
  real backend obviously uses actual timestamps.
- Once the API exists, swap `src/lib/store/data-store.ts`'s zustand actions for TanStack Query
  mutations/queries hitting these endpoints; the component layer (pages, shared components) should not
  need to change since it already only talks to the store's selector/action interface.
