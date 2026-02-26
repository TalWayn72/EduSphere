/**
 * Roleplay Simulator schema — F-007
 *
 * scenario_templates: instructor-authored or built-in role-play scenarios
 * scenario_sessions:  per-user run of a scenario (tracks turns + evaluation)
 *
 * RLS: tenant isolation on both tables.
 */
import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { users } from './core';

// ── Scenario Templates ────────────────────────────────────────────────────────

export const scenario_templates = pgTable('scenario_templates', {
  id: pk(),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),

  title: text('title').notNull(),
  domain: text('domain').notNull(), // 'sales' | 'customer_service' | 'healthcare' | 'management'

  difficulty_level: text('difficulty_level', {
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
    .notNull()
    .default('INTERMEDIATE'),

  /** Full character persona description for the AI. */
  character_persona: text('character_persona').notNull(),

  /** Context and learning objective shown to the learner before the session. */
  scene_description: text('scene_description').notNull(),

  /**
   * Evaluation rubric — array of {name, description, maxScore}.
   * Total maxScore must equal 100.
   */
  evaluation_rubric: jsonb('evaluation_rubric').notNull().default([]),

  max_turns: integer('max_turns').notNull().default(10),
  is_active: boolean('is_active').notNull().default(true),
  is_builtin: boolean('is_builtin').notNull().default(false),

  ...timestamps,
});

// ── Scenario Sessions ─────────────────────────────────────────────────────────

export const scenario_sessions = pgTable('scenario_sessions', {
  id: pk(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  scenario_id: uuid('scenario_id')
    .notNull()
    .references(() => scenario_templates.id, { onDelete: 'cascade' }),
  tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),

  /** Optional link to agent_executions table for message history. */
  agent_execution_id: uuid('agent_execution_id'),

  status: text('status', {
    enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
  })
    .notNull()
    .default('IN_PROGRESS'),

  turn_count: integer('turn_count').notNull().default(0),

  /**
   * Populated by evaluation node — stores EvaluationResult JSON.
   * Shape: { overallScore, criteriaScores, strengths, areasForImprovement, summary }
   */
  evaluation_result: jsonb('evaluation_result'),

  started_at: timestamp('started_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type ScenarioTemplate = typeof scenario_templates.$inferSelect;
export type NewScenarioTemplate = typeof scenario_templates.$inferInsert;
export type ScenarioSession = typeof scenario_sessions.$inferSelect;
export type NewScenarioSession = typeof scenario_sessions.$inferInsert;

export interface RubricCriterion {
  name: string;
  description: string;
  maxScore: number;
}

export interface EvaluationResult {
  overallScore: number;
  criteriaScores: Array<{ name: string; score: number; feedback: string }>;
  strengths: string[];
  areasForImprovement: string[];
  summary: string;
}
