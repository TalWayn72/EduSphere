import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const tenantThemes = pgTable('tenant_themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull().default('Default'),
  isActive: boolean('is_active').notNull().default(true),
  primitives: jsonb('primitives')
    .notNull()
    .$type<Record<string, string>>()
    .default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TenantTheme = typeof tenantThemes.$inferSelect;
export type NewTenantTheme = typeof tenantThemes.$inferInsert;
