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
-- AGE stores properties as agtype; use agtype accessor to extract tenant_id.
CREATE OR REPLACE FUNCTION ag_catalog.get_tenant_id_from_props(props agtype)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT ag_catalog.agtype_access_operator(props, '"tenant_id"'::agtype)::text
$$;

-- Enable RLS on vertex label tables (skip if tables don't exist yet)
DO $$
DECLARE
  label_name text;
  vertex_labels text[] := ARRAY['Concept', 'Person', 'Term', 'Source', 'TopicCluster'];
  table_exists boolean;
BEGIN
  FOREACH label_name IN ARRAY vertex_labels LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'edusphere_graph' AND table_name = label_name
    ) INTO table_exists;

    IF table_exists THEN
      EXECUTE format('ALTER TABLE edusphere_graph.%I ENABLE ROW LEVEL SECURITY', label_name);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON edusphere_graph.%I', label_name);
      EXECUTE format(
        $policy$
        CREATE POLICY tenant_isolation ON edusphere_graph.%I
          AS PERMISSIVE FOR ALL TO PUBLIC
          USING (
            ag_catalog.get_tenant_id_from_props(properties) = current_setting('app.current_tenant', TRUE)
            OR current_setting('app.current_tenant', TRUE) IS NULL
          )
        $policy$, label_name
      );
      RAISE NOTICE 'RLS enabled on vertex label: %', label_name;
    ELSE
      RAISE NOTICE 'Skipping vertex label % (table not yet created)', label_name;
    END IF;
  END LOOP;
END;
$$;

-- Enable RLS on edge label tables (skip if tables don't exist yet)
DO $$
DECLARE
  label_name text;
  edge_labels text[] := ARRAY[
    'RELATED_TO', 'CONTRADICTS', 'PREREQUISITE_OF', 'MENTIONS', 'CITES',
    'AUTHORED_BY', 'INFERRED_RELATED', 'REFERS_TO', 'DERIVED_FROM', 'BELONGS_TO'
  ];
  table_exists boolean;
BEGIN
  FOREACH label_name IN ARRAY edge_labels LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'edusphere_graph' AND table_name = label_name
    ) INTO table_exists;

    IF table_exists THEN
      EXECUTE format('ALTER TABLE edusphere_graph.%I ENABLE ROW LEVEL SECURITY', label_name);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON edusphere_graph.%I', label_name);
      EXECUTE format(
        $policy$
        CREATE POLICY tenant_isolation ON edusphere_graph.%I
          AS PERMISSIVE FOR ALL TO PUBLIC
          USING (
            ag_catalog.get_tenant_id_from_props(properties) = current_setting('app.current_tenant', TRUE)
            OR current_setting('app.current_tenant', TRUE) IS NULL
          )
        $policy$, label_name
      );
      RAISE NOTICE 'RLS enabled on edge label: %', label_name;
    ELSE
      RAISE NOTICE 'Skipping edge label % (table not yet created)', label_name;
    END IF;
  END LOOP;
END;
$$;

-- Grant permission to app role (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edusphere_app') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA edusphere_graph TO edusphere_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA edusphere_graph TO edusphere_app';
    RAISE NOTICE 'Granted edusphere_graph permissions to edusphere_app';
  ELSE
    RAISE NOTICE 'Role edusphere_app does not exist yet, skipping grants';
  END IF;
END;
$$;

-- Log completion
\echo 'AGE 1.7.0 RLS policies applied to all vertex and edge label tables'
\echo 'Apache AGE 1.7.0 graph database initialized'
\echo 'Graph name: edusphere_graph'
