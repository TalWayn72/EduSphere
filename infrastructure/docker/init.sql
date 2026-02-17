-- ═══════════════════════════════════════════════════════════════
-- EduSphere Database Initialization Script
-- PostgreSQL 16 + Apache AGE + pgvector
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Apache AGE will be loaded via shared_preload_libraries
-- and initialized in age-setup.sql

-- Create application schema
CREATE SCHEMA IF NOT EXISTS edusphere;

-- Set default schema search path
ALTER DATABASE edusphere SET search_path TO edusphere, public, ag_catalog;

-- Grant privileges to edusphere user
GRANT ALL PRIVILEGES ON SCHEMA edusphere TO edusphere;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA edusphere TO edusphere;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA edusphere TO edusphere;

-- Enable Row-Level Security globally
ALTER DATABASE edusphere SET row_security = on;

-- Log completion
\echo '✅ Database initialization complete'
\echo '📦 Extensions enabled: uuid-ossp, pgcrypto, vector'
\echo '🔐 RLS enabled globally'
