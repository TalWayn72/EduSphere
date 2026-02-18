# EduSphere — Docker Development Setup

> **Purpose**: Comprehensive guide for setting up and managing the EduSphere Docker development environment
> **Target**: Local development on Windows, macOS, and Linux
> **Last Updated**: February 18, 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [All-in-One Container (Recommended for demos/staging)](#2-all-in-one-container)
3. [Custom Images](#3-custom-images)
4. [docker-compose.yml](#4-docker-composeyml)
5. [Network Configuration](#5-network-configuration)
6. [Volume Management](#6-volume-management)
7. [Service Health Checks](#7-service-health-checks)
8. [Environment Variables](#8-environment-variables)
9. [Startup/Shutdown Commands](#9-startupshutdown-commands)
10. [Logs & Debugging](#10-logs--debugging)
11. [Windows-Specific Issues](#11-windows-specific-issues)

---

## 2. All-in-One Container

> **Use case**: Demo environments, staging servers, CI/CD pipelines, quick local setup.
> **Image**: `edusphere-all-in-one:build10`
> **Managed by**: supervisord (all services in a single container)

### Architecture

```
edusphere-all-in-one
├── PostgreSQL 17 + Apache AGE + pgvector   (port 5432)
├── Redis                                    (port 6379)
├── NATS JetStream                           (port 4222, 8222)
├── MinIO                                    (port 9000, 9001)
├── Keycloak 26.5.3                          (port 8080)
├── Ollama (disabled by default)             (port 11434)
├── subgraph-core                            (port 4001)
├── subgraph-content                         (port 4002)
├── subgraph-annotation                      (port 4003)
├── subgraph-collaboration                   (port 4004)
├── subgraph-agent                           (port 4005)
├── subgraph-knowledge                       (port 4006)
└── Hive Gateway v2 (supergraph)             (port 4000)
```

### Startup Sequence

1. `startup.sh` starts PostgreSQL, creates DB + extensions (AGE, pgvector, uuid-ossp)
2. Runs `tsx src/migrate.ts` — applies Drizzle migrations (idempotent, IF NOT EXISTS)
3. Seeds demo data if DB is empty (5 users, 1 course, Apache AGE graph ontology)
4. Stops temporary PostgreSQL, hands off to supervisord
5. supervisord starts ALL services in priority order
6. After 35s, `compose-supergraph` runs `node compose.js` — fetches SDL from 6 subgraphs, writes `supergraph.graphql`
7. Gateway hot-reloads and serves the composed supergraph

### Build

```bash
docker build -t edusphere-all-in-one:build10 .
```

### Run

```bash
docker run -d --name edusphere \
  -p 4000:4000 -p 4001:4001 -p 4002:4002 -p 4003:4003 \
  -p 4004:4004 -p 4005:4005 -p 4006:4006 \
  -p 5432:5432 -p 6379:6379 -p 8080:8080 \
  -p 4222:4222 -p 8222:8222 -p 9000:9000 -p 9001:9001 \
  edusphere-all-in-one:build10
```

### Verify

```bash
# Gateway health
curl http://localhost:4000/health

# GraphQL users query
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users(limit:3){ id email firstName lastName role } }"}'

# GraphQL courses query
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ courses { id title slug instructorId isPublished } }"}'
```

### Logs

```bash
docker exec <container> bash -c "cat //var/log/edusphere/compose-supergraph.log"
docker exec <container> bash -c "cat //var/log/edusphere/gateway.log"
docker exec <container> bash -c "cat //var/log/edusphere/subgraph-core.log"
docker exec <container> bash -c "cat //var/log/postgresql/init.log"
```

### Key Technical Decisions

| Decision | Reason |
|----------|--------|
| supervisord over systemd | Works in Docker without PID 1 issues |
| startup.sh for DB init | PostgreSQL needs to be up before migrate/seed, then handed to supervisord |
| `compose-supergraph` as one-shot program | Waits for all subgraphs (35s), then fetches SDL and composes |
| `node compose.js` (not tsx) | Gateway dir has compiled JS in node_modules |
| `IF NOT EXISTS` in migrations | Idempotent — safe to run on already-initialized DB |
| Raw pg Pool in `executeCypher` | Apache AGE requires multi-statement: LOAD + SET + SELECT — cannot use Drizzle prepared statements |

---
11. [Performance Tuning](#11-performance-tuning)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### 1.1 Docker Desktop

**Minimum Requirements**:
- **Docker Desktop**: 4.25.0+ (includes Docker Engine 24.0+, Docker Compose v2)
- **Memory**: 8GB RAM minimum, 16GB recommended
- **Disk Space**: 20GB free space for images and volumes
- **CPU**: 4+ cores recommended

**Installation**:

**Windows**:
```powershell
# Download from https://www.docker.com/products/docker-desktop
# Or install via winget
winget install Docker.DockerDesktop
```

**macOS**:
```bash
# Download from https://www.docker.com/products/docker-desktop
# Or install via Homebrew
brew install --cask docker
```

**Linux**:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

### 1.2 WSL2 for Windows

**CRITICAL**: WSL2 is **required** for Docker Desktop on Windows. WSL1 is not supported.

**Installation**:
```powershell
# Open PowerShell as Administrator
wsl --install

# Set WSL2 as default
wsl --set-default-version 2

# Verify installation
wsl --list --verbose
# Should show: * Ubuntu    Running    2
```

**Performance Tip**: Place your project files in the WSL2 filesystem (e.g., `/home/username/projects/edusphere`) rather than the Windows filesystem (`/mnt/c/`) for 10-20x faster I/O.

**Docker Desktop WSL2 Integration**:
1. Open Docker Desktop
2. Settings → Resources → WSL Integration
3. Enable integration with your WSL2 distribution (e.g., Ubuntu)
4. Click "Apply & Restart"

### 1.3 Verify Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 24.0.0 or higher

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.20.0 or higher

# Verify Docker daemon is running
docker ps
# Should return empty list (not error)

# Test Docker installation
docker run hello-world
# Should download and run successfully
```

---

## 2. Custom Images

### 2.1 postgres-age Image (PostgreSQL + AGE + pgvector)

EduSphere requires a custom PostgreSQL image with:
- **Apache AGE 1.5.0**: Graph database extension for Cypher queries
- **pgvector 0.8.0**: Vector similarity search for embeddings
- **PostgreSQL 16.x**: Base image

**Dockerfile** (`infrastructure/docker/postgres-age/Dockerfile`):

```dockerfile
# infrastructure/docker/postgres-age/Dockerfile
FROM postgres:16-alpine

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    git \
    clang15 \
    llvm15 \
    curl \
    postgresql-dev

# Install pgvector extension
RUN cd /tmp && \
    git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make && \
    make install && \
    cd .. && \
    rm -rf pgvector

# Install Apache AGE extension
RUN cd /tmp && \
    git clone --branch v1.5.0 https://github.com/apache/age.git && \
    cd age && \
    make PG_CONFIG=/usr/local/bin/pg_config && \
    make PG_CONFIG=/usr/local/bin/pg_config install && \
    cd .. && \
    rm -rf age

# Clean up build dependencies to reduce image size
RUN apk del build-base git clang15 llvm15

# Copy initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD pg_isready -U postgres || exit 1
```

**Initialization Script** (`infrastructure/docker/postgres-age/init.sql`):

```sql
-- infrastructure/docker/postgres-age/init.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "age";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Load AGE into session
LOAD 'age';

-- Set search path
SET search_path = ag_catalog, "$user", public;

-- Create the knowledge graph
SELECT create_graph('edusphere_graph');

-- Create application user
CREATE USER edusphere_app WITH PASSWORD 'dev_password_change_in_prod';

-- Grant permissions
GRANT CONNECT ON DATABASE postgres TO edusphere_app;
GRANT USAGE ON SCHEMA public TO edusphere_app;
GRANT USAGE ON SCHEMA ag_catalog TO edusphere_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO edusphere_app;
GRANT SELECT ON ALL TABLES IN SCHEMA ag_catalog TO edusphere_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO edusphere_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO edusphere_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO edusphere_app;

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('age', 'vector', 'uuid-ossp', 'pgcrypto');

-- Verify graph creation
SELECT * FROM ag_graph WHERE name = 'edusphere_graph';
```

**Build Command**:
```bash
cd infrastructure/docker/postgres-age
docker build -t edusphere/postgres-age:1.5.0 .

# Verify image
docker images | grep postgres-age
```

### 2.2 Image Versioning

Use semantic versioning for custom images:
- `edusphere/postgres-age:1.5.0` — Production-ready
- `edusphere/postgres-age:1.5.0-dev` — Development builds
- `edusphere/postgres-age:latest` — Always points to latest stable

---

## 3. docker-compose.yml

**File Location**: `infrastructure/docker-compose.yml`

```yaml
# infrastructure/docker-compose.yml
version: '3.9'

services:
  # ===================================================
  # PostgreSQL with AGE + pgvector
  # ===================================================
  postgres:
    image: edusphere/postgres-age:1.5.0
    container_name: edusphere-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_postgres_password}
      POSTGRES_DB: edusphere
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres-age/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    networks:
      - edusphere-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d edusphere"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # ===================================================
  # Keycloak (Identity & Access Management)
  # ===================================================
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: edusphere-keycloak
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-admin}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: postgres
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD:-dev_postgres_password}
      KC_HOSTNAME: localhost
      KC_HTTP_ENABLED: "true"
      KC_HEALTH_ENABLED: "true"
    command:
      - start-dev
      - --import-realm
    volumes:
      - keycloak_data:/opt/keycloak/data
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm.json:ro
    networks:
      - edusphere-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/localhost/8080 && echo -e 'GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && cat <&3 | grep -q '200 OK'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

  # ===================================================
  # NATS JetStream (Event Streaming & Messaging)
  # ===================================================
  nats:
    image: nats:2.10-alpine
    container_name: edusphere-nats
    restart: unless-stopped
    ports:
      - "4222:4222"  # Client connections
      - "8222:8222"  # HTTP management
      - "6222:6222"  # Cluster routing
    command:
      - "--jetstream"
      - "--store_dir=/data"
      - "--max_payload=8MB"
      - "--max_pending=128MB"
      - "--http_port=8222"
    volumes:
      - nats_data:/data
    networks:
      - edusphere-network
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8222/healthz || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M

  # ===================================================
  # MinIO (S3-Compatible Object Storage)
  # ===================================================
  minio:
    image: minio/minio:RELEASE.2024-02-06T21-36-22Z
    container_name: edusphere-minio
    restart: unless-stopped
    ports:
      - "9000:9000"  # S3 API
      - "9001:9001"  # Web Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
      MINIO_BROWSER: "on"
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - edusphere-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9000/minio/health/live || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.25'
          memory: 512M

  # ===================================================
  # MinIO Client (Initialize Buckets)
  # ===================================================
  minio-init:
    image: minio/mc:RELEASE.2024-02-06T22-30-35Z
    container_name: edusphere-minio-init
    depends_on:
      minio:
        condition: service_healthy
    networks:
      - edusphere-network
    entrypoint: >
      /bin/sh -c "
      mc alias set edusphere http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin};
      mc mb --ignore-existing edusphere/courses;
      mc mb --ignore-existing edusphere/transcripts;
      mc mb --ignore-existing edusphere/embeddings;
      mc mb --ignore-existing edusphere/avatars;
      mc mb --ignore-existing edusphere/backups;
      mc anonymous set download edusphere/courses;
      mc anonymous set download edusphere/avatars;
      echo 'MinIO buckets initialized successfully';
      "

  # ===================================================
  # Jaeger (Distributed Tracing)
  # ===================================================
  jaeger:
    image: jaegertracing/all-in-one:1.54
    container_name: edusphere-jaeger
    restart: unless-stopped
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger Collector HTTP
      - "14250:14250"  # Jaeger Collector gRPC
      - "6831:6831/udp"  # Jaeger Agent (Thrift)
    environment:
      COLLECTOR_ZIPKIN_HOST_PORT: ":9411"
      COLLECTOR_OTLP_ENABLED: "true"
    networks:
      - edusphere-network
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:16686/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M

  # ===================================================
  # Redis (Caching & Session Store) - Optional but Recommended
  # ===================================================
  redis:
    image: redis:7.2-alpine
    container_name: edusphere-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-dev_redis_password}
    volumes:
      - redis_data:/data
    networks:
      - edusphere-network
    healthcheck:
      test: ["CMD-SHELL", "redis-cli --auth ${REDIS_PASSWORD:-dev_redis_password} ping | grep PONG"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M

# ===================================================
# Networks
# ===================================================
networks:
  edusphere-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

# ===================================================
# Volumes
# ===================================================
volumes:
  postgres_data:
    driver: local
  keycloak_data:
    driver: local
  nats_data:
    driver: local
  minio_data:
    driver: local
  redis_data:
    driver: local
```

---

## 4. Network Configuration

### 4.1 Bridge Network

EduSphere uses a custom bridge network (`edusphere-network`) for service-to-service communication.

**Benefits**:
- Automatic DNS resolution between containers (e.g., `postgres:5432`)
- Isolation from other Docker networks
- Custom subnet for predictable IP addressing

**Configuration**:
```yaml
networks:
  edusphere-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### 4.2 Service Communication

Services communicate using container names as hostnames:

```typescript
// Example: Connecting to PostgreSQL from a subgraph
const databaseUrl = "postgresql://edusphere_app:dev_password@postgres:5432/edusphere";

// Example: Connecting to NATS
const natsUrl = "nats://nats:4222";

// Example: Connecting to MinIO
const minioEndpoint = "minio:9000";
```

**DNS Resolution**: Docker automatically resolves service names to container IPs within the network.

### 4.3 Port Mapping

**Host → Container Port Mappings**:
```
Host Port    Container Port    Service
---------    --------------    -------
5432         5432              PostgreSQL
8080         8080              Keycloak
4222         4222              NATS Client
8222         8222              NATS Management
6222         6222              NATS Cluster
9000         9000              MinIO S3 API
9001         9001              MinIO Console
16686        16686             Jaeger UI
14268        14268             Jaeger Collector HTTP
14250        14250             Jaeger Collector gRPC
6831/udp     6831/udp          Jaeger Agent
6379         6379              Redis
```

**Accessing Services from Host**:
```bash
# PostgreSQL
psql -h localhost -p 5432 -U postgres -d edusphere

# Keycloak Admin Console
open http://localhost:8080

# MinIO Console
open http://localhost:9001

# Jaeger UI
open http://localhost:16686

# NATS Management
curl http://localhost:8222/varz
```

### 4.4 External Access

By default, all services are accessible from the host machine but **not** from the external network.

**Production Consideration**: Never expose PostgreSQL, NATS, or Redis directly to the internet. Use a reverse proxy (e.g., Traefik, Nginx) with TLS termination.

---

## 5. Volume Management

### 5.1 Named Volumes

EduSphere uses **named volumes** for persistent data. Named volumes are managed by Docker and survive container restarts and removals.

**Defined Volumes**:
```yaml
volumes:
  postgres_data:      # PostgreSQL data directory
  keycloak_data:      # Keycloak configuration and realm data
  nats_data:          # NATS JetStream message storage
  minio_data:         # MinIO object storage
  redis_data:         # Redis persistence
```

### 5.2 Volume Locations

**Linux/macOS**:
```bash
# Default volume path
/var/lib/docker/volumes/<volume-name>/_data

# List volumes
docker volume ls

# Inspect a volume
docker volume inspect postgres_data
```

**Windows (WSL2)**:
```powershell
# Access WSL2 filesystem
\\wsl$\docker-desktop-data\data\docker\volumes

# Or from WSL2
ls /var/lib/docker/volumes/
```

### 5.3 Backup & Restore

**PostgreSQL Backup**:
```bash
# Create a backup
docker exec edusphere-postgres pg_dump -U postgres edusphere > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i edusphere-postgres psql -U postgres edusphere < backup_20260217.sql
```

**MinIO Backup**:
```bash
# Sync to local directory
docker run --rm \
  --network infrastructure_edusphere-network \
  -v $(pwd)/minio-backup:/backup \
  minio/mc:latest \
  mirror edusphere/courses /backup/courses
```

**Full Volume Backup**:
```bash
# Backup a volume to tar.gz
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz -C /data .

# Restore from tar.gz
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/postgres_data_backup.tar.gz -C /data"
```

### 5.4 Cleaning Volumes

**WARNING**: This will delete all data!

```bash
# Remove all volumes (DANGEROUS)
docker compose -f infrastructure/docker-compose.yml down -v

# Remove specific volume
docker volume rm infrastructure_postgres_data

# Prune unused volumes
docker volume prune
```

---

## 6. Service Health Checks

Health checks ensure services are ready before dependent services start.

### 6.1 PostgreSQL Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d edusphere"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

**Explanation**:
- `pg_isready`: PostgreSQL utility to check if server is accepting connections
- `interval: 10s`: Check every 10 seconds
- `timeout: 5s`: Fail if check takes > 5 seconds
- `retries: 5`: Mark unhealthy after 5 consecutive failures
- `start_period: 30s`: Grace period before first check

### 6.2 Keycloak Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "exec 3<>/dev/tcp/localhost/8080 && echo -e 'GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && cat <&3 | grep -q '200 OK'"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

**Explanation**:
- Checks Keycloak's `/health/ready` endpoint
- `start_period: 60s`: Keycloak takes ~60s to start

### 6.3 NATS Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8222/healthz || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### 6.4 MinIO Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:9000/minio/health/live || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

### 6.5 Checking Health Status

```bash
# Check all service health
docker compose -f infrastructure/docker-compose.yml ps

# Expected output:
# NAME                   STATUS
# edusphere-postgres     Up (healthy)
# edusphere-keycloak     Up (healthy)
# edusphere-nats         Up (healthy)
# edusphere-minio        Up (healthy)
# edusphere-jaeger       Up (healthy)
# edusphere-redis        Up (healthy)

# Inspect specific service health
docker inspect edusphere-postgres | jq '.[0].State.Health'
```

---

## 7. Environment Variables

### 7.1 .env File

Create `.env` file in `infrastructure/` directory:

```bash
# infrastructure/.env

# ===================================================
# PostgreSQL Configuration
# ===================================================
POSTGRES_PASSWORD=dev_postgres_password_change_me
POSTGRES_USER=postgres
POSTGRES_DB=edusphere

# ===================================================
# Keycloak Configuration
# ===================================================
KEYCLOAK_ADMIN_PASSWORD=admin_change_me
KEYCLOAK_ADMIN=admin

# ===================================================
# MinIO Configuration
# ===================================================
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_change_me

# ===================================================
# Redis Configuration
# ===================================================
REDIS_PASSWORD=dev_redis_password_change_me

# ===================================================
# Application Configuration
# ===================================================
NODE_ENV=development
LOG_LEVEL=debug

# ===================================================
# NATS Configuration (No credentials needed for dev)
# ===================================================
# NATS runs without auth in dev mode
```

### 7.2 Loading .env File

Docker Compose automatically loads `.env` from the same directory as `docker-compose.yml`.

```bash
# Verify environment variables
docker compose -f infrastructure/docker-compose.yml config

# Override with different .env file
docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.yml up
```

### 7.3 Security Best Practices

**DO**:
- Use strong passwords in production
- Store `.env` files in `.gitignore`
- Use secret management tools (AWS Secrets Manager, Vault) in production
- Rotate credentials regularly

**DON'T**:
- Commit `.env` files to version control
- Use default passwords in production
- Share credentials via Slack/email

**Example `.env.example`**:
```bash
# infrastructure/.env.example
POSTGRES_PASSWORD=your_postgres_password
KEYCLOAK_ADMIN_PASSWORD=your_keycloak_password
MINIO_ROOT_PASSWORD=your_minio_password
REDIS_PASSWORD=your_redis_password
```

Commit `.env.example` to Git as a template.

---

## 8. Startup/Shutdown Commands

### 8.1 Starting Services

```bash
# Start all services in background
docker compose -f infrastructure/docker-compose.yml up -d

# Start specific services
docker compose -f infrastructure/docker-compose.yml up -d postgres redis

# Start with build (if Dockerfile changed)
docker compose -f infrastructure/docker-compose.yml up -d --build

# Start and follow logs
docker compose -f infrastructure/docker-compose.yml up

# Start with recreated containers (ignores cache)
docker compose -f infrastructure/docker-compose.yml up -d --force-recreate
```

### 8.2 Stopping Services

```bash
# Stop all services (keeps volumes)
docker compose -f infrastructure/docker-compose.yml down

# Stop and remove volumes (DELETES DATA)
docker compose -f infrastructure/docker-compose.yml down -v

# Stop specific service
docker compose -f infrastructure/docker-compose.yml stop postgres

# Pause services (suspend processes)
docker compose -f infrastructure/docker-compose.yml pause
docker compose -f infrastructure/docker-compose.yml unpause
```

### 8.3 Restarting Services

```bash
# Restart all services
docker compose -f infrastructure/docker-compose.yml restart

# Restart specific service
docker compose -f infrastructure/docker-compose.yml restart postgres

# Recreate and restart (apply config changes)
docker compose -f infrastructure/docker-compose.yml up -d --force-recreate postgres
```

### 8.4 Service Lifecycle

```bash
# Check service status
docker compose -f infrastructure/docker-compose.yml ps

# View resource usage
docker stats

# Inspect a service
docker inspect edusphere-postgres

# Execute command in running container
docker exec -it edusphere-postgres psql -U postgres -d edusphere

# Open shell in container
docker exec -it edusphere-postgres sh
```

### 8.5 Startup Order

Services start in dependency order defined by `depends_on`:

1. **postgres** (no dependencies)
2. **nats** (no dependencies)
3. **redis** (no dependencies)
4. **minio** (no dependencies)
5. **keycloak** (depends on postgres)
6. **minio-init** (depends on minio)
7. **jaeger** (no dependencies)

**Important**: `depends_on` with `condition: service_healthy` ensures Keycloak waits for PostgreSQL to be fully ready, not just started.

---

## 9. Logs & Debugging

### 9.1 Viewing Logs

```bash
# View logs for all services
docker compose -f infrastructure/docker-compose.yml logs

# Follow logs in real-time
docker compose -f infrastructure/docker-compose.yml logs -f

# View logs for specific service
docker compose -f infrastructure/docker-compose.yml logs postgres

# Follow logs for multiple services
docker compose -f infrastructure/docker-compose.yml logs -f postgres keycloak

# View last 100 lines
docker compose -f infrastructure/docker-compose.yml logs --tail=100 postgres

# View logs with timestamps
docker compose -f infrastructure/docker-compose.yml logs -t postgres
```

### 9.2 Log Levels

**PostgreSQL**:
```bash
# Enable query logging (temporary)
docker exec edusphere-postgres psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
docker exec edusphere-postgres psql -U postgres -c "SELECT pg_reload_conf();"

# View slow queries
docker exec edusphere-postgres psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

**Keycloak**:
```yaml
# Add to environment in docker-compose.yml
environment:
  KC_LOG_LEVEL: DEBUG  # Options: ERROR, WARN, INFO, DEBUG, TRACE
```

**NATS**:
```bash
# Enable debug logging
command:
  - "--jetstream"
  - "--debug"
  - "--trace"
```

### 9.3 Debugging Connection Issues

```bash
# Test PostgreSQL connection
docker exec edusphere-postgres psql -U postgres -d edusphere -c "SELECT version();"

# Test NATS connection
docker run --rm --network infrastructure_edusphere-network \
  natsio/nats-box:latest \
  nats -s nats://nats:4222 pub test "hello"

# Test MinIO connection
docker run --rm --network infrastructure_edusphere-network \
  minio/mc:latest \
  ls --insecure http://minio:9000

# Test Redis connection
docker exec edusphere-redis redis-cli --auth dev_redis_password ping
```

### 9.4 Network Debugging

```bash
# Inspect network
docker network inspect infrastructure_edusphere-network

# Test DNS resolution
docker run --rm --network infrastructure_edusphere-network \
  alpine ping -c 3 postgres

# Test port connectivity
docker run --rm --network infrastructure_edusphere-network \
  alpine telnet postgres 5432
```

### 9.5 Log Aggregation (Production)

For production, integrate with centralized logging:

**Fluentd**:
```yaml
logging:
  driver: fluentd
  options:
    fluentd-address: localhost:24224
    tag: edusphere.postgres
```

**JSON File Driver** (default):
```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 10. Windows-Specific Issues

### 10.1 WSL2 File System Performance

**Problem**: Files on Windows filesystem (`/mnt/c/`) have 10-20x slower I/O.

**Solution**: Move project to WSL2 filesystem:
```bash
# From WSL2 terminal
cd ~
git clone https://github.com/your-org/edusphere.git
cd edusphere
```

**Accessing from Windows**: Use `\\wsl$\Ubuntu\home\username\edusphere` in File Explorer.

### 10.2 Line Ending Issues (CRLF vs LF)

**Problem**: Windows uses CRLF (`\r\n`), Linux uses LF (`\n`). Shell scripts fail with `\r: command not found`.

**Solution**:
```bash
# Configure Git to auto-convert
git config --global core.autocrlf input

# Convert existing files
dos2unix infrastructure/docker/postgres-age/init.sql

# Or manually
sed -i 's/\r$//' infrastructure/docker/postgres-age/init.sql
```

**Prevention**: Add `.gitattributes`:
```
# .gitattributes
* text=auto
*.sh text eol=lf
*.sql text eol=lf
*.yml text eol=lf
```

### 10.3 Docker Desktop Memory Limits

**Problem**: Default 2GB RAM is insufficient.

**Solution**:
1. Open Docker Desktop
2. Settings → Resources → Advanced
3. Set Memory to at least 8GB
4. Set CPUs to at least 4
5. Click "Apply & Restart"

**WSL2 Config** (`%USERPROFILE%\.wslconfig`):
```ini
[wsl2]
memory=12GB
processors=6
swap=4GB
```

### 10.4 Port Conflicts

**Problem**: Port already in use (e.g., 5432, 8080).

**Solution**:
```powershell
# Find process using port
netstat -ano | findstr :5432

# Kill process (replace PID)
taskkill /PID 12345 /F

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 on host instead
```

### 10.5 Permission Issues

**Problem**: Cannot write to volumes.

**Solution**:
```bash
# From WSL2
sudo chown -R $USER:$USER ~/edusphere

# Or run Docker commands with sudo (not recommended)
sudo docker compose up
```

### 10.6 Antivirus Interference

**Problem**: Antivirus software (Windows Defender, McAfee) slows down file access.

**Solution**:
1. Add Docker directories to exclusion list:
   - `C:\Program Files\Docker`
   - `C:\ProgramData\Docker`
   - `\\wsl$\docker-desktop-data`
   - Your project directory
2. Windows Security → Virus & threat protection → Exclusions

### 10.7 VPN Issues

**Problem**: VPN interferes with Docker networking.

**Solution**:
```powershell
# Restart Docker Desktop after connecting to VPN
net stop com.docker.service
net start com.docker.service

# Or restart WSL
wsl --shutdown
```

---

## 11. Performance Tuning

### 11.1 Resource Limits

**Per-Service Limits** (already configured in docker-compose.yml):
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

**Global Limits** (Docker Desktop):
- Memory: 12-16GB for dev environment
- CPUs: 6-8 cores
- Swap: 4GB

### 11.2 PostgreSQL Performance

**Tune postgresql.conf** (add to `init.sql`):
```sql
-- PostgreSQL performance tuning for development
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET max_worker_processes = 4;
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
ALTER SYSTEM SET max_parallel_workers = 4;
```

**Connection Pooling** (PgBouncer):
```yaml
# Add to docker-compose.yml
pgbouncer:
  image: pgbouncer/pgbouncer:1.21
  environment:
    DATABASES: edusphere=host=postgres port=5432 dbname=edusphere
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 25
  ports:
    - "6432:6432"
  networks:
    - edusphere-network
```

### 11.3 MinIO Performance

**Multi-part Upload Optimization**:
```yaml
environment:
  MINIO_API_REQUESTS_MAX: 10000
  MINIO_API_REQUESTS_DEADLINE: 10s
```

### 11.4 NATS Performance

**Increase Buffer Sizes**:
```yaml
command:
  - "--jetstream"
  - "--max_payload=8MB"
  - "--max_pending=128MB"
  - "--write_deadline=10s"
```

### 11.5 Volume Performance (WSL2)

**Use Named Volumes** (not bind mounts) for database data:
```yaml
# FAST (named volume)
volumes:
  - postgres_data:/var/lib/postgresql/data

# SLOW (bind mount on Windows)
volumes:
  - ./data:/var/lib/postgresql/data
```

**Exception**: Use bind mounts for config files (read-only):
```yaml
volumes:
  - ./init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
```

### 11.6 Image Build Optimization

**Multi-stage Builds**:
```dockerfile
# Build stage
FROM postgres:16-alpine AS builder
RUN apk add --no-cache build-base git
RUN cd /tmp && git clone https://github.com/pgvector/pgvector.git && \
    cd pgvector && make && make install

# Runtime stage
FROM postgres:16-alpine
COPY --from=builder /usr/local/lib/postgresql /usr/local/lib/postgresql
```

**BuildKit**:
```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker build -t edusphere/postgres-age:1.5.0 .
```

---

## 12. Troubleshooting

### 12.1 PostgreSQL Issues

**Problem**: `role "edusphere_app" does not exist`

**Solution**:
```bash
# Recreate database with init script
docker compose -f infrastructure/docker-compose.yml down -v
docker compose -f infrastructure/docker-compose.yml up -d postgres
```

**Problem**: `pg_isready` fails

**Solution**:
```bash
# Check logs
docker logs edusphere-postgres

# Verify PostgreSQL is running
docker exec edusphere-postgres pg_isready -U postgres

# Connect manually
docker exec -it edusphere-postgres psql -U postgres
```

**Problem**: Slow query performance

**Solution**:
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### 12.2 Keycloak Issues

**Problem**: Keycloak stuck at "Starting..."

**Solution**:
```bash
# Increase start_period in healthcheck
# Check logs for errors
docker logs edusphere-keycloak

# Common issue: PostgreSQL not ready
docker compose -f infrastructure/docker-compose.yml restart postgres keycloak
```

**Problem**: Cannot access admin console

**Solution**:
```bash
# Verify port mapping
docker ps | grep keycloak

# Check if port 8080 is available
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Access via container IP
docker inspect edusphere-keycloak | jq '.[0].NetworkSettings.Networks."infrastructure_edusphere-network".IPAddress'
curl http://<container-ip>:8080
```

### 12.3 NATS Issues

**Problem**: `nats: no servers available for connection`

**Solution**:
```bash
# Verify NATS is running
docker logs edusphere-nats

# Test connection
docker run --rm --network infrastructure_edusphere-network \
  natsio/nats-box:latest \
  nats -s nats://nats:4222 pub test "hello"
```

**Problem**: JetStream not enabled

**Solution**:
```bash
# Verify JetStream is enabled
docker exec edusphere-nats nats-server --jetstream --version

# Check startup command
docker inspect edusphere-nats | jq '.[0].Config.Cmd'
```

### 12.4 MinIO Issues

**Problem**: `Access Denied` when creating bucket

**Solution**:
```bash
# Check credentials
docker logs edusphere-minio

# Login to console: http://localhost:9001
# Username: minioadmin
# Password: minioadmin_change_me

# Verify buckets
docker exec edusphere-minio mc ls local
```

**Problem**: Cannot upload files

**Solution**:
```bash
# Check bucket policy
docker exec edusphere-minio mc anonymous get local/courses

# Set download policy
docker exec edusphere-minio mc anonymous set download local/courses
```

### 12.5 Network Issues

**Problem**: Services cannot communicate

**Solution**:
```bash
# Verify all services are on same network
docker network inspect infrastructure_edusphere-network

# Recreate network
docker compose -f infrastructure/docker-compose.yml down
docker network rm infrastructure_edusphere-network
docker compose -f infrastructure/docker-compose.yml up -d
```

**Problem**: DNS resolution fails

**Solution**:
```bash
# Test DNS
docker run --rm --network infrastructure_edusphere-network \
  alpine nslookup postgres

# Check Docker DNS
docker inspect bridge | jq '.[0].IPAM.Config'
```

### 12.6 Volume Issues

**Problem**: Data not persisting

**Solution**:
```bash
# Verify volume is mounted
docker inspect edusphere-postgres | jq '.[0].Mounts'

# Check volume exists
docker volume ls | grep postgres_data

# Inspect volume
docker volume inspect infrastructure_postgres_data
```

**Problem**: Permission denied when accessing volume

**Solution**:
```bash
# Fix permissions (Linux/macOS)
sudo chown -R 999:999 /var/lib/docker/volumes/infrastructure_postgres_data/_data

# Or recreate volume
docker compose -f infrastructure/docker-compose.yml down -v
docker compose -f infrastructure/docker-compose.yml up -d
```

### 12.7 General Docker Issues

**Problem**: `docker-compose: command not found`

**Solution**:
```bash
# Use docker compose (v2) instead of docker-compose (v1)
docker compose version

# Or install docker-compose v1
pip install docker-compose
```

**Problem**: Out of disk space

**Solution**:
```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes
# WARNING: This removes ALL unused images, containers, volumes

# Selective cleanup
docker image prune -a  # Remove unused images
docker volume prune    # Remove unused volumes
docker container prune # Remove stopped containers
```

**Problem**: Docker daemon not responding

**Solution**:
```bash
# Restart Docker Desktop (Windows/macOS)
# Or restart Docker service (Linux)
sudo systemctl restart docker

# Check Docker status
docker info
```

### 12.8 Health Check Failures

**Problem**: Service marked unhealthy

**Solution**:
```bash
# Check health status
docker inspect edusphere-postgres | jq '.[0].State.Health'

# View failed health check logs
docker inspect edusphere-postgres | jq '.[0].State.Health.Log'

# Manually run health check command
docker exec edusphere-postgres pg_isready -U postgres -d edusphere
```

### 12.9 Build Failures

**Problem**: `ERROR [internal] load metadata for docker.io/library/postgres:16-alpine`

**Solution**:
```bash
# Pull base image manually
docker pull postgres:16-alpine

# Retry build
docker build -t edusphere/postgres-age:1.5.0 infrastructure/docker/postgres-age
```

**Problem**: Build fails on ARM64 (Apple Silicon)

**Solution**:
```bash
# Use buildx for multi-platform builds
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t edusphere/postgres-age:1.5.0 \
  infrastructure/docker/postgres-age
```

---

## Appendix: Quick Reference

### Service URLs (Development)

| Service      | URL                               | Credentials                        |
|--------------|-----------------------------------|------------------------------------|
| PostgreSQL   | `postgresql://localhost:5432`     | postgres / dev_postgres_password   |
| Keycloak     | http://localhost:8080             | admin / admin                      |
| MinIO Console| http://localhost:9001             | minioadmin / minioadmin            |
| MinIO S3 API | http://localhost:9000             | minioadmin / minioadmin            |
| NATS         | `nats://localhost:4222`           | No auth (dev)                      |
| NATS Monitor | http://localhost:8222             | No auth                            |
| Jaeger UI    | http://localhost:16686            | No auth                            |
| Redis        | `redis://localhost:6379`          | Password: dev_redis_password       |

### Common Commands

```bash
# Start all services
docker compose -f infrastructure/docker-compose.yml up -d

# Stop all services
docker compose -f infrastructure/docker-compose.yml down

# View logs
docker compose -f infrastructure/docker-compose.yml logs -f

# Rebuild custom image
docker build -t edusphere/postgres-age:1.5.0 infrastructure/docker/postgres-age

# Backup PostgreSQL
docker exec edusphere-postgres pg_dump -U postgres edusphere > backup.sql

# Restore PostgreSQL
docker exec -i edusphere-postgres psql -U postgres edusphere < backup.sql

# Connect to PostgreSQL
docker exec -it edusphere-postgres psql -U postgres -d edusphere

# Access MinIO console
open http://localhost:9001

# Clean everything (DANGEROUS)
docker compose -f infrastructure/docker-compose.yml down -v
docker system prune -a --volumes
```

---

## Next Steps

After setting up Docker:

1. **Verify Services**: Ensure all health checks pass
2. **Initialize Database**: Run migrations with Drizzle ORM
3. **Configure Keycloak**: Import realm configuration
4. **Test Connectivity**: Verify subgraphs can connect to all services
5. **Review Logs**: Check for any warnings or errors
6. **Performance Baseline**: Run initial load tests

**Related Documentation**:
- [Database Schema](../database/DATABASE_SCHEMA.md)
- [Development Guidelines](./GUIDELINES.md)
- [Architecture Overview](../architecture/ARCHITECTURE.md)
- [Testing Conventions](../testing/TESTING_CONVENTIONS.md)

---

**Last Updated**: February 17, 2026
**Maintainer**: EduSphere DevOps Team
**Version**: 1.0.0
