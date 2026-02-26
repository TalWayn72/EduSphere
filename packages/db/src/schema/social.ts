/**
 * Social following tables — F-035 Social Following System
 * RLS: users see own follows + public profiles within same tenant.
 */
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id').notNull(),
    followingId: uuid('following_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_follows_unique').on(t.followerId, t.followingId),
    index('user_follows_follower_idx').on(t.followerId),
    index('user_follows_following_idx').on(t.followingId),
    pgPolicy('user_follows_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          follower_id::text = current_setting('app.current_user_id', TRUE)
          OR following_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
        )
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;
