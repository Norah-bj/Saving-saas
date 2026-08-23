# Database

PostgreSQL 17, one shared schema (`public`), multi-tenant via `organization_id` on every
tenant-scoped table (see [ARCHITECTURE.md](ARCHITECTURE.md)). Migrations via Flyway,
`backend/src/main/resources/db/migration/`.

**Full DDL, kept in sync with every migration**: [backend/schema.sql](backend/schema.sql).

## Migration history

| Migration | Phase(s) | Adds |
|---|---|---|
| `V1__vertical_slice.sql` | 1-3 | `organizations`, `users`, `user_roles`, `savings_transactions`, `share_holdings`, `refresh_tokens`, `audit_log` |
| `V2__payroll_import.sql` | 4 | `payroll_imports`, `payroll_import_rows` |
| `V3__loans.sql` | 5 | `loans`, `loan_timeline_events`, `guarantees` |
| `V4__disbursement_and_repayment.sql` | 9-10 | `ledger_transactions` |

Phases 6-8 and 11 added no migration (guarantor response, committee review, and contract
generation reused the phase-5 `loans`/`guarantees` tables; phase 11 reporting/ledger is read-only
against existing tables).

**Rule**: once applied, a migration file is immutable — a later phase that needs schema changes
adds a new `V{n+1}__description.sql`, never edits an existing one.

## Key tables (see schema.sql for full DDL)

- **organizations** — one row per tenant. Carries org-level policy settings that are configurable,
  not hardcoded: `share_value_rwf`, `loan_interest_rate`, `loan_insurance_rate`,
  `min_months_before_eligible`, `allowed_repayment_periods` (int array), `min_monthly_saving_rwf`.
- **users** — both members and staff are the same table (`AppUser` entity); `user_roles` is a
  separate join table (`user_id`, `role`, `is_committee_chair`) since one user can hold multiple
  roles (e.g. a member who is also on the loan committee).
- **savings_transactions** — the member-facing savings ledger (running `balance_after` computed
  server-side on write). Distinct from **ledger_transactions**, the accountant-facing bookkeeping
  view (disbursements, repayments, fees) — the two are written together for money-moving actions
  but serve different UI pages and different reporting needs. See phase 9-10 note below.
- **loans** / **loan_timeline_events** / **guarantees** — loan lifecycle, its audit trail, and the
  guarantor relationship. `loans.status` uses the hyphenated-enum-with-converter pattern (see
  ARCHITECTURE.md) — a real bug (combining `@Enumerated` with the converter) was found and fixed
  here; see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) history / [DECISIONS.md](DECISIONS.md).
- **payroll_imports** / **payroll_import_rows** — one row per uploaded Excel file, one child row
  per spreadsheet row with its outcome (matched/duplicate/no-match/invalid).
- **refresh_tokens** — hashed, rotated on use, old-token-reuse rejected.
- **audit_log** — `organization_id` is nullable (NULL = platform-level action), unlike the
  frontend mock's `"platform"` string sentinel.

## Constraints worth knowing

- `national_id` is globally unique across the whole platform (one person, one national ID, even
  across organizations).
- `employee_id` is unique **per organization** (`UNIQUE(organization_id, employee_id)`), not
  globally.
- Indexes on `(organization_id, member_id, occurred_on/created_at)` for both ledger tables, since
  that's the shape of every reporting/history query.

## Seed / test data

No seed data is scripted — all dev-database rows so far were created through real API calls
during interactive testing sessions across phases. See [DEVELOPMENT.md](DEVELOPMENT.md) for the
current known dev test credential and the local Postgres connection details.
