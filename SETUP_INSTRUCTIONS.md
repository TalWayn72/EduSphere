# EduSphere - Setup Instructions

## Phase 0 & 1: Foundation + Data Layer ✅

### Prerequisites

1. **Docker Desktop** - Must be running
   - Download: https://www.docker.com/products/docker-desktop/
   - After installation, start Docker Desktop

2. **Node.js 20+** and **pnpm 9+**
   ```bash
   node --version  # Should be >= 20.0.0
   pnpm --version  # Should be >= 9.0.0
   ```

### Step 1: Start Infrastructure

```bash
# Start PostgreSQL + Redis
docker compose -f docker-compose.dev.yml up -d postgres redis

# Wait for PostgreSQL to be ready (~30 seconds)
docker exec edusphere-postgres pg_isready -U edusphere -d edusphere
```

### Step 2: Apply Database Migrations

```bash
# Generate and apply migrations
cd packages/db
pnpm generate  # Already done - creates migrations/
pnpm migrate   # Apply migrations to PostgreSQL

# Verify tables created
docker exec edusphere-postgres psql -U edusphere -d edusphere -c "\dt"
```

Expected output: **16 tables**
- tenants, users, courses, modules, media_assets
- transcripts, transcript_segments
- annotations
- collab_documents, collab_sessions, crdt_updates
- agent_definitions, agent_executions
- content_embeddings, annotation_embeddings, concept_embeddings

### Step 3: Seed Database

```bash
# Seed demo data + initialize Apache AGE graph
pnpm seed

# Verify data
docker exec edusphere-postgres psql -U edusphere -d edusphere -c "
  SELECT
    (SELECT COUNT(*) FROM tenants) AS tenants,
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM courses) AS courses
"
```

Expected output:
- 2 tenants (Demo, University A)
- 5 users (1 super admin, 1 org admin, 1 instructor, 2 students)
- 1 course with 2 modules

### Step 4: Verify Apache AGE Graph

```bash
# Check graph exists
docker exec edusphere-postgres psql -U edusphere -d edusphere -c "
  SELECT * FROM ag_catalog.ag_graph WHERE name = 'edusphere_graph'
"

# Check vertices
docker exec edusphere-postgres psql -U edusphere -d edusphere -c "
  LOAD 'age';
  SET search_path = ag_catalog, public;
  SELECT * FROM cypher('edusphere_graph', $$
    MATCH (n) RETURN n LIMIT 10
  $$) AS (node agtype);
"
```

### Step 5: Run Health Check

```bash
# Run health check script
./scripts/health-check.sh
```

Expected output:
```
🏥 EduSphere Health Check
==========================
Checking PostgreSQL... ✓
Checking PostgreSQL extensions... ✓ (uuid-ossp, pgcrypto, age, vector)
Checking Apache AGE graph... ✓ (edusphere_graph)
Checking Redis... ✓

==========================
All services healthy!
```

---

## Current Status

✅ **Phase 0: Foundation** - Complete
- Docker infrastructure configured
- PostgreSQL 16 + Apache AGE 1.5.0 + pgvector 0.8.0
- Health check script created

✅ **Phase 1: Data Layer** - Complete
- 16 PostgreSQL tables created
- Row-Level Security (RLS) ready
- Apache AGE graph ontology initialized
- pgvector embeddings tables ready

⏳ **Next:** Phase 2 - Core + Content Subgraphs
- Keycloak authentication
- GraphQL subgraph-core (Users, Tenants)
- GraphQL subgraph-content (Courses, Media, Transcription)

---

## Troubleshooting

### Docker not found
```bash
# On Windows, ensure Docker Desktop is running
# Check PATH includes: C:\Program Files\Docker\Docker\resources\bin\
```

### PostgreSQL connection refused
```bash
# Check container is running
docker ps | grep postgres

# Check logs
docker logs edusphere-postgres
```

### Apache AGE extension not loaded
```bash
# Restart PostgreSQL container
docker restart edusphere-postgres

# Check shared_preload_libraries
docker exec edusphere-postgres psql -U postgres -c "SHOW shared_preload_libraries"
```

### Migrations fail
```bash
# Reset database (CAUTION: deletes all data)
docker exec edusphere-postgres psql -U postgres -c "DROP DATABASE edusphere"
docker exec edusphere-postgres psql -U postgres -c "CREATE DATABASE edusphere OWNER edusphere"

# Re-run migrations
cd packages/db && pnpm migrate
```
