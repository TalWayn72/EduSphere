-- Migration: add vtt_key column to transcripts
-- Used by the translation worker to store the MinIO key of the WebVTT subtitle file.
-- Nullable: existing transcripts retain null until VTT is generated.

ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS vtt_key TEXT;
