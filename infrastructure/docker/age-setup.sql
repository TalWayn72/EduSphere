-- ═══════════════════════════════════════════════════════════════
-- Apache AGE Graph Database Setup
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

-- Log completion
\echo '✅ Apache AGE graph database initialized'
\echo '📊 Graph name: edusphere_graph'
