-- Real pg_dump-backed backups (gap-closure phase 6) — see docs/DECISIONS.md
-- for why this is platform-wide only, SUPER_ADMIN-triggered, no per-tenant
-- restore. file_path is nullable so historical metadata-only rows (created
-- before this phase, or in case a future non-file backup type is ever
-- added) don't need a value.
ALTER TABLE backup_records ADD COLUMN file_path TEXT;
