# Technical decisions

Dated, most recent first. Format: **Decision** / **Reason** / **Alternatives considered** /
**Impact**.

---

### At most one Loan Committee Chair per organization (2026-08-29, gap-closure phase 2)

**Decision**: `PUT /members/{id}/committee-chair` enforces a single chair per organization —
promoting a new chair automatically demotes whoever currently holds it, rather than allowing
multiple simultaneous chairs or requiring the caller to demote the old one first.

**Reason**: every reference to this role elsewhere in the codebase and docs treats it as singular —
`BUSINESS_RULES.md` and `LoanReviewService` both say "the Committee Chair," never "a chair," and
the whole point of the rule (final say on guaranteed loans belongs to one specific person, not the
whole committee) only holds if there's exactly one. Requiring a separate manual demotion step
first would just be an extra click for the same guaranteed outcome, with a window in between where
an org could accidentally end up with two chairs if the admin forgot the first step.

**Alternatives considered**: allow multiple chairs (any of whom can give final approval) — rejected
as a materially different, unrequested business rule; requiring explicit demotion before promotion
— rejected as extra friction with no real benefit over doing both atomically server-side.

**Impact**: `MemberRepository.findCommitteeChairByOrganizationId` assumes at most one row can ever
match — if that invariant is ever violated (e.g., a future direct-SQL fix reintroduces two), this
query silently returns just one of them via `Optional`. Both the promotion and the resulting
auto-demotion get their own audit-log entry, so an admin can always see who displaced whom.

---

### LoanContract.tsx embeds the real generated PDF instead of re-rendering (2026-08-29, gap-closure phase 1b)

**Decision**: `LoanContract.tsx` now fetches `GET /loans/{id}/contract` as an authenticated blob
and displays it in an `<iframe>`, with a Download button, instead of re-rendering the contract as
styled HTML from `useDataStore`'s mock loan/member/organization/guarantee data.

**Reason**: `KNOWN_ISSUES.md` flagged this as "a real design decision, not a data-source swap"
because a naive swap risked losing the page's rich, print-tuned bespoke rendering. Reading
`LoanContractPdfGenerator` (the backend's PDF generator) settled it: its class doc says it "ports
`src/pages/LoanContract.tsx` article-for-article — same Kinyarwanda text, same conditional
articles" — the two were already content-identical by design. With no actual content difference,
embedding the real PDF removes a real risk (frontend and backend drifting apart on a legal
document's wording over time) for no loss.

**Alternatives considered**: keep the bespoke HTML renderer but feed it real backend data instead
of mock data — rejected because it would mean two independent implementations of the same legal
text that could silently diverge on the next edit to either one; the backend's version is also the
one used for `Content-Disposition: inline` viewing and downloading elsewhere in the app (e.g.
`accountant/Disbursement.tsx`'s Preview/View Contract links), so it's already the canonical one.

**Impact**: `apiClient` gained `getBlob()` (binary responses can't go through the JSON-parsing
`request()` path) and `loans.ts` gained `useLoanContractPdf()`, which manages the object URL's
lifecycle (revokes on loan-id change/unmount). The old bespoke Kinyarwanda-rendering code in
`LoanContract.tsx` was deleted, not kept as a fallback — `LoanContractPdfGenerator` is now the only
place that text lives; keep both in sync only if this decision is ever reversed.

---

### Interest income / insurance fee recognized in full at disbursement (2026-08-29, gap-closure phase 1)

**Decision**: The full interest and insurance amount for a loan's entire term is written as
revenue (`interest-income`/`insurance-fee` typed `ledger_transactions` rows) at the moment the
loan is disbursed, not amortized across installments and not deferred to loan completion.

**Reason**: explicit user decision, made to unblock `totalInterestIncome`/`totalInsuranceCollected`
staying permanently zero (see the superseded entry below). Matches how the insurance fee already
behaves conceptually — a one-time charge — and is far simpler to implement/audit than per-
installment interest/principal splitting, which doesn't exist anywhere in the codebase today.

**Alternatives considered**: accrual recognition per repaid installment — rejected as materially
more complex (needs a real amortization schedule per loan) for a metric that's currently a
reporting nicety, not a regulatory requirement.

**Impact**: implemented in gap-closure phase 3 — `LoanDisbursementService.disburse()` writes both
ledger rows in the same transaction as the disbursement itself. A loan that's later written off or
defaults keeps its already-recognized revenue — no reversal logic exists or is planned. Supersedes
the "left undecided" entry below.

---

### Real backups are platform-wide only — no per-tenant restore (2026-08-29, gap-closure phase 1)

**Decision**: "Real backup" means one real `pg_dump` of the entire shared-schema database,
SUPER_ADMIN-triggered, stored securely, and listed in the existing `backup_records` UI. Restore is
never a button in the app — it stays a manual ops action (`pg_restore` run by a human with direct
DB access) for the whole platform, never scoped to one organization.

**Reason**: explicit user decision. A shared-schema multi-tenant DB has no clean way to restore one
organization's rows to an earlier point in time without touching every other tenant's foreign-key
references (loans, guarantees, ledger entries cross-reference members across the same tables) —
building that safely is a genuinely separate, much harder feature than "back up the database."

**Alternatives considered**: real per-tenant export/restore — rejected for now as materially larger
scope needing its own design pass; revisit only if a real need for it shows up.

**Impact**: `POST /backups/{id}/restore` is explicitly out of scope. The existing Restore button
stays local-only UI state (as documented in `KNOWN_ISSUES.md`) even after this phase ships a real
`pg_dump`-backed create/list.

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

### Interest income / insurance fee recognition timing left undecided (2026-08-23, phase 11) — SUPERSEDED

**Superseded 2026-08-29** by "Interest income / insurance fee recognized in full at disbursement"
above — the decision got made and implemented in gap-closure phase 3. Kept here as a record of the
reasoning for leaving it unresolved for as long as it was.

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
