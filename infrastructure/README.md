# EduSphere Infrastructure

Complete Docker-based infrastructure stack for local development and testing.

## Services

| Service | Port(s) | Version | Purpose |
|---------|---------|---------|---------|
| **PostgreSQL** | 5432 | 16 + AGE 1.5.0 + pgvector 0.8.0 | Main database with graph + embeddings |
| **Keycloak** | 8080 | 26.1.0 | OIDC authentication & JWT tokens |
| **NATS** | 4222, 8222 | 2.10 | JetStream event messaging |
| **MinIO** | 9000, 9001 | Latest | S3-compatible object storage |
| **Redis** | 6379 | 7-alpine | Caching & sessions |
| **Jaeger** | 16686, 4317, 4318 | 1.64 | OpenTelemetry tracing |
| **Ollama** | 11434 | Latest | Local LLM for AI agents |

## Quick Start

### 1. Start Infrastructure

```bash
# From project root
docker-compose up -d

# Wait for all services (takes ~60s for Keycloak)
./scripts/health-check.sh
```

### 2. Access Services

**Keycloak Admin Console**
- URL: http://localhost:8080
- Username: `admin`
- Password: `admin`

**MinIO Console**
- URL: http://localhost:9001
- Access Key: `minioadmin`
- Secret Key: `minioadmin`

**Jaeger UI**
- URL: http://localhost:16686

**NATS Monitor**
- URL: http://localhost:8222

**PostgreSQL**
```bash
psql postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere
```

### 3. Verify Health

```bash
./scripts/health-check.sh
```

Expected output:
```
✅ All services are healthy!
```

## Demo Users

| Email | Password | Role | tenant_id |
|-------|----------|------|-----------|
| super.admin@edusphere.dev | SuperAdmin123! | SUPER_ADMIN | 00000000-0000-0000-0000-000000000000 |
| org.admin@example.com | OrgAdmin123! | ORG_ADMIN | 11111111-1111-1111-1111-111111111111 |
| instructor@example.com | Instructor123! | INSTRUCTOR | 11111111-1111-1111-1111-111111111111 |
| student@example.com | Student123! | STUDENT | 11111111-1111-1111-1111-111111111111 |
| researcher@example.com | Researcher123! | RESEARCHER | 11111111-1111-1111-1111-111111111111 |

## Custom PostgreSQL Image

Built from `infrastructure/docker/Dockerfile.postgres`:
- **Base:** postgres:16-alpine
- **Extensions:**
  - Apache AGE 1.5.0 (graph database)
  - pgvector 0.8.0 (embeddings)
  - uuid-ossp, pgcrypto
- **Graph:** `edusphere_graph` (auto-created)
- **RLS:** Enabled globally

### Build Manually

```bash
cd infrastructure/docker
docker build -t edusphere-postgres:latest -f Dockerfile.postgres .
```

## Database Initialization

1. **init.sql** - Create schema, enable extensions, grant privileges
2. **age-setup.sql** - Load Apache AGE, create graph

Scripts run automatically on first container start.

## Ollama Setup

### Pull LLM Models

```bash
# Enter Ollama container
docker exec -it edusphere-ollama bash

# Pull Llama 3.1 8B
ollama pull llama3.1:8b

# Pull nomic-embed-text (embeddings)
ollama pull nomic-embed-text

# Verify
ollama list
```

## Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f keycloak
```

### Restart Service

```bash
docker-compose restart postgres
```

### Stop All

```bash
docker-compose down
```

### Clean Volumes (⚠️ Deletes all data)

```bash
docker-compose down -v
```

### Rebuild PostgreSQL Image

```bash
docker-compose up -d --build postgres
```

## Troubleshooting

### PostgreSQL not starting

```bash
# Check logs
docker-compose logs postgres

# Common fixes
docker-compose down -v  # Remove volumes
docker-compose up -d postgres
```

### Keycloak "Waiting for database"

Keycloak takes ~60s to start on first run. Check:

```bash
docker-compose logs keycloak | grep "Running the server"
```

### Apache AGE not loaded

```bash
# Verify extension
docker exec edusphere-postgres psql -U edusphere -d edusphere -c "SELECT * FROM pg_extension WHERE extname='age';"

# Check shared_preload_libraries
docker exec edusphere-postgres psql -U edusphere -d edusphere -c "SHOW shared_preload_libraries;"
```

### NATS connection refused

```bash
# Check NATS health
curl http://localhost:8222/varz

# Restart if needed
docker-compose restart nats
```

## Next Steps

After infrastructure is healthy:
1. ✅ Run `./scripts/health-check.sh`
2. → Start Phase 0.3: Scaffold first subgraph (Core)
