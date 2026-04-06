-- Migration 0046: Knowledge Source Chunk Embeddings
-- Creates a dedicated pgvector table for knowledge source text chunks.
-- Decoupled from transcript_segments so any source type (URL, PDF, TEXT, etc.)
-- can store embeddings without requiring a transcript pipeline entry.

CREATE TABLE IF NOT EXISTS knowledge_source_chunk_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   UUID    NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  embedding   vector(768) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, chunk_index)
);

-- HNSW index for cosine similarity search (same params as other embedding tables)
CREATE INDEX IF NOT EXISTS idx_ks_chunk_embeddings_hnsw
  ON knowledge_source_chunk_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128);

-- Index for fast per-source lookup (used during reindex / deletion)
CREATE INDEX IF NOT EXISTS idx_ks_chunk_embeddings_source_id
  ON knowledge_source_chunk_embeddings (source_id);
