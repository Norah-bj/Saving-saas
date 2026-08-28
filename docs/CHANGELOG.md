# Changelog

Dated log of what changed and why. One entry per merged PR/phase. See [DECISIONS.md](DECISIONS.md)
for the reasoning behind significant choices, and [TESTING.md](TESTING.md) for what was actually
verified.

---

## 2026-08-29 — Gap-closure Phase 1a: real backend for the Policies reference text

**Changed**: new `GET /policies` (`policy` package: `PolicyDocument`, `PolicyDocumentRepository`,
`PolicyDocumentDto`, `PolicyController`, `PolicyDocumentSeeder`) returns the same 8 read-only
governance documents (membership, savings, shares, loan, guarantor, suspension, exit, privacy)
`member/Policies.tsx` and `loan-committee/Policy.tsx`'s reference list previously read from the
mock store. `V9__policy_documents.sql` seeds them for every existing organization; new frontend
`src/lib/api/policies.ts` (`usePolicies`) wires both pages to the real endpoint.

**Every organization gets the same starting content, including brand-new ones**:
`AuthService.register()` now also calls `PolicyDocumentSeeder.defaults(organizationId)` and saves
the result, so a self-registered organization's admin sees real policy text immediately, not an
empty list. Content is identical across orgs today (generic cooperative governance language, not
per-tenant); no edit endpoint exists yet — this was a data-source swap, not a new editing feature.

**Testing**: real end-to-end curl flow. Confirmed all 8 categories present for an existing org
(`tcs2`); registered a fresh test organization and confirmed the same 8 rows were seeded for it
too (verified via SQL, since `GET /policies` itself correctly 403s an unverified new admin —
confirming the endpoint is covered by the existing `EmailVerificationFilter`, not a gap in it).
Confirmed tenant isolation: each organization has its own 8 rows, not shared/global ones. Cleaned
up the test organization completely afterward. `mvn -q compile`, `tsc -b`, and `npm run build` all
clean.

**Merge-risk assessment**: low. Purely additive — one new migration, one new package with no
existing caller, one new field-free constructor call in `AuthService.register()` between two
already-existing save calls. No existing endpoint's request/response shape changed.

---

## 2026-08-27 — Three documented gaps closed: member activation, org-suspension login gate, SUPER_ADMIN bootstrap

**Changed**: three small, independent backend fixes, each previously tracked in
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) as a real gap, chosen deliberately as "cheap real bugs" ahead of
broader feature work and manual browser testing.

1. **`MemberService.create()` now activates new members.** Was leaving every staff-added member
   stuck at the entity's default `pending` status forever — nothing else in the system ever moved
   them out of it. Added one line, `member.activate()`, right after the existing
   `member.verifyEmail()` call, mirroring what the self-registering org-admin created by
   `/auth/register` already did.
2. **`AuthService.login()` now checks the logging-in user's organization status, not just the
   user's own.** A `suspended` organization's members could previously still log in and use the
   API normally. Added a check that 403s with "Your organization's account is suspended. Contact
   the platform administrator." when `organization.getStatus() == OrganizationStatus.suspended`.
   `trial` is unaffected (a billing signal only, not a login gate); a platform SUPER_ADMIN has no
   organization (`organization == null`) and so can never be blocked by one.
3. **New `POST /auth/bootstrap-super-admin` endpoint.** Previously the only way to create a
   platform SUPER_ADMIN was a direct SQL insert against the database. The new endpoint is public
   (no JWT exists yet the first time it's meaningfully callable) but gated by a bootstrap token
   (`app.super-admin-bootstrap-token`, from `SUPER_ADMIN_BOOTSTRAP_TOKEN`, blank/disabled by
   default) checked in the service layer, and by a new `MemberRepository.existsSuperAdmin()` query
   that makes the endpoint succeed at most once ever, regardless of how many times it's called or
   whether the token leaks. New `BootstrapSuperAdminRequest` DTO. Deliberately not exposed anywhere
   in the frontend — a one-time operational action, not a signup flow. See
   [DEVELOPMENT.md](DEVELOPMENT.md) for how to use it and [API.md](API.md) for the contract.

**Testing**: real end-to-end curl flow against a locally running backend + real Postgres, cross-
checked against hand-run SQL, with every test mutation reverted/deleted immediately after:
- Fix 1: `POST /members` as an org-admin now returns `"status":"active"` instead of `"pending"`.
- Fix 2: suspending a test org via `POST /organizations/{id}/status` immediately 403s that org's
  members' logins (`"Your organization's account is suspended..."`); reverting to `active`
  immediately restores them.
- Fix 3: wrong token → 403 "Invalid bootstrap token."; correct token while a super-admin already
  exists → 409 "A platform super-admin already exists."; with the existing dev super-admin's role
  row temporarily removed, correct token → 201 + real access/refresh tokens issued for a new
  SUPER_ADMIN with `organizationId: null`; an immediate second attempt → 409 again. Dev database
  fully restored to its original state afterward (original super-admin's role reinserted, all test
  rows deleted).

**Merge-risk assessment**: low. All three changes are additive or narrowly scoped — one new line in
`MemberService`, one new conditional in `AuthService.login()` that only fires for an org explicitly
marked `suspended` (a status nothing currently sets except the existing platform
`POST /organizations/{id}/status` endpoint), and one wholly new endpoint + repository query + DTO
with no existing caller. No existing endpoint's request/response shape changed. Branched from fresh
`main`, independent of the open Phase C–F frontend-wiring PR stack (#22–#25) — no overlap with any
file those PRs touch.

---

## 2026-08-27 — Super Admin workspace wired to the real backend (final phase)

**Changed**: `super-admin/Organizations.tsx`, `Billing.tsx`, `Analytics.tsx`, `AuditLogs.tsx`,
`Backups.tsx` now call the real backend — the sixth and last of the workspaces marked for wiring.
`Monitoring.tsx`, `Settings.tsx`, and `Support.tsx` stay on mock data, unchanged from the explicit
scope decision made back in phase 15 (no real system exists behind any of the three). New frontend
file `src/lib/api/platform-organizations.ts` (`usePlatformOrganizations`,
`useUpdatePlatformOrganizationStatus`, `useUpdatePlatformOrganizationPlan`). `audit.ts` gained
`usePlatformAuditLog`; `backups.ts`/`useBackups`/`useCreateBackup` were reused as-is from the Org
Admin phase — the backend already scopes them correctly for a super-admin caller (null
`organizationId` from the JWT), no change needed. Backend: `OrganizationDto` gained `createdAt` and
`memberCount`.

**One real backend gap, closed with a bulk query, not N+1**: neither `Organizations.tsx`'s table
nor `Analytics.tsx`'s growth/member-distribution charts had a field to read — `OrganizationDto`
never carried `createdAt` or a member count. Added both. `createdAt` was already a plain column
read; `memberCount` needed real care since `PlatformOrganizationsController.list()` returns every
org on the platform — computing it via the existing single-org `countByOrganizationId` once per
org in the list would be an N+1 query. Added `MemberRepository.countAllGroupedByOrganization()`
(one `GROUP BY` query for every org's count at once) instead, used only by the platform list; the
single-org endpoints (`GET /organizations/{id}`, the profile/loan-policy PATCHes) keep using the
existing single-org count method, unaffected.

**Testing**: real end-to-end curl flow against local Postgres. Cross-checked every org's
`memberCount` from the bulk query against a hand-run `LEFT JOIN ... GROUP BY` SQL query — matched
exactly for all 5 dev orgs (1 each for four, 7 for `tcs2`). Exercised `POST
/organizations/{id}/status` (suspend → revert to active) and `POST /organizations/{id}/plan`
(enterprise → revert to starter) against a real org, reverting both immediately after. Confirmed
`GET /audit-logs` as a real SUPER_ADMIN spans all 5 orgs (97 entries, 5 distinct `organizationId`
values) — the platform-wide view Org Admin's phase deliberately couldn't grant. Confirmed `GET
/backups` as SUPER_ADMIN lists records across orgs, and `POST /backups` as SUPER_ADMIN correctly
produces `organizationId: null` (platform-wide), unlike an ORG_ADMIN's own-org-scoped create.
`tsc -b`, the stricter unused-locals check, and `vite build` all pass clean.

**A real hiccup while testing, not a code bug**: the local dev backend failed to start once with
"Port 8080 was already in use" — several `mvn spring-boot:run` processes and their `cmd.exe`
wrappers from earlier phases' testing sessions had been left running rather than fully terminated.
Identified and killed the actual stray processes (verified each one's real command line first,
including confirming a live `java.exe` PID was VS Code's own Java language server and *not*
touching it) rather than assuming and force-killing broadly. Worth remembering for future sessions
in this environment: stopping a backgrounded `mvn spring-boot:run` needs to account for the wrapper
process, not just the JVM it spawns.

**Not verified**: no browser-automation tool exists in this environment — the actual click-through
hasn't been done in a running browser and still needs a human.

**All six role workspaces are now wired to the real backend.** What's left of the original roadmap:
`member/Policies.tsx`, `LoanContract.tsx`, `ExitSettlement.tsx` (member workspace),
`secretary/Members.tsx`'s registry picker, `loan-committee/Policy.tsx`'s reference list, and
`super-admin/Monitoring.tsx`/`Settings.tsx`/`Support.tsx` — all deliberately deferred, documented
in [KNOWN_ISSUES.md](KNOWN_ISSUES.md), not oversights. Phase 17 (production deployment) is the only
unstarted roadmap item.

---

## 2026-08-26 — Org Admin workspace wired to the real backend

**Changed**: `org-admin/Dashboard.tsx`, `Users.tsx`, `Moderation.tsx`, `Settings.tsx`,
`Backups.tsx`, `Reports.tsx` now call the real backend — fifth of the six remaining workspaces.
New frontend files: `src/lib/api/backups.ts` (`useBackups`, `useCreateBackup`), `audit.ts`
(`useOrgAuditLog`). `members.ts` gained `useUpdateMemberRoles`/`useUpdateMemberStatus`,
`organization.ts` gained `useUpdateOrganizationProfile`. Backend: `AccountantDashboardDto` gained
`totalSharesValueRwf`, `AuditLogController` widened to allow ORG_ADMIN (self-scoped only).

**A real, deliberate security-relevant widening, not just a new field**: `GET /audit-logs` was
SUPER_ADMIN-only; `org-admin/Dashboard.tsx`'s "Recent Activity" card needs an org's own trail.
Rather than a blanket widen, the controller now forces an ORG_ADMIN caller to their own
organization server-side regardless of any `organizationId` query param they pass — verified
directly: passing a different org's UUID as the caller returned the caller's own org's entries
anyway, not the requested one. SUPER_ADMIN's existing platform-wide behavior (including the
`?organizationId=` narrowing param) is unchanged.

**One backend DTO extension, reusing an existing shared endpoint rather than adding a new one**:
`org-admin/Dashboard.tsx` needs a "Total Shares Value" stat that `accountant/Dashboard.tsx` (which
already calls the same `GET /reports/accountant-dashboard`) has no equivalent for. Added
`totalSharesValueRwf` to the shared `AccountantDashboardDto` — computed server-side via one new
aggregate query (`SUM(total_shares)` per org) rather than fetching every member's share-holding row
individually, then multiplied by the org's own `share_value_rwf`. `accountant/Dashboard.tsx` simply
doesn't read the new field.

**Backups' "Restore" stays exactly as fake as the mock's** — `GET`/`POST /backups` are wired for
real; the Restore button remains local-only UI state, matching the backend's own real limitation
(no `pg_dump`/restore automation exists — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)), not a
regression introduced by this wiring pass.

**Testing**: real end-to-end curl flow against local Postgres. Confirmed `totalSharesValueRwf`
present and correct on `GET /reports/accountant-dashboard`. Specifically verified the audit-log
security fix: as an ORG_ADMIN, a request with no `organizationId` param returned only that caller's
80 own-org entries, and a request that explicitly passed a different (fabricated) org's UUID as the
param *still* returned only the caller's own org's entries — confirming the server-side override,
not just the happy path. Exercised `PUT /members/{id}/roles`, `POST /members/{id}/status`
(suspend→activate), `PATCH /organizations/{id}/profile`, and `GET`/`POST /backups` against real
dev fixtures, reverting every test mutation immediately afterward (role grant, suspension, org
profile name) so the fixtures' documented state stayed accurate. `tsc -b`, the stricter
unused-locals check, and `vite build` all pass clean.

**Not verified**: no browser-automation tool exists in this environment — the actual click-through
hasn't been done in a running browser and still needs a human.

---

## 2026-08-26 — HR workspace wired to the real backend

**Changed**: `hr/Dashboard.tsx`, `Upload.tsx`, `Reports.tsx` now call the real backend — fourth of
the six remaining workspaces, and the smallest (3 pages). `Upload.tsx` reuses the exact
`useImportPayroll`/`usePayrollImports` hooks built for `accountant/Import.tsx` in the previous
phase — same backend endpoint, same real multipart upload, no new frontend API surface needed
beyond the two pages themselves.

**A real, pre-existing role-check gap found while wiring, not introduced by it**: `GET
/members/{id}` (detail) has allowed HR since it was first built, but `GET /members` (list) never
did — only `SECRETARY`/`ORG_ADMIN`. HR's Dashboard ("Total Monthly Payroll", sum of every member's
salary) and Reports ("Expected Monthly Deduction" per member) both need the full roster, and
HR would have gotten a 403 on the very first request. Widened `GET /members`'s `@PreAuthorize` to
match the detail endpoint's role set. Also added `monthlySalaryRwf` to `MemberSummary` — it was
only ever on `MemberDetail` before, and HR needs it for every member in the list, not one at a
time. No new privacy exposure: the same staff roles that could already read one member's salary via
the detail endpoint can now read it in bulk, not a wider audience.

**Testing**: real end-to-end curl flow against local Postgres. Specifically isolated the role-check
fix rather than testing it incidentally: temporarily granted the dev fixture `g2@tcs2.rw`
(otherwise member-only, the project's designated "genuinely plain member" test account) the `hr`
role, confirmed `GET /members` returned `200` with `monthlySalaryRwf` present on every row, then
removed the temporary grant immediately afterward so the fixture's documented role stayed accurate
for future testing. `POST /payroll/import` itself was already thoroughly verified in the previous
phase (same endpoint, same code path, no role-specific branching) — not re-tested here. `tsc -b`,
the stricter unused-locals check, and `vite build` all pass clean.

**Not verified**: no browser-automation tool exists in this environment — the actual click-through
hasn't been done in a running browser and still needs a human.

---

## 2026-08-26 — Accountant workspace wired to the real backend

**Changed**: `accountant/Dashboard.tsx`, `Transactions.tsx`, `Statements.tsx`, `Disbursement.tsx`,
`Reports.tsx`, `Import.tsx`, `Exports.tsx` now call the real backend — third of the six remaining
workspaces, and the first with **zero backend changes needed beyond one DTO extension** (every
endpoint's field names already matched what the pages needed, since the accountant reporting
endpoints were originally built by porting this exact client-side aggregation logic in phase 11).
New frontend files: `src/lib/api/ledger.ts` (`useLedger`, filterable, adapts `occurredOn` -> `date`),
`src/lib/api/reporting.ts` (`useAccountantDashboard`, `useFinancialReport`), `src/lib/api/payroll.ts`
(`useImportPayroll`, `usePayrollImports`). `loans.ts` gained `useGenerateContract`, `useDisburse`,
`useRecordRepayment`. `client.ts` gained multipart/`FormData` support (skips JSON-stringifying and
lets `fetch` set its own boundary) — the first upload endpoint this frontend has wired.

**One backend DTO extension, found while wiring, not guessed**: `LoanSummaryDto` was missing
`remainingBalance`/`monthlyInstallment`. `Disbursement.tsx`'s "Active Loans — Repayments" table
needs both for *every* currently disbursed/repaying loan, not just one highlighted item like the
member dashboard's existing list-vs-detail workaround — so extending the list DTO was the right
fix here, not a per-row detail fetch. Added both, sourced directly from the `Loan` entity's already
-tracked columns.

**`accountant/Import.tsx` genuinely couldn't keep its existing two-step UX**: the mock parsed the
`.xlsx` client-side (via the `xlsx` library) into a preview table, then a separate "Import" click
ran client-side validation against it. The real backend has no non-committing preview — `POST
/payroll/import` parses and validates the actual file server-side (Apache POI, phase 4) and returns
the full result in one atomic call. Rewired to upload-then-show-result in one step; the download-
template button and Import History table are otherwise unchanged. See
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Testing**: real end-to-end curl flow against local Postgres — confirmed `GET
/reports/accountant-dashboard` and `GET /reports/financial` return the exact pre-aggregated shape
the dashboard/reports pages expect (server-side month-bucketing already matched the mock's
client-side math from phase 11's original testing); confirmed `GET /ledger` and the extended `GET
/loans` fields; **uploaded a real generated `.xlsx` covering all four payroll outcomes** (matched,
duplicate, employee not found, invalid amount) via real multipart `curl`, cross-checked the
resulting `savings_transactions` row directly against `psql` (`15,000 RWF salary-deduction`,
correct running balance, source correctly stamped with the uploaded filename); confirmed `GET
/payroll/imports` lists it; chained `generate-contract` → `disburse` → `record-repayment` on a real
loan and confirmed each real status transition and timeline entry. `tsc -b`, the stricter
unused-locals check, and `vite build` all pass clean.

**Not verified**: no browser-automation tool exists in this environment — the actual click-through
(selecting a real file in a browser file picker, watching the upload progress) hasn't been done in
a running browser and still needs a human.

---

## 2026-08-26 — Loan Committee workspace wired to the real backend

**Changed**: `loan-committee/Dashboard.tsx`, `Pending.tsx`, `PendingDetail.tsx`, `Decisions.tsx`,
`Reports.tsx`, `Policy.tsx` now call the real backend — second of the six remaining workspaces.
New `src/lib/api/loans.ts` additions: `useLoans` (staff-wide list — same `GET /loans` endpoint as
member-side `useMyLoans`, already auto-scoped to "every org loan" for a staff caller),
`useStartReview`, `useCommitteeDecision`. New `organization.ts` addition: `useUpdateLoanPolicy`
(handles the whole-percentage ↔ fraction conversion at the boundary, same unit issue documented
throughout this project). Backend: `LoanSummaryDto` gained `decidedDate`, `LoanDetailDto` gained
`guaranteeStatus`.

**Why**: continuing the workspace-by-workspace wiring effort — every endpoint this phase needed
already existed from earlier roadmap phases.

**A real backend enforcement the frontend mock never had, now visible for the first time**:
`LoanReviewService.decide()` has always 403'd a non-chair Loan Committee member deciding a
guaranteed loan (phase 7, committee-chair-only rule) — but nothing in the frontend ever exercised
that path, since every page ran on mock data with no server round-trip. `PendingDetail.tsx` now
checks the caller's own `committeeChair` flag (from the JWT, informational only) and swaps the
Approve/Reject card for an explanatory message when a non-chair member views a guaranteed loan
awaiting decision — so the restriction is discovered as a clear message, not a raw 403 after
clicking. The actual enforcement stays entirely server-side, re-checked fresh from the database
exactly as before; the frontend flag only decides what to *show*, never what's *allowed*.

**Two real DTO gaps found by reading the actual backend, not guessed**:
1. `LoanSummaryDto` (the list endpoint) never carried a decision date, so `Dashboard.tsx`'s
   "approved/rejected this month" buckets and `Decisions.tsx`'s sort-by-decision-date had nothing
   to compute from. Added `decidedDate`, sourced from the existing `approvedDate` column for
   approvals and from `Loan.updatedAt` (already set precisely at rejection time by
   `rejectByCommittee`/`rejectByGuarantorDecline`) for rejections — there's no dedicated
   rejected-date column, so this is a documented approximation, not a new tracked field.
2. `LoanDetailDto` carried `guarantorIds` (just UUIDs) but nothing about *whether* the guarantor
   had responded — `PendingDetail.tsx`'s "Guarantor Analysis" card needs the accept/decline status.
   `GET /guarantees` couldn't answer this: it's deliberately a personal "my requests as guarantor"
   inbox, not usable by a committee member looking at someone else's loan. Added `guaranteeStatus`
   to `LoanDetailDto` instead of a new endpoint — the assembler already had the guarantee row in
   hand (it was extracting the guarantor ID from it either way, just discarding the status).

**Testing**: real end-to-end curl flow against local Postgres — confirmed `decidedDate` on both an
approved-then-completed loan and a rejected one; confirmed `guaranteeStatus: "accepted"` on the
existing guaranteed committee-review fixture (`TC-2026-002`); confirmed the chair-only enforcement
directly — a non-chair committee member's decision attempt correctly 403'd with the existing
message, then the chair fixture's decision on the *same* loan correctly succeeded; confirmed
`start-review` moves a submitted loan to committee-review; confirmed the loan-policy PATCH persists
and reverted it back to the fixture's original rates afterward. `tsc -b`, the stricter
unused-locals check, and `vite build` all pass clean.

**Not wired, deliberately**: `loan-committee/Policy.tsx`'s read-only "reference policies" list
(constitution/guarantor-rule text) stays on mock data — no backend has ever existed for this
content, same gap as `member/Policies.tsx`.

**Not verified**: no browser-automation tool exists in this environment — the actual click-through
hasn't been done in a running browser and still needs a human.

---

## 2026-08-25 — Secretary workspace wired to the real backend

**Changed**: `secretary/Dashboard.tsx`, `Members.tsx`, `Suspended.tsx`, `ExitRequests.tsx`,
`Meetings.tsx`, `Announcements.tsx`, `Documents.tsx` now call the real backend instead of the
zustand mock — first of the six remaining workspaces (HR, Accountant, Secretary, Loan Committee,
Org Admin, Super Admin) to be wired, following the same adapter pattern established for the member
workspace. New frontend hooks: `useMembers`/`useCreateMember` (`src/lib/api/members.ts`),
`useCreateMeeting`/`useRecordMinutes`/`useCreateAnnouncement`/`useCreateDocument`
(`src/lib/api/secretary-ops.ts`), plus a shared `PageResponse<T>` type in `client.ts` since this is
the first paginated list endpoint wired. Backend: `MemberSummary` gained a `roles` field (needed
for the Members table's role badges — the DTO simply didn't carry it before now).

**Why**: user asked to continue the workspace-by-workspace wiring effort, all six remaining
workspaces already having their backend endpoints built across the earlier 16 phases — this is a
"wire it up" job, not "build backend + wire" like the member workspace was. Split by workspace,
Secretary first since it reuses the same meetings/announcements/documents/exit-request endpoints
already proven working by the member-side wiring.

**Adapter-pattern gap found, not guessed — read `ExitRequestDto`/`ExitEligibilityDto` directly**:
`GET /exit-requests` never included a member's name (mirrors the mock's own `ExitRequest` shape,
just `memberId`), so `ExitRequests.tsx` resolves names via the same `useMembers()` list it already
needs for the page grid. The mock's `blockReason` helper also accessed a guarantee as
`guarantee.loan.contractNumber` (nested); the real `ExitEligibilityDto.ActiveGuarantee` is flat —
`guarantee.loanContractNumber` — fixed in the port.

**A real Rules-of-Hooks constraint, not a shortcut**: `DataTable`'s `cell: (row) => ReactNode`
callbacks run inline during the parent's render, not as their own components, so a per-row
`useExitEligibility(memberId)` call (needed to show "Blocked — outstanding loan ..." next to a
pending request) can't live directly in a `cell` function. Extracted `BlockReasonCell`/
`ActionsForRow` as real subcomponents so the hook call is legal; React Query dedupes the two
components' identical per-row queries automatically, so this costs nothing extra over a single
call.

**Genuinely dropped, not silently faked**: `secretary/Members.tsx`'s "pre-fill from employee
registry" candidate picker has no backend equivalent (no endpoint exposes "payroll-imported but
not-yet-a-member" employees) — removed rather than left pointing at nothing. Manual entry (the
rest of the form) is fully wired, including surfacing the one-time `temporaryPassword` the backend
returns on creation (the mock never had real auth, so it never needed to show one). See
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) for both this and the `GET /members` pagination workaround
(`?size=500`, no true "get all" mode).

**Testing**: real end-to-end curl flow against local Postgres — confirmed `MemberSummary.roles`
returns correctly (`["hr","loan-committee","org-admin","member"]`), created a member via
`POST /members` and confirmed the response shape matches the page's expectations, created a
meeting/recorded its minutes/created an announcement/created a document via their real endpoints,
and cross-checked `GET /exit-requests` plus `GET /members/{id}/exit-eligibility` against the
existing `TC-2026-TEST-BLOCK`/`TC-2026-002` blocked-exit fixture — confirmed the exact
`outstandingLoans`/`activeGuarantees` shape the wired `BlockReasonCell` expects. `tsc -b`, the
stricter unused-locals check, and `vite build` all pass clean.

**Not verified**: no browser-automation tool exists in this environment — the actual click-through
(schedule a meeting, add a member, approve/reject an exit request) hasn't been done in a running
browser and still needs a human.

---

## 2026-08-24 — Email verification for self-service organization registration

**Changed**: New `email` package (`EmailService` interface, `ConsoleEmailService` dev stub — logs
instead of sending). New `auth.EmailVerificationToken`/`EmailVerificationTokenRepository`/
`EmailVerificationService` (opaque hashed single-use tokens, same pattern as refresh tokens). New
`security.EmailVerificationFilter` — blocks every request from an authenticated-but-unverified
user except `/auth/**` and `GET /me`, re-checking the DB fresh on every request rather than
trusting a JWT claim. `AppUser` gained `emailVerified`/`verifyEmail()`. New endpoints `POST
/auth/verify-email`, `POST /auth/resend-verification`. `MeResponse` and
`AuthResponse.UserSummary` both gained `emailVerified`.

**Why**: raised directly by the user after reviewing the frontend-wiring work's corrected
`Register.tsx` copy (no more "verified within one business day") — instant self-service
registration is the right call for scaling a multi-tenant SaaS, but a newly registered
organization shouldn't be able to touch sensitive member/financial data before the registering
email address is actually confirmed to belong to them. Explicit instruction: keep instant
self-service, add verification as a gate on *access*, not as a delay on *registration*.

**Scope decision, asked not assumed**: email sending needs a real provider and credentials that
don't exist yet. Asked the user how to handle it — chose a dev-only console-log stub now
(`ConsoleEmailService`) over blocking this feature on picking an SMTP/SendGrid/SES account, with a
real implementation swapped in later behind the same `EmailService` interface.

**Database**: `V8__email_verification.sql` — adds `users.email_verified` (backfilled `true` for
every existing row, so nobody already using the system is retroactively locked out) and
`email_verification_tokens`.

**A real distinction preserved, not just self-registration gated blindly**: staff-added members
(`POST /members`) are marked verified immediately — the adding admin already vouches for their
identity, there's no email-ownership gap to close there the way there is for an unknown party
self-registering a brand-new organization. Platform super-admins (provisioned only via direct SQL)
are exempt from the gate for the same reason. See [BUSINESS_RULES.md](BUSINESS_RULES.md).

**Testing**: real end-to-end curl flow — registered a new org, confirmed `emailVerified: false` in
the response, confirmed the console-logged link, confirmed `GET /members`/`GET /organizations/{id}`
correctly 403 `email_not_verified` while `GET /me` and `POST /auth/resend-verification` stayed
reachable, verified with a bad token (403) and the real one (204), then confirmed the *same*
still-valid access token could immediately reach the previously-blocked endpoints — proving the
fresh-DB-check design point, not a JWT-claim staleness workaround. Cross-checked directly against
`users.email_verified` and `audit_log` via `psql`. Confirmed the migration's backfill against an
existing dev user (`admin2@tcs2.rw`, verified `true` without re-registering), confirmed a
staff-created member is verified immediately, and confirmed a super-admin login is unaffected by
the gate either way.

**Result**: stacked on `feature/organization-and-member-dto-additions` (PR #14) — backend-only,
additive (new package, new filter, new columns/table), touches shared `AuthService`/`SecurityConfig`
but every existing endpoint's behavior for already-verified users is unchanged (verified directly:
the pre-existing dev fixture logged in and used the API exactly as before).

---

## 2026-08-24 — Frontend wired to the real backend: foundation + member workspace

**Changed**: New frontend integration layer — `src/lib/api/client.ts` (shared `fetch` wrapper with
401-refresh-retry), `src/lib/store/auth-store.ts` (real JWT state, replacing the auth half of
`session-store.ts`), `src/lib/hooks/use-current-user.ts` (combines the auth store with a real
`GET /me` query), and one `src/lib/api/{resource}.ts` file per backend package (`organization.ts`,
`members.ts`, `savings.ts`, `loans.ts`, `guarantees.ts`, `membership.ts`, `notifications.ts`,
`secretary-ops.ts`). Added `@tanstack/react-query`. Every member-workspace page
(`member/Dashboard.tsx`, `Savings.tsx`, `SavingsStatement.tsx`, `Shares.tsx`, `Loans.tsx`,
`LoanApply.tsx`, `LoanDetail.tsx`, `Guarantors.tsx`, `Meetings.tsx`, `Announcements.tsx`,
`Documents.tsx`) plus `Profile.tsx` and `Notifications.tsx` now call the real API instead of the
zustand mock store. `Login.tsx` rewritten (real email/password form, demo-persona picker removed).
`Register.tsx` rewritten to submit all of `RegisterRequest`'s required fields (the old form was
missing over half of them) and its copy corrected — it previously claimed manual review ("verified
within one business day") when the real backend is instant self-service.

**Backend changes made to support this** (own PR, stacked on the exit/share-withdrawal-requests
PR): `GET /exit-requests` and `GET /share-withdrawals` changed from staff-only to
`SELF_OR_STAFF` (a plain member now sees their own requests, matching the pattern already used by
`SavingsController`/`GuaranteeController`) — `Profile.tsx` and `member/Shares.tsx` need this to
show a member their own pending/past requests. Also: `MeResponse` gained `dateJoined`,
`OrganizationDto` gained `shareValueRwf`/`loanInterestRate`/`loanInsuranceRate`/
`minMonthsBeforeEligible`/`allowedRepaymentPeriods`, a new minimal `GET
/members/guarantor-candidates` endpoint was added (open to any authenticated user, unlike the
staff-only `GET /members`), and `ExitEligibilityDto` was restructured from plain contract-number
strings to nested `{id, contractNumber, remainingBalance}`/`{guaranteeId, loanContractNumber,
amountGuaranteed}` records so `Profile.tsx` can render real data, not just names. See
[API.md](API.md).

**Why**: user asked directly whether the backend and frontend were actually connected and whether
they could test it end-to-end — the honest answer was no, the backend existed only in unmerged PRs
and the frontend had never called it. Chose to wire the foundation plus one complete, demoable
slice (the member workspace) first, rather than all 7 role workspaces at once; the remaining six
follow later using the same pattern.

**Adapter pattern, not redesign**: every converted page keeps its exact existing JSX — where a
backend DTO's shape or units differ from what the existing frontend types/components expect, the
API layer adapts, not the page. Two real examples, both in `src/lib/api/loans.ts`: backend
interest/insurance rates are fractions (`0.05`) but the frontend expects whole percentages (`5`);
the backend's savings ledger returns newest-first but every frontend consumer assumes oldest-first.
Both corrected once, in the adapter. Full detail in
[ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration).

**Explicitly not wired this round**: `member/Policies.tsx` (no backend exists for `RolePolicy`
content), `LoanContract.tsx`/`ExitSettlement.tsx` (real PDF generation exists server-side, but
swapping the current HTML rendering for a PDF embed is a design decision, not a data-source swap),
and all six non-member workspaces. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Testing**: no browser-automation tool exists in this environment. Verified: backend compiles and
runs on a local consolidated branch (`integration/frontend-wiring`, merging the previously-unmerged
phase-11 PR into the phase-12→phase-13-completion PR chain); frontend `tsc -b`/`vite build` clean;
every converted page's request/response shape manually cross-checked field-by-field against the
real endpoint contracts already proven correct by this session's curl-based backend testing; CORS
verified working with real `Origin`-header requests, not just same-origin curl. **Not verified**:
actually clicking through the running app in a real browser — that still needs a human.

**Result**: backend micro-fix as its own PR stacked on the exit/share-withdrawal-requests PR
(low risk — widens an existing staff-only list endpoint to also allow self-access, no behavior
change for staff callers); frontend foundation + member workspace as a separate PR based directly
on `origin/main` (frontend files, untouched by any backend PR) — additive/new-files plus
page-internal data-source swaps only, no shared component or route structure changed.

---

## 2026-08-23 — Phase 13 completion: Exit and share-withdrawal requests

**Changed**: New `membership` package (`ExitRequest`/`ShareWithdrawalRequest`,
`ExitRequestService`/`ShareWithdrawalRequestService`, `ExitRequestController`/
`ShareWithdrawalRequestController`/`ExitEligibilityController`) — `GET/POST /exit-requests`,
`POST /exit-requests/{id}/decision`, `GET/POST /share-withdrawals`,
`POST /share-withdrawals/{id}/decision`, `GET /members/{id}/exit-eligibility`. `AppUser` gained
`exit()`. `ShareHolding` gained `removeShares()`. `SavingsService` gained `withdrawShares()`.
`LoanRepository`/`GuaranteeRepository` gained the queries the eligibility check needs.

**Why**: user-requested — the largest remaining piece of phase 13, explicitly asked to be built
"end-to-end using real backend data... Do not use mock-only behavior," after being offered as one
of several flagged gaps to circle back to.

**Database**: `V7__exit_and_share_withdrawal_requests.sql` — two new tables.

**One correction to BACKEND_CONTRACT.md, not just the mock, ported**: its business-rules section
describes "outstanding loan" as blocking exit across a long list of statuses (submitted through
repaying); the actual `data-store.ts` code only ever checks `disbursed`/`repaying`. Ported the real
code — a loan that hasn't been disbursed yet isn't real financial exposure.

**Genuinely goes beyond the frontend mock, as asked**: approving a share withdrawal actually moves
the shares and money (decrements `share_holdings`, writes a `WITHDRAWAL` savings transaction) —
the mock's `decideShareWithdrawal` only ever flipped a status flag, never touching either. Share
sufficiency and exit eligibility are both validated server-side (409s), not just via a disabled
button client-side. Duplicate-pending-exit-request submission is rejected (409) — the mock's UI
prevents this but never enforces it server-side.

**Testing**: see [TESTING.md](TESTING.md#phase-13-completion). Full exit lifecycle verified
against real login behavior (not just DB state) — approved exit correctly blocks the member's next
real login attempt. Ineligibility-blocks-approval verified against both a real disbursed loan
(inserted via SQL for the test) and a real pre-existing active guarantee from earlier phase
testing. Share withdrawal approval cross-checked directly against the DB — shares and balance
matched hand computation exactly; rejection confirmed to leave both untouched.

**Result**: PR #12, targeting PR #11 as base (stacked, same reason as the prior PRs) — merge order
#7 → #8 → #9 → #10 → #11 → #12.

---

## 2026-08-23 — Phase 15: Platform Super Admin (scoped to the real parts)

**Changed**: New `PlatformOrganizationsController`/`AuditLogController` — `GET /organizations`
[platform], `POST /organizations/{id}/status`, `POST /organizations/{id}/plan`,
`GET /audit-logs` [platform, optional `?organizationId=`]. `Organization` gained `updateStatus`/
`updatePlan`. `AuditLogRepository` gained platform-wide and org-scoped list queries.

**Why**: next roadmap phase, but with an unusual wrinkle — `super-admin/` has 9 pages of wildly
different maturity (some real, some entirely fabricated placeholder data). Asked the user how to
scope it rather than guessing; they chose to build only the real parts.

**Scope decision** (asked, not assumed): built Organizations (list/status/plan — real
`Organization` data), and platform AuditLogs (real `audit_log` data). Analytics and Billing's
plan-price display needed no new endpoint — both derive from the same `GET /organizations`
response client-side, exactly like the frontend mock does today. **Deliberately not built**:
Monitoring (fabricated uptime/response-time/DB-size numbers — no real observability pipeline
exists), Settings (fabricated platform API keys — no API-key auth mechanism exists, this backend
is JWT-only), Support (a hardcoded ticket list not even wired to the mock's own data layer — no
ticketing spec exists to port). See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

**Database**: no migration — reuses `organizations` and `audit_log` as-is.

**New capability needed for testing, not previously possible**: no SUPER_ADMIN user existed
anywhere in the dev database, and no API path can create one (`/auth/register` only creates
ORG_ADMIN + a new org). Created one via direct SQL insert (`organization_id = NULL`,
`user_roles.role = 'super-admin'`) — confirmed it logs in correctly with a null `organizationId`
throughout the JWT/response chain.

**Testing**: see [TESTING.md](TESTING.md#phase-15). Real cross-org data (3 orgs) exercised
end-to-end; confirmed the new platform-wide controller and the existing self-scoped
`OrganizationController` correctly coexist on overlapping `/organizations` base paths without
routing conflicts; confirmed an ORG_ADMIN gets 403 on every platform endpoint.

**Real gap surfaced while testing (not introduced by this phase)**: `POST
/organizations/{id}/status` can mark an org `suspended`, but nothing in `AuthService.login` checks
an organization's own status — only the logging-in user's. Suspending an org currently has no
functional effect on its members' ability to log in. Documented, not fixed — touches already-shipped
phase-1 auth code without being asked.

**Result**: PR #11, targeting PR #10 as base (stacked, same reason as the prior two PRs) — merge
order #7 → #8 → #9 → #10 → #11.

---

## 2026-08-23 — Phases 14, 16: Backups (records only) + notifications (read side)

**Changed**: New `backup` package (`BackupRecord`, `BackupService`, `BackupController`) —
`GET/POST /backups`. New `notification` package (`AppNotification`, `NotificationService`,
`NotificationController`) — `GET /notifications`, `POST /notifications/{id}/read`,
`POST /notifications/read-all`.

**Why**: next two well-scoped roadmap phases. Bundled together since both are small
tracking/inbox-style features with no relationship to each other.

**Database**: `V6__backups_and_notifications.sql` — adds `backup_records` (`organization_id`
nullable, same platform-wide pattern as `audit_log`) and `notifications` (scoped by `user_id`
alone, no `organization_id` needed).

**Deliberate scope limits, not oversights**: `backup_records` is metadata only — `sizeMb` is a
real row-count-based proxy (not a random number, but also not an actual file size), and there is
no `pg_dump`/restore automation, matching the frontend mock exactly (it doesn't implement restore
either). `notifications` only has the read side — nothing creates a notification anywhere in the
system yet, same gap as the frontend mock. Both flagged in
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) rather than silently built halfway.

**Testing**: see [TESTING.md](TESTING.md#phases-14-16). Backup size cross-checked against hand-run
SQL (exact match). Notification cross-user isolation confirmed (404, not 403, on someone else's
notification). Role gates confirmed for both.

**Result**: PR #10, targeting PR #9 as base (stacked, same reason as #9 on #8) — merge order
#7 → #8 → #9 → #10.

---

## 2026-08-23 — Phases 12-13: Secretary ops + organization administration

**Changed**: New `secretary` package (`Meeting`/`Announcement`/`DocumentItem` entities,
`SecretaryOpsService`, `MeetingController`/`AnnouncementController`/`DocumentController`) —
`GET/POST /meetings`, `POST /meetings/{id}/minutes`, `GET/POST /announcements`, `GET/POST
/documents`. New `OrganizationController`/`OrganizationService`/`OrganizationDto` — `GET
/organizations/{id}`, `PATCH /organizations/{id}/profile`, `PATCH /organizations/{id}/loan-policy`.
`MemberController`/`MemberService` gained `PUT /members/{id}/roles` and `POST /members/{id}/status`.

**Why**: next two roadmap phases — secretary's meetings/documents/announcements pages and
org-admin's user/settings/moderation pages needed real endpoints. Bundled together since they're
both small and were built in the same session.

**Database**: `V5__secretary_ops_and_org_admin.sql` — adds `meetings`, `announcements`,
`documents`. Phase 13 needed no migration (reused existing `user_roles`/`users.status`/
`organizations` columns).

**Added beyond the frontend mock** (see [BUSINESS_RULES.md](BUSINESS_RULES.md) for detail):
server-side audience/visibility filtering on announcements and documents (the mock either didn't
filter at all or only filtered client-side); field-scoped authorization on organization settings
(the mock's single unrestricted `updateOrganization` action is split into an ORG_ADMIN-only
profile endpoint and an ORG_ADMIN-or-LOAN_COMMITTEE loan-policy endpoint); status-transition
validation on member suspend/activate (409 on anything other than active↔suspended).

**Testing**: see [TESTING.md](TESTING.md#phases-12-13). Full lifecycle tested for each new
resource against real dev data in the `tcs2` org — meeting create → record minutes; announcement
and document create with both `all` and `admins`-restricted visibility, verified a plain-member
account correctly can't see the restricted ones and gets 403 attempting to create; organization
profile and loan-policy updates, verified a loan-committee-only (non-admin) user gets 403 on
profile but 200 on loan-policy; member role replacement; member suspend → login correctly 403 →
reactivate → login correctly 200, with a real DB row and audit log entry checked at every step.

**Result**: PR #9, targeting `docs/project-documentation` (PR #8) as base since this phase's doc
edits build on that branch's new files — merge order noted in the PR: #7 (phase 11) → #8 (docs) →
#9 (this phase).

**Remaining issues found while testing**: newly created members are stuck `pending` forever (not
introduced by this phase — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md)). Exit requests and
share-withdrawal requests remain unbuilt (also phase-13 roadmap scope).

---

## 2026-08-23 — Phase 11: Accountant reporting + ledger

**Changed**: New `reporting` package (`ReportingController`/`ReportingService`) —
`GET /reports/accountant-dashboard`, `GET /reports/financial`. Completed `LedgerController` —
`GET /ledger` (filter by type/method/memberId). New `common/WebConfig.java`.

**Why**: next roadmap phase — the accountant workspace's dashboard, reports, and transactions
pages needed real endpoints.

**Files/modules affected**: `reporting/*` (new), `ledger/LedgerController.java`,
`ledger/LedgerService.java`, `ledger/LedgerTransactionDto.java` (new), `ledger/
LedgerTransactionRepository.java`, `loan/LoanRepository.java`, `loan/LoanStatusCount.java` (new),
`member/MemberRepository.java`, `savings/SavingsTransactionRepository.java` (new query methods
added, no existing methods changed), `common/WebConfig.java` (new).

**Database**: no migration — purely new read queries against existing tables.

**Testing**: see [TESTING.md](TESTING.md#phase-11). All three endpoints hit against real dev data
in the `tcs2` org, every number cross-checked against hand-run SQL.

**Result**: merged via PR #7, low merge risk (additive/read-only, no existing endpoint changed).

**Remaining issues**: `totalInterestIncome`/`totalInsuranceCollected` always report zero — see
[KNOWN_ISSUES.md](KNOWN_ISSUES.md).

---

## 2026-08-23 — Phases 9-10: Disbursement + salary-based repayment

**Changed**: `LoanDisbursementService` (disburse, record-repayment). New `ledger` package
(`LedgerTransaction` — the accountant-facing bookkeeping view, distinct from
`savings_transactions`).

**Why**: next roadmap phases; both share one frontend page (`accountant/`) so built together.

**Database**: `V4__disbursement_and_repayment.sql` — adds `ledger_transactions`.

**Testing**: full lifecycle — disburse → 6 (and separately 12) monthly repayments → `completed`
status, `remainingBalance = 0`; guarantee auto-release verified both in the DB and functionally.
20 ledger rows verified with exact amounts. Audit log confirmed for both actions (a gap vs. the
frontend mock, which only audits disbursement — fixed here per BACKEND_CONTRACT.md's "every
mutating endpoint" rule).

**Result**: merged via PR #6.

---

## 2026-08-23 — Phase 8: Loan contracts (PDF)

**Changed**: New `contract` package. `POST /loans/{id}/generate-contract`,
`GET /loans/{id}/contract` (renders live from current data, no stored snapshot — matches the
frontend). `LoanContractPdfGenerator` via OpenPDF, article-for-article port of
`LoanContract.tsx`.

**Testing**: generated PDF bytes read back and verified for both the guaranteed-loan branch (10
articles, "WISHINGIWE" title, guarantor clauses/signature, 2 pages) and self-covered branch (7
articles, "— ISANZWE" title, 1 page) — every interest/insurance amount and date matched hand
computation.

**Result**: merged via PR #5.

---

## 2026-08-23 — Phase 7: Loan committee review

**Changed**: `LoanReviewService` (start-review, committee-decision). **First phase to enforce the
committee-chair-only rule** for guaranteed loans (documented since planning, not implemented until
now — see [DECISIONS.md](DECISIONS.md)). Extracted `LoanDetailAssembler` as a shared component.

**Testing**: non-chair committee member correctly approved a self-covered loan, then correctly
403'd on a guaranteed loan; a chair user then correctly approved it.

**Result**: merged via PR #4.

---

## 2026-08-23 — Phase 6: Guarantors

**Changed**: `GuaranteeService`/`GuaranteeController` — accept/decline a guarantee request. Added
the guarantor-lock rule to `LoanApplicationService.apply()`.

**Result**: merged via PR #3.

---

## 2026-08-21 — Phase 5: Loan applications

**Changed**: New `loan` package — `LoanCalculator`, application submission, `guarantees` table.
Server-side loan eligibility (≥N months) and guarantor-requirement enforcement added beyond what
the frontend mock does.

**Database**: `V3__loans.sql`.

**Bugs found and fixed** (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the general pattern):
combining `@Enumerated` with an `autoApply` converter on `Loan.status`/`LoanTimelineEvent.stage`;
`GlobalExceptionHandler` missing a catch-all handler, causing unrelated 500s to masquerade as 401s.

**Result**: merged via PR #2.

---

## 2026-08-21 — Phase 4: Payroll/HR Excel import

**Changed**: New `payroll` package — Apache POI server-side `.xlsx` parsing, replacing the
frontend's SheetJS demo. Exact business rules ported from `importPayroll` (duplicate-detection
order preserved). `SavingsService` gained a generic `recordDeduction` method.

**Database**: `V2__payroll_import.sql`.

**Testing**: real generated `.xlsx` covering all four row outcomes plus the empty-sheet error
path.

**Result**: merged.

---

## 2026-08-20 — Phases 1-3: Vertical slice (auth, tenant, members, savings/shares)

**Changed**: First working backend — `auth`, `member`, `savings`, `security`, `tenant`,
`organization` packages. Org self-registration, login, JWT issuing, `/me`, member creation with
generated temp password, savings ledger with server-computed running balance, share purchases
priced from the org's own `share_value_rwf`, refresh-token rotation.

**Database**: `V1__vertical_slice.sql`.

**Testing**: RBAC correctly denies a plain member from listing/viewing others while allowing
self-access; genuine cross-tenant isolation verified across three separately-registered
organizations.

**Result**: merged via PR #1 (`feature/backend-foundation`).
