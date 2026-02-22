# PostgreSQL Read Replicas & CDN Setup Guide

**Target:** EduSphere — 100,000+ concurrent users
**PostgreSQL:** 16 (streaming replication)
**Last Updated:** February 2026

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │         Application Layer        │
                        │   NestJS Subgraphs (6 services)  │
                        └────────────┬──────┬─────────────┘
                                     │      │
                        WRITES ◄─────┘      └─────► READS
                             │                        │
                   ┌─────────▼──────┐     ┌──────────▼──────────┐
                   │  PRIMARY (RW)  │     │  readReplica helper  │
                   │ postgres:5432  │     │ REPLICA_DATABASE_URL │
                   └─────────┬──────┘     └──────────┬──────────┘
                             │                        │
                   WAL Stream│                        │ Queries
                   (async)   │              ┌─────────┴──────────┐
                             │              │                    │
                   ┌─────────▼──────┐  ┌───▼────────┐  ┌───────▼────┐
                   │  WAL Archiver  │  │ Replica-1  │  │ Replica-2  │
                   │  (pg_wal/)     │  │ (port 5432)│  │ (port 5432)│
                   └────────────────┘  │ hot_standby│  │ hot_standby│
                                       │    = on    │  │    = on    │
                                       └────────────┘  └────────────┘
```

**Replication type:** Synchronous-optional streaming replication (asynchronous by default; set `synchronous_standby_names` for zero data-loss on writes).

---

## Why Read Replicas

| Driver | Detail |
|--------|--------|
| **Scale** | 100k concurrent users generate a read-heavy workload (GraphQL queries, embeddings, graph traversals). Read replicas absorb 70–80% of SELECT traffic. |
| **Analytics isolation** | LLM/RAG pipeline queries (pgvector HNSW scans, Apache AGE Cypher traversals) can take seconds. Running them on a replica prevents starvation on the primary write path. |
| **HA / Failover** | Replicas are pre-warmed standbys — promotion to primary takes seconds via `pg_ctl promote`. |
| **Compliance** | Read replicas provide a point-in-time consistent view for GDPR audit reports without impacting production traffic. |

---

## Setup Steps

### 1. Configure the Primary

Add to `/etc/postgresql/16/main/postgresql.conf` on the primary server:

```conf
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB
```

Create the replication role:

```sql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '<strong-secret>';
```

Ensure `pg_hba.conf` allows replication connections from replica subnet (see `infrastructure/postgres/pg_hba.conf`):

```
host  replication  replicator  10.0.1.0/24  scram-sha-256
```

Reload config: `pg_ctl reload` or `SELECT pg_reload_conf();`

### 2. Take a Base Backup (Bootstrap Replica)

Run from the replica server (or a dedicated backup host):

```bash
pg_basebackup \
  --host=postgres-primary \
  --port=5432 \
  --username=replicator \
  --pgdata=/var/lib/postgresql/16/main \
  --wal-method=stream \
  --checkpoint=fast \
  --progress \
  --verbose
```

### 3. Configure the Replica

Copy `infrastructure/postgres/postgresql-replica.conf` to the replica's `postgresql.conf` (or include it via `include_if_exists`).

Edit `primary_conninfo` with the actual primary host and password:

```conf
primary_conninfo = 'host=postgres-primary port=5432 user=replicator password=<secret> sslmode=require'
```

Create the standby signal file:

```bash
touch /var/lib/postgresql/16/main/standby.signal
```

### 4. Start the Replica

```bash
pg_ctl start -D /var/lib/postgresql/16/main
```

Verify hot standby is active:

```sql
SELECT pg_is_in_recovery();
-- Returns: t
```

---

## Application Connection Strings

| Pool | Environment Variable | Direction |
|------|---------------------|-----------|
| Primary (write) | `DATABASE_URL` | All INSERT/UPDATE/DELETE |
| Replica (read) | `REPLICA_DATABASE_URL` | SELECT-only queries |

Example `.env`:

```env
DATABASE_URL=postgresql://edusphere_app:<secret>@postgres-primary:5432/edusphere_db?sslmode=require
REPLICA_DATABASE_URL=postgresql://edusphere_app:<secret>@postgres-replica-1:5432/edusphere_db?sslmode=require
```

Usage in code (`packages/db/src/helpers/readReplica.ts`):

```typescript
import { withReadReplica } from '@edusphere/db/helpers/readReplica';

// Read query routed to replica (or primary fallback if REPLICA_DATABASE_URL unset)
const courses = await withReadReplica((db) =>
  db.select().from(schema.courses).where(eq(schema.courses.tenantId, tenantId))
);
```

---

## CDN: Static Asset Caching

### CloudFront (AWS)

| Rule | Path Pattern | TTL | Cache Behavior |
|------|-------------|-----|----------------|
| Vite assets | `/assets/*` | 31536000s (1 year) | Cache + forward headers |
| index.html | `/*` | 0s | No cache (pass-through) |
| GraphQL | `/graphql*` | 0s | No cache, pass-through |

**CloudFront Cache-Control forwarding:**
- Origin (`Nginx`) sets `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`.
- CloudFront respects origin headers — no separate TTL override needed.

**Invalidation on deploy:**

```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/index.html" "/*.html"
# /assets/* never needs invalidation — Vite content-hashes every filename.
```

### Cloudflare (alternative)

Create a Page Rule:
- URL: `https://app.edusphere.com/assets/*`
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month

```toml
# wrangler.toml cache rule
[[rules]]
  description = "Cache Vite assets for 1 year"
  expression = '(http.request.uri.path matches "^/assets/")'
  action = "set_cache_settings"
  [rules.action_parameters.cache]
    eligible_for_cache = true
    ttl.browser = 31536000
    ttl.edge = 2592000  # 30 days at edge; browser gets 1 year via header
```

### Nginx Configuration

See `infrastructure/nginx/nginx.conf` for the full Nginx config including:
- `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`
- `/graphql` → `Cache-Control: no-store` + WebSocket upgrade
- `/*` → SPA fallback to `index.html`

---

## Monitoring Replication Lag

Run on the **primary** to check all connected standbys:

```sql
SELECT
  application_name,
  client_addr,
  state,
  sync_state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  (sent_lsn - replay_lsn) AS replication_lag_bytes,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication
ORDER BY replay_lag DESC;
```

**Alert threshold:** `replay_lag > 30s` or `replication_lag_bytes > 512MB` → PagerDuty alert.

Prometheus metric (via `postgres_exporter`):

```yaml
# prometheus.yml scrape config
- job_name: postgres_replication
  metrics_path: /metrics
  static_configs:
    - targets: ['postgres-exporter:9187']
  metric_relabel_configs:
    - source_labels: [__name__]
      regex: pg_stat_replication.*
      action: keep
```

---

## Failover Procedure

Follow this procedure when the primary becomes unavailable.

### Automatic Failover (Patroni — recommended for production)

If Patroni is configured, it handles leader election and promotion automatically. Verify with:

```bash
patronictl -c /etc/patroni/config.yml list
```

### Manual Failover

**Step 1 — Confirm primary is down:**

```bash
pg_ctl status -D /var/lib/postgresql/16/main   # on primary — must be stopped
```

**Step 2 — Identify the most up-to-date replica:**

```sql
-- Run on each replica; highest LSN wins
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), pg_is_in_recovery();
```

**Step 3 — Promote the chosen replica to primary:**

```bash
pg_ctl promote -D /var/lib/postgresql/16/main
# PostgreSQL will write a recovery completion record and exit recovery mode.
```

Verify promotion:

```sql
SELECT pg_is_in_recovery();
-- Returns: f  (now primary)
```

**Step 4 — Update connection strings:**

Update `DATABASE_URL` in all subgraph `.env` files (or K8s ConfigMap) to point to the new primary. Restart subgraphs to pick up the new connection.

**Step 5 — Re-attach remaining replicas:**

Remaining replicas must be repointed to the new primary. Edit `primary_conninfo` on each remaining replica and reload:

```bash
pg_ctl reload -D /var/lib/postgresql/16/main
```

**Step 6 — Restore old primary as new replica (after it recovers):**

Run `pg_basebackup` from the new primary, configure `standby.signal`, and start.

**RTO target:** < 60 seconds with Patroni automatic failover.
**RPO target:** < 30 seconds of data loss with `hot_standby_feedback = on` and replication lag monitoring.

---

## References

- `infrastructure/postgres/postgresql-replica.conf` — Replica PostgreSQL config
- `infrastructure/postgres/pg_hba.conf` — HBA authentication rules
- `infrastructure/nginx/nginx.conf` — Nginx CDN/proxy config
- `packages/db/src/helpers/readReplica.ts` — Application read/write split helper
- `tests/security/read-replica.spec.ts` — Static security validation tests
