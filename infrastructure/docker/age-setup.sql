-- ═══════════════════════════════════════════════════════════════
-- Apache AGE 1.7.0 Graph Database Setup
-- New in 1.7.0: RLS support on label tables, faster ID index scans
-- ═══════════════════════════════════════════════════════════════

-- Load Apache AGE extension
CREATE EXTENSION IF NOT EXISTS age;

-- Set search path to include ag_catalog
SET search_path = ag_catalog, edusphere, public;

-- Create the graph
SELECT create_graph('edusphere_graph');

-- Grant access to edusphere user
GRANT USAGE ON SCHEMA ag_catalog TO edusphere;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ag_catalog TO edusphere;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ag_catalog TO edusphere;

-- ── AGE 1.7.0: Future-proof RLS on graph label tables ────────────────────
-- NOTE: Multi-tenancy for Cypher queries is enforced at the application
-- layer via SET LOCAL app.current_tenant = '<uuid>' before each query
-- (see packages/db/src/graph-helpers.ts withTenantContext wrapper).
-- AGE 1.7.0 added RLS support on vertex/edge label tables for future
-- database-level tenant isolation. Enable when per-tenant graph isolation
-- is required at the database layer (Phase 7 hardening).
-- ─────────────────────────────────────────────────────────────────────────

-- Log completion
\echo '✅ Apache AGE 1.7.0 graph database initialized'
\echo '📊 Graph name: edusphere_graph'
\echo '🔒 RLS-ready: AGE 1.7.0 label table RLS support available'
