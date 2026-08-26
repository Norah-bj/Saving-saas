# Known issues / deliberately deferred work

## Real gaps

- **`totalInterestIncome`/`totalInsuranceCollected` are always zero.** No `interest-income` or
  `insurance-fee` typed `ledger_transactions` row is ever written anywhere (frontend mock or real
  backend) — there's no decided rule for revenue-recognition timing. See
  [BUSINESS_RULES.md](BUSINESS_RULES.md) and [DECISIONS.md](DECISIONS.md). Not a bug; a decision
  that hasn't been made yet.
- **`/auth/register` cannot attach a new user to an existing organization** — it always creates a
  brand-new org + its first ORG_ADMIN. There is no invite-a-new-staff-member-to-my-org flow.
- **No exit-settlement page/endpoint.** `secretary/ExitRequests.tsx` links an approved request to
  `/members/{id}/exit-settlement` — a separate settlement-calculation feature that was never
  requested and isn't built. Exit/share-withdrawal requests themselves (submit, decide, real share
  and savings-balance movement on approval) are fully built — see [FEATURES.md](FEATURES.md).
- **No committee-chair assignment endpoint.** `PUT /members/{id}/roles` (phase 13) replaces a
  member's role set but deliberately never grants chair status — it's still only settable directly
  via `UPDATE user_roles SET is_committee_chair = true` against the dev database. No frontend page
  exposes chair assignment either (`org-admin/Users.tsx`'s role editor has no chair toggle), so
  there's no UI-driven spec to port yet.
- **Newly created members are stuck `pending` forever.** Discovered while testing phase 13's
  `POST /members/{id}/status` (which correctly 409s trying to move a `pending` member to
  `active`/`suspended`, since that's not a transition it supports) — `MemberService.create` never
  calls `AppUser.activate()`, unlike the self-registering org-admin created by `/auth/register`,
  which does. Every member added via `POST /members` is `pending` indefinitely; nothing in the
  system currently moves them to `active`. Pre-existing gap from earlier phases, not introduced by
  phase 13 — just newly surfaced by it. `MemberStatus.pending` doesn't block login either (only
  `suspended`/`exited` do in `AuthService.login`), so this hasn't blocked anything functionally,
  but it means member status is not actually meaningful yet for freshly created members.
- **No real backup mechanism, and no restore endpoint at all.** `backup_records` (phase 14) is
  metadata tracking only — `size_mb` is a row-count-based proxy, not an actual file size, and
  nothing performs a real `pg_dump`. This matches the frontend mock, which also never implements
  restore (its "Restore" button only sets local component state, calling no store action). Real
  disaster-recovery automation is future work, and restoring a shared-schema multi-tenant database
  per-organization is a genuinely harder problem than a single-tenant `pg_dump`/`pg_restore` pair —
  worth designing deliberately when it's actually needed, not bolted on here.
- **Nothing creates a notification.** Phase 16 only built the inbox read side (list, mark-read,
  mark-all-read) — same gap as the frontend mock, where `NOTIFICATIONS` is static seed data despite
  per-type icons implying loan/meeting/announcement/savings events should push one. Wiring other
  services (loan status changes, new meetings, new announcements, ...) to actually create
  notifications is future work, deliberately not done here to avoid touching many already-shipped
  services' logic without an explicit decision on which events should notify whom.
- **Platform Super Admin (phase 15) deliberately covers only part of `super-admin/`'s 9 pages.**
  Asked the user how to scope it given the pages span very different maturity levels; chose "build
  only the real parts." Built: Organizations (list/status/plan), Analytics and Billing's
  plan-display (both derive from the same `GET /organizations` response, no new endpoint needed),
  AuditLogs. **Deliberately not built**: Monitoring (fabricated system uptime/response-time/DB-size
  numbers with no real observability pipeline behind them), Settings (fabricated platform API
  keys — this backend has no API-key auth mechanism, JWT-only), Support (a hardcoded ticket list
  not even wired to the mock's own data layer, i.e. no spec exists to port). Building those three
  for real would mean inventing entire new subsystems unrelated to anything else in this app —
  revisit only with an explicit decision to build real observability/API-key-auth/ticketing.
- **No SUPER_ADMIN bootstrap flow.** The only way to create a platform super-admin user today is a
  direct SQL insert (`organization_id = NULL`, a `user_roles` row with `role = 'super-admin'`) —
  `/auth/register` only ever creates an ORG_ADMIN + brand-new org. Fine for one dev-only test
  account; a real platform launch needs a real way to provision the first super-admin.
- **Email verification sends no real email yet.** `EmailService`'s only implementation
  (`ConsoleEmailService`) logs the verification link instead of sending it — chosen deliberately so
  this feature wasn't blocked on picking/paying for a real provider before one was needed. Before
  any real user registers, swap in a real implementation (SMTP, SendGrid, SES, ...) and remove
  `ConsoleEmailService`'s `@Service` annotation; nothing else needs to change, `EmailVerificationService`
  only depends on the `EmailService` interface. See [BUSINESS_RULES.md](BUSINESS_RULES.md).
- **Organization status doesn't gate anything.** `POST /organizations/{id}/status` (phase 15) can
  mark an org `suspended`, but `AuthService.login` never checks the logging-in user's
  *organization's* status, only the user's own — so a "suspended" organization's members can still
  log in and use the API normally today. See [BUSINESS_RULES.md](BUSINESS_RULES.md). Not fixed
  here since it touches already-shipped phase-1 auth code without being asked.

## Fixed bugs worth remembering (so the same mistake doesn't recur)

1. **Never combine `@Enumerated(EnumType.STRING)` with an `autoApply=true` `AttributeConverter`
   on the same entity field.** Hit on `Loan.status`/`LoanTimelineEvent.stage` in phase 5 —
   Hibernate silently preferred `@Enumerated`'s raw uppercase output over the converter, failing
   the DB's lowercase-hyphenated `CHECK` constraint on every insert. Fix: the field gets only
   `@Column`; enums *without* a converter (`MemberStatus`, `SubscriptionPlan`,
   `OrganizationStatus`, `PayrollImportStatus`, `GuaranteeStatus`) correctly keep
   `@Enumerated(STRING)` alone.
2. **`GlobalExceptionHandler` must always keep a catch-all `@ExceptionHandler(Exception.class)`.**
   Without one (phase 5), an unrelated 500 got masked as a misleading 401 "Authentication
   required" — `JwtAuthenticationFilter` clears the security context in its `finally` block, and
   doesn't re-run on Tomcat's internal `/error` forward dispatch, so the real exception never
   surfaced. Cost significant debugging time before the root cause was found. Fixed with a
   catch-all handler (logs at ERROR, returns proper 500) plus permitting `/error` in
   `SecurityConfig`.
3. **`@RequestParam` enum binding bypasses the hyphenated-value converter pattern** (phase 11) —
   see [DECISIONS.md](DECISIONS.md). Fixed via `common/WebConfig.java`; any *new* hyphenated enum
   used in a query param needs its converter added there too, or it will 500.
4. Spring Data derived-query methods like `findByIdAndOrganizationId(id, organizationId)` don't
   reliably resolve a nested `organization.id` path when the entity only has a `@ManyToOne
   Organization organization` relationship — fails at startup with `Could not resolve attribute
   'organizationId'`. Fix: keep the `@ManyToOne` for navigation, but also add a real read-only
   mirror column (`@Column(name = "organization_id", insertable = false, updatable = false)`) set
   manually in the constructor. Apply to any future entity that needs this kind of derived query.
5. A single named `@FilterDef` (e.g. `organizationFilter`) cannot be declared on more than one
   `@Entity` class, even identically — Hibernate 6 throws at startup. Declare it exactly once, in
   `tenant/package-info.java`; entities only add `@Filter(name = ..., condition = ...)`.

## Not a bug, just not done yet

- Row-Level Security (database-layer tenant isolation, defense-in-depth on top of the application
  layer) is designed but not implemented — see [ARCHITECTURE.md](ARCHITECTURE.md).
- The frontend is only partially wired to the real backend — member, secretary, and loan committee
  workspaces call it now, every other workspace (HR, Accountant, Org Admin, Super Admin) still
  runs on the zustand mock. See [FEATURES.md](FEATURES.md) and
  [ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration).
- Within the now-wired member workspace, three pages are deliberately still mock-only:
  `member/Policies.tsx` (reads `RolePolicy` content — no backend exists for this in any phase),
  and `LoanContract.tsx`/`ExitSettlement.tsx` (the backend already generates real PDFs for these —
  see [API.md](API.md)'s contract endpoints — but replacing the current bespoke HTML rendering with
  a PDF embed is a real design decision, not a data-source swap, so it wasn't done as part of this
  round of wiring).
- **`secretary/Members.tsx`'s "pre-fill from employee registry" picker was dropped, not wired.**
  The mock let a secretary pick an unregistered employee from a payroll-derived candidate list to
  auto-fill the add-member form — no backend endpoint exposes anything like "employees imported via
  payroll but not yet registered as members" (payroll import only records match/duplicate/
  no-match/invalid-amount outcomes against *existing* members, nothing about employees who aren't
  members yet). Manual entry (the rest of the form) is fully wired; the picker itself was removed
  rather than fabricated. Revisit if/when payroll import is extended to expose that data.
- **`GET /members`/`GET /loans` have no "get all" mode** — every staff page that needs the full
  roster or portfolio (`secretary/Members.tsx`, `Suspended.tsx`, `Dashboard.tsx`,
  `ExitRequests.tsx`'s name lookup, `org-admin/Users.tsx` once wired, and every `loan-committee/*`
  page) asks for one large page (`?size=500`) instead of paging through results, matching the
  mock's assume-everything-fits-in-memory shape. Fine at real-world SACCO scale; would need genuine
  pagination support (and paginated UI) to hold up at, say, thousands of records in one org.
- **`loan-committee/Policy.tsx`'s reference-policy list stays on mock data.** The editable loan
  calculation settings (interest/insurance rates, eligibility window, repayment periods) are fully
  wired to `PATCH /organizations/{id}/loan-policy`; the read-only "constitution and guarantor rule"
  reference text below it has no backend anywhere in the roadmap — same gap as
  `member/Policies.tsx`, kept rather than faked.
- No browser-automation tool was available while wiring the member workspace, so real
  click-through testing (login, submit a savings top-up, apply for a loan, respond to a guarantee
  request, etc.) in an actual browser has not been done by Claude and still needs a human — see
  [TESTING.md](TESTING.md).
- Backend is not deployed anywhere — see [DEPLOYMENT.md](DEPLOYMENT.md).
