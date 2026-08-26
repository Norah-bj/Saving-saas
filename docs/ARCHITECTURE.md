# Architecture

## System shape

Two codebases in this one repo, now **partially** wired together (member, secretary, loan
committee, and accountant workspaces so far — see
[Frontend/backend integration](#frontendbackend-integration) below):

- **Frontend** (repo root `src/`): Vite + React 18 + TypeScript + React Router + Tailwind v4 +
  shadcn/ui (base-ui flavor), TanStack React Query for server state. Fully built and polished. The
  member, secretary, loan committee, and accountant workspaces now call the real backend; every
  other workspace (HR, Org Admin, Super Admin) still runs entirely against the zustand mock store
  (`src/lib/mock-data/`, `src/lib/store/data-store.ts`). Deployed to Vercel (see
  [DEPLOYMENT.md](DEPLOYMENT.md)) — the deployed build still points at mock data until the backend
  itself is deployed too.
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

## Frontend/backend integration

The member workspace (`src/pages/member/*`, plus `Profile.tsx`/`Notifications.tsx`), the secretary
workspace (`src/pages/secretary/*`), the loan committee workspace (`src/pages/loan-committee/*`),
and the accountant workspace (`src/pages/accountant/*`) are wired to the real backend; every other
workspace still runs on the zustand mock store. Wiring follows this shape, established once and
meant to be reused as later workspaces are converted:

- **`src/lib/api/client.ts`** — a single shared `fetch` wrapper (`apiClient.get/post/put/patch`).
  Attaches `Authorization: Bearer` from the auth store; on a 401 from any endpoint *except*
  `/auth/*` itself, attempts one `/auth/refresh` and retries once before giving up and logging out
  (a 401 from `/auth/login` itself means bad credentials, not an expired session — deliberately
  not treated the same way). Throws a typed `ApiError` matching the backend's real `{error,
  message, timestamp, details}` shape. Also handles file uploads: when the request body is a
  `FormData` instance, it's passed straight to `fetch` without JSON-stringifying and without
  setting `Content-Type` — `fetch` fills in the correct `multipart/form-data` boundary itself, and
  setting the header manually would drop it. First (and so far only) consumer:
  `payroll.ts`'s `useImportPayroll`.
- **`src/lib/store/auth-store.ts`** — `accessToken`/`refreshToken`/`user` (the JWT's lightweight
  `AuthResponse.UserSummary`), persisted. Replaces the auth half of the old `session-store.ts`;
  that file now only holds `activeRole` (which workspace the user is currently viewing) — a real
  client-only UI concern, unrelated to authentication, kept separate on purpose.
- **`src/lib/hooks/use-current-user.ts`** — combines the auth store's lightweight `user` with a
  `useQuery(['me'], ...)` call to `GET /me` for the full profile (email, phone, department,
  status, `dateJoined`, ...) that pages like `Profile.tsx` need beyond the JWT claims.
- **One `src/lib/api/{resource}.ts` file per backend package** (`savings.ts`, `loans.ts`,
  `guarantees.ts`, `membership.ts`, `secretary-ops.ts`, `notifications.ts`, `organization.ts`,
  `members.ts`) — thin typed functions/React Query hooks built on `apiClient`, one file per
  resource area mirroring the backend's own package structure.
- **Adapter pattern, not redesign**: every converted page keeps its exact existing JSX. Where a
  backend DTO's shape or units genuinely differ from what the existing frontend types/components
  expect, the *API layer* adapts — not the page, not the shared component. Two real examples so
  far (both in `src/lib/api/loans.ts`): backend interest/insurance rates are fractions (`0.05`)
  but the frontend type/every consumer expects whole percentages (`5`); the backend's savings
  ledger returns newest-first but every consumer (chart series, statement math) assumes
  oldest-first. Both are corrected once, in the adapter, so shared components like
  `LoanStagePipeline`/`LoanTimelineList` (typed against the frontend's own `Loan` type) work
  unchanged against real data.
- **List-endpoint vs. detail-endpoint gaps**: a couple of list endpoints (`GET /loans`) don't carry
  every field the UI needs for a "highlighted" item (e.g. `remainingBalance` for the active-loan
  summary card) — only the detail endpoint does. Rather than changing the list endpoint's shape,
  the affected pages (`member/Loans.tsx`, `member/Dashboard.tsx`) fetch the one relevant item's
  full detail separately. A pattern to repeat, not a one-off workaround.
- **New minimal endpoint for a real access-control gap**: `GET /members/guarantor-candidates`
  exists because the loan-application guarantor picker needs a list of fellow members, but the
  only existing member-list endpoint (`GET /members`) is staff-only and returns sensitive fields
  (national ID, savings balance) that shouldn't be broadly exposed. The new endpoint is
  deliberately minimal (`{id, fullName, department}` only) and open to any authenticated member —
  narrower access needs get a narrower endpoint, not a loosened existing one.
- **Shared `PageResponse<T>` type** (`client.ts`) mirrors the backend's `common.PageResponse<T>` —
  every paginated list endpoint (`GET /members`, and future ones) returns the same
  `{content, page, size, totalElements, totalPages}` shape, so one type covers all of them. Pages
  that want "everything" rather than real pagination (matching the mock's assume-it-all-fits
  shape) ask for one large page (`?size=500`) instead of paging through results — see
  `useMembers()` in `members.ts` and [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
- **`DataTable`'s per-row `cell` callbacks aren't components** — they run inline during the
  parent's render, so a cell that needs its own data fetch (e.g. exit-eligibility per pending exit
  request, to show a real-time "blocked" reason) must be pulled into an actual subcomponent so its
  hook call is legal. See `secretary/ExitRequests.tsx`'s `BlockReasonCell`.
- **JWT-derived flags shown in the UI are informational only, never the actual gate**: real
  server-side authorization the frontend can usefully preview (e.g. `committeeChair`, used by
  `loan-committee/PendingDetail.tsx` to show "only the Chair can decide this" instead of Approve/
  Reject buttons that would 403) is read from the auth store's lightweight JWT claim purely to
  decide what to *render*. The enforcement itself always stays server-side, re-checked fresh from
  the database on every request — the same rule already established for backend business logic
  (see the loan approval workflow in [BUSINESS_RULES.md](BUSINESS_RULES.md)), just extended to how
  the frontend uses that same claim.
- **CORS**: already configured before this integration work started (`app.cors.allowed-origins` in
  `application.yml`, defaulting to `http://localhost:3000`) — verified working with real
  browser-`Origin` requests, not just same-origin `curl`.
- **No browser-automation tool exists in this environment.** Everything above was verified via real
  HTTP round-trips (`curl` with a real `Origin` header, checked against a running backend) and a
  clean `tsc -b`/`vite build`, plus a manual check that every converted page calls its data hooks
  before any early `return null` (a common React crash `tsc` doesn't catch). Actually clicking
  through the running app in a browser has not been done by Claude and still needs a human.
