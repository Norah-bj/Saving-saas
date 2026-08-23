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
`OUTSTANDING_LOAN_STATUSES`. No exit endpoint exists yet; this is organization-administration
scope (phase 13).

## Revenue recognition (interest income / insurance fees) — undecided

There is currently **no rule at all** for *when* interest income or insurance fee revenue should
be recognized as a ledger entry (upfront at disbursement, amortized per installment, or at loan
completion). The frontend mock never writes such a row either. See
[KNOWN_ISSUES.md](KNOWN_ISSUES.md) — don't invent this logic without an explicit decision, since
it touches already-shipped disburse/repay code.
