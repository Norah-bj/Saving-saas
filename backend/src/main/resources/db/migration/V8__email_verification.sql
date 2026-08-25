-- V8__email_verification.sql
--
-- Self-service organization registration (POST /auth/register) previously
-- activated the registering admin immediately with no proof of email
-- ownership. New self-registered users now start unverified; existing rows
-- are backfilled to verified so nobody already using the system is locked
-- out retroactively. Members added by staff (POST /members) are also marked
-- verified at creation time — an admin already vouches for them, there's no
-- self-service identity gap to close there. See docs/BUSINESS_RULES.md.

ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET email_verified = true;

CREATE TABLE email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  TEXT NOT NULL UNIQUE,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);

CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);
