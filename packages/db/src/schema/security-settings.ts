/**
 * Security settings per tenant — MFA policy, session timeout, IP allowlist, etc.
 */
import { pgTable, uuid, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const securitySettings = pgTable('security_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().unique(),
  mfaRequired: boolean('mfa_required').notNull().default(false),
  mfaRequiredForAdmins: boolean('mfa_required_for_admins').notNull().default(true),
  sessionTimeoutMinutes: integer('session_timeout_minutes').notNull().default(480),
  maxConcurrentSessions: integer('max_concurrent_sessions').notNull().default(5),
  loginAttemptLockoutThreshold: integer('login_attempt_lockout_threshold').notNull().default(5),
  passwordMinLength: integer('password_min_length').notNull().default(8),
  passwordRequireSpecialChars: boolean('password_require_special_chars').notNull().default(false),
  passwordExpiryDays: integer('password_expiry_days'),
  ipAllowlist: jsonb('ip_allowlist'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SecuritySettings = typeof securitySettings.$inferSelect;
export type NewSecuritySettings = typeof securitySettings.$inferInsert;
