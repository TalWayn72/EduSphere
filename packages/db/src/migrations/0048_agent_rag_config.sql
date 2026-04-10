-- Migration 0048: Add rag_config column to agent_definitions
-- The Drizzle schema includes rag_config but the base migration (0000) did not.

ALTER TABLE "agent_definitions"
  ADD COLUMN IF NOT EXISTS "rag_config" jsonb NOT NULL DEFAULT '{"vectorWeight":0.5,"graphWeight":0.5}'::jsonb;
