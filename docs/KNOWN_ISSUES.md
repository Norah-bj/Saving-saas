# Known issues / deliberately deferred work

## Real gaps

- **`/auth/register` cannot attach a new user to an existing organization** — it always creates a
  brand-new org + its first ORG_ADMIN. There is no invite-a-new-staff-member-to-my-org flow.
- **No in-app backup restore endpoint.** The platform can now create a real,
  platform-wide `pg_dump`, but restore remains a manual platform-operations
  action (see [DEVELOPMENT.md](DEVELOPMENT.md#backups-and-manual-restore)). The
  frontend Restore button is still local-only UI state. Production backup
  retention, off-host replication, and recovery drills still need an operational
  runbook and storage configuration; see [DEPLOYMENT.md](DEPLOYMENT.md). A full
  restore into a scratch database has not been exercised yet (the local
  `ikiminaconnect` role has no `CREATEDB`); only `pg_restore --list` was verified.
- **`super-admin/Dashboard.tsx` still reads the zustand mock store** (`useDataStore` organizations,
  `MOCK_TODAY`), unlike its sibling `Organizations.tsx`/`Analytics.tsx`, which use the real
  `GET /organizations`. **`LandingPage.tsx`** likewise renders the mock `PLATFORM_ORGANIZATIONS`
  list and count as if they were real customers — must be replaced or removed before a public
  launch.
- **Test coverage is still partial.** Backend integration tests and CI exist since gap-closure
  phase 7 (see [TESTING.md](TESTING.md)), but the frontend has no tests (lint + build only) and
  several backend areas (meetings, announcements, documents, exit requests, real backup creation)
  are only manually verified.
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
- **Real email delivery needs a verified sending domain.** `ResendEmailService` sends real email
  when `EMAIL_PROVIDER=resend` (`ConsoleEmailService` remains the local default), but Resend's test
  sender `onboarding@resend.dev` only delivers to the Resend account's own address. Members can
  only receive verification emails once a domain is verified in Resend (SPF/DKIM) and `EMAIL_FROM`
  uses it — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Recently closed gaps

- **Backups were metadata-only — fixed (gap-closure phase 6).** `POST /backups` (now SUPER_ADMIN
  only) runs a real platform-wide `pg_dump -F c` and records the file's real size and absolute
  path; a failed dump returns 409 and deletes the partial file. ORG_ADMIN keeps read access to the
  platform-wide list. The Docker image now installs the PGDG `postgresql-client-17` so `pg_dump`
  matches a PostgreSQL 17 server (the base image's default client is older and would refuse).
- **No exit-settlement page — fixed in gap-closure phase 1c** (`ExitSettlement.tsx`, see below);
  `secretary/ExitRequests.tsx`'s "View Settlement" link now lands on a real page.
- **Email verification sent no real email — fixed** by `ResendEmailService`
  (`EMAIL_PROVIDER=resend`); only the sending-domain limitation above remains.

- **Payroll import hardening (gap-closure phase 5).** `PayrollFileParser` now rejects a non-.xlsx/
  .xls upload before touching its content (clear "please upload an Excel file" message instead of
  a cryptic parse error), and catches the broader set of unchecked exceptions POI throws for
  encrypted/malformed workbooks (previously only `IOException` was caught, so those surfaced as an
  unhandled 500). `GlobalExceptionHandler` gained a handler for `MaxUploadSizeExceededException`
  (413 with a clear message — previously also fell through to a generic 500).
  `PayrollImportService` gained a defensive row-count cap (5000) and now attempts each row's actual
  savings deduction *before* counting it successful or building the summary, catching any
  unexpected failure and downgrading just that row to `error` instead of either mis-reporting it or
  risking a mid-loop exception rolling back every other row's already-good outcome. See
  [DECISIONS.md](DECISIONS.md) for what this last change does and doesn't guarantee. Verified with
  a real test file covering all four outcomes (matched/duplicate/two error reasons), a wrong file
  type, a corrupt file, and (with a temporarily lowered limit) an oversized upload; all test
  savings transactions and payroll records cleaned up afterward, restoring exact prior balances.
- **Nothing created a notification — fixed.** Phase 16 only built the inbox read side; now these
  real events write real notifications: loan application submitted (borrower), guarantor requested
  (guarantor), guarantor accepted/declined (borrower), loan approved/rejected (borrower), loan
  disbursed (borrower), repayment recorded and loan fully repaid (borrower), meeting scheduled (all
  org members), announcement published (all members, or staff only for an `admins`-audience
  announcement — matching who can actually see it). New `NotificationService.notify`/`notifyMany`;
  `MemberRepository` gained `findAllIdsByOrganizationId`/`findAllStaffIdsByOrganizationId` for the
  fan-out cases. **Deliberately still not wired**: savings/share events (voluntary deposits, share
  purchases/withdrawals) — no specific trigger points were requested and the "important
  savings/account events" framing was too vague to implement without inventing the actual rule;
  revisit with an explicit decision on which savings events should notify. See
  [DECISIONS.md](DECISIONS.md). Verified end-to-end through the real multi-step loan lifecycle
  (application → guarantee → approval → disbursement → repayment → completion) plus a real meeting
  and two real announcements (`all` and `admins` audience), confirming exact recipient sets via
  SQL; all test data cleaned up afterward.
- **`totalInterestIncome`/`totalInsuranceCollected` were always zero — fixed.**
  `LoanDisbursementService.disburse()` now writes real `interest-income`/`insurance-fee` typed
  `ledger_transactions` rows in the same transaction as the disbursement itself, recognized in full
  at disbursement time (not amortized per installment, not deferred to completion — see
  [DECISIONS.md](DECISIONS.md)). The aggregation queries themselves needed no changes — they were
  already correctly summing whatever rows existed, which until now was none. Verified end-to-end:
  disbursed a real guaranteed test loan (50,000 RWF, 5% interest, insurance fee 500), confirmed
  exactly the right ledger rows (`interest-income: 2500`, `insurance-fee: 500`) and that both
  `GET /reports/accountant-dashboard` and `GET /reports/financial` immediately reflected the real
  totals; cleaned up the test loan afterward.
- **No committee-chair assignment endpoint — fixed.** New `PUT /members/{id}/committee-chair`
  (ORG_ADMIN only), body `{"chair": true|false}`. Promoting someone requires they already hold the
  `loan-committee` role (409 otherwise — assign that role first via the existing `/roles`
  endpoint); the backend enforces at most one chair per organization by auto-demoting whoever
  currently holds it (both the promotion and the auto-demotion get their own audit-log entry). No
  longer only settable via direct SQL. `org-admin/Users.tsx` gained a "Make Chair"/"Remove Chair"
  button (shown only for loan-committee members) and a "Chair" badge in the roster table. See
  [DECISIONS.md](DECISIONS.md) for why a single chair is assumed.
- **`ExitSettlement.tsx` was mock-rendered HTML — fixed.** Now reads real data throughout:
  `useMemberDetail` (savings balance, share count), `useOrganization` (share value, legal
  representative), `useExitEligibility`, and `useExitRequests`. No new backend endpoint was needed
  — the settlement amount is just savings + share value, and outstanding loan balance is always 0
  here since exit is only reachable once exit-eligibility is already clean (no outstanding loans,
  no active guarantees). **Correction to a stale claim this same entry used to make**: there is no
  backend-generated settlement PDF anywhere in the codebase (verified by grepping the whole
  backend for "settlement") — the earlier wording claiming one existed was inaccurate, unlike the
  loan contract case below where a real generator genuinely did exist. This page keeps the
  browser's `window.print()` for PDF output, same as before.
- **`LoanContract.tsx` was mock-rendered HTML — fixed.** Now embeds the real backend-generated PDF
  (`GET /loans/{id}/contract`) via an `<iframe>`, fetched as an authenticated blob (new
  `apiClient.getBlob`/`useLoanContractPdf`) since a plain `<iframe src>` can't carry the JWT bearer
  token. `LoanContractPdfGenerator` already ported this page's old article-for-article Kinyarwanda
  text faithfully (see its class doc), so this was purely a source-of-truth swap, not a content
  change — the design decision flagged in the entry this replaces was "embed the PDF, since backend
  and frontend content are already identical," not "invent new content."
- **`member/Policies.tsx` and `loan-committee/Policy.tsx`'s reference-policy list — fixed.** Both
  read `RolePolicy` content that had no backend anywhere in the roadmap. New `GET /policies`
  (`policy` package: `PolicyDocument` entity, `policy_documents` table) returns the same 8
  read-only governance documents (membership, savings, shares, loan, guarantor, suspension, exit,
  privacy) every organization already had as mock data — seeded identically for every existing org
  via `V9__policy_documents.sql`, and for every newly self-registered org via
  `AuthService.register()` (`PolicyDocumentSeeder`). No update/edit endpoint exists yet — still
  read-only reference text, same as it always was; only the data source changed.
- **Newly created members are stuck `pending` forever — fixed.** `MemberService.create()` now
  calls `member.activate()` right after `member.verifyEmail()`, matching what the self-registering
  org-admin created by `/auth/register` already did. Verified: `POST /members` now returns
  `"status":"active"` immediately.
- **No SUPER_ADMIN bootstrap flow — fixed.** `POST /auth/bootstrap-super-admin` provisions the
  platform's SUPER_ADMIN, gated by a `SUPER_ADMIN_BOOTSTRAP_TOKEN` env var (unset by default —
  the endpoint refuses every request until an operator configures one) and by
  `MemberRepository.existsSuperAdmin()` (succeeds at most once, ever, regardless of how many times
  it's called or whether the token leaks). See [DEVELOPMENT.md](DEVELOPMENT.md) and
  [API.md](API.md). Verified end-to-end: wrong token → 403; correct token while a super-admin
  already exists → 409; correct token with no super-admin in the system → 201 + real tokens issued;
  immediate second attempt → 409.
- **Organization status doesn't gate anything — fixed.** `AuthService.login` now checks the
  logging-in user's *organization's* status (not just the user's own) and rejects with 403 when
  it's `suspended`. `trial` remains a normal operating status (billing signal only) and never
  blocks login; a platform SUPER_ADMIN has no organization and so can't be blocked by one.
  Verified: suspending a test org via `POST /organizations/{id}/status` immediately 403s that
  org's members' logins; reverting to `active` immediately restores them.

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
6. **A role granted access to a detail endpoint isn't automatically granted access to the
   corresponding list endpoint — check both when adding a new consumer of either.** `GET
   /members/{id}` allowed `HR` from the start; `GET /members` never did, purely because nothing
   needed it until HR's own dashboard/reports pages were wired (phase 4/11's frontend work, this
   session). HR could look up one member by ID but not list the roster at all. Fixed by widening
   the list endpoint's `@PreAuthorize` to match. Worth checking for the same split anywhere a role
   is added to one of a resource's endpoints but not audited against its siblings.
7. **Widening a platform-only endpoint's role check must force the new role's query scope
   server-side, never trust a filter param it could also set.** `GET /audit-logs` was
   SUPER_ADMIN-only with an optional `?organizationId=` narrowing param. Adding ORG_ADMIN for
   `org-admin/Dashboard.tsx` without also overriding that param server-side would have let an
   org-admin request another tenant's audit trail just by passing its UUID. Fixed by ignoring the
   param entirely for a non-super-admin caller and always using their own
   `currentUser.organizationId()` — see [ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration)
   for the general pattern. Verified directly, not assumed: passing a fabricated org UUID as an
   ORG_ADMIN still returned only the caller's own org's rows.

## Not a bug, just not done yet

- Row-Level Security (database-layer tenant isolation, defense-in-depth on top of the application
  layer) is designed but not implemented — see [ARCHITECTURE.md](ARCHITECTURE.md).
- **Every role workspace now calls the real backend** — the workspace-by-workspace wiring effort
  (member → secretary → loan committee → accountant → HR → org admin → super admin) is complete.
  What's left is page-level, not workspace-level: a handful of individual pages within otherwise-
  wired workspaces deliberately still read the zustand mock store (listed in the items directly
  below), plus `super-admin/Monitoring.tsx`/`Settings.tsx`/`Support.tsx`, which were explicitly
  scoped out back in phase 15 since no real system exists behind any of the three (fabricated
  uptime numbers, fabricated API keys, a hardcoded ticket list — see that item further down). See
  [FEATURES.md](FEATURES.md) and [ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration).
- **Every page in the member workspace's roadmap now calls the real backend** — see "Recently
  closed gaps" for `Policies.tsx`, `LoanContract.tsx`, and `ExitSettlement.tsx`.
- **`secretary/Members.tsx`'s "pre-fill from employee registry" picker was dropped, not wired —
  reconsidered in gap-closure phase 5 and still declined, for a concrete reason now.** The mock let
  a secretary pick an unregistered employee from a payroll-derived candidate list to auto-fill the
  add-member form. Checked what data would actually be available for such a picker:
  `PayrollFileRow`/the import file format itself only ever carries Employee ID and Saving Amount —
  no name, department, phone, or anything else a "pre-fill" would need. Building this for real
  would mean redesigning the payroll import file contract to carry employee metadata beyond what
  any real payroll export was ever asked to include, not just adding a read endpoint over existing
  data. See [DECISIONS.md](DECISIONS.md). Manual entry (the rest of the form) is fully wired; the
  picker itself stays dropped rather than fabricated.
- **`GET /members`/`GET /loans`/`GET /ledger` have no "get all" mode** — every staff page that
  needs the full roster/portfolio/ledger (`secretary/Members.tsx`, `Suspended.tsx`,
  `org-admin/Users.tsx` once wired, every `loan-committee/*` and `accountant/*` list page) asks for
  one large page (`?size=500`) instead of paging through results, matching the mock's
  assume-everything-fits-in-memory shape. Fine at real-world SACCO scale; would need genuine
  pagination support (and paginated UI) to hold up at, say, thousands of records in one org.
- **`accountant/Import.tsx` and `hr/Upload.tsx`'s upload flow changed shape, not just data
  source.** The mock parsed the `.xlsx` client-side and showed an editable preview before a
  separate "Import" click; the real backend (`POST /payroll/import`) parses and validates the
  actual file server-side in one atomic call, with no non-committing preview endpoint. Both pages
  are wired as upload-then-show-real-result instead — the download-template button (still a pure
  client-side convenience) and Import/Upload History table are otherwise unchanged. Revisit only if
  a genuine "preview without committing" need shows up; adding one just to match the old UX isn't
  worth a new endpoint on its own.
- No browser-automation tool was available while wiring the member workspace, so real
  click-through testing (login, submit a savings top-up, apply for a loan, respond to a guarantee
  request, etc.) in an actual browser has not been done by Claude and still needs a human — see
  [TESTING.md](TESTING.md).
- Backend is not deployed anywhere — see [DEPLOYMENT.md](DEPLOYMENT.md).
