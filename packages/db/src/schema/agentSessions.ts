import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { tenants } from './tenants';

export const sessionStatusEnum = pgEnum('session_status', [
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agentType: varchar('agent_type', { length: 100 }).notNull(),
  status: sessionStatusEnum('status').notNull().default('ACTIVE'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const agentSessionsRLS = sql`
CREATE POLICY agent_sessions_user_isolation ON agent_sessions
  USING (user_id::text = current_setting('app.current_user_id', TRUE))
  WITH CHECK (user_id::text = current_setting('app.current_user_id', TRUE));

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
`;

export const agentSessionsIndexes = sql`
CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_type ON agent_sessions(agent_type);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
`;

export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;
