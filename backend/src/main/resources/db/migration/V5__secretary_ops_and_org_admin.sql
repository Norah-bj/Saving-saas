-- V5__secretary_ops_and_org_admin.sql
--
-- Phase 12: secretary ops (meetings, announcements, documents) — org
-- operations content, no money/loan logic. Phase 13 (organization
-- administration: role assignment, member status, org profile/policy
-- updates) needs no new tables — user_roles, users.status, and
-- organizations' profile/policy columns already exist from V1.
--
-- documents is metadata-only, matching the frontend mock exactly — there is
-- no real file storage (S3/R2/MinIO) behind it yet, per BACKEND_CONTRACT.md;
-- that remains future work, not something this phase invents.

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
    -- Never populated by any current frontend flow (no attendance-marking
    -- UI exists) — kept for entity fidelity with src/lib/types.ts's Meeting,
    -- not because anything reads/writes it yet.
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
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name           TEXT NOT NULL,
    category       TEXT NOT NULL
                     CHECK (category IN ('constitution', 'policy', 'report', 'minutes', 'form')),
    file_type      TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx')),
    uploaded_date  DATE NOT NULL,
    uploaded_by    TEXT NOT NULL,
    size_kb        INTEGER NOT NULL,
    visibility     TEXT NOT NULL CHECK (visibility IN ('all', 'admins')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_org_date ON documents(organization_id, uploaded_date DESC);
