-- V3__loans.sql
--
-- Phase 5: loan applications. Includes `guarantees` too, even though
-- "Guarantors" is roadmap phase 6 — a guarantor-backed loan application
-- creates a pending guarantee request as part of applying (see
-- LoanApplicationService), so the table has to exist now. What's deferred
-- to phase 6 is the guarantor-side response workflow (accept/reject) and
-- the guarantor-lock rule (can't apply for a loan while actively
-- guaranteeing someone else's) — this phase only creates the request.

CREATE TABLE loans (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id),
    -- {org logo initials}-{year}-{sequence}, e.g. "AP-2026-101". NOT the
    -- frontend mock's hardcoded "APK-2026-..." prefix — that was
    -- APUPEKA-specific; this derives the prefix from the applying
    -- organization instead (organizations.logo_initials).
    contract_number      TEXT NOT NULL,
    member_id            UUID NOT NULL REFERENCES users(id),
    amount               NUMERIC(14,2) NOT NULL,
    purpose              TEXT NOT NULL,
    period_months        INTEGER NOT NULL,
    -- Snapshot of the organization's rate at application time — later rate
    -- changes must not retroactively change an already-submitted loan.
    interest_rate        NUMERIC(5,4) NOT NULL,
    insurance_required   BOOLEAN NOT NULL,
    insurance_fee        NUMERIC(14,2) NOT NULL,
    monthly_installment  NUMERIC(14,2) NOT NULL,
    total_payable        NUMERIC(14,2) NOT NULL,
    remaining_balance    NUMERIC(14,2) NOT NULL,
    status               TEXT NOT NULL CHECK (status IN (
                             'submitted', 'under-review', 'guarantor-approval', 'committee-review',
                             'approved', 'rejected', 'contract-generated', 'disbursed',
                             'repaying', 'completed'
                          )),
    applied_date         DATE NOT NULL,
    approved_date        DATE,
    disbursed_date       DATE,
    risk_score           INTEGER NOT NULL,
    committee_notes      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT loans_contract_number_per_org UNIQUE (organization_id, contract_number)
);

CREATE INDEX idx_loans_org_member ON loans(organization_id, member_id);
CREATE INDEX idx_loans_org_status ON loans(organization_id, status);

-- Child table, not a JSON column, per BACKEND_CONTRACT.md's note — needed
-- for queryability once reporting phases (9-11) arrive.
CREATE TABLE loan_timeline_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id      UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    stage        TEXT NOT NULL CHECK (stage IN (
                     'submitted', 'under-review', 'guarantor-approval', 'committee-review',
                     'approved', 'rejected', 'contract-generated', 'disbursed',
                     'repaying', 'completed'
                  )),
    occurred_on  DATE NOT NULL,
    officer      TEXT NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_timeline_loan ON loan_timeline_events(loan_id, created_at);

CREATE TABLE guarantees (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(id),
    loan_id            UUID NOT NULL REFERENCES loans(id),
    borrower_id        UUID NOT NULL REFERENCES users(id),
    guarantor_id       UUID NOT NULL REFERENCES users(id),
    amount_guaranteed  NUMERIC(14,2) NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'rejected', 'released')),
    requested_date     DATE NOT NULL,
    responded_date     DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guarantees_org_guarantor ON guarantees(organization_id, guarantor_id);
CREATE INDEX idx_guarantees_loan ON guarantees(loan_id);
