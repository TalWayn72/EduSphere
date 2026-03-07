import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  integer,
  bigint,
  varchar,
  numeric,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { users } from './core';
import { courses } from './content';

// ─── Visual Assets ────────────────────────────────────────────────────────────
// Uploaded images that instructors attach to text anchors.
// Stored in MinIO per-course bucket with ClamAV scan tracking.
export const visualAssets = pgTable(
  'visual_assets',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    course_id: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    uploader_id: uuid('uploader_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    filename: text('filename').notNull(),
    original_name: text('original_name').notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    // MinIO object key: {tenantId}/{courseId}/visual-assets/{uuid}-{sanitizedName}
    storage_key: text('storage_key').notNull(),
    // MinIO key for auto-converted WebP version (null for GIF/SVG)
    webp_key: text('webp_key'),
    // ClamAV scan lifecycle: PENDING → SCANNING → CLEAN | INFECTED | ERROR
    scan_status: text('scan_status', {
      enum: ['PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'ERROR'],
    })
      .notNull()
      .default('PENDING'),
    // ClamAV verdict string (virus name) when INFECTED
    scan_verdict: text('scan_verdict'),
    // {width, height, format, alt_text}
    metadata: jsonb('metadata').notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('idx_visual_assets_tenant').on(t.tenant_id),
    index('idx_visual_assets_course').on(t.course_id),
    index('idx_visual_assets_scan').on(t.scan_status),
    index('idx_visual_assets_uploader').on(t.uploader_id),
  ]
);

export type VisualAsset = typeof visualAssets.$inferSelect;
export type NewVisualAsset = typeof visualAssets.$inferInsert;
export type ScanStatus = VisualAsset['scan_status'];

// ─── Visual Anchors ───────────────────────────────────────────────────────────
// Semantic text anchors created by instructors in study documents.
// Each anchor binds a text passage → one visual asset (one-to-one MVP).
export const visualAnchors = pgTable(
  'visual_anchors',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    // The media_asset this anchor belongs to (the study document)
    media_asset_id: uuid('media_asset_id').notNull(),
    created_by: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Semantic text content selected by instructor
    anchor_text: text('anchor_text').notNull(),
    // Simhash fingerprint of anchor_text for fuzzy version-sync matching
    anchor_hash: varchar('anchor_hash', { length: 64 }).notNull(),
    // PDF page where anchor starts (null for HTML/Word docs)
    page_number: integer('page_number'),
    // Normalized coordinates (0–1 relative to container) for start position
    pos_x: numeric('pos_x', { precision: 8, scale: 6 }),
    pos_y: numeric('pos_y', { precision: 8, scale: 6 }),
    pos_w: numeric('pos_w', { precision: 8, scale: 6 }),
    pos_h: numeric('pos_h', { precision: 8, scale: 6 }),
    // Multi-page selection: end page + end coordinates
    page_end: integer('page_end'),
    pos_x_end: numeric('pos_x_end', { precision: 8, scale: 6 }),
    pos_y_end: numeric('pos_y_end', { precision: 8, scale: 6 }),
    // Assigned visual asset (null until instructor assigns image)
    visual_asset_id: uuid('visual_asset_id').references(
      () => visualAssets.id,
      { onDelete: 'set null' }
    ),
    // DOM document order (0-based) — used for tie-breaking centermost detection
    document_order: integer('document_order').notNull().default(0),
    // Set to true by sync tool when anchor_text no longer matches document content
    is_broken: boolean('is_broken').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('idx_visual_anchors_tenant').on(t.tenant_id),
    index('idx_visual_anchors_asset').on(t.media_asset_id),
    // Composite for the most common query: load all anchors for an asset sorted by order
    index('idx_visual_anchors_asset_order').on(
      t.media_asset_id,
      t.document_order
    ),
    index('idx_visual_anchors_visual_asset').on(t.visual_asset_id),
  ]
);

export type VisualAnchor = typeof visualAnchors.$inferSelect;
export type NewVisualAnchor = typeof visualAnchors.$inferInsert;

// ─── Document Versions ────────────────────────────────────────────────────────
// Snapshot history for study documents — tracks anchor state at each version.
// Enables rollback, DIFF display, and AI broken-anchor re-mapping.
export const documentVersions = pgTable(
  'document_versions',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    // The media_asset (study document) this version belongs to
    media_asset_id: uuid('media_asset_id').notNull(),
    version_number: integer('version_number').notNull(),
    created_by: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Full snapshot of all anchors at this version point
    anchors_snapshot: jsonb('anchors_snapshot').notNull().default([]),
    // Human-readable summary of what changed vs previous version
    diff_summary: text('diff_summary'),
    // IDs of anchors flagged as broken after version update
    broken_anchors: jsonb('broken_anchors').notNull().default([]),
    // AI-generated remapping suggestions keyed by broken anchor ID
    ai_suggestions: jsonb('ai_suggestions'),
    ...timestamps,
  },
  (t) => [
    index('idx_document_versions_asset').on(t.media_asset_id),
    index('idx_document_versions_tenant').on(t.tenant_id),
    unique('uq_document_versions_asset_version').on(
      t.media_asset_id,
      t.version_number
    ),
  ]
);

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
