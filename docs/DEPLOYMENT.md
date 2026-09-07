# Deployment

## Current status

- **Frontend:** deployed on Vercel, but its current build uses `VITE_API_URL=http://localhost:8080/api/v1`. That address is valid only on the computer running the backend; it cannot work for visitors to the Vercel site.
- **Backend:** production deployment and a production PostgreSQL database are not configured yet. `backend/Dockerfile` now provides a portable deployment artifact, and Flyway applies the schema migrations on an empty database.
- **Data:** the local PostgreSQL database is not automatically copied to a hosted database. Treat production as a new database unless a deliberate, tested data migration is performed.

## What must be deployed

Use three separate managed services:

1. Vercel for the React frontend (already in place).
2. Any Docker-capable Java host for `backend/` (Render, Railway, Fly.io, a VM, or equivalent).
3. Managed PostgreSQL from the same provider or a reputable managed database provider.

The backend host must build with **`backend` as the Docker build context** and use `backend/Dockerfile`. Configure its health check as `GET /actuator/health`; the application now includes Spring Boot Actuator for that endpoint.

## Backend environment variables

Copy the names from `backend/.env.production.example` into the backend host's secret/environment-variable screen. Never put real values in Git, the Vercel environment, screenshots, or chat.

| Variable | Purpose |
|---|---|
| `SPRING_PROFILES_ACTIVE=prod` | Enables fail-fast production configuration. |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Hosted PostgreSQL connection. `DB_URL` must be a JDBC URL. |
| `JWT_SECRET` | Long random signing secret; changing it logs out every user. |
| `CORS_ALLOWED_ORIGINS` | Exact comma-separated frontend origins, e.g. `https://saving-saas.vercel.app`. Include Vercel preview URLs only when genuinely needed. |
| `FRONTEND_URL` | Canonical frontend URL used in email-verification links. |
| `EMAIL_PROVIDER` | Set to `resend` for real delivery; leave `console` for local development. |
| `RESEND_API_KEY` | Create in Resend Dashboard → API Keys. Store only in Render's secret variables. |
| `EMAIL_FROM` | Use `onboarding@resend.dev` for the initial test. It can deliver only to the email address on the Resend account. For other recipients, verify a domain and use an address on that domain. |
| `SUPER_ADMIN_BOOTSTRAP_TOKEN` | One-time secret required only to create the first platform super-admin. Remove it after provisioning. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `BACKUP_DIRECTORY` | Required by the platform-wide `pg_dump` backup feature. Mount `BACKUP_DIRECTORY` on persistent private storage; otherwise backups disappear on a redeploy. |

The hosting provider supplies `PORT`; do not hard-code it. The API listens on that port automatically.

## Connect Vercel to the deployed API

After the backend host gives you an HTTPS URL such as `https://api.example.com`, set this Vercel environment variable for Production (and Preview too only if you need preview deployments to work):

```text
VITE_API_URL=https://api.example.com/api/v1
```

Also set the backend values together:

```text
CORS_ALLOWED_ORIGINS=https://saving-saas.vercel.app
FRONTEND_URL=https://saving-saas.vercel.app
```

Redeploy the backend after changing its variables, then redeploy Vercel after changing `VITE_API_URL`. Vite embeds `VITE_*` values during the frontend build; changing the Vercel variable alone does not change an already-built site.

Test in this order:

1. Open `https://api.example.com/actuator/health`; expect HTTP 200.
2. Log in on the deployed Vercel URL.
3. In browser developer tools, confirm login calls the HTTPS API URL, never `localhost:8080`.
4. Confirm there is no browser CORS error.

## First platform super-admin

There is no super-admin account created by organization registration. Once the production database and API are live, use the one-time `POST /api/v1/auth/bootstrap-super-admin` endpoint with the configured `SUPER_ADMIN_BOOTSTRAP_TOKEN`. Its exact request is documented in [`API.md`](API.md) and [`DEVELOPMENT.md`](DEVELOPMENT.md). The endpoint creates one `super-admin` account with no organization; that account can use the Super Admin workspace to manage all organizations.

Do this from a secure machine, save the password in a password manager, and remove `SUPER_ADMIN_BOOTSTRAP_TOKEN` from the host afterward. Do not share a real account password with a developer or paste it into chat.

## Important launch limitation: email

Email verification uses Resend when `EMAIL_PROVIDER=resend`. For the first demo,
create a Resend account using your email, create an API key, and set
`EMAIL_FROM=onboarding@resend.dev`; the test sender can deliver only to that
account email. To send verification to cooperative members, verify a domain
you own in Resend, then use an address at that domain. Resend requires SPF and
DKIM DNS records for domain verification. This is separate from the CORS issue.
