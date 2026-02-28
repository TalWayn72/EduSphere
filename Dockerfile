# ═══════════════════════════════════════════════════════════════
# EduSphere - All-in-One Docker Container
# PostgreSQL 18 + Apache AGE 1.7.0 + pgvector 0.8.1 + Redis + Keycloak + NATS + MinIO + Ollama
# All services managed by supervisord inside a single container
# Last updated: February 2026
# ═══════════════════════════════════════════════════════════════

FROM ubuntu:22.04

LABEL maintainer="EduSphere Team"
LABEL description="EduSphere all-in-one: PG18 + AGE 1.7.0 + pgvector 0.8.1 + Keycloak + NATS + MinIO"
LABEL postgresql.version="18"
LABEL apache.age.version="1.7.0"
LABEL pgvector.version="0.8.1"
LABEL keycloak.version="26.5.3"
LABEL nats.version="2.12.4"
LABEL node.version="22-lts"

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV PATH="/opt/nodejs/bin:$PATH"

# ═══════════════════════════════════════════════════════════════
# STAGE 0: Corporate CA cert + system CA certificates
# Corporate proxy performs SSL interception — inject root CA FIRST
# so all subsequent curl/wget/apt HTTPS calls succeed (SI-5 compliant)
# ═══════════════════════════════════════════════════════════════

COPY infrastructure/docker/corporate-root-ca.pem /usr/local/share/ca-certificates/corporate-root-ca.crt

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    update-ca-certificates

# ═══════════════════════════════════════════════════════════════
# STAGE 1: System base + PGDG repo + PostgreSQL 18
# AGE 1.7.0 and pgvector 0.8.1 compiled from source (PG18 packages
# not yet available in pgdg apt — source build is the reliable path)
# ═══════════════════════════════════════════════════════════════

RUN apt-get update && apt-get install -y \
    build-essential curl wget git gnupg lsb-release \
    flex bison \
    netcat-openbsd supervisor python3 python3-pip \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y \
       postgresql-18 \
       postgresql-contrib-18 \
       postgresql-server-dev-18 \
       redis-server \
       openjdk-21-jre-headless \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════
# STAGE 1.5: Compile Apache AGE 1.7.0 + pgvector 0.8.1 from source
# Both compiled against PG18 dev headers (postgresql-server-dev-18)
# ═══════════════════════════════════════════════════════════════

RUN cd /tmp && \
    git clone --branch release/PG18/1.7.0 --depth 1 https://github.com/apache/age.git && \
    cd age && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install && \
    cd / && rm -rf /tmp/age

RUN cd /tmp && \
    git clone --branch v0.8.1 --depth 1 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install && \
    cd / && rm -rf /tmp/pgvector

# ═══════════════════════════════════════════════════════════════
# STAGE 2: Node.js 22 LTS + pnpm
# Direct binary from nodejs.org — pinned to official signed release
# ═══════════════════════════════════════════════════════════════

RUN cd /tmp && \
    NODEFILE=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/ \
      | grep -oP 'node-v[0-9]+\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz' | sort -V | tail -1) && \
    curl -fsSL "https://nodejs.org/dist/latest-v22.x/$NODEFILE" -o "$NODEFILE" && \
    tar -xJf "$NODEFILE" && \
    mv "${NODEFILE%.tar.xz}" /opt/nodejs && \
    rm -f "$NODEFILE" && \
    npm install -g pnpm@latest && \
    npm cache clean --force

# ═══════════════════════════════════════════════════════════════
# STAGE 3: NATS Server v2.12.4
# ═══════════════════════════════════════════════════════════════

RUN cd /tmp && \
    curl -fsSL \
      https://github.com/nats-io/nats-server/releases/download/v2.12.4/nats-server-v2.12.4-linux-amd64.tar.gz \
      -o nats-server-v2.12.4-linux-amd64.tar.gz && \
    tar -xzf nats-server-v2.12.4-linux-amd64.tar.gz && \
    mv nats-server-v2.12.4-linux-amd64/nats-server /usr/local/bin/nats-server && \
    chmod +x /usr/local/bin/nats-server && \
    rm -rf /tmp/nats-server*

# ═══════════════════════════════════════════════════════════════
# STAGE 4: MinIO (latest)
# ═══════════════════════════════════════════════════════════════

RUN curl -fsSL \
      https://dl.min.io/server/minio/release/linux-amd64/minio \
      -o /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio && \
    mkdir -p /data/minio

# ═══════════════════════════════════════════════════════════════
# STAGE 5: Keycloak 26.5.3
# ═══════════════════════════════════════════════════════════════

RUN cd /opt && \
    curl -fsSL \
      https://github.com/keycloak/keycloak/releases/download/26.5.3/keycloak-26.5.3.tar.gz \
      -o keycloak-26.5.3.tar.gz && \
    tar -xzf keycloak-26.5.3.tar.gz && \
    mv keycloak-26.5.3 keycloak && \
    rm keycloak-26.5.3.tar.gz

# ═══════════════════════════════════════════════════════════════
# STAGE 6: Ollama
# ═══════════════════════════════════════════════════════════════

RUN curl -fsSL https://ollama.com/install.sh | sh

# ═══════════════════════════════════════════════════════════════
# STAGE 7: Configure PostgreSQL 18 — AGE + pgvector + edusphere DB
# shared_preload_libraries must be set BEFORE starting PostgreSQL
# ═══════════════════════════════════════════════════════════════

RUN echo "shared_preload_libraries = 'age'" >> /etc/postgresql/18/main/postgresql.conf && \
    echo "listen_addresses = '*'" >> /etc/postgresql/18/main/postgresql.conf && \
    echo "port = 5432" >> /etc/postgresql/18/main/postgresql.conf && \
    echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/18/main/pg_hba.conf

USER postgres

RUN /etc/init.d/postgresql start && \
    psql --command "CREATE USER edusphere WITH SUPERUSER PASSWORD 'edusphere_dev_password';" && \
    createdb -O edusphere edusphere && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"vector\";" && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"age\";" && \
    psql -d edusphere -c "SET search_path = ag_catalog, public; SELECT create_graph('edusphere_graph');" && \
    /etc/init.d/postgresql stop

USER root

# ═══════════════════════════════════════════════════════════════
# STAGE 8: Application Code
# ═══════════════════════════════════════════════════════════════

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json tsconfig.base.json ./

# Copy workspace packages + apps (cached unless these change)
COPY packages ./packages
COPY apps ./apps

# Install + build (cached unless packages/apps change)
# Build only backend services — web/mobile frontends are not served from this container
RUN pnpm install --no-frozen-lockfile
RUN pnpm turbo build --filter='./packages/*' --filter='./apps/subgraph-*' --filter='./apps/gateway' --filter='./apps/transcription-worker'

# ═══════════════════════════════════════════════════════════════
# STAGE 9: Runtime config (after build — changes here don't bust build cache)
# ═══════════════════════════════════════════════════════════════

COPY infrastructure ./infrastructure
COPY scripts ./scripts
COPY infrastructure/docker/supervisord.conf /etc/supervisor/conf.d/edusphere.conf
COPY infrastructure/docker/startup.sh /startup.sh
RUN chmod +x /startup.sh

# ═══════════════════════════════════════════════════════════════
# STAGE 10: Ports + Health + Entrypoint
# ═══════════════════════════════════════════════════════════════

# GraphQL Gateway + Subgraphs
EXPOSE 4000 4001 4002 4003 4004 4005 4006
# Infrastructure services
EXPOSE 5432 6379 8080 4222 8222 9000 9001 11434

HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["/startup.sh"]
