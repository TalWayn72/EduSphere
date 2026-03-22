/**
 * Org Invitations — FEAT-ORG-ONBOARDING Phase 1
 * Email-based user invitation system with role assignment and expiry.
 *
 * RLS: tenant-scoped via `tenant_id`
 * SI-1: uses app.current_tenant (NOT app.current_user)
 * SI-3: invited_email should use encryptField() at service layer
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

export const orgInvitations = pgTable(
  'org_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    invitedEmail: varchar('invited_email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('STUDENT'),
    /** Unique token for invitation acceptance link */
    token: varchar('token', { length: 128 }).notNull().unique(),
    /** PENDING | ACCEPTED | EXPIRED | REVOKED */
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    invitedBy: uuid('invited_by').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Optional message from inviter */
    message: text('message'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_org_invitations_tenant').on(t.tenantId),
    index('idx_org_invitations_email').on(t.invitedEmail),
    index('idx_org_invitations_status').on(t.status),
    uniqueIndex('idx_org_invitations_token').on(t.token),
    pgPolicy('org_invitations_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type OrgInvitation = typeof orgInvitations.$inferSelect;
export type NewOrgInvitation = typeof orgInvitations.$inferInsert;
