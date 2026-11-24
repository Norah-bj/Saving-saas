FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
# pg_dump refuses to dump a server newer than itself, and the base image's
# default postgresql-client is older than the PostgreSQL 17 we target, so
# install the matching client from the official PostgreSQL (PGDG) apt repo.
# Keep this major version equal to the production database's.
ARG PG_CLIENT_VERSION=17
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
        https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && . /etc/os-release \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-${PG_CLIENT_VERSION} \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/backend-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
