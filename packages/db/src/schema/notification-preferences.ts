/**
 * Notification preferences — Phase 65 Social & Notification Integration.
 * Per-user channel opt-in/out + tenant-level defaults.
 * RLS: users manage own preferences; ORG_ADMIN/SUPER_ADMIN manage tenant defaults.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { notificationChannelEnum } from './notification-deliveries';

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    notificationType: text('notification_type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('notif_pref_user_type_channel').on(
      t.userId,
      t.notificationType,
      t.channel
    ),
    index('notif_pref_tenant_user').on(t.tenantId, t.userId),
    pgPolicy('notification_preferences_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND user_id::text = current_setting('app.current_user_id', TRUE)
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND user_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
  ]
).enableRLS();

export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;

export const tenantNotificationDefaults = pgTable(
  'tenant_notification_defaults',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    notificationType: text('notification_type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    /** Mandatory notifications (e.g. compliance) cannot be disabled by users */
    mandatory: boolean('mandatory').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('tenant_notif_defaults_unique').on(
      t.tenantId,
      t.notificationType,
      t.channel
    ),
    pgPolicy('tenant_notification_defaults_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type TenantNotificationDefault =
  typeof tenantNotificationDefaults.$inferSelect;
export type NewTenantNotificationDefault =
  typeof tenantNotificationDefaults.$inferInsert;
