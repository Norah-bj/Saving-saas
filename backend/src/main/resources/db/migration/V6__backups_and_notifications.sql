-- V6__backups_and_notifications.sql
--
-- Phase 14 (backups) and phase 16 (notifications). Bundled in one migration
-- since both are small, org-operations-adjacent tables with no relationship
-- to each other — not because they share any business logic.
--
-- backup_records is metadata only — there is no real pg_dump/restore
-- automation behind this yet (no restore endpoint either; the frontend mock
-- doesn't implement restore beyond local UI state). See docs/KNOWN_ISSUES.md.
--
-- notifications has no creation endpoint — nothing in the frontend mock ever
-- dynamically creates a notification either (NOTIFICATIONS is static seed
-- data in data-store.ts, despite the per-type icons implying loan/meeting/
-- announcement/savings events should push one). This phase only builds the
-- inbox read side (list, mark read, mark all read); wiring other services to
-- actually create notifications is future work.

CREATE TABLE backup_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable = platform-wide, same pattern as audit_log.organization_id.
    organization_id  UUID REFERENCES organizations(id),
    label            TEXT NOT NULL,
    type             TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'scheduled')),
    size_mb          INTEGER NOT NULL,
    created_by       TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backup_records_org_date ON backup_records(organization_id, created_at DESC);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('loan', 'meeting', 'announcement', 'savings', 'system')),
    read        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_date ON notifications(user_id, created_at DESC);
