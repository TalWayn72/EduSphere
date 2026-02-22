# PgBouncer Connection Pooling

**Phase 7.1 — Production Database Pooling**
**Version:** 1.0
**Last Updated:** 2026-02-22

---

## Overview

EduSphere uses PgBouncer as a connection pooler between NestJS subgraphs and PostgreSQL 16. At 100,000+ concurrent users, direct PostgreSQL connections would exhaust `max_connections`. PgBouncer allows thousands of client connections to be multiplexed over a small number of server connections.

## Architecture

```
[Client Browser]
    |  HTTPS
[Hive Gateway :4000]
    |  HTTP
[6 NestJS Subgraphs :4001-4006]
    |  TCP
[PgBouncer :6432]  <- Connection pool
    |  TCP (<=200 connections)
[PostgreSQL 16 :5432]
```

## Configuration

**Files:**
- `infrastructure/pgbouncer/pgbouncer.ini` — Main PgBouncer configuration
- `infrastructure/pgbouncer/userlist.txt` — User credentials (SCRAM-SHA-256 hashes)
- `infrastructure/docker-compose.pgbouncer.yml` — Docker override for local development

### Pool Mode: Transaction (Required)

PgBouncer is configured in **transaction pooling** mode, which is mandatory for:
- PostgreSQL Row-Level Security using `SET LOCAL` (GDPR tenant isolation)
- Drizzle ORM transaction blocks
- `BEGIN ... SET LOCAL app.current_tenant = '...' ... COMMIT` pattern

> WARNING: Session pooling mode is incompatible with RLS `SET LOCAL` commands.
> Always use `BEGIN ... SET LOCAL ... COMMIT` — never SET outside a transaction.

### Per-Subgraph Named Pools

Each subgraph has a named pool in `pgbouncer.ini`:

| Subgraph | Pool Name | Pool Size |
|----------|-----------|-----------|
| Core | `edusphere_core` | 25 connections |
| Content | `edusphere_content` | 25 connections |
| Annotation | `edusphere_annotation` | 25 connections |
| Collaboration | `edusphere_collaboration` | 25 connections |
| Agent | `edusphere_agent` | 35 connections (larger for LangGraph) |
| Knowledge | `edusphere_knowledge` | 35 connections (larger for pgvector/AGE) |
| Default | `edusphere` | 10 connections (migrations, admin) |

**Total server-side connections:** 170 max (PostgreSQL `max_connections` set to >=200)
**Total client-side connections:** Up to 1,000

## Local Development Setup

```bash
# Start PgBouncer alongside infrastructure
docker-compose -f docker-compose.yml -f infrastructure/docker-compose.pgbouncer.yml up -d

# Verify PgBouncer is running
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS;"

# Update subgraph DATABASE_URL to route through PgBouncer
# In apps/subgraph-core/.env:
DATABASE_URL=postgresql://edusphere:<password>@pgbouncer:5432/edusphere_core
```

## Production Deployment

In Kubernetes, PgBouncer runs as a sidecar or a shared deployment:

```yaml
# Credentials via ExternalSecret (AWS Secrets Manager)
# Never commit real credentials to pgbouncer/userlist.txt
# The placeholder SCRAM-SHA-256 hashes must be replaced with real hashes:

# 1. Generate hash from PostgreSQL:
psql -c "SELECT rolpassword FROM pg_authid WHERE rolname = 'edusphere';"

# 2. Or use pgbouncer's pg_shadow_show tool:
# See infrastructure/pgbouncer/userlist.txt header comments for instructions.
```

## Monitoring

PgBouncer exposes stats via its admin console and Prometheus:

```bash
# View pool statistics
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW STATS;"

# View current pools
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS;"

# View active clients
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW CLIENTS;"
```

Grafana dashboard includes PgBouncer metrics via the `pgbouncer_stats` user and
the `pgbouncer-exporter` Prometheus sidecar (port 9127).

## Security Notes

1. **SCRAM-SHA-256** authentication only — MD5 and trust are prohibited
2. **No plaintext credentials** — always use SCRAM hashes in `userlist.txt`
3. **TLS enabled** in production (`client_tls_sslmode = require`)
4. **Audit logging** — all connections and disconnections are logged
5. **Connection limits** — `max_client_conn = 1000` prevents connection exhaustion attacks
6. **Query timeout** — `query_timeout = 300` prevents runaway queries from blocking the pool
7. **Server lifetime** — `server_lifetime = 3600` forces reconnect for credential rotation support
8. **Host port isolation** — PgBouncer exposed on host port 6432, not 5432, to avoid conflict with direct PostgreSQL access

## RLS Compatibility Rules

Because PgBouncer uses transaction pooling, all RLS context MUST be set inside an
explicit transaction:

```typescript
// CORRECT — SET LOCAL inside BEGIN/COMMIT
await withTenantContext(tenantId, userId, role, async () => {
  return db.select().from(courses).where(eq(courses.tenantId, tenantId));
});

// WRONG — SET without transaction is not propagated to server connection
await db.execute(sql`SET app.current_tenant = ${tenantId}`);
```

The `withTenantContext()` helper in `packages/db/src/rls/withTenantContext.ts`
handles this automatically.
