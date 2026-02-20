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

-- ============================================================
-- Apache AGE 1.7.0 — Row-Level Security on Label Tables
-- ============================================================
-- AGE stores vertices in tables: edusphere_graph.{LabelName}
-- Each row has: id (graphid), properties (agtype)
-- We enable RLS and create USING policies that extract tenant_id
-- from the properties agtype value.

-- Helper: extract tenant_id string from agtype properties
-- AGE stores properties as agtype; we cast to jsonb for filtering.
CREATE OR REPLACE FUNCTION ag_catalog.get_tenant_id_from_props(props agtype)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT (props::jsonb ->> 'tenant_id')
$$;

-- Enable RLS on vertex label tables
DO $$
DECLARE
  label_name text;
  vertex_labels text[] := ARRAY['Concept', 'Person', 'Term', 'Source', 'TopicCluster'];
BEGIN
  FOREACH label_name IN ARRAY vertex_labels LOOP
    -- Enable RLS
    EXECUTE format(
      'ALTER TABLE edusphere_graph.%I ENABLE ROW LEVEL SECURITY',
      label_name
    );
    -- Drop existing policy if any (idempotent)
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON edusphere_graph.%I',
      label_name
    );
    -- Create tenant isolation policy
    EXECUTE format(
      $policy$
      CREATE POLICY tenant_isolation ON edusphere_graph.%I
        AS PERMISSIVE
        FOR ALL
        TO PUBLIC
        USING (
          ag_catalog.get_tenant_id_from_props(properties) = current_setting('app.current_tenant', TRUE)
          OR current_setting('app.current_tenant', TRUE) IS NULL
        )
      $policy$,
      label_name
    );
    RAISE NOTICE 'RLS enabled on vertex label: %', label_name;
  END LOOP;
END;
$$;

-- Enable RLS on edge label tables (edges also carry tenant_id for cross-tenant safety)
DO $$
DECLARE
  label_name text;
  edge_labels text[] := ARRAY[
    'RELATED_TO', 'CONTRADICTS', 'PREREQUISITE_OF', 'MENTIONS', 'CITES',
    'AUTHORED_BY', 'INFERRED_RELATED', 'REFERS_TO', 'DERIVED_FROM', 'BELONGS_TO'
  ];
BEGIN
  FOREACH label_name IN ARRAY edge_labels LOOP
    EXECUTE format(
      'ALTER TABLE edusphere_graph.%I ENABLE ROW LEVEL SECURITY',
      label_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON edusphere_graph.%I',
      label_name
    );
    EXECUTE format(
      $policy$
      CREATE POLICY tenant_isolation ON edusphere_graph.%I
        AS PERMISSIVE
        FOR ALL
        TO PUBLIC
        USING (
          ag_catalog.get_tenant_id_from_props(properties) = current_setting('app.current_tenant', TRUE)
          OR current_setting('app.current_tenant', TRUE) IS NULL
        )
      $policy$,
      label_name
    );
    RAISE NOTICE 'RLS enabled on edge label: %', label_name;
  END LOOP;
END;
$$;

-- Grant permission to app role
GRANT USAGE ON SCHEMA edusphere_graph TO edusphere_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA edusphere_graph TO edusphere_app;

-- Log completion
\echo 'AGE 1.7.0 RLS policies applied to all vertex and edge label tables'
\echo 'Apache AGE 1.7.0 graph database initialized'
\echo 'Graph name: edusphere_graph'
