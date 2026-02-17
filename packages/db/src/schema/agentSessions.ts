import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const sessionStatusEnum = pgEnum('session_status', [
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  agentType: varchar('agent_type', { length: 100 }).notNull(),
  status: sessionStatusEnum('status').notNull().default('ACTIVE'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const agentSessionsRLS = sql`
CREATE POLICY agent_sessions_user_isolation ON agent_sessions
  USING (user_id::text = current_setting('app.current_user', TRUE));

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
`;

export const agentSessionsIndexes = sql`
CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_type ON agent_sessions(agent_type);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
`;

export type AgentSession = typeof agentSessions.$inferSelect;
export type NewAgentSession = typeof agentSessions.$inferInsert;
