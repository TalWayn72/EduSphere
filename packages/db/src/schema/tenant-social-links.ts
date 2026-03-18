/**
 * Tenant social media links — Phase 65 Social & Notification Integration.
 * Stores social media URLs per tenant for footer, header, and sharing.
 * RLS: authenticated users can read; ORG_ADMIN/SUPER_ADMIN can write.
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tenantSocialLinks = pgTable(
  'tenant_social_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    linkedinUrl: varchar('linkedin_url', { length: 512 }),
    facebookUrl: varchar('facebook_url', { length: 512 }),
    twitterUrl: varchar('twitter_url', { length: 512 }),
    youtubeUrl: varchar('youtube_url', { length: 512 }),
    instagramUrl: varchar('instagram_url', { length: 512 }),
    whatsappUrl: varchar('whatsapp_url', { length: 512 }),
    githubUrl: varchar('github_url', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('tenant_social_links_tenant_unique').on(t.tenantId),
    pgPolicy('tenant_social_links_read', {
      for: 'select',
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    pgPolicy('tenant_social_links_write', {
      for: 'all',
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type TenantSocialLink = typeof tenantSocialLinks.$inferSelect;
export type NewTenantSocialLink = typeof tenantSocialLinks.$inferInsert;
