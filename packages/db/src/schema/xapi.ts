/**
 * xAPI / LRS schema — F-028 xAPI 1.0.3 Integration
 * xapi_tokens: bearer tokens for LRS endpoint authentication
 * xapi_statements: stored xAPI statements (local LRS)
 *
 * Raw tokens are NEVER stored; only SHA-256 hash is persisted.
 */
import {
  pgTable, uuid, text, boolean, timestamp, jsonb,
  uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

/**
 * xapi_tokens — bearer tokens for LRS authentication.
 * Optional lrs_endpoint enables forwarding to an external LRS.
 */
export const xapiTokens = pgTable('xapi_tokens', {
  id: pk(),
  tenantId: tenantId(),
  tokenHash: text('token_hash').notNull().unique(),
  lrsEndpoint: text('lrs_endpoint'),
  description: text('description').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('xapi_tokens_tenant_idx').on(t.tenantId),
}));

/**
 * xapi_statements — self-hosted LRS statement store.
 * Stores xAPI 1.0.3 statements emitted from NATS events.
 */
export const xapiStatements = pgTable('xapi_statements', {
  id: pk(),
  tenantId: tenantId(),
  statementId: uuid('statement_id').notNull(),
  actor: jsonb('actor').notNull(),
  verb: jsonb('verb').notNull(),
  object: jsonb('object').notNull(),
  result: jsonb('result'),
  context: jsonb('context'),
  storedAt: timestamp('stored_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statementIdUnique: uniqueIndex('xapi_statements_statement_id_unique').on(t.statementId),
  tenantIdx: index('xapi_statements_tenant_idx').on(t.tenantId),
  storedAtIdx: index('xapi_statements_stored_at_idx').on(t.storedAt),
}));

export const xapiTokensRLS = sql`
ALTER TABLE xapi_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY xapi_tokens_tenant_isolation ON xapi_tokens
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const xapiStatementsRLS = sql`
ALTER TABLE xapi_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY xapi_statements_tenant_isolation ON xapi_statements
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const xapiIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_xapi_tokens_tenant ON xapi_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xapi_tokens_hash ON xapi_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_xapi_statements_tenant ON xapi_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xapi_statements_stored_at ON xapi_statements(stored_at DESC);
`;

export type XapiToken = typeof xapiTokens.$inferSelect;
export type NewXapiToken = typeof xapiTokens.$inferInsert;
export type XapiStatementRow = typeof xapiStatements.$inferSelect;
export type NewXapiStatementRow = typeof xapiStatements.$inferInsert;
