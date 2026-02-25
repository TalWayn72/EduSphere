import { pgTable, text, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { users } from './core';
import { media_assets } from './content';

export const annotations = pgTable(
  'annotations',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    asset_id: uuid('asset_id')
      .notNull()
      .references(() => media_assets.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    annotation_type: text('annotation_type', {
      enum: ['TEXT', 'SKETCH', 'LINK', 'BOOKMARK', 'SPATIAL_COMMENT'],
    }).notNull(),
    layer: text('layer', {
      enum: ['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED'],
    })
      .notNull()
      .default('PERSONAL'),
    content: jsonb('content').notNull(),
    spatial_data: jsonb('spatial_data'),
    parent_id: uuid('parent_id').references((): any => annotations.id, {
      onDelete: 'cascade',
    }),
    is_resolved: boolean('is_resolved').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('idx_annotations_tenant').on(t.tenant_id),
    index('idx_annotations_tenant_user').on(t.tenant_id, t.user_id),
    index('idx_annotations_tenant_date').on(t.tenant_id, t.created_at),
  ],
);

export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;
export type AnnotationLayer = Annotation['layer'];
export type AnnotationType = Annotation['annotation_type'];
