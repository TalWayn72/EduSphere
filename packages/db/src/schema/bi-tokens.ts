/**
 * BI API Tokens schema — F-029 BI Tool Export (Power BI / Tableau)
 * bi_api_tokens: API tokens for BI tool OData endpoint authentication.
 * Raw tokens are NEVER stored; only SHA-256 hash is persisted.
 */
import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId } from './_shared';

/**
 * bi_api_tokens — stores hashed bearer tokens for BI tool authentication.
 * The raw token is NEVER stored; only SHA-256 hash is persisted.
 */
export const biApiTokens = pgTable('bi_api_tokens', {
  id: pk(),
  tenantId: tenantId(),
  tokenHash: text('token_hash').notNull().unique(),
  description: text('description').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}, (t) => ({
  tenantIdx: index('bi_api_tokens_tenant_idx').on(t.tenantId),
}));

export const biApiTokensRLS = sql`
ALTER TABLE bi_api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY bi_api_tokens_tenant_isolation ON bi_api_tokens
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const biApiTokensIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_bi_api_tokens_tenant ON bi_api_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bi_api_tokens_hash ON bi_api_tokens(token_hash);
`;

export type BiApiToken = typeof biApiTokens.$inferSelect;
export type NewBiApiToken = typeof biApiTokens.$inferInsert;
