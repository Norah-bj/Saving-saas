# Backend Contract — IkiminaConnect

This document describes the REST API the future Java 21 / Spring Boot 3 / PostgreSQL
backend must expose to replace the current in-memory zustand mock (`src/lib/store/data-store.ts`)
without changing the frontend's data shapes. Entity fields below mirror
`src/lib/types.ts` exactly — that file is the source of truth for field names and types.

## Architecture

```
Next.js frontend (this repo)
        │  REST + JSON, JWT bearer auth
        ▼
Spring Boot 3 API (Spring Security, Spring Data JPA/Hibernate)
        │
        ▼
PostgreSQL (one schema per organization or a shared schema with organization_id
            on every row — either works; row-level isolation is the hard requirement)
```

Cross-cutting requirements:
- **Auth**: JWT access + refresh tokens, RBAC matching the `Role` union (`member`, `secretary`,
  `accountant`, `loan-committee`, `hr`, `org-admin`, `super-admin`). A user's `roles[]` can contain
  more than one — every non-`super-admin` role also implies `member`.
- **Multi-tenancy**: every entity except the platform-level ones (`Organization`, `AuditLogEntry`
  with `organizationId: "platform"`, platform `BackupRecord`s) is scoped to an `organizationId`.
  All list/query endpoints must filter by the caller's organization unless the caller is `super-admin`.
- **File handling**: Excel import/export uses Apache POI server-side (the frontend currently parses
  client-side with SheetJS as a demo stand-in). PDF generation (loan contracts, statements) uses
  OpenPDF/iText server-side (the frontend currently renders a print-styled HTML page as a stand-in).
- **Audit log**: every mutating endpoint below should write an `AuditLogEntry`.

## Entities

Each maps 1:1 to the TypeScript interface of the same name in `src/lib/types.ts`.

| Entity | Notes |
|---|---|
| `Organization` | Tenant record. `plan` drives `SubscriptionPlan` limits. |
| `AppUser` | A member/officer. `nationalId` is the platform-wide unique identifier; `employeeId` is unique within an organization. `roles: Role[]`. |
| `SavingsTransaction` | Append-only ledger row per member. `balanceAfter` is a running balance — compute server-side on insert, never trust client-supplied balances. |
| `ShareHolding` | One row per member; `totalShares * shareValue` = share value. |
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
- **Risk score**: currently a deterministic heuristic (`riskScoreFor` in `loan-calculator.ts`) based
  on loan-to-savings ratio, membership tenure, guarantor presence, and debt-service ratio vs salary —
  port the same formula or replace with a real underwriting model, but keep the 0–100 scale and the
  three risk bands (`riskBand`: ≥75 Low, ≥50 Moderate, <50 High) the frontend already renders.
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

## Migration notes

- The frontend's `lib/mock-data/*` seed files are a reasonable source for initial PostgreSQL seed/fixture
  data (realistic Rwandan names, departments, RWF amounts) when standing up a staging environment.
- `MOCK_TODAY` (`src/lib/mock-data/financials.ts`) stands in for `now()` throughout the mock data — the
  real backend obviously uses actual timestamps.
- Once the API exists, swap `src/lib/store/data-store.ts`'s zustand actions for TanStack Query
  mutations/queries hitting these endpoints; the component layer (pages, shared components) should not
  need to change since it already only talks to the store's selector/action interface.
