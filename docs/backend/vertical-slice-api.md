# Vertical-slice API — auth, members, savings & shares

Concrete request/response shapes for the first real end-to-end flow. Narrower than the full endpoint
list in `docs/BACKEND_CONTRACT.md` — this is everything needed for: organization → user/member →
authentication → savings transaction → updated balance → statement/history → audit record, and
nothing from later phases.

All endpoints under `/api/v1`. All responses `application/json`. Errors: standard problem shape
`{ "error": string, "message": string, "details"?: object }` with the appropriate HTTP status.

## Auth

### `POST /auth/login`

```json
// Request
{ "email": "d.nkurunziza@apupeka.rw", "password": "..." }

// 200 Response
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": {
    "id": "usr_...",
    "organizationId": "org_...",
    "fullName": "David Nkurunziza",
    "roles": ["member"],
    "committeeChair": false
  }
}
```
`401` on bad credentials. `403` if `user.status` is `suspended` or `exited`.

### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "eyJ..." }
// 200 Response — same shape as login. Old refresh token is revoked (rotation).
```

### `POST /auth/logout`
```json
// Request
{ "refreshToken": "eyJ..." }
// 204 No Content — revokes the refresh token server-side.
```

### `GET /me`
Requires `Authorization: Bearer <accessToken>`.
```json
// 200 Response
{
  "id": "usr_...",
  "organizationId": "org_...",
  "nationalId": "1199390889012034",
  "employeeId": "EMP007",
  "fullName": "David Nkurunziza",
  "email": "d.nkurunziza@apupeka.rw",
  "phone": "+250 788 100 007",
  "department": "Education",
  "position": "Head Teacher",
  "status": "active",
  "roles": ["member"],
  "committeeChair": false,
  "monthlySalaryRwf": 290000
}
```

## Members

All member endpoints require an authenticated user; list/create require `secretary` or `org-admin`.
Every response is implicitly scoped to the caller's `organizationId` (application-layer Hibernate
filter — see `BACKEND_CONTRACT.md`'s multi-tenancy section); a `super-admin` caller may pass an
explicit `?organizationId=` query param to cross that scope.

### `GET /members`
```
?status=active&search=nkurunziza&page=0&size=20
```
```json
// 200 Response
{
  "content": [
    {
      "id": "usr_...",
      "nationalId": "1199390889012034",
      "employeeId": "EMP007",
      "fullName": "David Nkurunziza",
      "department": "Education",
      "position": "Head Teacher",
      "status": "active",
      "dateJoined": "2021-06-14",
      "savingsBalanceRwf": 1740500
    }
  ],
  "page": 0, "size": 20, "totalElements": 22, "totalPages": 2
}
```

### `POST /members`
Requires `secretary` or `org-admin`. Creates the user record and an empty `share_holdings` row.
```json
// Request
{
  "nationalId": "1199591020304050",
  "employeeId": "EMP023",
  "fullName": "New Member",
  "email": "n.member@apupeka.rw",
  "phone": "+250 788 100 023",
  "department": "Finance",
  "position": "Clerk",
  "monthlySalaryRwf": 250000
}
// 201 Response — full member object, status "pending" until activated.
// 409 if nationalId already exists anywhere on the platform, or employeeId
// already exists within this organization.
```

### `GET /members/{id}`
Full member profile, including `roles`, `committeeChair`, `savingsBalanceRwf`, `shares` summary.
`404` if not found or not in the caller's organization (not `403` — don't leak existence across tenants).

## Savings & shares

### `GET /members/{id}/savings-ledger`
```
?from=2026-01-01&to=2026-08-31&page=0&size=20
```
```json
// 200 Response
{
  "content": [
    {
      "id": "tx_...",
      "occurredOn": "2026-08-01",
      "type": "voluntary",
      "amount": 11500,
      "balanceAfter": 1740500,
      "description": "Voluntary savings top-up",
      "source": "Member Self-Service"
    }
  ],
  "page": 0, "size": 20, "totalElements": 48, "totalPages": 3,
  "currentBalanceRwf": 1740500
}
```

### `POST /members/{id}/savings/voluntary`
Requires the caller to be the member themself, or `accountant`/`secretary`/`org-admin`.
```json
// Request
{ "amountRwf": 11500, "source": "Member Self-Service" }

// 201 Response — the created ledger row (same shape as the list item above).
// balanceAfter is always computed server-side, inside a transaction with a
// row lock on the member, from the previous balance + amount. The client
// never supplies balanceAfter.
```
Writes an `audit_log` row (`action: "Added voluntary saving"`).

### `POST /members/{id}/shares/buy`
```json
// Request
{ "shares": 2 }

// 201 Response
{
  "memberId": "usr_...",
  "totalShares": 13,
  "shareValueRwf": 5000,           // read from the member's organization
  "totalValueRwf": 65000,
  "ledgerEntry": {
    "id": "tx_...",
    "type": "share-purchase",
    "amount": 10000,
    "balanceAfter": 1750500,
    "description": "Purchase of 2 shares"
  }
}
```
`amount = shares * organizations.share_value_rwf` for the member's own organization — never a
client-supplied price. Writes an `audit_log` row and inserts one `savings_transactions` row
(share purchases still flow through the savings balance, matching the current frontend model).

## What's deliberately out of scope for this slice

No loans, guarantees, payroll import, meetings, documents, reports, or notifications yet — those are
phases 4 onward in `BACKEND_CONTRACT.md`'s roadmap. This slice exists to prove: real Postgres, real
JWT auth + RBAC, real tenant isolation, and a real money-moving write path (savings/shares) with a
server-computed running balance — the riskiest architectural assumptions, validated before building
everything that depends on them.
