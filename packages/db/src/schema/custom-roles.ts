/**
 * Custom roles + sub-admin delegation (F-113).
 * Allows ORG_ADMIN to define custom roles with granular permissions
 * and delegate them to regular users within a tenant.
 */
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

// ── custom_roles ─────────────────────────────────────────────────────────────

export const customRoles = pgTable('custom_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  /** Array of permission keys e.g. ["courses:view","users:view"] stored as text[] */
  permissions: text('permissions').array().notNull().default([]),
  isSystem: boolean('is_system').notNull().default(false),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CustomRole = typeof customRoles.$inferSelect;
export type NewCustomRole = typeof customRoles.$inferInsert;

// ── user_role_delegations ─────────────────────────────────────────────────────

export const userRoleDelegations = pgTable('user_role_delegations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').notNull(),
  delegatedBy: uuid('delegated_by').notNull(),
  /** Optional expiry — null means indefinite */
  validUntil: timestamp('valid_until', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserRoleDelegation = typeof userRoleDelegations.$inferSelect;
export type NewUserRoleDelegation = typeof userRoleDelegations.$inferInsert;
