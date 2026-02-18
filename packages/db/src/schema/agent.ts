import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps, softDelete } from './_shared';
import { tenants } from './tenants';
import { users } from './core';

// Re-export agent sessions and messages
export * from './agentSessions';
export * from './agentMessages';

// Agent Definitions
export const agent_definitions = pgTable('agent_definitions', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  creator_id: uuid('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  template: text('template', {
    enum: [
      'CHAVRUTA_DEBATE',
      'SUMMARIZE',
      'QUIZ_ASSESS',
      'RESEARCH_SCOUT',
      'EXPLAIN',
      'CUSTOM',
    ],
  }).notNull(),
  config: jsonb('config').notNull().default({}),
  is_active: boolean('is_active').notNull().default(true),
  ...timestamps,
  ...softDelete,
});

// Agent Executions
export const agent_executions = pgTable('agent_executions', {
  id: pk(),
  agent_id: uuid('agent_id')
    .notNull()
    .references(() => agent_definitions.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  status: text('status', {
    enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  })
    .notNull()
    .default('QUEUED'),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata').notNull().default({}),
});

export type AgentDefinition = typeof agent_definitions.$inferSelect;
export type NewAgentDefinition = typeof agent_definitions.$inferInsert;
export type AgentExecution = typeof agent_executions.$inferSelect;
export type NewAgentExecution = typeof agent_executions.$inferInsert;
export type AgentTemplate = AgentDefinition['template'];
export type AgentExecutionStatus = AgentExecution['status'];
