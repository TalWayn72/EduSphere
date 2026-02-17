import { pgTable, uuid, text, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { agentSessions } from './agentSessions';

export const messageRoleEnum = pgEnum('message_role', [
  'USER',
  'ASSISTANT',
  'SYSTEM',
  'TOOL',
]);

export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => agentSessions.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const agentMessagesRLS = sql`
CREATE POLICY agent_messages_session_isolation ON agent_messages
  USING (
    EXISTS (
      SELECT 1 FROM agent_sessions
      WHERE agent_sessions.id = agent_messages.session_id
      AND agent_sessions.user_id::text = current_setting('app.current_user', TRUE)
    )
  );

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
`;

export const agentMessagesIndexes = sql`
CREATE INDEX idx_agent_messages_session ON agent_messages(session_id);
CREATE INDEX idx_agent_messages_created ON agent_messages(created_at);
`;

export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
