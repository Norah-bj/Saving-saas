-- V1__vertical_slice.sql
--
-- First real vertical slice: organizations, users/roles, auth, savings & shares
-- ledger, audit log. See docs/BACKEND_CONTRACT.md for the full entity list and
-- business rules, and docs/backend/vertical-slice-api.md for the API this schema
-- backs. Tables for later roadmap phases (loans, guarantees, meetings, ...) are
-- stubbed as one-line comments at the bottom, not created yet.
--
-- Multi-tenancy: single shared database/schema, organization_id on every
-- tenant-scoped table. Row-level isolation is enforced at the application layer
-- (Hibernate @Filter bound to the request's JWT organizationId claim) — this
-- migration does not include Postgres Row-Level Security policies; those are a
-- phase-2 hardening step layered on afterward, not required for this slice.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ─────────────────────────────────────────────────────────────────────────
-- Tenants
-- ─────────────────────────────────────────────────────────────────────────

-- Fixed-vocabulary columns below use TEXT + CHECK rather than native Postgres
-- ENUM types. Reason: several vocabularies (app_role, savings_tx_type) contain
-- hyphens ("loan-committee", "salary-deduction") to match src/lib/types.ts's
-- string-literal unions exactly, and hyphens aren't valid Java enum constant
-- names — native Postgres enums would force either ugly Java constant names
-- or per-enum JDBC converters just to work around that. TEXT + CHECK gives
-- the same "only these values are valid" guarantee, maps trivially to a plain
-- Java enum with @Enumerated(STRING), and is used consistently for every
-- vocabulary column in this schema rather than mixing two strategies.

CREATE TABLE organizations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        TEXT NOT NULL,
    short_name                  TEXT NOT NULL,
    slug                        TEXT NOT NULL UNIQUE,
    district                    TEXT NOT NULL,
    sector                      TEXT NOT NULL,
    address                     TEXT NOT NULL,
    contact_email               TEXT NOT NULL,
    contact_phone               TEXT NOT NULL,
    logo_initials               TEXT NOT NULL,
    brand_color                 TEXT NOT NULL,
    stamp_label                 TEXT NOT NULL,
    plan                        TEXT NOT NULL DEFAULT 'starter'
                                    CHECK (plan IN ('starter','growth','enterprise')),
    status                      TEXT NOT NULL DEFAULT 'trial'
                                    CHECK (status IN ('active','suspended','trial')),
    legal_representative_name   TEXT NOT NULL,
    legal_representative_title  TEXT NOT NULL,

    -- Org-level policy settings. Configurable per tenant — never hardcode
    -- APUPEKA's values (5000 share, 5% interest, 1% insurance, 3 months) in
    -- application code. These are the source of truth `loan-calculator.ts`
    -- reads at runtime once ported server-side.
    share_value_rwf             NUMERIC(14,2) NOT NULL,
    loan_interest_rate          NUMERIC(5,4) NOT NULL,           -- 0.0500 = 5%
    loan_insurance_rate         NUMERIC(5,4) NOT NULL,           -- 0.0100 = 1%
    min_months_before_eligible  INTEGER NOT NULL DEFAULT 3,
    allowed_repayment_periods   INTEGER[] NOT NULL DEFAULT ARRAY[3,6,12,24],
    -- Deviation from src/lib/types.ts's Organization interface: this field
    -- doesn't exist there yet. Added because the user's stated business rules
    -- include "5,000 RWF minimum monthly saving" as an org policy, which the
    -- current frontend type never captured.
    min_monthly_saving_rwf      NUMERIC(14,2) NOT NULL DEFAULT 0,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()

    -- memberCount from the frontend type is intentionally NOT a column here —
    -- it's derived (COUNT(*) FROM users WHERE organization_id = ...), storing
    -- it redundantly would just invite it to drift out of sync.
);

-- ─────────────────────────────────────────────────────────────────────────
-- Users & roles
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL only for platform super-admin users; every organization user has one.
    organization_id      UUID REFERENCES organizations(id),
    national_id          TEXT NOT NULL UNIQUE,          -- platform-wide unique identity anchor
    employee_id          TEXT NOT NULL,                 -- unique per organization, see constraint below
    full_name            TEXT NOT NULL,
    -- Unique globally, not just per-org: this is the login identifier, and two
    -- accounts sharing a login email would make auth ambiguous. Not in the
    -- original AppUser interface's constraints, but required for login to work.
    email                TEXT NOT NULL UNIQUE,
    phone                TEXT NOT NULL,
    department           TEXT NOT NULL DEFAULT '',
    position             TEXT NOT NULL DEFAULT '',       -- display label only, never authorize against this
    status               TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('active','suspended','exited','pending')),
    password_hash        TEXT NOT NULL,                  -- BCrypt, Spring Security default
    date_joined          DATE NOT NULL DEFAULT current_date,
    monthly_salary_rwf   NUMERIC(14,2) NOT NULL DEFAULT 0,
    bank_name            TEXT,
    bank_account_number  TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT users_employee_id_per_org UNIQUE (organization_id, employee_id)

    -- avatarInitials from the frontend type is intentionally NOT a column —
    -- it's two letters derived from full_name, computed client-side rather
    -- than stored and risking drift if a member's name is ever edited.
);

CREATE INDEX idx_users_org ON users(organization_id);

-- A user can hold multiple roles (every non-super-admin role also implies
-- "member" at the application layer — not modeled as a separate row here).
CREATE TABLE user_roles (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                TEXT NOT NULL CHECK (role IN (
                            'member','secretary','accountant','loan-committee',
                            'hr','org-admin','super-admin'
                        )),
    -- Only meaningful when role = 'loan-committee'. Drives the committee-chair
    -- -only final approval rule on guaranteed loans (BACKEND_CONTRACT.md).
    -- Authorization checks read this column, never the free-text `position`.
    is_committee_chair  BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX idx_user_roles_role ON user_roles(role);

CREATE TABLE refresh_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Savings & shares ledger
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE savings_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    member_id        UUID NOT NULL REFERENCES users(id),
    occurred_on      DATE NOT NULL,  -- named occurred_on, not `date` (reserved-word-adjacent, poor column name)
    type             TEXT NOT NULL CHECK (type IN (
                        'salary-deduction','voluntary','share-purchase','loan-repayment',
                        'withdrawal','loan-disbursement-adjustment'
                     )),
    amount           NUMERIC(14,2) NOT NULL,
    -- Running balance, computed server-side inside the same transaction as the
    -- insert (with a row lock on the member's latest row) — never accept a
    -- client-supplied balance.
    balance_after    NUMERIC(14,2) NOT NULL,
    description      TEXT NOT NULL,
    source           TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_savings_tx_member_date
    ON savings_transactions(organization_id, member_id, occurred_on);

CREATE TABLE share_holdings (
    member_id        UUID PRIMARY KEY REFERENCES users(id),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    total_shares     INTEGER NOT NULL DEFAULT 0 CHECK (total_shares >= 0),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    -- Deliberately no share_value column here — value is
    -- organizations.share_value_rwf (one authoritative value per tenant).
    -- Share value in RWF = total_shares * that organization's share_value_rwf.
);

CREATE INDEX idx_share_holdings_org ON share_holdings(organization_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL = platform-level action. Replaces the frontend mock's "platform"
    -- string sentinel with a real nullable FK.
    organization_id  UUID REFERENCES organizations(id),
    actor_user_id    UUID REFERENCES users(id),
    actor_name       TEXT NOT NULL,   -- denormalized snapshot at time of action
    action           TEXT NOT NULL,
    target           TEXT NOT NULL,
    occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org_date ON audit_log(organization_id, occurred_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Payroll / HR Excel import (phase 4) — added in V2__payroll_import.sql,
-- this file's V1 section above was already applied to the live database and
-- Flyway migrations are immutable once run, so this arrived as a new
-- migration rather than editing V1.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE payroll_import_summaries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id),
    file_name            TEXT NOT NULL,
    imported_by_user_id  UUID REFERENCES users(id),
    imported_by_name     TEXT NOT NULL,   -- denormalized snapshot, same convention as audit_log.actor_name
    occurred_on          DATE NOT NULL,
    total_records        INTEGER NOT NULL,
    successful           INTEGER NOT NULL,
    failed                INTEGER NOT NULL,
    duplicates           INTEGER NOT NULL,
    total_amount_rwf     NUMERIC(14,2) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_summaries_org_date
    ON payroll_import_summaries(organization_id, occurred_on DESC);

-- Kept for audit purposes even though BACKEND_CONTRACT.md flagged persisting
-- per-row detail as optional — cheap to store, and "what happened to row N
-- of this file" is worth having on record.
CREATE TABLE payroll_import_records (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_summary_id  UUID NOT NULL REFERENCES payroll_import_summaries(id) ON DELETE CASCADE,
    employee_id        TEXT NOT NULL,
    national_id        TEXT NOT NULL DEFAULT '',
    member_name        TEXT NOT NULL DEFAULT '',
    amount             NUMERIC(14,2) NOT NULL,
    status             TEXT NOT NULL CHECK (status IN ('matched', 'error', 'duplicate')),
    error_reason       TEXT
);

CREATE INDEX idx_payroll_records_summary ON payroll_import_records(import_summary_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Loan applications (phase 5) — added in V3__loans.sql. Includes `guarantees`
-- too, even though "Guarantors" is roadmap phase 6 — a guarantor-backed loan
-- application creates a pending guarantee request as part of applying, so
-- the table has to exist now. What's deferred to phase 6 is the
-- guarantor-side response workflow (accept/reject) and the guarantor-lock
-- rule (can't apply for a loan while actively guaranteeing someone else's).
-- ─────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────
-- Disbursement & salary-based repayment (phases 9-10) — added in
-- V4__disbursement_and_repayment.sql. Both write to this one table (the
-- accountant-facing bookkeeping view, distinct from savings_transactions)
-- and both live on the same frontend page, so they arrived together.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE ledger_transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organizations(id),
    member_id             UUID NOT NULL REFERENCES users(id),
    -- Full real vocabulary from src/lib/types.ts's LedgerTransaction.type
    -- union, even though this phase only ever inserts
    -- 'loan-disbursement-adjustment' and 'loan-repayment' — the other
    -- values belong to later reporting phases but are the same stable
    -- domain vocabulary.
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

-- ─────────────────────────────────────────────────────────────────────────
-- Secretary ops (phase 12) — added in V5__secretary_ops_and_org_admin.sql.
-- documents is metadata-only, matching the frontend mock exactly — no real
-- file storage (S3/R2/MinIO) exists behind it yet; see docs/KNOWN_ISSUES.md.
-- Phase 13 (organization administration) needed no new tables — user_roles,
-- users.status, and organizations' profile/policy columns already covered it.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE meetings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    title            TEXT NOT NULL,
    meeting_date     DATE NOT NULL,
    meeting_time     TEXT NOT NULL,
    location         TEXT NOT NULL,
    agenda           TEXT[] NOT NULL DEFAULT '{}',
    status           TEXT NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    minutes_summary  TEXT,
    -- Never populated by any current frontend flow — kept for entity
    -- fidelity with src/lib/types.ts's Meeting, not because anything
    -- reads/writes it yet.
    attendee_ids     UUID[] NOT NULL DEFAULT '{}',
    created_by       TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_org_date ON meetings(organization_id, meeting_date DESC);

CREATE TABLE announcements (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(id),
    title              TEXT NOT NULL,
    body               TEXT NOT NULL,
    announcement_date  DATE NOT NULL,
    priority           TEXT NOT NULL CHECK (priority IN ('normal', 'important', 'urgent')),
    author             TEXT NOT NULL,
    audience           TEXT NOT NULL CHECK (audience IN ('all', 'members', 'admins')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_org_date ON announcements(organization_id, announcement_date DESC);

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL
                      CHECK (category IN ('constitution', 'policy', 'report', 'minutes', 'form')),
    file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx')),
    uploaded_date   DATE NOT NULL,
    uploaded_by     TEXT NOT NULL,
    size_kb         INTEGER NOT NULL,
    visibility      TEXT NOT NULL CHECK (visibility IN ('all', 'admins')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_org_date ON documents(organization_id, uploaded_date DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Later roadmap phases — not created yet, listed here so the eventual full
-- schema shape is visible. See BACKEND_CONTRACT.md's entity table and
-- phased roadmap for the order these arrive in.
-- ─────────────────────────────────────────────────────────────────────────
-- exit_requests                — approval workflow (remaining phase-13 scope, not built this round)
-- share_withdrawal_requests   — approval workflow (remaining phase-13 scope, not built this round)
-- notifications               — per-user feed (phase 16)
-- backup_records              — organization_id nullable = platform-wide (phase 14)
-- subscription_plans          — mostly static reference data
-- role_policies               — CMS-like policy text content
