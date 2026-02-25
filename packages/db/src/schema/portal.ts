/**
 * Portal pages table — F-037 No-Code Custom Portal Builder
 * RLS:
 *   - Admins (ORG_ADMIN, SUPER_ADMIN) can read and write within their tenant
 *   - All authenticated users can read published portal pages
 *   - Write restricted to ORG_ADMIN / SUPER_ADMIN only
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const portalPages = pgTable(
  'portal_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().unique(), // one portal per tenant
    slug: text('slug').notNull().default('home'),
    title: text('title').notNull().default('Learning Portal'),
    layout: jsonb('layout').notNull().default('[]'), // PortalBlock[] JSON array
    published: boolean('published').notNull().default(false),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('portal_pages_tenant_idx').on(t.tenantId),
    pgPolicy('portal_pages_admin_rls', {
      as: 'permissive',
      for: 'all',
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
    }),
    pgPolicy('portal_pages_read_published_rls', {
      as: 'permissive',
      for: 'select',
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND published = TRUE
      `,
    }),
  ],
).enableRLS();

export type PortalPage = typeof portalPages.$inferSelect;
export type NewPortalPage = typeof portalPages.$inferInsert;

// ── TypeScript block shape (stored in layout jsonb column) ───────────────────

export const ALLOWED_BLOCK_TYPES = [
  'HeroBanner',
  'FeaturedCourses',
  'StatWidget',
  'TextBlock',
  'ImageBlock',
  'CTAButton',
] as const;

export type BlockType = (typeof ALLOWED_BLOCK_TYPES)[number];

export interface PortalBlock {
  id: string; // unique UUID
  type: BlockType;
  order: number;
  config: {
    // HeroBanner:       { title, subtitle, backgroundUrl, ctaText, ctaLink }
    // FeaturedCourses:  { title, courseIds, maxCount }
    // StatWidget:       { metrics: ['completions', 'learners', 'courses'] }
    // TextBlock:        { content, alignment: 'left' | 'center' | 'right' }
    // ImageBlock:       { imageUrl, alt, width: 'full' | 'half' }
    // CTAButton:        { text, link, variant: 'primary' | 'secondary' }
    [key: string]: unknown;
  };
}
