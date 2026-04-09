-- Migration 0047: Add chunk_text column to knowledge_source_chunk_embeddings
-- Stores the actual text of each embedded chunk so search results can return
-- real content to the LLM instead of a source title placeholder.

ALTER TABLE knowledge_source_chunk_embeddings
  ADD COLUMN IF NOT EXISTS chunk_text TEXT NOT NULL DEFAULT '';
