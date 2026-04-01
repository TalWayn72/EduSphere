import { describe, it, expect } from 'vitest';
import {
  GENERATE_COURSE_FROM_PROMPT_MUTATION,
  EXECUTION_STATUS_SUBSCRIPTION,
  AGENT_EXECUTION_QUERY,
} from './agent-course-gen.queries';

describe('agent-course-gen.queries', () => {
  it('exports GENERATE_COURSE_FROM_PROMPT_MUTATION as a mutation DocumentNode', () => {
    expect(GENERATE_COURSE_FROM_PROMPT_MUTATION).toBeDefined();
    expect(GENERATE_COURSE_FROM_PROMPT_MUTATION.kind).toBe('Document');
    expect(
      GENERATE_COURSE_FROM_PROMPT_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = GENERATE_COURSE_FROM_PROMPT_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('GenerateCourseFromPrompt');
  });

  it('exports EXECUTION_STATUS_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(EXECUTION_STATUS_SUBSCRIPTION).toBeDefined();
    expect(EXECUTION_STATUS_SUBSCRIPTION.kind).toBe('Document');
    expect(
      EXECUTION_STATUS_SUBSCRIPTION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = EXECUTION_STATUS_SUBSCRIPTION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('ExecutionStatusChanged');
  });

  it('exports AGENT_EXECUTION_QUERY as a query DocumentNode', () => {
    expect(AGENT_EXECUTION_QUERY).toBeDefined();
    expect(AGENT_EXECUTION_QUERY.kind).toBe('Document');
    expect(AGENT_EXECUTION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = AGENT_EXECUTION_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AgentExecution');
  });
});
