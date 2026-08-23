# Technical decisions

Dated, most recent first. Format: **Decision** / **Reason** / **Alternatives considered** /
**Impact**.

---

### Query-param hyphenated enums need an explicit converter (2026-08-23, phase 11)

**Decision**: Added `common/WebConfig.java` (`WebMvcConfigurer.addFormatters`) registering a
`Converter<String, EnumType>` per hyphenated enum used in a `@RequestParam`, calling the enum's
own `fromValue`.

**Reason**: Spring's default `@RequestParam` enum binding calls `Enum.valueOf` directly and
bypasses the `@JsonCreator fromValue` used everywhere else for this codebase's hyphenated-value
enum pattern. Request *bodies* go through Jackson and work fine; query *params* don't.
`GET /ledger?type=loan-disbursement-adjustment` 500'd until this was fixed.

**Alternatives considered**: change the `@RequestParam` types to `String` and call `fromValue`
manually inside each controller method — rejected as something that would have to be
remembered/repeated at every future filterable endpoint, whereas the `WebConfig` converter fixes
it once for the whole app.

**Impact**: any future `@RequestParam`/`@PathVariable` typed as one of these hyphenated enums must
have its converter added to `WebConfig`, or it will 500 on every value containing a hyphen.

---

### Interest income / insurance fee recognition timing left undecided (2026-08-23, phase 11)

**Decision**: Ported the accountant reporting aggregations faithfully — they correctly compute
`totalInterestIncome`/`totalInsuranceCollected` from whatever `ledger_transactions` rows exist,
which today is none, so both are always zero.

**Reason**: no business rule specifies whether interest/insurance revenue should be recognized
upfront at disbursement, amortized per installment, or at loan completion. The frontend mock never
writes such a row either — this is a real gap inherited from the mock, not something introduced
by the backend.

**Alternatives considered**: guessing a recognition point and retroactively adding
ledger-writing logic to the already-shipped phase 9-10 disburse/repay methods — rejected, since an
assumption baked into shipped code is harder to unwind than an honest zero.

**Impact**: a future phase must make this decision explicitly before these two metrics will show
real numbers.

---

### Committee-chair-only final approval is new backend logic, not a port (2026-08-21, phase 7)

**Decision**: A guaranteed loan can only receive final committee approval from the user with
`is_committee_chair = true`, re-read fresh from the DB on every decision.

**Reason**: this is a real, confirmed APUPEKA rule that the frontend mock never enforced (any
`loan-committee` user could decide any loan in the mock). Not implementing it would leave the most
sensitive approval in the system unprotected.

**Alternatives considered**: trusting the JWT's role claims for this check — rejected because a
15-minute-old token could carry stale chair status, a real privilege-escalation window on the
single most consequential decision in the app.

**Impact**: see [BUSINESS_RULES.md](BUSINESS_RULES.md). Any future sensitive-approval endpoint
should follow the same "re-read the authorizing fact from the DB, don't trust the token" pattern.

---

### Multi-tenancy: single shared schema, not schema-per-tenant or dedicated infra (2026-08-19, planning)

**Decision**: One PostgreSQL database/schema, `organization_id` on every tenant-scoped table.

**Reason**: the user was initially pitched a "build custom-domain provisioning and dedicated
enterprise infrastructure from day one" architecture. Agreed the tenant-scoped data model must be
right from day one (hard to retrofit later), but building actual deployment automation for
dedicated infrastructure before a second customer exists is premature — and contradicts the
project's own vertical-slice-first instinct.

**Alternatives considered**: schema-per-tenant (operationally heavier — migrations run N times,
per-schema connection pooling — for no benefit until an actual customer needs dedicated
infrastructure); dedicated database per tenant from day one (same problem, worse).

**Impact**: keep `organization_id` on everything and keep the code free of hardcoded
single-tenant assumptions, but don't build multi-region/dedicated-infra tooling until a paying
customer actually asks for it — at that point it's a deployment/ops task, not an architecture
change, specifically *because* the schema was done right up front. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the migration path this leaves open.

---

### JWT + rotated refresh tokens, two-layer RBAC (2026-08-19, planning)

**Decision**: ~15-minute JWT access tokens, rotated refresh tokens hashed server-side; every
endpoint enforced by both a coarse `@PreAuthorize` role check and a fine-grained service-layer
business-rule check read fresh from the DB.

**Reason**: short-lived access tokens limit the blast radius of a leaked token; the two-layer
check means a role change (e.g. losing committee-chair status) takes effect immediately for
sensitive decisions rather than waiting up to 15 minutes for token expiry.

**Impact**: any new sensitive endpoint must not rely on `@PreAuthorize` alone if the authorizing
fact can change faster than token TTL.

---

Older/broader design rationale (multi-tenancy pitch, entity-by-entity mapping from the frontend
mock, full future endpoint list) lives in [BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md), written
before this file existed — not duplicated here.
