# IkiminaConnect (APUPEKA)

A multi-tenant savings & loan management platform for SACCOs, cooperatives,
and employee savings associations. Frontend: Vite + React + TypeScript SPA
with React Router, Tailwind v4, and shadcn/ui. Backend: Java 21 + Spring Boot
+ PostgreSQL, built vertical-slice by vertical-slice (11 of 17 phases done —
see `docs/FEATURES.md`).

The frontend still runs entirely on a zustand store seeded with mock data
(see `src/lib/mock-data/`) — it is not yet wired to the real backend, which
runs locally only. **Start at [`docs/README.md`](docs/README.md)** for the
full documentation map (architecture, API, database, business rules,
decisions, changelog, known issues, dev setup).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in from
`/login` with any of the demo personas.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`tsc -b`) and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Project structure

- `src/pages/` — one component per route, grouped by workspace role
- `src/routes.tsx` — the central route table
- `src/components/layout/` — sidebar, topbar, workspace switcher, the
  `ProtectedLayout` auth/role guard
- `src/components/ui/` — shadcn/ui primitives (base-ui flavor)
- `src/components/shared/` and `src/components/charts/` — reusable
  dashboard building blocks (StatCard, DataTable, chart wrappers, etc.)
- `src/lib/` — types, mock data, the zustand store, and business logic
  (loan calculator, formatting helpers)

## Backend

Lives in `backend/` (separate Maven project, Java 21 + Spring Boot + PostgreSQL). See
[`docs/backend/DEV_SETUP.md`](docs/backend/DEV_SETUP.md) for local setup and
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the dev workflow.

```bash
cd backend
mvn spring-boot:run
```
