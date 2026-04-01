/**
 * Notification delivery log — Phase 65 Social & Notification Integration.
 * Tracks every notification dispatch across all channels with delivery status.
 * RLS: users see own deliveries; ORG_ADMIN/SUPER_ADMIN see tenant-wide.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  pgEnum,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notificationChannelEnum = pgEnum('notification_channel', [
  'push_web',
  'push_mobile',
  'email',
  'whatsapp',
  'in_app',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    notificationType: text('notification_type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    payload: jsonb('payload'),
    templateKey: text('template_key'),
    status: deliveryStatusEnum('status').notNull().default('pending'),
    externalId: text('external_id'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_notif_deliveries_user_created').on(
      t.tenantId,
      t.userId,
      t.createdAt
    ),
    index('idx_notif_deliveries_retry').on(t.status, t.nextRetryAt),
    index('idx_notif_deliveries_channel_status').on(t.channel, t.status),
    pgPolicy('notification_deliveries_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          user_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
        )
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
