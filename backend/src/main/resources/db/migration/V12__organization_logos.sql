-- V12__organization_logos.sql
--
-- An organization can upload its own logo (PNG, JPEG or WebP, up to 1 MB);
-- without one, the app keeps showing logo_initials. The image lives in its
-- own table so ordinary organization reads never load the bytes, and in the
-- database so it works on any host without separate file storage.
-- organizations.logo_updated_at doubles as "has a logo" and as the cache-buster
-- in the logo URL.

ALTER TABLE organizations ADD COLUMN logo_updated_at TIMESTAMPTZ;

CREATE TABLE organization_logos (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    content_type    TEXT NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
    data            BYTEA NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
