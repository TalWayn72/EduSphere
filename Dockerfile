# ═══════════════════════════════════════════════════════════════
# EduSphere - All-in-One Docker Container
# Single container with all services and subgraphs
# ═══════════════════════════════════════════════════════════════

FROM ubuntu:22.04

LABEL maintainer="EduSphere Team"
LABEL description="Complete EduSphere platform in a single container"

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# ═══════════════════════════════════════════════════════════════
# STAGE 1: Install System Dependencies
# ═══════════════════════════════════════════════════════════════

RUN apt-get update && apt-get install -y \
    # Build tools
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    # PostgreSQL 16
    postgresql-16 \
    postgresql-contrib-16 \
    postgresql-server-dev-16 \
    # Redis
    redis-server \
    # Supervisor for process management
    supervisor \
    # Java for Keycloak
    openjdk-21-jre-headless \
    # Python for various tools
    python3 \
    python3-pip \
    # Network tools
    netcat-openbsd \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════
# STAGE 2: Install Node.js 20 + pnpm
# ═══════════════════════════════════════════════════════════════

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm@9.15.0 && \
    npm cache clean --force

# ═══════════════════════════════════════════════════════════════
# STAGE 3: Build PostgreSQL Extensions (Apache AGE + pgvector)
# ═══════════════════════════════════════════════════════════════

# Install Apache AGE 1.5.0
RUN cd /tmp && \
    git clone --branch PG16/v1.5.0 --depth 1 https://github.com/apache/age.git && \
    cd age && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install && \
    cd / && \
    rm -rf /tmp/age

# Install pgvector 0.8.0
RUN cd /tmp && \
    git clone --branch v0.8.0 --depth 1 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make USE_PGXS=1 && \
    make USE_PGXS=1 install && \
    cd / && \
    rm -rf /tmp/pgvector

# ═══════════════════════════════════════════════════════════════
# STAGE 4: Install Additional Services
# ═══════════════════════════════════════════════════════════════

# Install NATS Server
RUN cd /tmp && \
    wget https://github.com/nats-io/nats-server/releases/download/v2.10.24/nats-server-v2.10.24-linux-amd64.tar.gz && \
    tar -xzf nats-server-v2.10.24-linux-amd64.tar.gz && \
    mv nats-server-v2.10.24-linux-amd64/nats-server /usr/local/bin/ && \
    chmod +x /usr/local/bin/nats-server && \
    rm -rf /tmp/nats-server*

# Install MinIO
RUN cd /tmp && \
    wget https://dl.min.io/server/minio/release/linux-amd64/minio && \
    chmod +x minio && \
    mv minio /usr/local/bin/ && \
    mkdir -p /data/minio

# Install Keycloak 26.1.0
RUN cd /opt && \
    wget https://github.com/keycloak/keycloak/releases/download/26.1.0/keycloak-26.1.0.tar.gz && \
    tar -xzf keycloak-26.1.0.tar.gz && \
    mv keycloak-26.1.0 keycloak && \
    rm keycloak-26.1.0.tar.gz

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# ═══════════════════════════════════════════════════════════════
# STAGE 5: Configure PostgreSQL
# ═══════════════════════════════════════════════════════════════

# Configure PostgreSQL
USER postgres

RUN /etc/init.d/postgresql start && \
    psql --command "CREATE USER edusphere WITH SUPERUSER PASSWORD 'edusphere_dev_password';" && \
    createdb -O edusphere edusphere && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"vector\";" && \
    psql -d edusphere -c "CREATE EXTENSION IF NOT EXISTS \"age\";" && \
    psql -d edusphere -c "LOAD 'age';" && \
    psql -d edusphere -c "SET search_path = ag_catalog, '$user', public;" && \
    psql -d edusphere -c "SELECT create_graph('edusphere_graph');"

# Update PostgreSQL config
RUN echo "shared_preload_libraries = 'age'" >> /etc/postgresql/16/main/postgresql.conf && \
    echo "listen_addresses = '*'" >> /etc/postgresql/16/main/postgresql.conf && \
    echo "port = 5432" >> /etc/postgresql/16/main/postgresql.conf && \
    echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf

USER root

# ═══════════════════════════════════════════════════════════════
# STAGE 6: Copy Application Code
# ═══════════════════════════════════════════════════════════════

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps
COPY infrastructure ./infrastructure
COPY scripts ./scripts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages
RUN pnpm turbo build

# ═══════════════════════════════════════════════════════════════
# STAGE 7: Configure Supervisor
# ═══════════════════════════════════════════════════════════════

COPY infrastructure/docker/supervisord.conf /etc/supervisor/conf.d/edusphere.conf

# ═══════════════════════════════════════════════════════════════
# STAGE 8: Expose Ports
# ═══════════════════════════════════════════════════════════════

EXPOSE 4000    # Gateway
EXPOSE 4001    # Core Subgraph
EXPOSE 4002    # Content Subgraph
EXPOSE 4003    # Annotation Subgraph
EXPOSE 4004    # Collaboration Subgraph
EXPOSE 4005    # Agent Subgraph
EXPOSE 4006    # Knowledge Subgraph
EXPOSE 5432    # PostgreSQL
EXPOSE 6379    # Redis
EXPOSE 8080    # Keycloak
EXPOSE 4222    # NATS Client
EXPOSE 8222    # NATS Monitoring
EXPOSE 9000    # MinIO API
EXPOSE 9001    # MinIO Console
EXPOSE 11434   # Ollama

# ═══════════════════════════════════════════════════════════════
# STAGE 9: Startup
# ═══════════════════════════════════════════════════════════════

# Create startup script
COPY infrastructure/docker/startup.sh /startup.sh
RUN chmod +x /startup.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["/startup.sh"]
