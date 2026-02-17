import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// User role enum
export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
  'STUDENT',
  'RESEARCHER',
]);

// Users table with Row-Level Security
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('STUDENT'),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// RLS Policy: Users can only see users in their tenant
export const usersRLSPolicy = sql`
CREATE POLICY users_tenant_isolation_policy ON users
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
`;

// Indexes for performance
export const usersIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`;

// Type inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
