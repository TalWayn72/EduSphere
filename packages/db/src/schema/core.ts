import { pgTable, text, uuid, jsonb, unique } from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';

// Users table
export const users = pgTable(
  'users',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    display_name: text('display_name').notNull(),
    role: text('role', {
      enum: ['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR', 'STUDENT', 'RESEARCHER'],
    })
      .notNull()
      .default('STUDENT'),
    avatar_url: text('avatar_url'),
    preferences: jsonb('preferences').notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (table) => ({
    email_tenant_unique: unique().on(table.email, table.tenant_id),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = User['role'];
