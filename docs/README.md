# IkiminaConnect documentation

IkiminaConnect (branded "APUPEKA Digital Savings and Loan Cooperative" for its first real
customer) is a multi-tenant SACCO/cooperative savings-and-loan platform: members save through
payroll deduction or voluntarily, buy shares, apply for loans that go through a guarantor +
committee approval workflow, and staff (HR, Accountant, Secretary, Org Admin) run the
cooperative's day-to-day operations. A future Platform Super Admin role manages the SaaS itself
across many organizations.

This `docs/` directory is the project's persistent memory — it should always describe the
**current** state of the system, not just its original design. Update the relevant file(s) below
as part of every change, not after the fact (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## Map

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Frontend + backend architecture, multi-tenancy, auth/RBAC, folder structure |
| [DATABASE.md](DATABASE.md) | Schema overview, migration history, key constraints |
| [API.md](API.md) | Every real endpoint that exists today, by controller |
| [FEATURES.md](FEATURES.md) | What's built (by phase) vs. not yet started |
| [BUSINESS_RULES.md](BUSINESS_RULES.md) | Domain rules enforced by the backend (approval workflows, eligibility, locks) |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Toolchain, local setup, git/PR workflow, testing pattern |
| [TESTING.md](TESTING.md) | What's been tested per phase and how |
| [DECISIONS.md](DECISIONS.md) | Why things were built the way they were, alternatives considered |
| [CHANGELOG.md](CHANGELOG.md) | Dated log of what changed, why, and what was tested |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Real gaps, deliberately deferred work, things to fix later |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Hosting today, and what's still needed for production |

## Pre-existing design documents (still current, not duplicated here)

These were written before the backend build started and remain the source of truth for the
*original* design intent — `ARCHITECTURE.md` and `API.md` point into them rather than repeating
their content:

- [BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md) — full entity list, business rules, complete
  planned endpoint list (including phases not yet built), multi-tenancy rationale
- [backend/schema.sql](backend/schema.sql) — DDL, kept in sync with each new Flyway migration
- [backend/DEV_SETUP.md](backend/DEV_SETUP.md) — local Postgres/toolchain setup
- [backend/vertical-slice-api.md](backend/vertical-slice-api.md) — concrete request/response JSON
  for the original auth → members → savings vertical slice
- [backend/folder-structure.md](backend/folder-structure.md) — Maven package layout
