import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { pk, timestamps } from './_shared';

export const tenants = pgTable('tenants', {
  id: pk(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan', { enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] })
    .notNull()
    .default('FREE'),
  settings: jsonb('settings').notNull().default({}),
  subscription_expires_at: timestamp('subscription_expires_at', { withTimezone: true }),
  ...timestamps,
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
