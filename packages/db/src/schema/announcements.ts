/**
 * Announcements — admin-managed platform-wide messages shown to users.
 * RLS: admin can write, all tenant users can read active announcements.
 */
import { pgTable, uuid, text, varchar, boolean, timestamp, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    priority: varchar('priority', { length: 20 }).notNull().default('INFO'),
    targetAudience: varchar('target_audience', { length: 20 }).notNull().default('ALL'),
    isActive: boolean('is_active').notNull().default(false),
    publishAt: timestamp('publish_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata'),
  },
  (table) => [
    pgPolicy('announcements_rls', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
    }),
  ],
).enableRLS();

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
