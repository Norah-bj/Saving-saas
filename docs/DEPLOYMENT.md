# Deployment

## Today

- **Frontend**: deployed to Vercel (`vercel.json` at repo root). Mock-data-only — no backend
  calls yet, so no environment-specific API URL configuration exists yet either.
- **Backend**: not deployed anywhere. Runs locally only, against a local PostgreSQL 17 instance.
  No Dockerfile, no CI pipeline, no production `application.properties` profile yet.

## Planned (phase 17, not started)

Production deployment is its own roadmap phase and hasn't been designed yet beyond the
multi-tenancy architecture already accounting for it (see [ARCHITECTURE.md](ARCHITECTURE.md)'s
future dedicated-tenant migration path). When this phase starts, this document should record:
hosting choice for the backend, production database setup, secrets management, CI/CD, the
frontend's real API base URL configuration, and how a merge to `main` actually reaches production
(if at all — the user merges PRs manually today; whether that stays true in production is an open
question for that phase).

## What NOT to do before phase 17

Don't build custom-domain provisioning or dedicated-infrastructure automation ahead of an actual
paying customer needing it — this was an explicit early decision, not an oversight. See
[DECISIONS.md](DECISIONS.md).
