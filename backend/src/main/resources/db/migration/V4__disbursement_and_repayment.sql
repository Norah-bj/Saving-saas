-- V4__disbursement_and_repayment.sql
--
-- Phases 9-10: disbursement and salary-based repayment. Both write to the
-- same ledger_transactions table (BACKEND_CONTRACT.md's LedgerTransaction —
-- the accountant-facing bookkeeping view, distinct from savings_transactions
-- which is the member-facing savings ledger) and both live on the same
-- frontend page (accountant/Disbursement.tsx), so they arrive together.

CREATE TABLE ledger_transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organizations(id),
    member_id             UUID NOT NULL REFERENCES users(id),
    -- Full real vocabulary from src/lib/types.ts's LedgerTransaction.type
    -- union, even though this phase only ever inserts
    -- 'loan-disbursement-adjustment' and 'loan-repayment' — the other
    -- values (insurance-fee, interest-income, ...) belong to later
    -- reporting phases but are part of the same stable domain vocabulary.
    type                  TEXT NOT NULL CHECK (type IN (
                             'salary-deduction', 'voluntary', 'share-purchase', 'loan-repayment',
                             'withdrawal', 'loan-disbursement-adjustment', 'insurance-fee', 'interest-income'
                          )),
    amount                NUMERIC(14,2) NOT NULL,
    occurred_on           DATE NOT NULL,
    method                TEXT NOT NULL CHECK (method IN ('payroll', 'cash', 'mobile-money', 'bank-transfer')),
    reference             TEXT NOT NULL,
    recorded_by_user_id   UUID REFERENCES users(id),
    recorded_by_name      TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_tx_org_member_date
    ON ledger_transactions(organization_id, member_id, occurred_on DESC);
CREATE INDEX idx_ledger_tx_org_date ON ledger_transactions(organization_id, occurred_on DESC);
