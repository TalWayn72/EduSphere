-- Migration 0016: Visual Anchoring & Asset Linking System (Phase 29)
-- Creates visual_assets, visual_anchors, document_versions tables with full RLS

-- ─── visual_assets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visual_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  course_id UUID NOT NULL,
  uploader_id UUID,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  -- MinIO key: {tenantId}/{courseId}/visual-assets/{uuid}-{sanitizedName}
  storage_key TEXT NOT NULL,
  -- MinIO key for WebP-converted version (NULL for GIF/SVG)
  webp_key TEXT,
  -- ClamAV scan lifecycle
  scan_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (scan_status IN ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'ERROR')),
  scan_verdict TEXT,  -- virus name if INFECTED
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visual_assets_tenant  ON visual_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_course  ON visual_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_scan    ON visual_assets(scan_status);
CREATE INDEX IF NOT EXISTS idx_visual_assets_uploader ON visual_assets(uploader_id);

ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visual_assets_tenant_isolation" ON visual_assets
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ─── visual_anchors ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visual_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  -- FK to media_assets (study document) — intentionally no FK constraint
  -- to avoid circular dependency with content subgraph
  media_asset_id UUID NOT NULL,
  created_by UUID,
  anchor_text TEXT NOT NULL,
  -- 64-char simhash of anchor_text for fuzzy version-sync
  anchor_hash VARCHAR(64) NOT NULL,
  -- PDF page number (NULL for HTML/Word docs)
  page_number INTEGER,
  -- Normalized coordinates (0.0–1.0) relative to document container
  pos_x NUMERIC(8, 6),
  pos_y NUMERIC(8, 6),
  pos_w NUMERIC(8, 6),
  pos_h NUMERIC(8, 6),
  -- Multi-page selection end position
  page_end INTEGER,
  pos_x_end NUMERIC(8, 6),
  pos_y_end NUMERIC(8, 6),
  -- Linked visual asset (NULL until instructor assigns)
  visual_asset_id UUID REFERENCES visual_assets(id) ON DELETE SET NULL,
  -- DOM document order for centermost tie-breaking
  document_order INTEGER NOT NULL DEFAULT 0,
  -- Flagged when anchor_text no longer found in updated document
  is_broken BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visual_anchors_tenant
  ON visual_anchors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visual_anchors_asset
  ON visual_anchors(media_asset_id);
-- Primary query: load all anchors for a document, ordered for centermost detection
CREATE INDEX IF NOT EXISTS idx_visual_anchors_asset_order
  ON visual_anchors(media_asset_id, document_order);
CREATE INDEX IF NOT EXISTS idx_visual_anchors_visual_asset
  ON visual_anchors(visual_asset_id);

-- FTS index for Hebrew + Latin anchor text search (Phase 5)
-- Requires pg_trgm and Hebrew text search config.
-- Run: CREATE TEXT SEARCH CONFIGURATION hebrew (COPY = pg_catalog.simple);
-- in your PostgreSQL instance if 'hebrew' config is not available.
-- Fallback: 'simple' also tokenizes Hebrew correctly (no stemming).
CREATE INDEX IF NOT EXISTS idx_visual_anchors_fts
  ON visual_anchors USING GIN (to_tsvector('hebrew', anchor_text));

ALTER TABLE visual_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visual_anchors_tenant_isolation" ON visual_anchors
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ─── document_versions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  media_asset_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID,
  -- Full snapshot of all anchors at this version
  anchors_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  diff_summary TEXT,
  -- IDs of broken anchors after version update
  broken_anchors JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- AI remapping suggestions keyed by broken anchor ID
  ai_suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique version per document
  UNIQUE (media_asset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_asset
  ON document_versions(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_tenant
  ON document_versions(tenant_id);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_versions_tenant_isolation" ON document_versions
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- Instructors can write versions; students read only
CREATE POLICY "document_versions_instructor_write" ON document_versions
  FOR INSERT
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND current_setting('app.current_user_role', TRUE)
      IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
  );
