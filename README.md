# IkiminaConnect (APUPEKA)

A multi-tenant savings and loan management platform for SACCOs, cooperatives,
and employee savings associations. The frontend is Vite, React and TypeScript;
the backend is Java 21, Spring Boot and PostgreSQL.

Every workflow is wired to the real API; the only pages not backed by real
data are three deliberately unbuilt super-admin pages, labelled as sample-data
previews (see [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)). The frontend is deployed on
Vercel, but it cannot log in until the API and production database are
deployed and Vercel receives the deployed API URL. Start with
[`docs/README.md`](docs/README.md) for the documentation map.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API defaults to
`http://localhost:8080/api/v1`; set `VITE_API_URL` in `.env.local` when it is
different.

## Scripts

- `npm run dev` - start the Vite development server
- `npm run build` - typecheck and build the production frontend
- `npm run preview` - preview the production frontend locally
- `npm run lint` - run ESLint

## Backend

The backend lives in `backend/` as a separate Maven project. For local setup,
see [`docs/backend/DEV_SETUP.md`](docs/backend/DEV_SETUP.md). For production
environment variables, Docker deployment, Vercel connection, and launch
checks, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

```bash
cd backend
mvn spring-boot:run
```
