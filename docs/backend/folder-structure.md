# Backend folder structure

A new top-level `backend/` directory, sibling to `src/` (the React frontend stays exactly where it
is — this is a separate Maven project, not a merge into the existing repo layout).

```
Saving-saas/
├── src/                          # existing React frontend — untouched
├── docs/
│   ├── BACKEND_CONTRACT.md
│   └── backend/
│       ├── schema.sql
│       ├── vertical-slice-api.md
│       └── folder-structure.md   # this file
└── backend/
    ├── pom.xml
    └── src/
        ├── main/
        │   ├── java/rw/ikiminaconnect/
        │   │   ├── IkiminaConnectApplication.java
        │   │   │
        │   │   ├── config/                 # Spring config: CORS, OpenAPI, bean wiring
        │   │   │
        │   │   ├── security/               # cross-cutting, not feature-specific
        │   │   │   ├── JwtService.java              # issue/parse/verify access + refresh tokens
        │   │   │   ├── SecurityConfig.java           # Spring Security filter chain, @PreAuthorize enablement
        │   │   │   ├── CurrentUser.java               # request-scoped bean: id, organizationId, roles, committeeChair
        │   │   │   └── PasswordConfig.java             # BCrypt bean
        │   │   │
        │   │   ├── tenant/                 # multi-tenancy plumbing, not a business feature
        │   │   │   ├── OrganizationFilterInterceptor.java   # enables the Hibernate @Filter per-request
        │   │   │   └── TenantContext.java                    # thread-local/request-scoped current organizationId
        │   │   │
        │   │   ├── organization/           # Organization entity + settings endpoints
        │   │   │   ├── Organization.java
        │   │   │   ├── OrganizationRepository.java
        │   │   │   └── OrganizationService.java
        │   │   │
        │   │   ├── auth/                   # login/refresh/logout
        │   │   │   ├── AuthController.java
        │   │   │   ├── AuthService.java
        │   │   │   └── RefreshToken.java
        │   │   │
        │   │   ├── member/                 # AppUser + roles (member management)
        │   │   │   ├── AppUser.java
        │   │   │   ├── UserRole.java
        │   │   │   ├── MemberController.java
        │   │   │   ├── MemberService.java
        │   │   │   └── MemberRepository.java
        │   │   │
        │   │   ├── savings/                # savings ledger + share holdings
        │   │   │   ├── SavingsTransaction.java
        │   │   │   ├── ShareHolding.java
        │   │   │   ├── SavingsController.java
        │   │   │   ├── SavingsService.java             # balance computation lives here, server-side only
        │   │   │   └── SavingsRepository.java
        │   │   │
        │   │   ├── audit/
        │   │   │   ├── AuditLogEntry.java
        │   │   │   └── AuditService.java               # injected into other services, not its own controller
        │   │   │
        │   │   └── common/                 # shared: pagination DTOs, error handling, base entity
        │   │       ├── ApiError.java
        │   │       ├── GlobalExceptionHandler.java
        │   │       └── PageResponse.java
        │   │
        │   └── resources/
        │       ├── application.yml                     # local dev profile
        │       ├── application-prod.yml
        │       └── db/migration/
        │           └── V1__vertical_slice.sql           # copy of docs/backend/schema.sql
        │
        └── test/java/rw/ikiminaconnect/
            ├── auth/AuthControllerTest.java
            ├── savings/SavingsServiceTest.java          # balance computation, concurrent-write locking
            └── tenant/OrganizationFilterInterceptorTest.java  # the isolation test that matters most
```

Package-by-feature (`member/`, `savings/`, `auth/`, ...), not package-by-layer
(`controllers/`, `services/`, `repositories/`) — keeps each business area's files together as the
codebase grows through the roadmap's later phases (`loan/`, `guarantee/`, `payroll/`, ... get added
the same way, each a sibling package).

`security/` and `tenant/` are deliberately separate from `member/` — they're cross-cutting concerns
every future feature package depends on, not part of the member-management feature itself.

Migrations: Flyway, `V1__vertical_slice.sql` is the file at `docs/backend/schema.sql` copied in
verbatim (that file is the reviewable source; this is where it actually runs from). Later phases add
`V2__loans.sql`, `V3__payroll.sql`, etc., one per roadmap phase.
