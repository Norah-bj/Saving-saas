stop the # Local dev environment setup

## Toolchain (installed 2026-08-20)

- **JDK 21** (Temurin) — `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot`, via winget
  (`EclipseAdoptium.Temurin.21.JDK`). `JAVA_HOME` and `PATH` set persistently (User scope).
- **Maven 3.9.9** — no official winget package exists; downloaded directly from
  `archive.apache.org` and extracted to `C:\Users\NORA\tools\apache-maven-3.9.9`. Added to `PATH`
  (User scope) alongside JAVA_HOME.
- **PostgreSQL 17** — already installed on this machine before this project existed. Uses the
  existing instance; see below.

## PostgreSQL — uses the existing Windows service, port 5432

This project connects to the PostgreSQL instance that was already installed on this machine:

- Service: `postgresql-x64-17` (Windows service, runs as `NT AUTHORITY\NetworkService`)
- Data directory: `C:\Program Files\PostgreSQL\17\data`
- Port: **5432** (default)
- Auth: `scram-sha-256`

A dedicated role and database were created for this project only — nothing else on the instance
was touched:

```sql
CREATE ROLE ikiminaconnect WITH LOGIN PASSWORD 'ikiminaconnect_dev';
CREATE DATABASE ikiminaconnect OWNER ikiminaconnect;
```

`application.yml`'s defaults already match this (`DB_URL=jdbc:postgresql://localhost:5432/ikiminaconnect`,
`DB_USERNAME=ikiminaconnect`, `DB_PASSWORD=ikiminaconnect_dev`) — no environment variables need to
be set for local development. The `postgres` superuser password is not used by the application and
isn't stored anywhere in this repo.

Since it's already a registered Windows service, it starts automatically with the machine — nothing
to manually start or stop for this project.

### Superseded approach (do not use)

An earlier pass in this setup created a second, parallel PostgreSQL data directory at
`C:\Users\NORA\pgdata` on port 5433, to work around not knowing this instance's password at the
time. That approach was abandoned once the real password was available — don't recreate it. If
`C:\Users\NORA\pgdata` still exists on disk, it's inert (the server process is stopped) and safe to
delete whenever convenient; it was never a project dependency.

## Running the backend

```powershell
cd backend
mvn spring-boot:run
```

Flyway runs `V1__vertical_slice.sql` automatically against the `ikiminaconnect` database on
startup.
