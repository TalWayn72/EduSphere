// Shared schema helpers for Drizzle ORM
import { uuid, timestamp } from 'drizzle-orm/pg-core';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

// Primary key helper
export const pk = () => uuid('id').primaryKey().defaultRandom();

// Tenant ID foreign key helper
export const tenantId = () => uuid('tenant_id').notNull();

// Timestamps helper (created_at, updated_at)
export const timestamps = {
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

// Soft delete helper (deleted_at)
export const softDelete = {
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
};
