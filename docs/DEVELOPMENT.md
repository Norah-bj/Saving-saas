# Development

## Local setup

- **Backend**: full toolchain install + Postgres setup steps are in
  [backend/DEV_SETUP.md](backend/DEV_SETUP.md). Summary: JDK 21 Temurin, Maven 3.9.9 (manual
  install, no winget package), PostgreSQL 17 (an already-installed Windows service reused for this
  project — a dedicated `ikiminaconnect` role/database created on it, nothing else on the instance
  touched). On Windows, new shell calls don't reliably inherit a just-changed registry PATH — set
  `$env:JAVA_HOME`/`$env:PATH` explicitly at the top of every command that needs them rather than
  assuming persistence.
- **Frontend**: `npm install && npm run dev`, see the root [README.md](../README.md). Copy
  `.env.example` to `.env` and set `VITE_API_URL` (defaults to `http://localhost:8080/api/v1`) —
  needed now that the member workspace calls the real backend instead of the zustand mock; see
  [ARCHITECTURE.md](ARCHITECTURE.md#frontendbackend-integration). To exercise the wired pages
  locally, start the backend first (`mvn spring-boot:run` from `backend/`, wait for `Started
  IkiminaConnectApplication`), then `npm run dev` — both servers run independently, nothing
  auto-starts the other. The non-member workspaces don't need the backend running yet since they
  still read from the mock.
- **Dev test credentials** (for smoke-testing against real data in the `tcs2` org rather than a
  freshly-registered empty org) — all `DevTest123!`, all reset via a direct DB `UPDATE` because the
  original test-session passwords were never recorded (`UPDATE users SET password_hash =
  crypt('...', gen_salt('bf', 10)) WHERE email = '...'` via `psql`, pgcrypto extension; reset the
  same way if one stops working, rather than guessing):
  - `admin2@tcs2.rw` — org-admin + hr + loan-committee + member, status `active`
  - `chair@tcs2.rw` — loan-committee (committee chair) + member, status `active`
  - `plain@tcs2.rw` — **secretary** + member (promoted during phase 13 role-assignment testing —
    no longer a genuinely plain member), status `pending`. Also now holds a disbursed test loan
    (`TC-2026-TEST-BLOCK`) and an active guarantee on `TC-2026-002`, making it a ready-made
    "blocked from exiting" fixture — see [BUSINESS_RULES.md](BUSINESS_RULES.md).
  - `g2@tcs2.rw` — member only, status `active` — use this one for genuinely-plain-member /
    staff-authorization testing now that `plain@tcs2.rw` isn't plain anymore.
  - `zero@tcs2.rw` — status `exited` (used to verify the exit-approval flow end-to-end, including
    that login is actually blocked afterward) — **cannot log in**, kept as a record of that test,
    don't reset its password expecting it to work.
  - `superadmin@ikiminaconnect.rw` / `DevTest123!` — SUPER_ADMIN, `organization_id = NULL`. This
    one predates `POST /auth/bootstrap-super-admin` and was **inserted from scratch** via SQL. If
    it's ever deleted, recreate it via the bootstrap endpoint instead (see below) — SQL insertion
    is no longer necessary.

## Provisioning the platform SUPER_ADMIN

`POST /auth/bootstrap-super-admin` is the real way to create the platform's first (and, by design,
only ever automatically created) SUPER_ADMIN — see [API.md](API.md) for the exact request/response
shape. It's public (no JWT exists yet the first time it's meaningfully callable) but gated two
ways: a bootstrap token, and the fact that it only ever succeeds once.

1. Set `SUPER_ADMIN_BOOTSTRAP_TOKEN` before starting the backend — it's blank by default, which
   disables the endpoint entirely (every call 403s regardless of what token is sent):
   ```bash
   export SUPER_ADMIN_BOOTSTRAP_TOKEN="some-long-random-value-you-generate"
   mvn spring-boot:run
   ```
2. Call the endpoint once:
   ```bash
   curl -X POST http://localhost:8080/api/v1/auth/bootstrap-super-admin \
     -H "Content-Type: application/json" \
     -d '{
       "token": "some-long-random-value-you-generate",
       "fullName": "Platform Operator",
       "nationalId": "1199000000000001",
       "employeeId": "PLAT-001",
       "email": "you@example.com",
       "phone": "0788000000",
       "password": "a-real-password"
     }'
   ```
   Response is the normal `AuthResponse` shape (real access + refresh tokens) — log in with the
   same email/password afterward via `/auth/login` as usual.
3. Any further call — same token or not — 409s with `"A platform super-admin already exists."`
   once any user holds the `super-admin` role. Rotate/unset `SUPER_ADMIN_BOOTSTRAP_TOKEN` after use
   if you want to close the door entirely (not required for correctness, since the existence check
   already prevents a second super-admin, but tidier for a shared/non-local environment).

Not exposed anywhere in the frontend UI — a one-time operational action, not a normal signup flow.

## Environment variables

No `.env` file is required for local backend development — DB connection defaults
(`DB_USERNAME=ikiminaconnect`, `DB_PASSWORD=ikiminaconnect_dev`) are baked into
`application.properties` for the dev profile. See `backend/DEV_SETUP.md` for the reasoning and
what would need to change for a non-local environment.

`SUPER_ADMIN_BOOTSTRAP_TOKEN` (optional, blank/disabled by default) — see above.

## Git / PR workflow

GitHub Flow: `main` is protected, work happens on `feature/xxx` branches, Conventional Commit
messages, PRs opened via the `gh` CLI (full path on this machine:
`"/c/Program Files/GitHub CLI/gh.exe"`, not on PATH).

- **Never merge a PR without the user's explicit approval** — open it and stop; the user reviews
  and merges themselves.
- **Every PR description must include an explicit merge-risk assessment** — state plainly whether
  it's safe/low-risk or whether it touches something that could affect other work (shared
  infrastructure, an existing endpoint's behavior, deployment config, etc.), so the user can be
  mindful when merging. This is a standing instruction, not optional per-PR judgment.
- Branch from `origin/main` (verify the local branch tip actually matches `origin/main` before
  starting new work — a stale previous feature branch can silently diverge).
- One phase = one branch = one PR, generally. New migrations get a new `V{n}` file; existing
  migrations are never edited once applied.

## Testing pattern

See [TESTING.md](TESTING.md) — no automated suite yet; manual curl + psql cross-checking is the
current standard for every phase before it's considered done.

## Documentation is part of the implementation

A phase/feature is not finished until code, testing, *and* documentation are all done — not
"documented later." Before starting a task: read the relevant doc(s) in `docs/`, inspect the
actual current code (don't trust a doc blindly — code is ground truth if they disagree), then
implement, test, and update:

- [CHANGELOG.md](CHANGELOG.md) — always, for any meaningful change.
- [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [API.md](API.md),
  [BUSINESS_RULES.md](BUSINESS_RULES.md), [FEATURES.md](FEATURES.md) — whichever actually changed.
- [DECISIONS.md](DECISIONS.md) — for any non-obvious technical choice, especially anything a
  future session would otherwise re-litigate.
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) — for any bug found+fixed (so the same mistake isn't
  repeated) or gap deliberately left unfixed (so it isn't silently "fixed" later via an unstated
  assumption).

Never document a secret (password, API key, token, credential value) — name the variable/what
it's for instead. The one existing exception, the dev-only test password above, is a throwaway
local credential for a database only this machine can reach, not a real secret.
