-- V11__staff_invites.sql (gap-closure phase 9)
--
-- Staff-added members (POST /members) used to get a generated temporary
-- password that the adding admin had to pass on by hand. They now get a
-- single-use invite link and choose their own password. Until they accept,
-- the account has no password at all (password_hash IS NULL), so nobody —
-- including the admin who created it — can sign in as them. Every existing
-- row keeps its password hash, so no current user is affected.

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Single-use account links: staff invites and self-service password resets.
-- Same shape and rationale as email_verification_tokens (V8): only the
-- SHA-256 hash of the token is stored, so a leaked row or a link left in a
-- browser history is useless once used or expired. A token only works for
-- the purpose it was issued for.
CREATE TABLE account_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    purpose     TEXT NOT NULL CHECK (purpose IN ('INVITE', 'PASSWORD_RESET')),
    token_hash  TEXT NOT NULL UNIQUE,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);

CREATE INDEX idx_account_tokens_user_purpose ON account_tokens(user_id, purpose);
