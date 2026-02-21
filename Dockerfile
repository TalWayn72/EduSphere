# ═══════════════════════════════════════════════════════════════
# EduSphere - All-in-One Docker Container
# PostgreSQL 17 + Apache AGE + pgvector + Redis + Keycloak + NATS + MinIO + Ollama
# All services managed by supervisord inside a single container
# Last updated: February 2026
# ═══════════════════════════════════════════════════════════════

FROM ubuntu:22.04

LABEL maintainer="EduSphere Team"
LABEL description="EduSphere all-in-one: PG17 + AGE + pgvector + Keycloak + NATS + MinIO"
LABEL postgresql.version="17"
LABEL apache.age.version="pgdg-package"
LABEL pgvector.version="pgdg-package"
LABEL keycloak.version="26.5.3"
LABEL nats.version="2.12.4"
LABEL node.version="22-lts"

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
# Disable SSL verification for corporate proxy environments
ENV GIT_SSL_NO_VERIFY=true
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV PATH="/opt/nodejs/bin:$PATH"

# ═══════════════════════════════════════════════════════════════
# STAGE 0: Disable apt SSL verification (corporate proxy support)
# ═══════════════════════════════════════════════════════════════

RUN echo 'Acquire::https::Verify-Peer "false";' > /etc/apt/apt.conf.d/99insecure && \
    echo 'Acquire::https::Verify-Host "false";' >> /etc/apt/apt.conf.d/99insecure && \
    echo 'Acquire::AllowInsecureRepositories "true";' >> /etc/apt/apt.conf.d/99insecure

# ═══════════════════════════════════════════════════════════════
# STAGE 1: System base + PGDG repo + PostgreSQL 17 + AGE + pgvector
# AGE and pgvector installed as PGDG packages — no compilation needed
# ═══════════════════════════════════════════════════════════════

RUN apt-get update && apt-get install -y \
    build-essential curl wget git ca-certificates gnupg lsb-release \
    netcat-openbsd supervisor python3 python3-pip \
    && curl -fsSL --insecure https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y \
       postgresql-17 \
       postgresql-contrib-17 \
       postgresql-17-age \
       postgresql-17-pgvector \
       redis-server \
       openjdk-21-jre-headless \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════
# STAGE 2: Node.js 22 LTS + pnpm
# Direct binary from nodejs.org — bypasses corporate SSL proxy issues
# (NodeSource setup script's internal curl fails with SSL inspection)
# ═══════════════════════════════════════════════════════════════

RUN cd /tmp && \
    NODEFILE=$(wget --no-check-certificate -qO- https://nodejs.org/dist/latest-v22.x/ \
      | grep -oP 'node-v[0-9]+\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz' | sort -V | tail -1) && \
    wget --no-check-certificate -q "https://nodejs.org/dist/latest-v22.x/$NODEFILE" && \
    tar -xJf "$NODEFILE" && \
    mv "${NODEFILE%.tar.xz}" /opt/nodejs && \
    rm -f "$NODEFILE" && \
    npm install -g pnpm@latest && \
    npm cache clean --force

# ═══════════════════════════════════════════════════════════════
# STAGE 3: NATS Server v2.12.4
# ═══════════════════════════════════════════════════════════════

RUN cd /tmp && \
    wget --no-check-certificate -q \
      https://github.com/nats-io/nats-server/releases/download/v2.12.4/nats-server-v2.12.4-linux-amd64.tar.gz && \
    tar -xzf nats-server-v2.12.4-linux-amd64.tar.gz && \
    mv nats-server-v2.12.4-linux-amd64/nats-server /usr/local/bin/nats-server && \
    chmod +x /usr/local/bin/nats-server && \
    rm -rf /tmp/nats-server*

# ═══════════════════════════════════════════════════════════════
# STAGE 4: MinIO (latest)
# ═══════════════════════════════════════════════════════════════

RUN wget --no-check-certificate -q \
      -O /usr/local/bin/minio \
      https://dl.min.io/server/minio/release/linux-amd64/minio && \
    chmod +x /usr/local/bin/minio && \
    mkdir -p /data/minio

# ═══════════════════════════════════════════════════════════════
# STAGE 5: Keycloak 26.5.3
# ═══════════════════════════════════════════════════════════════

RUN cd /opt && \
    wget --no-check-certificate -q \
      https://github.com/keycloak/keycloak/releases/download/26.5.3/keycloak-26.5.3.tar.gz && \
    tar -xzf keycloak-26.5.3.tar.gz && \
    mv keycloak-26.5.3 keycloak && \
    rm keycloak-26.5.3.tar.gz

# ═══════════════════════════════════════════════════════════════
# STAGE 6: Ollama
# ═══════════════════════════════════════════════════════════════

RUN curl -fsSL --insecure https://ollama.com/install.sh | sh

# ═══════════════════════════════════════════════════════════════
# STAGE 7: Configure PostgreSQL 17 — AGE + pgvector + edusphere DB
# shared_preload_libraries must be set BEFORE starting PostgreSQL
# ═══════════════════════════════════════════════════════════════

RUN echo "shared_preload_libraries = 'age'" >> /etc/postgresql/17/main/postgresql.conf && \
    echo "listen_addresses = '*'" >> /etc/postgresql/17/main/postgresql.conf && \
    echo "port = 5432" >> /etc/postgresql/17/main/postgresql.conf && \
    echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/17/main/pg_hba.conf

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
