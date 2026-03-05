/**
 * Notification templates per tenant (F-112 Email Templates).
 * Each tenant gets a copy of the platform defaults seeded on first access.
 * Unique constraint on (tenant_id, key) ensures one template per type per tenant.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    bodyHtml: text('body_html').notNull(),
    /** Array of variable placeholder names, e.g. ["user.name", "course.title"] */
    variables: jsonb('variables').notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantKeyIdx: uniqueIndex('notification_templates_tenant_key_idx').on(
      t.tenantId,
      t.key
    ),
  })
);

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
