# IkiminaConnect (APUPEKA)

A savings & loan management platform for SACCOs, cooperatives, and employee
savings associations, built as a Vite + React + TypeScript single-page app
with React Router, Tailwind v4, and shadcn/ui.

This is currently a frontend-only prototype: all data lives in a zustand
store seeded with realistic mock data (see `src/lib/mock-data/`). See
`docs/BACKEND_CONTRACT.md` for the planned Java/Spring Boot API this will
eventually talk to.

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
