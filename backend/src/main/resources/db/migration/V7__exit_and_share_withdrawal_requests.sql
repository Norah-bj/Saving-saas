-- V7__exit_and_share_withdrawal_requests.sql
--
-- Remaining phase-13 (organization administration) scope: member-initiated
-- exit and share-withdrawal requests, with staff approval and real
-- eligibility/sufficiency enforcement — see docs/BUSINESS_RULES.md.

CREATE TABLE exit_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    member_id        UUID NOT NULL REFERENCES users(id),
    reason           TEXT NOT NULL,
    requested_date   DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    decided_by       TEXT,
    decided_date     DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exit_requests_org_member ON exit_requests(organization_id, member_id);

CREATE TABLE share_withdrawal_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    member_id        UUID NOT NULL REFERENCES users(id),
    shares           INTEGER NOT NULL,
    amount           NUMERIC(14,2) NOT NULL,
    requested_date   DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    decided_by       TEXT,
    decided_date     DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_withdrawal_requests_org_member ON share_withdrawal_requests(organization_id, member_id);
