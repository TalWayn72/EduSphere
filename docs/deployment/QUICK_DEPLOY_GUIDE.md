# EduSphere Quick Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-17
**Target Environment:** Production (Kubernetes + Docker Compose)
**Deployment Time:** 30-45 minutes (first deployment)

---

## Table of Contents

1. [Prerequisites Checklist](#1-prerequisites-checklist)
2. [Environment Setup](#2-environment-setup)
3. [Database Initialization](#3-database-initialization)
4. [Docker Compose Deployment](#4-docker-compose-deployment)
5. [SSL/TLS Setup](#5-ssltls-setup)
6. [DNS Configuration](#6-dns-configuration)
7. [Health Verification](#7-health-verification)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Rollback Procedure](#9-rollback-procedure)
10. [Monitoring Setup](#10-monitoring-setup)
11. [Common Issues](#11-common-issues)
12. [Support Contacts](#12-support-contacts)

---

## 1. Prerequisites Checklist

### 1.1 Infrastructure Requirements

#### Server Specifications (Minimum Production)

- [ ] **CPU:** 16 cores (32 recommended for 100K+ users)
- [ ] **RAM:** 64 GB (128 GB recommended)
- [ ] **Storage:** 500 GB SSD (1 TB recommended)
  - OS: 50 GB
  - Docker images: 100 GB
  - PostgreSQL data: 200 GB
  - MinIO objects: 150 GB
- [ ] **Network:** 1 Gbps uplink
- [ ] **OS:** Ubuntu 22.04 LTS or RHEL 9+ (Kernel 5.15+)

#### Kubernetes Cluster (Alternative to Docker Compose)

- [ ] **Nodes:** 3+ worker nodes (HA configuration)
- [ ] **Version:** Kubernetes 1.28+
- [ ] **Ingress Controller:** Traefik v3.6+ or NGINX
- [ ] **Storage Class:** Dynamic provisioning (for StatefulSets)
- [ ] **Helm:** v3.12+

### 1.2 Software Dependencies

- [ ] **Docker:** 24.0+ with Docker Compose v2.20+
- [ ] **Git:** 2.40+
- [ ] **Node.js:** 20.x LTS (for build-time operations)
- [ ] **pnpm:** 9.x (optional, for development builds)
- [ ] **OpenSSL:** 3.0+ (for TLS certificate verification)
- [ ] **curl/wget:** For health checks

### 1.3 External Services

#### Required

- [ ] **Domain Name:** Registered and DNS configurable (e.g., `edusphere.yourdomain.com`)
- [ ] **Email SMTP Server:** For Keycloak notifications
  - Host, Port, Username, Password
  - TLS/SSL support
- [ ] **SSL Certificate:** Let's Encrypt (automated via Traefik) or custom cert

#### Optional (Production AI Features)

- [ ] **OpenAI API Key:** For GPT-4 agent execution (fallback to Ollama if not provided)
- [ ] **Anthropic API Key:** For Claude Opus 4.6 (optional premium feature)
- [ ] **Sentry DSN:** Error tracking (recommended)
- [ ] **Cloudflare Account:** CDN + DDoS protection (recommended)

### 1.4 Network Configuration

- [ ] **Firewall Rules:**
  - Allow inbound: 80 (HTTP), 443 (HTTPS)
  - Allow outbound: 80, 443 (for Let's Encrypt, API calls)
  - Internal: PostgreSQL (5432), NATS (4222), MinIO (9000)
- [ ] **DNS Access:** Ability to create A/CNAME records
- [ ] **Load Balancer:** (Optional) If using multi-node deployment

### 1.5 Credentials & Secrets

Prepare the following before deployment:

- [ ] **PostgreSQL Password:** Strong password (16+ chars, alphanumeric + special)
- [ ] **Keycloak Admin Password:** For initial setup
- [ ] **MinIO Access Keys:** S3-compatible credentials
- [ ] **JWT Secret:** 32+ character random string for token signing
- [ ] **NATS Authentication Token:** (Optional for production)
- [ ] **Grafana Admin Password:** For monitoring dashboard

### 1.6 Pre-Deployment Verification

```bash
# Check Docker installation
docker --version
docker compose version

# Verify system resources
free -h                    # Check available RAM (64GB+ recommended)
df -h                      # Check disk space (500GB+ recommended)
nproc                      # Check CPU cores (16+ recommended)

# Test network connectivity
curl -I https://github.com  # Verify HTTPS outbound
ping 8.8.8.8               # Verify internet connectivity

# Check DNS resolution
nslookup edusphere.yourdomain.com
```

**Proceed only if all checks pass.**

---

## 2. Environment Setup

### 2.1 Clone Repository

```bash
# Clone EduSphere repository
git clone https://github.com/your-org/edusphere.git
cd edusphere

# Checkout production-ready tag (replace with latest stable release)
git checkout v1.0.0
```

### 2.2 Production Environment Variables

Create `.env` file in the repository root:

```bash
# Copy production template
cp .env.production.example .env

# Edit with production values
nano .env
```

#### Complete Production `.env` Configuration

```env
# ===========================
# DEPLOYMENT ENVIRONMENT
# ===========================
NODE_ENV=production
DEPLOYMENT_MODE=production  # production | staging | development

# ===========================
# DOMAIN & URLS
# ===========================
DOMAIN=edusphere.yourdomain.com
PROTOCOL=https
BASE_URL=https://edusphere.yourdomain.com

# Gateway (Federation Supergraph)
GATEWAY_URL=https://edusphere.yourdomain.com/api/graphql
GATEWAY_WS_URL=wss://edusphere.yourdomain.com/api/graphql

# ===========================
# DATABASE (PostgreSQL 16)
# ===========================
DATABASE_URL=postgresql://edusphere_app:CHANGE_ME_STRONG_PASSWORD@postgres:5432/edusphere?schema=public
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=edusphere
DATABASE_USER=edusphere_app
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD  # CHANGE THIS!

# Connection pooling (PgBouncer settings if using)
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=100
DATABASE_POOL_IDLE_TIMEOUT=30000

# ===========================
# POSTGRESQL EXTENSIONS
# ===========================
# Apache AGE (Graph Database)
AGE_GRAPH_NAME=edusphere_graph
AGE_SCHEMA=ag_catalog

# pgvector (Semantic Search)
VECTOR_DIMENSIONS=768  # nomic-embed-text dimension

# ===========================
# AUTHENTICATION (Keycloak)
# ===========================
KEYCLOAK_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=edusphere
KEYCLOAK_CLIENT_ID=edusphere-app
KEYCLOAK_CLIENT_SECRET=CHANGE_ME_CLIENT_SECRET  # CHANGE THIS!
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD  # CHANGE THIS!

# JWT Configuration
JWT_SECRET=CHANGE_ME_32_CHAR_RANDOM_STRING  # CHANGE THIS! (openssl rand -base64 32)
JWT_EXPIRATION=3600  # 1 hour in seconds
JWT_REFRESH_EXPIRATION=604800  # 7 days in seconds

# ===========================
# NATS JETSTREAM (Messaging)
# ===========================
NATS_URL=nats://nats:4222
NATS_USER=edusphere
NATS_PASSWORD=CHANGE_ME_NATS_PASSWORD  # CHANGE THIS!
NATS_CLUSTER_NAME=edusphere-cluster
NATS_MAX_RECONNECT_ATTEMPTS=10

# ===========================
# MINIO (Object Storage - S3 Compatible)
# ===========================
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=false  # Set to true if using external MinIO with TLS
MINIO_ACCESS_KEY=CHANGE_ME_ACCESS_KEY  # CHANGE THIS!
MINIO_SECRET_KEY=CHANGE_ME_SECRET_KEY  # CHANGE THIS! (min 8 chars)
MINIO_BUCKET=edusphere
MINIO_REGION=us-east-1

# Public URL for presigned URLs
MINIO_PUBLIC_URL=https://cdn.yourdomain.com

# ===========================
# AI/ML CONFIGURATION
# ===========================
# Ollama (Local LLMs - Development/Staging)
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:latest

# OpenAI (Production)
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Optional
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Anthropic (Production - Optional)
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Optional
ANTHROPIC_MODEL=claude-opus-4-6

# AI Agent Sandboxing (gVisor)
AGENT_SANDBOX_ENABLED=true
AGENT_TIMEOUT_MS=30000
AGENT_MAX_MEMORY_MB=512
AGENT_MAX_CPU_CORES=2

# ===========================
# OBSERVABILITY
# ===========================
# OpenTelemetry / Jaeger
OTEL_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831

# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_GRAFANA_PASSWORD  # CHANGE THIS!

# Sentry (Error Tracking)
SENTRY_DSN=https://xxxxxx@sentry.io/xxxxxx  # Optional
SENTRY_ENVIRONMENT=production

# ===========================
# EMAIL (SMTP)
# ===========================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true  # true for 465, false for 587
SMTP_USER=no-reply@yourdomain.com
SMTP_PASSWORD=CHANGE_ME_SMTP_PASSWORD  # CHANGE THIS!
SMTP_FROM=EduSphere <no-reply@yourdomain.com>

# ===========================
# RATE LIMITING
# ===========================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100  # Requests per window
RATE_LIMIT_WINDOW_MS=60000   # 1 minute

# ===========================
# CORS CONFIGURATION
# ===========================
CORS_ORIGIN=https://edusphere.yourdomain.com,https://www.edusphere.yourdomain.com
CORS_CREDENTIALS=true

# ===========================
# TRAEFIK (Reverse Proxy & SSL)
# ===========================
TRAEFIK_DASHBOARD_ENABLED=true
TRAEFIK_DASHBOARD_USER=admin
TRAEFIK_DASHBOARD_PASSWORD=CHANGE_ME_TRAEFIK_PASSWORD  # CHANGE THIS! (bcrypt hash)

# Let's Encrypt
ACME_EMAIL=admin@yourdomain.com
ACME_CA_SERVER=https://acme-v02.api.letsencrypt.org/directory  # Production
# ACME_CA_SERVER=https://acme-staging-v02.api.letsencrypt.org/directory  # Staging (for testing)

# ===========================
# LOGGING
# ===========================
LOG_LEVEL=info  # debug | info | warn | error
LOG_FORMAT=json  # json | pretty

# ===========================
# FEATURE FLAGS
# ===========================
FEATURE_AI_AGENTS=true
FEATURE_CRDT_COLLABORATION=true
FEATURE_KNOWLEDGE_GRAPH=true
FEATURE_TRANSCRIPTION=true
FEATURE_MOBILE_APP=true
```

### 2.3 Security Hardening

```bash
# Restrict .env file permissions (critical!)
chmod 600 .env

# Verify no secrets are committed to git
grep -r "CHANGE_ME" .env  # Should return results (means you need to change them!)

# Generate secure random secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 24  # Database password
openssl rand -base64 24  # MinIO keys
```

### 2.4 Docker Network Setup

```bash
# Create custom Docker network for production
docker network create edusphere-network --driver bridge
```

---

## 3. Database Initialization

### 3.1 Start PostgreSQL Container

```bash
# Start PostgreSQL 16 with AGE + pgvector
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to be ready (30-60 seconds)
docker compose -f docker-compose.prod.yml logs -f postgres

# Look for: "database system is ready to accept connections"
```

### 3.2 Initialize Extensions

```bash
# Connect to PostgreSQL container
docker exec -it edusphere-postgres psql -U edusphere_app -d edusphere

# Run initialization SQL
```

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "age";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Load Apache AGE
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Create knowledge graph
SELECT create_graph('edusphere_graph');

-- Verify extensions
\dx

-- Exit
\q
```

### 3.3 Run Database Migrations

**Option A: Using pnpm (if Node.js is installed on server)**

```bash
# Install dependencies (one-time)
pnpm install --frozen-lockfile

# Generate and apply migrations
pnpm --filter @edusphere/db generate
pnpm --filter @edusphere/db migrate

# Initialize Apache AGE graph schema
pnpm --filter @edusphere/db graph:init
```

**Option B: Using Docker (recommended for production)**

```bash
# Run migrations inside a temporary container
docker compose -f docker-compose.prod.yml run --rm migration-runner

# Or manually execute SQL files
docker exec -i edusphere-postgres psql -U edusphere_app -d edusphere < ./packages/db/migrations/0001_initial_schema.sql
```

### 3.4 Verify Database Schema

```bash
# Connect to database
docker exec -it edusphere-postgres psql -U edusphere_app -d edusphere

# Verify tables created
\dt

# Expected output:
# tenants, users, courses, modules, media_assets, transcripts,
# transcript_segments, annotations, collab_documents, crdt_updates,
# collab_sessions, agent_definitions, agent_executions,
# content_embeddings, annotation_embeddings, concept_embeddings

# Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

# All tables should have rowsecurity = 't' (true)

# Verify Apache AGE graph
SELECT * FROM ag_graph WHERE name = 'edusphere_graph';

# Exit
\q
```

### 3.5 Seed Demo Data (Optional for Staging)

```bash
# ONLY for staging/demo environments - SKIP for production

pnpm --filter @edusphere/db seed

# Or via Docker
docker compose -f docker-compose.prod.yml run --rm seeder
```

**Demo accounts created (password: `Demo123!`):**

- admin@edusphere.dev (Super Admin)
- orgadmin@edusphere.dev (Org Admin)
- instructor@edusphere.dev (Instructor)
- student@edusphere.dev (Student)

---

## 4. Docker Compose Deployment

### 4.1 Docker Compose Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'

networks:
  edusphere-network:
    driver: bridge

volumes:
  postgres_data:
  minio_data:
  nats_data:
  grafana_data:
  prometheus_data:
  letsencrypt_data:

services:
  # ==========================================
  # REVERSE PROXY & SSL (Traefik)
  # ==========================================
  traefik:
    image: traefik:v3.6
    container_name: edusphere-traefik
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '8080:8080' # Traefik dashboard (restrict in production)
    command:
      - '--api.dashboard=true'
      - '--providers.docker=true'
      - '--providers.docker.exposedbydefault=false'
      - '--entrypoints.web.address=:80'
      - '--entrypoints.websecure.address=:443'
      - '--certificatesresolvers.letsencrypt.acme.httpchallenge=true'
      - '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web'
      - '--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}'
      - '--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json'
      - '--certificatesresolvers.letsencrypt.acme.caserver=${ACME_CA_SERVER}'
      - '--metrics.prometheus=true'
      - '--log.level=INFO'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      # HTTP to HTTPS redirect
      - 'traefik.http.routers.http-catchall.rule=HostRegexp(`{host:.+}`)'
      - 'traefik.http.routers.http-catchall.entrypoints=web'
      - 'traefik.http.routers.http-catchall.middlewares=redirect-to-https'
      - 'traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https'
      # Dashboard
      - 'traefik.http.routers.traefik-dashboard.rule=Host(`traefik.${DOMAIN}`)'
      - 'traefik.http.routers.traefik-dashboard.entrypoints=websecure'
      - 'traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt'
      - 'traefik.http.routers.traefik-dashboard.service=api@internal'
      - 'traefik.http.routers.traefik-dashboard.middlewares=traefik-auth'
      - 'traefik.http.middlewares.traefik-auth.basicauth.users=${TRAEFIK_DASHBOARD_USER}:${TRAEFIK_DASHBOARD_PASSWORD}'

  # ==========================================
  # DATABASE (PostgreSQL 16 + AGE + pgvector)
  # ==========================================
  postgres:
    image: edusphere/postgres-age:16
    container_name: edusphere-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      SHARED_PRELOAD_LIBRARIES: age
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/docker/postgres-age/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    networks:
      - edusphere-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DATABASE_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 16G
          cpus: '4'

  # ==========================================
  # AUTHENTICATION (Keycloak)
  # ==========================================
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    container_name: edusphere-keycloak
    restart: unless-stopped
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: ${DATABASE_USER}
      KC_DB_PASSWORD: ${DATABASE_PASSWORD}
      KC_HOSTNAME: auth.${DOMAIN}
      KC_PROXY: edge
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    command: start --optimized
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.keycloak.rule=Host(`auth.${DOMAIN}`)'
      - 'traefik.http.routers.keycloak.entrypoints=websecure'
      - 'traefik.http.routers.keycloak.tls.certresolver=letsencrypt'
      - 'traefik.http.services.keycloak.loadbalancer.server.port=8080'

  # ==========================================
  # MESSAGING (NATS JetStream)
  # ==========================================
  nats:
    image: nats:latest
    container_name: edusphere-nats
    restart: unless-stopped
    command:
      - '--jetstream'
      - '--store_dir=/data'
      - '--user=${NATS_USER}'
      - '--pass=${NATS_PASSWORD}'
      - '--max_payload=8MB'
    volumes:
      - nats_data:/data
    networks:
      - edusphere-network
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:8222/healthz']
      interval: 10s
      timeout: 5s
      retries: 5

  # ==========================================
  # OBJECT STORAGE (MinIO - S3 Compatible)
  # ==========================================
  minio:
    image: minio/minio:latest
    container_name: edusphere-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - edusphere-network
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 10s
      timeout: 5s
      retries: 5
    labels:
      - 'traefik.enable=true'
      # MinIO API
      - 'traefik.http.routers.minio-api.rule=Host(`cdn.${DOMAIN}`)'
      - 'traefik.http.routers.minio-api.entrypoints=websecure'
      - 'traefik.http.routers.minio-api.tls.certresolver=letsencrypt'
      - 'traefik.http.services.minio-api.loadbalancer.server.port=9000'
      # MinIO Console
      - 'traefik.http.routers.minio-console.rule=Host(`minio.${DOMAIN}`)'
      - 'traefik.http.routers.minio-console.entrypoints=websecure'
      - 'traefik.http.routers.minio-console.tls.certresolver=letsencrypt'
      - 'traefik.http.services.minio-console.loadbalancer.server.port=9001'

  # ==========================================
  # GRAPHQL GATEWAY (Hive Gateway v2)
  # ==========================================
  gateway:
    image: edusphere/gateway:latest
    container_name: edusphere-gateway
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: ${DATABASE_URL}
      KEYCLOAK_URL: ${KEYCLOAK_URL}
      KEYCLOAK_REALM: ${KEYCLOAK_REALM}
      JWT_SECRET: ${JWT_SECRET}
      SUBGRAPH_CORE_URL: http://subgraph-core:4001/graphql
      SUBGRAPH_CONTENT_URL: http://subgraph-content:4002/graphql
      SUBGRAPH_ANNOTATION_URL: http://subgraph-annotation:4003/graphql
      SUBGRAPH_COLLABORATION_URL: http://subgraph-collaboration:4004/graphql
      SUBGRAPH_AGENT_URL: http://subgraph-agent:4005/graphql
      SUBGRAPH_KNOWLEDGE_URL: http://subgraph-knowledge:4006/graphql
      OTEL_ENABLED: ${OTEL_ENABLED}
      JAEGER_ENDPOINT: ${JAEGER_ENDPOINT}
    depends_on:
      postgres:
        condition: service_healthy
      keycloak:
        condition: service_started
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.gateway.rule=Host(`${DOMAIN}`) && PathPrefix(`/api/graphql`)'
      - 'traefik.http.routers.gateway.entrypoints=websecure'
      - 'traefik.http.routers.gateway.tls.certresolver=letsencrypt'
      - 'traefik.http.services.gateway.loadbalancer.server.port=4000'
    deploy:
      replicas: 3 # HA setup
      resources:
        limits:
          memory: 2G
          cpus: '2'

  # ==========================================
  # SUBGRAPHS (6 Services)
  # ==========================================
  subgraph-core:
    image: edusphere/subgraph-core:latest
    container_name: edusphere-subgraph-core
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4001
      DATABASE_URL: ${DATABASE_URL}
      NATS_URL: ${NATS_URL}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network
    deploy:
      replicas: 2

  subgraph-content:
    image: edusphere/subgraph-content:latest
    container_name: edusphere-subgraph-content
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4002
      DATABASE_URL: ${DATABASE_URL}
      MINIO_ENDPOINT: ${MINIO_ENDPOINT}
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network
    deploy:
      replicas: 2

  subgraph-annotation:
    image: edusphere/subgraph-annotation:latest
    container_name: edusphere-subgraph-annotation
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4003
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network

  subgraph-collaboration:
    image: edusphere/subgraph-collaboration:latest
    container_name: edusphere-subgraph-collaboration
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4004
      DATABASE_URL: ${DATABASE_URL}
      NATS_URL: ${NATS_URL}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network

  subgraph-agent:
    image: edusphere/subgraph-agent:latest
    container_name: edusphere-subgraph-agent
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4005
      DATABASE_URL: ${DATABASE_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      AGENT_SANDBOX_ENABLED: ${AGENT_SANDBOX_ENABLED}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network
    deploy:
      resources:
        limits:
          memory: 4G # Higher memory for AI operations

  subgraph-knowledge:
    image: edusphere/subgraph-knowledge:latest
    container_name: edusphere-subgraph-knowledge
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4006
      DATABASE_URL: ${DATABASE_URL}
      OLLAMA_URL: ${OLLAMA_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - edusphere-network

  # ==========================================
  # FRONTEND (React SPA)
  # ==========================================
  web:
    image: edusphere/web:latest
    container_name: edusphere-web
    restart: unless-stopped
    environment:
      VITE_GRAPHQL_URL: ${GATEWAY_URL}
      VITE_GRAPHQL_WS_URL: ${GATEWAY_WS_URL}
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.web.rule=Host(`${DOMAIN}`)'
      - 'traefik.http.routers.web.entrypoints=websecure'
      - 'traefik.http.routers.web.tls.certresolver=letsencrypt'
      - 'traefik.http.services.web.loadbalancer.server.port=80'

  # ==========================================
  # MONITORING (Prometheus + Grafana + Jaeger)
  # ==========================================
  prometheus:
    image: prom/prometheus:latest
    container_name: edusphere-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.prometheus.rule=Host(`prometheus.${DOMAIN}`)'
      - 'traefik.http.routers.prometheus.entrypoints=websecure'
      - 'traefik.http.routers.prometheus.tls.certresolver=letsencrypt'
      - 'traefik.http.services.prometheus.loadbalancer.server.port=9090'

  grafana:
    image: grafana/grafana:latest
    container_name: edusphere-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_SERVER_ROOT_URL: https://grafana.${DOMAIN}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./infrastructure/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.grafana.rule=Host(`grafana.${DOMAIN}`)'
      - 'traefik.http.routers.grafana.entrypoints=websecure'
      - 'traefik.http.routers.grafana.tls.certresolver=letsencrypt'
      - 'traefik.http.services.grafana.loadbalancer.server.port=3000'

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: edusphere-jaeger
    restart: unless-stopped
    environment:
      COLLECTOR_ZIPKIN_HOST_PORT: :9411
      SPAN_STORAGE_TYPE: badger
      BADGER_EPHEMERAL: 'false'
      BADGER_DIRECTORY_VALUE: /badger/data
      BADGER_DIRECTORY_KEY: /badger/key
    networks:
      - edusphere-network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.jaeger.rule=Host(`jaeger.${DOMAIN}`)'
      - 'traefik.http.routers.jaeger.entrypoints=websecure'
      - 'traefik.http.routers.jaeger.tls.certresolver=letsencrypt'
      - 'traefik.http.services.jaeger.loadbalancer.server.port=16686'
```

### 4.2 Deploy All Services

```bash
# Build Docker images for all services (if not pulled from registry)
pnpm turbo docker:build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# View logs (specific service)
docker compose -f docker-compose.prod.yml logs -f gateway
```

### 4.3 Verify Container Status

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output: All services with status "Up"

# Check resource usage
docker stats --no-stream
```

---

## 5. SSL/TLS Setup

### 5.1 Let's Encrypt with Traefik (Automatic)

Traefik automatically provisions SSL certificates from Let's Encrypt. Configuration is in `docker-compose.prod.yml` (already included above).

#### Verify Certificate Provisioning

```bash
# Check Traefik logs for ACME certificate generation
docker logs edusphere-traefik 2>&1 | grep -i "certificate"

# Expected output:
# "Certificate obtained for domain edusphere.yourdomain.com"

# Verify certificate file created
docker exec edusphere-traefik ls -lh /letsencrypt/acme.json

# Check certificate validity
curl -vI https://edusphere.yourdomain.com 2>&1 | grep "SSL certificate"
```

#### Troubleshooting SSL Issues

```bash
# If certificate not provisioning, check DNS resolution
dig edusphere.yourdomain.com

# Verify port 80 is accessible (required for HTTP-01 challenge)
curl -I http://edusphere.yourdomain.com/.well-known/acme-challenge/test

# Check Traefik dashboard
# Navigate to: https://traefik.yourdomain.com (use credentials from .env)

# Manual certificate renewal (if needed)
docker exec edusphere-traefik traefik update --providers.docker
```

### 5.2 Custom SSL Certificate (Alternative)

If using a purchased SSL certificate:

```bash
# Create certificates directory
mkdir -p ./infrastructure/traefik/certs

# Copy certificate and private key
cp /path/to/certificate.crt ./infrastructure/traefik/certs/
cp /path/to/private.key ./infrastructure/traefik/certs/

# Update docker-compose.prod.yml to mount certificates
# Add under traefik.volumes:
# - ./infrastructure/traefik/certs:/certs

# Update Traefik command to use custom cert
# Remove Let's Encrypt configuration
# Add: "--providers.file.filename=/certs/traefik-certs.yml"
```

Create `./infrastructure/traefik/traefik-certs.yml`:

```yaml
tls:
  certificates:
    - certFile: /certs/certificate.crt
      keyFile: /certs/private.key
```

---

## 6. DNS Configuration

### 6.1 Required DNS Records

Configure the following DNS records with your domain registrar:

| Type  | Name       | Value                      | TTL |
| ----- | ---------- | -------------------------- | --- |
| A     | @          | `YOUR_SERVER_IP`           | 300 |
| A     | www        | `YOUR_SERVER_IP`           | 300 |
| A     | auth       | `YOUR_SERVER_IP`           | 300 |
| A     | cdn        | `YOUR_SERVER_IP`           | 300 |
| A     | minio      | `YOUR_SERVER_IP`           | 300 |
| A     | grafana    | `YOUR_SERVER_IP`           | 300 |
| A     | prometheus | `YOUR_SERVER_IP`           | 300 |
| A     | jaeger     | `YOUR_SERVER_IP`           | 300 |
| A     | traefik    | `YOUR_SERVER_IP`           | 300 |
| CNAME | api        | `edusphere.yourdomain.com` | 300 |

**Optional (if using Cloudflare CDN):**

| Type  | Name | Value                      | Proxy Status |
| ----- | ---- | -------------------------- | ------------ |
| A     | @    | `YOUR_SERVER_IP`           | Proxied      |
| CNAME | cdn  | `edusphere.yourdomain.com` | Proxied      |

### 6.2 Verify DNS Propagation

```bash
# Check DNS resolution
dig edusphere.yourdomain.com +short
dig auth.yourdomain.com +short
dig cdn.yourdomain.com +short

# Check DNS from multiple locations
curl "https://dnschecker.org/#A/edusphere.yourdomain.com"

# Wait for propagation (can take 5-60 minutes)
```

### 6.3 Cloudflare Configuration (Optional)

If using Cloudflare for CDN + DDoS protection:

1. **Add Site to Cloudflare:**
   - Log in to Cloudflare dashboard
   - Click "Add a Site"
   - Enter `yourdomain.com`
   - Select plan (Free is sufficient)

2. **Update Nameservers:**
   - Copy Cloudflare nameservers
   - Update at domain registrar

3. **SSL/TLS Settings:**
   - Navigate to SSL/TLS tab
   - Set mode to "Full (strict)"
   - Enable "Always Use HTTPS"

4. **Page Rules (Optional):**
   - Bypass cache for API: `api.yourdomain.com/*` → Cache Level: Bypass
   - Cache static assets: `cdn.yourdomain.com/*` → Cache Level: Cache Everything

---

## 7. Health Verification

### 7.1 Automated Health Check Script

Create `scripts/health-check-prod.sh`:

```bash
#!/bin/bash

# EduSphere Production Health Check
# Version: 1.0.0

set -e

DOMAIN="${DOMAIN:-edusphere.yourdomain.com}"
PROTOCOL="${PROTOCOL:-https}"

echo "========================================="
echo "EduSphere Production Health Check"
echo "Domain: $DOMAIN"
echo "========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health check function
check_service() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "Checking $name... "

    if response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$url" 2>&1); then
        if [ "$response" -eq "$expected" ]; then
            echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Connection error: $response)"
        return 1
    fi
}

# Check Docker containers
echo -e "\n${YELLOW}[1/6] Docker Containers${NC}"
docker compose -f docker-compose.prod.yml ps --format "table {{.Service}}\t{{.Status}}"

# Check SSL certificates
echo -e "\n${YELLOW}[2/6] SSL Certificates${NC}"
check_service "SSL Certificate" "$PROTOCOL://$DOMAIN" 200

# Check core services
echo -e "\n${YELLOW}[3/6] Core Services${NC}"
check_service "Frontend" "$PROTOCOL://$DOMAIN" 200
check_service "GraphQL Gateway" "$PROTOCOL://$DOMAIN/api/graphql" 400  # 400 expected for GET without query
check_service "Keycloak" "$PROTOCOL://auth.$DOMAIN" 200
check_service "MinIO (CDN)" "$PROTOCOL://cdn.$DOMAIN" 403  # 403 expected for anonymous access

# Check monitoring
echo -e "\n${YELLOW}[4/6] Monitoring Services${NC}"
check_service "Grafana" "$PROTOCOL://grafana.$DOMAIN" 302  # 302 redirect to login
check_service "Prometheus" "$PROTOCOL://prometheus.$DOMAIN" 200
check_service "Jaeger" "$PROTOCOL://jaeger.$DOMAIN" 200

# Check database
echo -e "\n${YELLOW}[5/6] Database${NC}"
if docker exec edusphere-postgres pg_isready -U edusphere_app > /dev/null 2>&1; then
    echo -e "PostgreSQL... ${GREEN}✓ OK${NC}"
else
    echo -e "PostgreSQL... ${RED}✗ FAIL${NC}"
fi

# Check extensions
echo -n "Apache AGE Extension... "
if docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c "SELECT * FROM ag_graph WHERE name='edusphere_graph';" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

echo -n "pgvector Extension... "
if docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c "SELECT * FROM pg_extension WHERE extname='vector';" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test GraphQL query
echo -e "\n${YELLOW}[6/6] GraphQL Federation${NC}"
echo -n "Testing GraphQL query... "
if response=$(curl -s -X POST "$PROTOCOL://$DOMAIN/api/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __typename }"}' 2>&1); then
    if echo "$response" | grep -q '"__typename"'; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAIL${NC} (Unexpected response: $response)"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Connection error)"
fi

echo -e "\n========================================="
echo -e "${GREEN}Health check complete!${NC}"
echo "========================================="
```

Run health check:

```bash
# Make executable
chmod +x scripts/health-check-prod.sh

# Run
./scripts/health-check-prod.sh
```

### 7.2 Manual Health Checks

```bash
# Test frontend
curl -I https://edusphere.yourdomain.com

# Test GraphQL gateway
curl -X POST https://edusphere.yourdomain.com/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Test Keycloak OIDC endpoint
curl https://auth.yourdomain.com/realms/edusphere/.well-known/openid-configuration | jq

# Test MinIO health
curl https://cdn.yourdomain.com/minio/health/live

# Test database connection
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c "SELECT 1;"
```

---

## 8. Post-Deployment Checklist

### 8.1 Security Hardening

- [ ] **Change all default passwords** in `.env` file
- [ ] **Restrict Traefik dashboard access** (whitelist IPs or disable)
- [ ] **Enable database connection SSL** (update `DATABASE_URL` with `?sslmode=require`)
- [ ] **Configure firewall rules** (allow only 80, 443 inbound)
- [ ] **Disable unnecessary services** (e.g., MinIO console if not needed)
- [ ] **Set up automated backups** (see Section 9.3)
- [ ] **Configure CORS origins** (restrict to production domain only)
- [ ] **Enable rate limiting** on Gateway (already configured in `.env`)
- [ ] **Review RLS policies** (ensure all tables have tenant isolation)
- [ ] **Disable demo user accounts** (if seeded for staging)

```bash
# Disable demo accounts (if seeded)
docker exec -it edusphere-postgres psql -U edusphere_app -d edusphere -c \
  "UPDATE users SET deleted_at = NOW() WHERE email LIKE '%@edusphere.dev';"
```

### 8.2 Keycloak Configuration

```bash
# Access Keycloak admin console
# Navigate to: https://auth.yourdomain.com/admin
# Login with: KEYCLOAK_ADMIN_USER / KEYCLOAK_ADMIN_PASSWORD

# Configure:
# 1. Create "edusphere" realm (if not exists)
# 2. Create client "edusphere-app" with Client ID/Secret
# 3. Configure redirect URIs:
#    - https://edusphere.yourdomain.com/*
#    - http://localhost:5173/* (for development)
# 4. Enable "Service Accounts Enabled" for client
# 5. Configure SMTP settings for email notifications
# 6. Create initial organization admin user
```

### 8.3 MinIO Bucket Setup

```bash
# Access MinIO console
# Navigate to: https://minio.yourdomain.com
# Login with: MINIO_ACCESS_KEY / MINIO_SECRET_KEY

# Create bucket via CLI
docker exec edusphere-minio mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
docker exec edusphere-minio mc mb local/edusphere

# Set bucket policy (public read for media assets)
docker exec edusphere-minio mc anonymous set download local/edusphere/media
```

### 8.4 Monitoring Dashboards

```bash
# Import Grafana dashboards
# Navigate to: https://grafana.yourdomain.com
# Login with: GRAFANA_ADMIN_USER / GRAFANA_ADMIN_PASSWORD

# Add Prometheus data source:
# URL: http://prometheus:9090

# Import dashboards from ./infrastructure/grafana/dashboards/
# - edusphere-overview.json
# - edusphere-graphql.json
# - edusphere-database.json
# - edusphere-system.json
```

### 8.5 Performance Optimization

```bash
# Enable HTTP/2 on Traefik (already configured)
# Verify HTTP/2 support
curl -I --http2 https://edusphere.yourdomain.com

# Configure PostgreSQL for production (inside container)
docker exec -it edusphere-postgres bash

# Edit postgresql.conf
echo "shared_buffers = 4GB" >> /var/lib/postgresql/data/postgresql.conf
echo "effective_cache_size = 12GB" >> /var/lib/postgresql/data/postgresql.conf
echo "maintenance_work_mem = 1GB" >> /var/lib/postgresql/data/postgresql.conf
echo "checkpoint_completion_target = 0.9" >> /var/lib/postgresql/data/postgresql.conf
echo "wal_buffers = 16MB" >> /var/lib/postgresql/data/postgresql.conf
echo "default_statistics_target = 100" >> /var/lib/postgresql/data/postgresql.conf
echo "random_page_cost = 1.1" >> /var/lib/postgresql/data/postgresql.conf
echo "effective_io_concurrency = 200" >> /var/lib/postgresql/data/postgresql.conf
echo "work_mem = 10MB" >> /var/lib/postgresql/data/postgresql.conf
echo "min_wal_size = 1GB" >> /var/lib/postgresql/data/postgresql.conf
echo "max_wal_size = 4GB" >> /var/lib/postgresql/data/postgresql.conf
echo "max_connections = 300" >> /var/lib/postgresql/data/postgresql.conf

# Restart PostgreSQL
docker restart edusphere-postgres
```

### 8.6 Backup Verification

```bash
# Test database backup
docker exec edusphere-postgres pg_dump -U edusphere_app edusphere > /tmp/backup-test.sql

# Verify backup file
ls -lh /tmp/backup-test.sql

# Expected: File size > 1MB (depending on data)
```

---

## 9. Rollback Procedure

### 9.1 Immediate Rollback (Service Failure)

If deployment fails or critical issues arise:

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Restore previous Docker images (if versioned)
docker tag edusphere/gateway:previous edusphere/gateway:latest
docker tag edusphere/web:previous edusphere/web:latest
# ... repeat for all services

# Restart with previous version
docker compose -f docker-compose.prod.yml up -d

# Verify health
./scripts/health-check-prod.sh
```

### 9.2 Database Rollback

**WARNING: Only perform during maintenance window**

```bash
# 1. Stop all services
docker compose -f docker-compose.prod.yml down

# 2. Restore database from backup
docker exec -i edusphere-postgres psql -U edusphere_app -d edusphere < /backups/edusphere-backup-YYYY-MM-DD.sql

# 3. Restart services
docker compose -f docker-compose.prod.yml up -d

# 4. Verify data integrity
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c "SELECT COUNT(*) FROM users;"
```

### 9.3 Automated Backup Strategy

Create `scripts/backup.sh`:

```bash
#!/bin/bash

# EduSphere Automated Backup Script
# Version: 1.0.0

BACKUP_DIR="/backups/edusphere"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "Starting backup: $DATE"

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec edusphere-postgres pg_dump -U edusphere_app -Fc edusphere > \
  "$BACKUP_DIR/postgres-$DATE.dump"

# Backup MinIO (metadata only)
echo "Backing up MinIO metadata..."
docker exec edusphere-minio mc admin config export local > \
  "$BACKUP_DIR/minio-config-$DATE.json"

# Backup Traefik certificates
echo "Backing up SSL certificates..."
docker cp edusphere-traefik:/letsencrypt/acme.json "$BACKUP_DIR/acme-$DATE.json"

# Compress backup
echo "Compressing backup..."
tar -czf "$BACKUP_DIR/edusphere-backup-$DATE.tar.gz" \
  "$BACKUP_DIR/postgres-$DATE.dump" \
  "$BACKUP_DIR/minio-config-$DATE.json" \
  "$BACKUP_DIR/acme-$DATE.json"

# Remove individual files
rm "$BACKUP_DIR/postgres-$DATE.dump" \
   "$BACKUP_DIR/minio-config-$DATE.json" \
   "$BACKUP_DIR/acme-$DATE.json"

# Remove old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $BACKUP_DIR/edusphere-backup-$DATE.tar.gz"

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/edusphere-backup-$DATE.tar.gz" s3://your-bucket/backups/
```

Schedule with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/edusphere-backup.log 2>&1
```

---

## 10. Monitoring Setup

### 10.1 Prometheus Configuration

Create `infrastructure/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'edusphere-production'
    environment: 'production'

scrape_configs:
  # Traefik metrics
  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8080']
    metrics_path: /metrics

  # Gateway metrics
  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:4000']
    metrics_path: /metrics

  # Subgraph metrics
  - job_name: 'subgraph-core'
    static_configs:
      - targets: ['subgraph-core:4001']
    metrics_path: /metrics

  - job_name: 'subgraph-content'
    static_configs:
      - targets: ['subgraph-content:4002']
    metrics_path: /metrics

  - job_name: 'subgraph-annotation'
    static_configs:
      - targets: ['subgraph-annotation:4003']
    metrics_path: /metrics

  - job_name: 'subgraph-collaboration'
    static_configs:
      - targets: ['subgraph-collaboration:4004']
    metrics_path: /metrics

  - job_name: 'subgraph-agent'
    static_configs:
      - targets: ['subgraph-agent:4005']
    metrics_path: /metrics

  - job_name: 'subgraph-knowledge'
    static_configs:
      - targets: ['subgraph-knowledge:4006']
    metrics_path: /metrics

  # PostgreSQL Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # MinIO metrics
  - job_name: 'minio'
    metrics_path: /minio/v2/metrics/cluster
    static_configs:
      - targets: ['minio:9000']

  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

# Alerting rules
rule_files:
  - '/etc/prometheus/alerts/*.yml'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### 10.2 Grafana Dashboards

Create `infrastructure/grafana/dashboards/edusphere-overview.json`:

```json
{
  "dashboard": {
    "title": "EduSphere Overview",
    "panels": [
      {
        "title": "Request Rate (req/s)",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Error Rate (%)",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "count(auth_sessions_active)",
            "legendFormat": "Active Sessions"
          }
        ]
      }
    ]
  }
}
```

### 10.3 Alert Rules

Create `infrastructure/prometheus/alerts/edusphere-alerts.yml`:

```yaml
groups:
  - name: edusphere_critical
    interval: 30s
    rules:
      # Service down alerts
      - alert: ServiceDown
        expr: up{job=~"gateway|subgraph-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: '{{ $labels.job }} is down'
          description: '{{ $labels.job }} has been down for more than 1 minute.'

      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate on {{ $labels.service }}'
          description: 'Error rate is {{ $value }}% on {{ $labels.service }}'

      # Database connection issues
      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'PostgreSQL database is down'
          description: 'Cannot connect to PostgreSQL database.'

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High response time on {{ $labels.service }}'
          description: 'P95 response time is {{ $value }}s on {{ $labels.service }}'

      # Disk space
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Low disk space'
          description: 'Only {{ $value | humanizePercentage }} disk space remaining.'

      # Memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is {{ $value | humanizePercentage }}.'

      # SSL certificate expiration
      - alert: SSLCertificateExpiringSoon
        expr: (acme_certificate_expiry_timestamp - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: 'SSL certificate expiring soon'
          description: 'SSL certificate for {{ $labels.domain }} expires in {{ $value }} days.'
```

### 10.4 Access Monitoring Dashboards

```bash
# Grafana
https://grafana.yourdomain.com
# Login: GRAFANA_ADMIN_USER / GRAFANA_ADMIN_PASSWORD

# Prometheus
https://prometheus.yourdomain.com

# Jaeger (Distributed Tracing)
https://jaeger.yourdomain.com

# Traefik Dashboard
https://traefik.yourdomain.com
# Login: TRAEFIK_DASHBOARD_USER / TRAEFIK_DASHBOARD_PASSWORD
```

---

## 11. Common Issues

### 11.1 SSL Certificate Not Generating

**Symptoms:**

- HTTPS not working
- Certificate errors in browser

**Solutions:**

```bash
# 1. Verify DNS is pointing to server
dig edusphere.yourdomain.com +short
# Should return your server IP

# 2. Check port 80 is accessible (required for Let's Encrypt HTTP-01 challenge)
curl -I http://edusphere.yourdomain.com

# 3. Check Traefik logs
docker logs edusphere-traefik 2>&1 | grep -i "certificate"

# 4. Verify ACME email is set
docker exec edusphere-traefik cat /etc/traefik/traefik.yml | grep acme

# 5. Delete old certificate and retry
docker exec edusphere-traefik rm /letsencrypt/acme.json
docker restart edusphere-traefik

# 6. Use Let's Encrypt staging server for testing (to avoid rate limits)
# Update ACME_CA_SERVER in .env to:
# ACME_CA_SERVER=https://acme-staging-v02.api.letsencrypt.org/directory
```

### 11.2 Database Connection Errors

**Symptoms:**

- GraphQL errors: "Cannot connect to database"
- Services failing health checks

**Solutions:**

```bash
# 1. Verify PostgreSQL is running
docker ps | grep postgres

# 2. Check PostgreSQL logs
docker logs edusphere-postgres

# 3. Test connection from gateway container
docker exec edusphere-gateway psql "$DATABASE_URL" -c "SELECT 1;"

# 4. Verify DATABASE_URL format
echo $DATABASE_URL
# Expected: postgresql://user:password@postgres:5432/edusphere

# 5. Check connection limits
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 6. Restart PostgreSQL
docker restart edusphere-postgres
```

### 11.3 GraphQL Federation Errors

**Symptoms:**

- Gateway returns 500 errors
- Subgraph composition fails

**Solutions:**

```bash
# 1. Check gateway logs
docker logs edusphere-gateway

# 2. Verify all subgraphs are healthy
curl http://localhost:4001/graphql -d '{"query":"{ __typename }"}'
curl http://localhost:4002/graphql -d '{"query":"{ __typename }"}'
# ... repeat for ports 4003-4006

# 3. Test supergraph composition manually
pnpm --filter @edusphere/gateway compose

# 4. Check for schema conflicts
pnpm --filter @edusphere/gateway schema:check

# 5. Restart gateway and subgraphs
docker compose -f docker-compose.prod.yml restart gateway subgraph-core subgraph-content
```

### 11.4 High Memory Usage

**Symptoms:**

- OOM (Out of Memory) errors
- Containers being killed

**Solutions:**

```bash
# 1. Check memory usage
docker stats --no-stream

# 2. Identify memory-intensive containers
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 3. Increase Docker memory limits (in docker-compose.prod.yml)
# For subgraph-agent:
deploy:
  resources:
    limits:
      memory: 8G  # Increase from 4G

# 4. Enable swap (if not already enabled)
sudo swapon --show
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 5. Optimize PostgreSQL memory settings
# See Section 8.5 - Performance Optimization
```

### 11.5 MinIO Connection Issues

**Symptoms:**

- File upload failures
- Presigned URL errors

**Solutions:**

```bash
# 1. Verify MinIO is running
docker ps | grep minio

# 2. Check MinIO logs
docker logs edusphere-minio

# 3. Test MinIO connectivity
curl https://cdn.yourdomain.com/minio/health/live

# 4. Verify bucket exists
docker exec edusphere-minio mc ls local/

# 5. Check access keys
docker exec edusphere-minio mc admin user list local

# 6. Recreate bucket
docker exec edusphere-minio mc rb --force local/edusphere
docker exec edusphere-minio mc mb local/edusphere
```

### 11.6 Keycloak Authentication Errors

**Symptoms:**

- Login failures
- JWT validation errors

**Solutions:**

```bash
# 1. Check Keycloak logs
docker logs edusphere-keycloak

# 2. Verify Keycloak is accessible
curl https://auth.yourdomain.com/realms/edusphere/.well-known/openid-configuration

# 3. Test JWT validation
# Get a token from Keycloak
TOKEN=$(curl -X POST "https://auth.yourdomain.com/realms/edusphere/protocol/openid-connect/token" \
  -d "client_id=edusphere-app" \
  -d "client_secret=$KEYCLOAK_CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

# Verify token structure
echo $TOKEN | jwt decode -

# 4. Check client configuration
# Navigate to Keycloak admin console
# Verify redirect URIs include production domain

# 5. Restart Keycloak
docker restart edusphere-keycloak
```

### 11.7 Slow Query Performance

**Symptoms:**

- High API response times
- Database CPU at 100%

**Solutions:**

```bash
# 1. Enable slow query log
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c \
  "ALTER SYSTEM SET log_min_duration_statement = 1000;"  # Log queries > 1s

# 2. Restart PostgreSQL
docker restart edusphere-postgres

# 3. View slow queries
docker exec edusphere-postgres tail -f /var/lib/postgresql/data/log/postgresql-*.log

# 4. Analyze query plans
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c \
  "EXPLAIN ANALYZE SELECT * FROM users WHERE tenant_id = '...';"

# 5. Check missing indexes
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -f \
  /scripts/analyze-missing-indexes.sql

# 6. Vacuum database
docker exec edusphere-postgres psql -U edusphere_app -d edusphere -c "VACUUM ANALYZE;"
```

---

## 12. Support Contacts

### 12.1 Internal Team

| Role               | Contact                  | Availability           |
| ------------------ | ------------------------ | ---------------------- |
| **DevOps Lead**    | devops@yourcompany.com   | 24/7 (on-call)         |
| **Backend Lead**   | backend@yourcompany.com  | Mon-Fri 9am-6pm EST    |
| **Database Admin** | dba@yourcompany.com      | Mon-Fri 9am-6pm EST    |
| **Security Team**  | security@yourcompany.com | 24/7 (critical issues) |

### 12.2 Escalation Procedure

**P1 - Critical (Production Down):**

1. Contact DevOps Lead immediately (Slack: @devops-oncall)
2. Create incident ticket: https://tickets.yourcompany.com
3. If no response in 15 minutes, escalate to CTO

**P2 - High (Degraded Performance):**

1. Contact Backend Lead via email
2. Create ticket with performance metrics
3. Escalate to DevOps if unresolved in 2 hours

**P3 - Medium (Non-critical Issues):**

1. Create ticket with detailed description
2. Assign to appropriate team
3. Expect response within 24 hours

**P4 - Low (Questions, Documentation):**

1. Post in #edusphere-support Slack channel
2. Check documentation: https://docs.edusphere.yourdomain.com

### 12.3 External Vendor Support

| Service        | Support Portal                      | SLA                     |
| -------------- | ----------------------------------- | ----------------------- |
| **PostgreSQL** | https://www.postgresql.org/support/ | Community (best effort) |
| **Keycloak**   | https://www.keycloak.org/support    | Community (best effort) |
| **Traefik**    | https://traefik.io/support/         | Community (best effort) |
| **OpenAI**     | https://help.openai.com             | Paid (24-hour response) |
| **Anthropic**  | https://support.anthropic.com       | Paid (24-hour response) |
| **Cloudflare** | https://dash.cloudflare.com         | Varies by plan          |

### 12.4 Community Resources

- **EduSphere Docs:** https://docs.edusphere.yourdomain.com
- **Internal Wiki:** https://wiki.yourcompany.com/edusphere
- **Slack Channels:**
  - #edusphere-deployments
  - #edusphere-support
  - #edusphere-incidents
- **Status Page:** https://status.edusphere.yourdomain.com

### 12.5 Emergency Runbook

Keep this printed and accessible:

```
========================================
EDUSPHERE EMERGENCY CONTACTS
========================================

PRIMARY ON-CALL: +1-XXX-XXX-XXXX
SECONDARY ON-CALL: +1-XXX-XXX-XXXX
CTO (ESCALATION): +1-XXX-XXX-XXXX

CRITICAL COMMANDS:
- Stop all: docker compose -f docker-compose.prod.yml down
- Start all: docker compose -f docker-compose.prod.yml up -d
- Health check: ./scripts/health-check-prod.sh
- Database backup: ./scripts/backup.sh
- View logs: docker compose -f docker-compose.prod.yml logs -f

INCIDENT TICKET: https://tickets.yourcompany.com
STATUS PAGE: https://status.edusphere.yourdomain.com
========================================
```

---

## Appendix A: Production Checklist

Print and complete before go-live:

```
EDUSPHERE PRODUCTION DEPLOYMENT CHECKLIST
Date: ________________  Deployer: ________________

PRE-DEPLOYMENT:
[ ] Server meets minimum specs (16 CPU, 64GB RAM, 500GB SSD)
[ ] Domain registered and DNS configured
[ ] SSL certificate provisioning tested
[ ] All .env secrets changed from defaults
[ ] Firewall rules configured (80, 443 open)
[ ] Backup strategy implemented and tested
[ ] Monitoring dashboards configured
[ ] Team notified of deployment window

DEPLOYMENT:
[ ] Repository cloned and checked out to stable tag
[ ] .env file created with production values
[ ] Database initialized with extensions
[ ] Migrations applied successfully
[ ] Docker Compose services started
[ ] SSL certificates generated
[ ] Health checks passing (all green)
[ ] GraphQL query tested successfully

POST-DEPLOYMENT:
[ ] Demo accounts disabled (if seeded)
[ ] Keycloak realm and client configured
[ ] MinIO bucket created and policies set
[ ] Grafana dashboards imported
[ ] Alert rules configured
[ ] Backup job scheduled (cron)
[ ] Performance optimizations applied
[ ] Team notified of successful deployment
[ ] Documentation updated with production URLs

VERIFICATION:
[ ] Frontend accessible via HTTPS
[ ] User can register and login
[ ] Course creation works
[ ] File upload to MinIO works
[ ] GraphQL mutations succeed
[ ] WebSocket connections stable
[ ] Monitoring data flowing to Grafana
[ ] No errors in logs (30-minute observation)

Sign-off:
DevOps Lead: ________________  Date: ________
Backend Lead: ________________  Date: ________
```

---

## Appendix B: Kubernetes Deployment (Alternative)

For Kubernetes deployment instead of Docker Compose:

```bash
# Install Helm chart
helm install edusphere ./infrastructure/k8s/charts/edusphere \
  --namespace edusphere \
  --create-namespace \
  --values ./infrastructure/k8s/values.prod.yaml \
  --set global.domain=edusphere.yourdomain.com \
  --set postgresql.auth.password=$DATABASE_PASSWORD \
  --set keycloak.auth.adminPassword=$KEYCLOAK_ADMIN_PASSWORD

# Verify deployment
kubectl get pods -n edusphere
kubectl get ingress -n edusphere

# Check logs
kubectl logs -n edusphere -l app=gateway --tail=100

# Scale services
kubectl scale deployment gateway -n edusphere --replicas=5

# Rolling update
helm upgrade edusphere ./infrastructure/k8s/charts/edusphere \
  --namespace edusphere \
  --values ./infrastructure/k8s/values.prod.yaml
```

---

**End of Quick Deploy Guide**

**Version:** 1.0.0
**Last Updated:** 2026-02-17
**Maintained By:** DevOps Team
**Support:** devops@yourcompany.com
