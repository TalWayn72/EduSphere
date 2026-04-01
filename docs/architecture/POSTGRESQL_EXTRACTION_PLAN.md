# PostgreSQL Extraction Plan

> **Purpose:** Define when and how to extract from monolithic PostgreSQL to per-service databases.
> This is a **planning document** — no extraction happens until trigger conditions are met.

---

## Current Architecture

- Single PostgreSQL 16 instance with extensions: `uuid-ossp`, `pgcrypto`, `age`, `vector`
- 32+ tables across 6 subgraph domains
- All subgraphs share one `DATABASE_URL`
- PgBouncer in transaction mode for connection pooling
- Apache AGE requires direct connections (bypasses PgBouncer)

## Trigger Conditions

Extraction should begin when ANY of these conditions are met:

| #   | Trigger               | Metric                                    | Current | Threshold          |
| --- | --------------------- | ----------------------------------------- | ------- | ------------------ |
| 1   | Connection exhaustion | Active connections                        | ~50     | > 200 sustained    |
| 2   | Write contention      | Lock wait time (p95)                      | ~5ms    | > 50ms             |
| 3   | Storage growth        | Database size                             | ~2GB    | > 500GB            |
| 4   | Query latency         | p95 query time                            | ~20ms   | > 200ms            |
| 5   | Deployment coupling   | Schema migrations block unrelated deploys | No      | Yes (3+ incidents) |
| 6   | Concurrent users      | Sustained concurrent connections          | ~100    | > 50,000           |

**Monitoring:** Track via `pg_stat_activity`, `pg_stat_statements`, `pg_locks`, Grafana dashboard.

## Extraction Order (Priority)

### Phase 1: Extract `subgraph-agent` (Highest Independence)

**Why first:** Agent service has the most independent data model (executions, messages, agent_definitions).
Only shares `users` via Federation entity resolution.

**Tables to extract:**

- `agent_definitions`, `agent_executions`, `agent_messages`, `agent_sessions`
- `xapi_statements` (if tightly coupled to agent workflows)

**Migration steps:**

1. Create new PostgreSQL instance for agent service
2. Dual-write: existing code writes to both old and new DB (feature flag)
3. Backfill: copy historical data to new instance
4. Switch reads to new instance (feature flag)
5. Stop writes to old instance
6. Drop old tables (after 30-day verification period)

### Phase 2: Extract `subgraph-knowledge` (AGE Dependency)

**Why second:** Knowledge graph uses Apache AGE which requires direct connections.
Extracting this removes the PgBouncer bypass complexity.

**Tables to extract:**

- `content_embeddings`, `annotation_embeddings`, `concept_embeddings`
- Apache AGE graph (`edusphere_graph`)

**Special considerations:**

- New instance needs AGE extension installed
- pgvector HNSW indexes must be recreated
- Graph initialization script must run on new instance

### Phase 3: Extract `subgraph-content` (Largest Domain)

**Why third:** Content has the most tables (courses, modules, content_items, files, etc.)
but also the most cross-references. Extract after Phase 1+2 reduce blast radius.

### Phase 4: Keep Core + Annotation + Collaboration Together

These three subgraphs share enough data (users, tenants, organizations) that extracting
them individually may not be worth the complexity. Re-evaluate at 100K+ users.

## Connection Budget Model

See [CONNECTION_BUDGET.md](CONNECTION_BUDGET.md) for the full model.

## Rollback Strategy

Each extraction phase has a 30-day rollback window:

1. Old tables are NOT dropped for 30 days after cutover
2. Dual-write can be re-enabled via feature flag
3. Reads can switch back to old instance immediately
4. Data reconciliation script verifies no writes were lost

## Decision Record

| Date       | Decision                          | Rationale                                 |
| ---------- | --------------------------------- | ----------------------------------------- |
| 2026-03-17 | Document plan, do not extract yet | All trigger metrics well below thresholds |

---

_Last updated: March 2026 — Enterprise Audit Wave 7_
