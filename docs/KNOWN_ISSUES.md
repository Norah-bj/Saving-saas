# Known issues / deliberately deferred work

## Real gaps

- **`totalInterestIncome`/`totalInsuranceCollected` are always zero.** No `interest-income` or
  `insurance-fee` typed `ledger_transactions` row is ever written anywhere (frontend mock or real
  backend) — there's no decided rule for revenue-recognition timing. See
  [BUSINESS_RULES.md](BUSINESS_RULES.md) and [DECISIONS.md](DECISIONS.md). Not a bug; a decision
  that hasn't been made yet.
- **`/auth/register` cannot attach a new user to an existing organization** — it always creates a
  brand-new org + its first ORG_ADMIN. There is no invite-a-new-staff-member-to-my-org flow.
- **No exit endpoint, and no share-withdrawal endpoint.** Exit eligibility rules are ported into
  docs/memory but there's no `POST /members/{id}/exit` or `POST /share-withdrawals/{id}/decision`
  yet — remaining phase-13 scope.
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
- The frontend is not wired to the real backend at all yet — see [FEATURES.md](FEATURES.md).
- Backend is not deployed anywhere — see [DEPLOYMENT.md](DEPLOYMENT.md).
