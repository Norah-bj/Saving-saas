-- V2__payroll_import.sql
--
-- Phase 4: payroll/HR Excel import. One summary row per uploaded file;
-- per-row validation detail persisted for audit purposes (BACKEND_CONTRACT.md
-- flagged this as optional — kept, since Postgres storage is cheap and a real
-- audit trail of "what happened to row N of this file" is worth having).

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
