/**
 * SEED 3 — Agent Templates (agent_definitions)
 *
 * Creates 4 demo AI agent templates used by the Agent subgraph:
 *   1. Chavruta Debate
 *   2. Quiz Master
 *   3. Explainer
 *   4. Research Scout
 *
 * Idempotent: uses onConflictDoNothing + deterministic UUIDs.
 */
import { createDatabaseConnection, schema } from '../index.js';

// ── Deterministic UUIDs ───────────────────────────────────────────────────────
const DEMO_TENANT   = '00000000-0000-0000-0000-000000000000';
const INSTRUCTOR_ID = '00000000-0000-0000-0000-000000000002'; // Demo Instructor

const AGENT_IDS = {
  chavruta:      '00000000-0000-0000-0000-000000000701',
  quizMaster:    '00000000-0000-0000-0000-000000000702',
  explainer:     '00000000-0000-0000-0000-000000000703',
  researchScout: '00000000-0000-0000-0000-000000000704',
} as const;

export async function seedAgentTemplates(): Promise<void> {
  const db = createDatabaseConnection();

  await db
    .insert(schema.agent_definitions)
    .values([
      // 1. Chavruta Debate ─────────────────────────────────────────────────────
      {
        id:         AGENT_IDS.chavruta,
        tenant_id:  DEMO_TENANT,
        creator_id: INSTRUCTOR_ID,
        name:       'Chavruta Debate Partner',
        template:   'CHAVRUTA_DEBATE',
        is_active:  true,
        config: {
          tone:           'socratic',
          language:       'he',
          maxTurns:       20,
          debatePosition: 'challenger',
        },
        rag_config: { vectorWeight: 0.4, graphWeight: 0.6 },
      },
      // 2. Quiz Master ─────────────────────────────────────────────────────────
      {
        id:         AGENT_IDS.quizMaster,
        tenant_id:  DEMO_TENANT,
        creator_id: INSTRUCTOR_ID,
        name:       'Quiz Master',
        template:   'QUIZ_ASSESS',
        is_active:  true,
        config: {
          questionTypes:    ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'],
          difficultyLevels: ['EASY', 'MEDIUM', 'HARD'],
          feedbackMode:     'immediate',
          language:         'he',
        },
        rag_config: { vectorWeight: 0.6, graphWeight: 0.4 },
      },
      // 3. Explainer ──────────────────────────────────────────────────────────
      {
        id:         AGENT_IDS.explainer,
        tenant_id:  DEMO_TENANT,
        creator_id: INSTRUCTOR_ID,
        name:       'Explainer',
        template:   'EXPLAIN',
        is_active:  true,
        config: {
          style:           'step_by_step',
          language:        'he',
          includeExamples: true,
          audienceLevel:   'beginner',
        },
        rag_config: { vectorWeight: 0.7, graphWeight: 0.3 },
      },
      // 4. Research Scout ──────────────────────────────────────────────────────
      {
        id:         AGENT_IDS.researchScout,
        tenant_id:  DEMO_TENANT,
        creator_id: INSTRUCTOR_ID,
        name:       'Research Scout',
        template:   'RESEARCH_SCOUT',
        is_active:  true,
        config: {
          sources:       ['knowledge_graph', 'vector_store', 'external_web'],
          maxSources:    10,
          citationStyle: 'APA',
          language:      'he',
        },
        rag_config: { vectorWeight: 0.5, graphWeight: 0.5 },
      },
    ])
    .onConflictDoNothing();

  console.log('✅ Agent templates seeded: 4 templates (Chavruta, QuizMaster, Explainer, ResearchScout)');
}
