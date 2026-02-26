/**
 * SCIM 2.0 schema — F-019 HRIS Auto-Enrollment
 * scim_tokens: API tokens for HRIS systems (Workday, BambooHR, ADP)
 * scim_sync_log: audit trail of SCIM provisioning operations
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

export const scimOperationEnum = pgEnum('scim_operation', [
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'SYNC_GROUP',
]);

export const scimStatusEnum = pgEnum('scim_status', ['SUCCESS', 'FAILED']);

/**
 * scim_tokens — stores hashed bearer tokens for HRIS system authentication.
 * The raw token is NEVER stored; only SHA-256 hash is persisted.
 */
export const scimTokens = pgTable('scim_tokens', {
  id: pk(),
  tenantId: tenantId(),
  tokenHash: text('token_hash').notNull().unique(),
  description: text('description').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * scim_sync_log — append-only audit log of all SCIM operations.
 * Satisfies SOC2 CC7.2 audit trail requirements.
 */
export const scimSyncLog = pgTable('scim_sync_log', {
  id: pk(),
  tenantId: tenantId(),
  operation: scimOperationEnum('operation').notNull(),
  externalId: text('external_id'),
  status: scimStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  affectedUserId: uuid('affected_user_id'),
  syncData: jsonb('sync_data'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scimTokensRLS = sql`
ALTER TABLE scim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY scim_tokens_tenant_isolation ON scim_tokens
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const scimSyncLogRLS = sql`
ALTER TABLE scim_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY scim_sync_log_tenant_isolation ON scim_sync_log
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const scimIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_scim_tokens_tenant ON scim_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scim_tokens_hash ON scim_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_scim_sync_log_tenant ON scim_sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scim_sync_log_created ON scim_sync_log(created_at DESC);
`;

export type ScimToken = typeof scimTokens.$inferSelect;
export type NewScimToken = typeof scimTokens.$inferInsert;
export type ScimSyncLog = typeof scimSyncLog.$inferSelect;
export type NewScimSyncLog = typeof scimSyncLog.$inferInsert;
