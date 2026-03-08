import {
  pgTable,
  uuid,
  text,
  timestamp,
  json,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const pushPlatformEnum = pgEnum('push_platform', ['web', 'ios', 'android']);

export const pushNotificationTokens = pgTable('push_notification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  token: text('token').notNull(),
  platform: pushPlatformEnum('platform').notNull(),
  expoPushToken: text('expo_push_token'),
  webPushSubscription: json('web_push_subscription'),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const pushNotificationTokensRLS = sql`
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_user_isolation" ON push_notification_tokens
  USING (user_id::text = current_setting('app.current_user_id', TRUE));
`;

export const pushNotificationTokensIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON push_notification_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_unique
  ON push_notification_tokens(user_id, token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform
  ON push_notification_tokens(user_id, platform);
`;

export type PushNotificationToken = typeof pushNotificationTokens.$inferSelect;
export type NewPushNotificationToken = typeof pushNotificationTokens.$inferInsert;
