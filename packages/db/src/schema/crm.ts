/**
 * CRM Integration schema — F-033 CRM Integration / Salesforce
 * crm_connections: OAuth 2.0 token storage (encrypted) per tenant
 * crm_sync_log: audit trail of CRM sync operations
 * SI-3: accessToken and refreshToken stored AES-256-GCM encrypted.
 */
import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

export const crmConnections = pgTable('crm_connections', {
  id: pk(),
  tenantId: tenantId().unique(),          // one connection per tenant
  provider: text('provider').notNull().default('SALESFORCE'),
  accessToken: text('access_token').notNull(),   // AES-256-GCM encrypted (SI-3)
  refreshToken: text('refresh_token').notNull(), // AES-256-GCM encrypted (SI-3)
  instanceUrl: text('instance_url').notNull(),   // e.g. https://myorg.salesforce.com
  connectedByUserId: uuid('connected_by_user_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('crm_connections_tenant_idx').on(t.tenantId),
}));

export const crmSyncLog = pgTable('crm_sync_log', {
  id: pk(),
  tenantId: tenantId(),
  operation: text('operation').notNull(),    // 'COMPLETION_SYNC', 'ENROLLMENT_WEBHOOK'
  externalId: text('external_id'),           // Salesforce activity ID
  status: text('status').notNull(),          // 'SUCCESS', 'FAILED', 'PENDING'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('crm_sync_log_tenant_idx').on(t.tenantId),
}));

export const crmConnectionsRLS = sql`
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_connections_tenant_isolation ON crm_connections
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const crmSyncLogRLS = sql`
ALTER TABLE crm_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_sync_log_tenant_isolation ON crm_sync_log
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const crmIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_crm_connections_tenant ON crm_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_log_tenant ON crm_sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_log_created ON crm_sync_log(created_at DESC);
`;

export type CrmConnection = typeof crmConnections.$inferSelect;
export type NewCrmConnection = typeof crmConnections.$inferInsert;
export type CrmSyncLog = typeof crmSyncLog.$inferSelect;
export type NewCrmSyncLog = typeof crmSyncLog.$inferInsert;
