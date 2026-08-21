# Contributing to IkiminaConnect

## Branching — GitHub Flow

- `main` is always deployable — it's what Vercel watches for the frontend deployment. Never commit
  to it directly.
- Every change gets its own branch off `main`: `feature/<short-description>` for new work,
  `fix/<short-description>` for bug fixes.
- Open a PR against `main` when the branch is ready. Merge once it's reviewed (or, solo, once you've
  re-read your own diff — the PR is still useful as a checkpoint and a record of *why*, not just
  *what*).
- Delete the branch after merging.

```bash
git checkout main
git pull
git checkout -b feature/short-description
# ... work, commit ...
git push -u origin feature/short-description
gh pr create
```

## Commit messages — Conventional Commits

```
<type>(<scope>): <short summary>

<optional longer body — the why, not just the what>
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.
Scope is optional but encouraged once a change is clearly on one side of the repo: `feat(backend):
...` vs `feat(frontend): ...`.

Examples:
- `feat(backend): add loan application endpoints`
- `fix(frontend): correct sidebar active-state on nested routes`
- `docs(backend): update contract with guarantor endpoint shapes`

## Why the frontend and backend share one repo and one `main`

This is a monorepo (`src/` for the Vite/React frontend, `backend/` for the Spring Boot API,
`docs/` for both). Vercel deploys the frontend from `main` on every push by default — to stop
backend-only commits from triggering a pointless rebuild, set Vercel's **Ignored Build Step**
(Project Settings → Git) to:

```bash
git diff --quiet HEAD^ HEAD -- src public package.json package-lock.json vite.config.ts index.html
```

That's the standard fix for this in a monorepo — not splitting the deployed frontend onto its own
permanently-diverging branch, which would just create constant merge drift between "the deployed
branch" and everything else.
