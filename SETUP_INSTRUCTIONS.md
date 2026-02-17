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

✅ **Phase 2: Authentication + Core/Content Subgraphs** - Infrastructure Ready
- Keycloak realm configured (see [PHASE_2_SETUP.md](PHASE_2_SETUP.md))
- Docker Compose updated with Keycloak service
- 5 demo users with roles (SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR, STUDENT, RESEARCHER)
- Code templates ready for packages/auth, subgraph-core, subgraph-content

⏳ **Next:** Phase 3 - Gateway & Supergraph
- Hive Gateway v2.7 configuration
- Supergraph composition
- GraphQL introspection
- Frontend setup (React 19 + Vite)

---

## Phase 2: Keycloak Authentication Setup

### Step 1: Start Keycloak

```bash
# Start Keycloak with PostgreSQL + Redis
docker compose -f docker-compose.dev.yml up -d postgres redis keycloak

# Wait for Keycloak to be ready (~60 seconds)
docker logs -f edusphere-keycloak
# Look for: "Running the server in development mode. DO NOT use this configuration in production."
```

### Step 2: Verify Keycloak Realm

```bash
# Open Keycloak Admin Console
# URL: http://localhost:8080
# Login: admin / admin123

# Verify:
# 1. Realm "edusphere" is imported
# 2. 5 users exist (Users menu)
# 3. 5 roles exist (Realm roles menu)
# 4. 3 clients exist (Clients menu)
```

### Step 3: Test Authentication

Test login with demo users:
- **Super Admin**: super.admin@edusphere.dev / SuperAdmin123!
- **Org Admin**: org.admin@example.com / OrgAdmin123!
- **Instructor**: instructor@example.com / Instructor123!
- **Student**: student@example.com / Student123!
- **Researcher**: researcher@example.com / Researcher123!

### Step 4: Build Auth Package & Subgraphs

See [PHASE_2_SETUP.md](PHASE_2_SETUP.md) for complete code templates for:
- `packages/auth` - JWT validation with Keycloak JWKS
- `apps/subgraph-core` - Users & Tenants GraphQL API
- `apps/subgraph-content` - Courses & Media GraphQL API

```bash
# Install dependencies
pnpm install

# Build auth package
pnpm --filter @edusphere/auth build

# Start subgraphs (in separate terminals)
pnpm --filter @edusphere/subgraph-core dev
pnpm --filter @edusphere/subgraph-content dev
```

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
