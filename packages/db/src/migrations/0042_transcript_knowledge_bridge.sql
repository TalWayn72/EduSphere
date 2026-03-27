-- Migration 0042: Add transcript_id FK to knowledge_sources table
-- Bridges transcription pipeline output to the RAG knowledge source system.
-- A completed transcript can be automatically promoted to a KnowledgeSource
-- for embedding and semantic search.

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. Add nullable transcript_id column with FK to transcripts
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. Partial index — only index rows that actually have a transcript link
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_transcript
  ON knowledge_sources(transcript_id)
  WHERE transcript_id IS NOT NULL;
