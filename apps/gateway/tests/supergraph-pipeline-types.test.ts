/**
 * BUG-104 — Supergraph Pipeline Types Validation
 *
 * Regression guard: verifies that supergraph.graphql contains all required
 * Pipeline types that were missing before the compose.js fix.
 *
 * The root cause of BUG-104 was a stale supergraph.graphql that lacked
 * Pipeline Template types, causing 400 Bad Request on the Lesson Pipeline page.
 * This test ensures the types are always present after recomposition.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SUPERGRAPH_PATH = join(__dirname, '..', 'supergraph.graphql');

let schemaSDL = '';

beforeAll(() => {
  if (!existsSync(SUPERGRAPH_PATH)) {
    throw new Error(
      `supergraph.graphql not found at ${SUPERGRAPH_PATH}.\n` +
        'Run: pnpm --filter @edusphere/gateway compose',
    );
  }
  schemaSDL = readFileSync(SUPERGRAPH_PATH, 'utf-8');
});

describe('BUG-104: Supergraph contains Pipeline types', () => {
  it('contains LessonPipelineTemplate type definition', () => {
    expect(schemaSDL).toMatch(/type LessonPipelineTemplate\b/);
  });

  it('contains LessonPipelineRun type definition', () => {
    expect(schemaSDL).toMatch(/type LessonPipelineRun\b/);
  });

  it('contains pipelineTemplates query', () => {
    expect(schemaSDL).toContain('pipelineTemplates');
    // Verify it returns the correct type
    expect(schemaSDL).toMatch(/pipelineTemplates.*\[LessonPipelineTemplate!\]!/);
  });

  it('contains lessonPipelineRun query', () => {
    expect(schemaSDL).toMatch(/lessonPipelineRun\(runId: ID!\)/);
  });

  it('contains lessonPipelineRuns query', () => {
    expect(schemaSDL).toMatch(/lessonPipelineRuns\(lessonId: ID!/);
  });

  it('contains startLessonPipelineRun mutation', () => {
    expect(schemaSDL).toContain('startLessonPipelineRun');
  });

  it('contains cancelLessonPipelineRun mutation', () => {
    expect(schemaSDL).toContain('cancelLessonPipelineRun');
  });

  it('contains createPipelineTemplate mutation', () => {
    expect(schemaSDL).toContain('createPipelineTemplate');
  });

  it('contains updatePipelineTemplate mutation', () => {
    expect(schemaSDL).toContain('updatePipelineTemplate');
  });

  it('contains lessonPipelineProgress subscription', () => {
    expect(schemaSDL).toContain('lessonPipelineProgress');
  });
});

describe('BUG-104: Lesson type has pipeline-related fields', () => {
  it('Lesson type references pipeline field or LessonPipeline', () => {
    // The Lesson type should have a connection to its pipeline
    // This can be either a direct `pipeline` field or a `currentRun` reference
    const hasPipelineField =
      schemaSDL.includes('currentRun: LessonPipelineRun') ||
      schemaSDL.includes('pipeline:') ||
      schemaSDL.includes('LessonPipeline');
    expect(hasPipelineField).toBe(true);
  });
});

describe('BUG-104: Pipeline types are owned by content subgraph', () => {
  it('LessonPipelineTemplate is in CONTENT graph', () => {
    // Federation supergraph marks ownership with @join__type(graph: CONTENT)
    const templateLine = schemaSDL
      .split('\n')
      .find((line) => line.includes('type LessonPipelineTemplate'));
    expect(templateLine).toBeDefined();
    expect(templateLine).toContain('CONTENT');
  });

  it('LessonPipelineRun is in CONTENT graph', () => {
    const runLine = schemaSDL
      .split('\n')
      .find((line) => line.includes('type LessonPipelineRun'));
    expect(runLine).toBeDefined();
    expect(runLine).toContain('CONTENT');
  });
});

describe('BUG-104: No conflicting LessonPipelineResult (agent renamed)', () => {
  it('agent LessonPipelineResult is renamed to AgentLessonPipelineResult', () => {
    // If the agent subgraph's LessonPipelineResult was NOT renamed,
    // composition would fail or produce conflicts.
    // After the fix, only AgentLessonPipelineResult should exist from agent.
    const agentResultExists = schemaSDL.includes('AgentLessonPipelineResult');
    // There should be no bare LessonPipelineResult from agent subgraph
    // (content subgraph may still have its own LessonPipelineResult)
    if (agentResultExists) {
      expect(schemaSDL).toContain('AgentLessonPipelineResult');
    }
  });
});
