# Architecture

## System shape

Two independent codebases in this one repo, not yet wired together:

- **Frontend** (repo root `src/`): Vite + React 18 + TypeScript + React Router + Tailwind v4 +
  shadcn/ui (base-ui flavor). Fully built and polished. Currently still runs against a zustand
  store seeded with mock data (`src/lib/mock-data/`, `src/lib/store/data-store.ts`) — it does not
  yet call the real backend. Deployed to Vercel (see [DEPLOYMENT.md](DEPLOYMENT.md)).
- **Backend** (`backend/`): Java 21 + Spring Boot 3.3.4 + PostgreSQL 17, built vertical-slice by
  vertical-slice against the frontend's existing mock behavior as the spec. Runs locally only —
  not yet deployed. See [FEATURES.md](FEATURES.md) for what's built so far.

The backend was built *after* the frontend, treating the frontend's mock data layer
(`src/lib/types.ts`, `src/lib/store/data-store.ts`) as the functional specification — entities,
field names, and business logic are ported from there unless a document below says otherwise. The
full rationale and entity-by-entity mapping lives in
[BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md).

**Rule while both exist side by side**: backend work changes *how* frontend pages will eventually
get data (swap a zustand mock action for a real API call), never *what* they render, unless a
change is technically unavoidable. The frontend's UI/UX is considered finished.

## Frontend structure

- `src/pages/` — one component per route, grouped by workspace/role folder (`member/`, `hr/`,
  `accountant/`, `secretary/`, `loan-committee/`, `org-admin/`, `super-admin/`, `auth/`)
- `src/routes.tsx` — the central route table
- `src/components/layout/` — sidebar, topbar, workspace switcher, `ProtectedLayout` (auth/role
  guard)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/shared/`, `src/components/charts/` — reusable dashboard building blocks
  (StatCard, DataTable, chart wrappers)
- `src/lib/types.ts` — the domain model (source of truth for backend entity design)
- `src/lib/store/data-store.ts` — zustand store; its action functions (`committeeDecision`,
  `disburseLoan`, `recordRepayment`, `importPayroll`, etc.) are the business-logic spec the
  backend ports
- `src/lib/mock-data/` — seed data
- `src/lib/loan-calculator.ts` — interest/insurance/schedule/risk-score math, ported to
  `backend`'s `LoanCalculator`

## Backend structure

Maven, package-by-feature under `rw.ikiminaconnect`:

```
tenant/       Hibernate @FilterDef declared once (package-info.java) for tenant isolation
security/     JWT issuing/parsing, Spring Security config, CurrentUser principal
common/       GlobalExceptionHandler, ApiError, PageResponse, shared exceptions, WebConfig
audit/        AuditService — every mutating action writes an audit_log row
organization/ Organization entity/repo (org-level settings: share value, interest rate, etc.)
auth/         Register/login/refresh/logout, /me
member/       AppUser (the member/staff entity), roles, member CRUD
savings/      Member-facing savings ledger, share purchases
payroll/      Excel (.xlsx) payroll import via Apache POI
loan/         Loan applications, guarantors, committee review, disbursement, repayment
contract/     PDF loan contract generation via OpenPDF
ledger/       Accountant-facing bookkeeping view (distinct from savings/ — see DATABASE.md)
reporting/    Accountant dashboard + financial report aggregations
```

Full original layout rationale: [backend/folder-structure.md](backend/folder-structure.md).

## Multi-tenancy

**Single shared PostgreSQL database, single schema.** Every tenant-scoped table carries
`organization_id`. Not schema-per-tenant, not dedicated infrastructure per customer — deliberately
deferred until a real customer needs it (see [DECISIONS.md](DECISIONS.md)).

Enforcement, two layers:
1. **Application layer (in place)**: a Hibernate `@Filter` (`organizationFilter`) bound to the
   authenticated request's `organization_id`, declared once in `tenant/package-info.java` and
   applied per-entity via `@Filter(name = "organizationFilter", condition = "organization_id =
   :orgId")`. Enabled per-request from the JWT's `organizationId` claim.
2. **Explicit repository scoping (the actual guarantee)**: every repository method that returns
   tenant data takes `organizationId` as an explicit parameter (e.g.
   `findByIdAndOrganizationId`) — this, not the Hibernate filter, is what's actually relied on
   for isolation; the filter is defense-in-depth.
3. **Database layer (planned, not yet built)**: Postgres Row-Level Security as a second layer of
   defense-in-depth. Not blocking — documented in BACKEND_CONTRACT.md.

Cross-tenant isolation has been verified end-to-end (three separately-registered orgs; a lookup
across orgs correctly 404s).

**Future dedicated-tenant migration path**: because every table already carries
`organization_id`, moving one tenant to its own database is a data export/restore into an
otherwise-identical database — no entity or application-code changes required.

## Auth / RBAC

- JWT access token (~15 min TTL) + rotated refresh token (stored server-side, old-token-reuse
  rejected). Claims: `sub` (user id), `organizationId` (null for platform super-admin), `roles:
  string[]`, `committeeChair: boolean`.
- Password hashing: Spring Security's `BCryptPasswordEncoder`.
- **Two enforcement layers on every endpoint**:
  1. Spring Security `@PreAuthorize` role checks (coarse — "is this user ACCOUNTANT or ORG_ADMIN").
  2. Service-layer business-rule checks, re-read fresh from the database, never trusted from the
     JWT (fine-grained — e.g. committee-chair status, which can change within a token's 15-minute
     lifetime). See [BUSINESS_RULES.md](BUSINESS_RULES.md).
- `committeeChair` is a real boolean on the user's role assignment (`user_roles.is_committee_chair`),
  never inferred from the free-text `position` title string the frontend mock uses as a label.
- **Third enforcement layer, request-wide rather than per-endpoint**: `EmailVerificationFilter`
  runs as a servlet filter (after `JwtAuthenticationFilter`, before Spring MVC dispatch) and blocks
  every request from an authenticated-but-unverified user except a small allowlist. Re-checks the
  database on every request rather than trusting a JWT claim, same reasoning as committee-chair
  above — verifying email should unblock access immediately, not after the next token refresh. See
  [BUSINESS_RULES.md](BUSINESS_RULES.md).
- **`email` package**: `EmailService` interface + `ConsoleEmailService` (the only implementation
  today — logs instead of sending real mail, since no provider account/credentials exist yet).
  Swappable behind the interface once one does — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Hyphenated-value enum pattern

Domain enums with a hyphenated wire format (e.g. `LoanStatus.CONTRACT_GENERATED` ↔
`"contract-generated"`) use: a Java `UPPER_SNAKE_CASE` enum + `toValue()`/`fromValue()` annotated
`@JsonValue`/`@JsonCreator` (covers JSON request/response bodies) **and** a separate
`@Converter(autoApply = true)` class (covers JPA persistence). Two rules that have each caused a
real bug when violated — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and
[DECISIONS.md](DECISIONS.md):
- The entity field must have **only** `@Column`, never also `@Enumerated` — combining both makes
  Hibernate silently prefer `@Enumerated`'s raw `UPPER_SNAKE_CASE` output over the converter.
- `@RequestParam`/`@PathVariable` bindings of these enums need an explicit `Converter` registered
  in `common/WebConfig.java` — Spring's default query-param binding calls `Enum.valueOf` directly
  and bypasses `fromValue`.
