# CI-optimized PostgreSQL 18 + Apache AGE 1.7.0 + pgvector 0.8.1
# Used in GitHub Actions workflows as the test database service.
# NOTE: This is the CI variant — no corporate CA cert required.
#       For production/local dev, use infrastructure/docker/Dockerfile.postgres.
FROM postgres:18-alpine

LABEL maintainer="EduSphere Team"
LABEL description="CI test image: PostgreSQL 18 + Apache AGE 1.7.0 + pgvector 0.8.1"

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    clang \
    llvm \
    git \
    flex \
    bison

# Install Apache AGE 1.7.0 (supports PG18)
RUN cd /tmp && \
    git clone --branch release/PG18/1.7.0 --depth 1 https://github.com/apache/age.git && \
    cd age && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install && \
    cd / && \
    rm -rf /tmp/age

# Install pgvector 0.8.1
RUN cd /tmp && \
    git clone --branch v0.8.1 --depth 1 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install && \
    cd / && \
    rm -rf /tmp/pgvector

# Remove build dependencies to reduce image size
RUN apk del build-base git flex bison && \
    rm -rf /var/cache/apk/*

# Pre-load AGE on every DB startup
RUN echo "shared_preload_libraries = 'age'" >> /usr/local/share/postgresql/postgresql.conf.sample

EXPOSE 5432

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD pg_isready -U "${POSTGRES_USER:-postgres}" || exit 1
