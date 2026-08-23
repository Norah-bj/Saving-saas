# Business rules enforced by the backend

Rules that are real domain logic, not just CRUD — each one either ported from the frontend mock
exactly, or added because the mock didn't enforce something it should have (marked below).

## Loan approval workflow

- **Self-covered loan** (amount ≤ the applicant's current savings): any Loan Committee member can
  approve/reject via `POST /loans/{id}/committee-decision`.
- **Guaranteed loan** (amount > savings): the named guarantor must accept first
  (`POST /guarantees/{id}/respond`), which forwards the loan to `committee-review`; then
  specifically the **Committee Chair** (`user_roles.is_committee_chair = true`, not just any
  `LOAN_COMMITTEE` member) must give final approval.
- Chair status is **re-read fresh from the database on every decision**, never trusted from the
  15-minute JWT claim — a stale "yes" would be a real privilege-escalation window on the most
  sensitive approval in the system.
- **Added beyond the frontend mock**: the frontend's `committeeDecision` lets any committee member
  decide any loan, guaranteed or not. The chair-only enforcement is new backend logic, not a port.

## Guarantor lock

A member cannot apply for their own loan while they are actively (`accepted`, not merely
`pending`) guaranteeing someone else's loan. Enforced in `LoanApplicationService.apply()`. The
lock releases automatically the moment the guaranteed loan's `remainingBalance` reaches zero.
Verified two ways: directly in the DB, and functionally (the freed guarantor's next loan
application hits a *different*, expected validation error, proving the lock itself cleared).

## Loan eligibility

A member must have been active for at least `organizations.min_months_before_eligible` months
before applying. **Added beyond the frontend mock**: the mock only disables a UI button; the
backend rejects with 403 server-side regardless of what the client sends.

## Guarantor requirement

A guaranteed loan (amount > savings) requires a valid, non-self `guarantorId`. **Added beyond the
frontend mock**: the mock lets a guaranteed application submit with no guarantor at all; the
backend requires one.

## Payroll import

Row-level validation order matters and was preserved exactly from the mock's `importPayroll`:
duplicate-within-file detection runs **before** the missing-member/invalid-amount checks. Four
possible per-row outcomes: matched, duplicate, no matching member, invalid amount.

## Loan calculator

Interest/insurance/schedule math and risk score ported from `src/lib/loan-calculator.ts`
verbatim, with one fix: the frontend hardcodes its risk-score tenure threshold to a local
`MIN_MONTHS_BEFORE_ELIGIBLE = 3` constant instead of reading the org's own configured value; the
backend's `LoanCalculator` takes it as a parameter instead, since an existing-but-ignored per-org
setting is exactly the kind of single-tenant hardcoding this platform must avoid (APUPEKA is the
first customer, not the platform owner).

Unit note: the frontend's `loan.interestRate` is a whole percentage (`5`) and divides by 100
before use; the backend stores rates as fractions (`0.05`) — equivalent math, different starting
representation. Easy to get wrong by copying the frontend's formula literally into new code.

## Disbursement / repayment

`min(monthlyInstallment, remainingBalance)` on the final payment (no overpayment). Guarantee
release (see above) happens automatically at zero balance. **Added beyond the frontend mock**: the
mock's `recordRepayment` writes no audit entry (`disburseLoan` does); the backend audits both, per
BACKEND_CONTRACT.md's "every mutating endpoint" rule.

## Exit eligibility (designed, not yet built as an endpoint)

A member should not be able to exit the cooperative while holding an outstanding loan or actively
guaranteeing someone else's — ported from the mock's `exitEligibility`/
`OUTSTANDING_LOAN_STATUSES`. No exit endpoint exists yet — remaining phase-13 scope, not built in
the phase-13 round that shipped role assignment/status/org settings.

## Announcement and document visibility (added beyond the frontend mock)

A plain member (holding only the `MEMBER` role) never receives `audience: "admins"` announcements
or `visibility: "admins"` documents from `GET /announcements`/`GET /documents` — filtered
server-side. **Added beyond the frontend mock**: `member/Announcements.tsx` shows every
announcement to every viewer regardless of `audience` (a real gap in the mock — the field existed
but nothing enforced it); `member/Documents.tsx` only filtered admins-only documents client-side,
which hides them from the UI but never actually protects the data. "Staff" for this check means
holding any role beyond `MEMBER`.

## Member status transitions

`POST /members/{id}/status` only accepts `active` or `suspended`, and only as a transition from the
*other* one of those two (409 otherwise) — matching exactly what `org-admin/Moderation.tsx` exposes
(a Suspend button when active, an Activate button when suspended, nothing for `pending`/`exited`).
Exit (`exited`) is permanent and only reachable through the exit-request approval flow (not yet
built); newly created members currently start `pending` and nothing in the system moves them to
`active` yet — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Organization settings: field-scoped authorization (added beyond the frontend mock)

`org-admin/Settings.tsx` and `loan-committee/Policy.tsx` both call the mock's single
`updateOrganization` action, unrestricted — either page could set any organization field in the
mock. The backend splits this into `PATCH /organizations/{id}/profile` (ORG_ADMIN only —
branding/contact fields) and `PATCH /organizations/{id}/loan-policy` (ORG_ADMIN or LOAN_COMMITTEE
— interest/insurance rates, eligibility window, repayment periods), so a loan-committee member
editing loan policy can never also rewrite the organization's branding or contact details.

## Backup visibility (added beyond the frontend mock)

`GET /backups` scopes by role rather than trusting a client-supplied filter: ORG_ADMIN only ever
sees their own organization's records; SUPER_ADMIN sees everything, platform-wide and every org's.
This falls out naturally from `CurrentUser.organizationId()` already being null for a super-admin
— the same repository method call returns the right scope for either role without a branch on
role name. `POST /backups` scopes the created record's `organizationId` the same way — a
super-admin's manual backup is automatically platform-wide.

## Notification ownership

A notification's owner is checked, not just its existence — `POST /notifications/{id}/read` on
someone else's notification returns 404 (not 403), so a caller can't distinguish "doesn't exist"
from "exists but isn't yours." `GET /notifications` and `POST /notifications/read-all` are always
scoped to the caller's own `userId`; there is no org-wide or staff view of another member's
notifications anywhere in the API.

## Organization status has no functional effect yet

`POST /organizations/{id}/status` (SUPER_ADMIN) lets the platform mark an organization
`suspended`, but `AuthService.login` only ever checks the logging-in *user's* status — it never
checks their organization's status. So today, suspending an organization changes what
`GET /organizations` reports but does not actually block any of its members from logging in or
using the API. Not fixed here since it touches already-shipped phase-1 auth code without being
asked — flagged in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) as a real gap for whenever organization
suspension needs to be a real enforcement mechanism rather than just a status label.

## Revenue recognition (interest income / insurance fees) — undecided

There is currently **no rule at all** for *when* interest income or insurance fee revenue should
be recognized as a ledger entry (upfront at disbursement, amortized per installment, or at loan
completion). The frontend mock never writes such a row either. See
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) — don't invent this logic without an explicit decision, since
it touches already-shipped disburse/repay code.
