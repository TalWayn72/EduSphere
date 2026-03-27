import { describe, it, expect } from 'vitest';
import { START_PROCTORING_SESSION_MUTATION, FLAG_PROCTORING_EVENT_MUTATION, END_PROCTORING_SESSION_MUTATION, GET_PROCTORING_REPORT_QUERY } from './proctoring.queries';

describe('proctoring.queries', () => {
  it('exports START_PROCTORING_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(START_PROCTORING_SESSION_MUTATION).toBeDefined();
    expect(START_PROCTORING_SESSION_MUTATION.kind).toBe('Document');
    expect(START_PROCTORING_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = START_PROCTORING_SESSION_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('StartProctoringSession');
  });

  it('exports FLAG_PROCTORING_EVENT_MUTATION as a mutation DocumentNode', () => {
    expect(FLAG_PROCTORING_EVENT_MUTATION).toBeDefined();
    expect(FLAG_PROCTORING_EVENT_MUTATION.kind).toBe('Document');
    expect(FLAG_PROCTORING_EVENT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = FLAG_PROCTORING_EVENT_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('FlagProctoringEvent');
  });

  it('exports END_PROCTORING_SESSION_MUTATION as a mutation DocumentNode', () => {
    expect(END_PROCTORING_SESSION_MUTATION).toBeDefined();
    expect(END_PROCTORING_SESSION_MUTATION.kind).toBe('Document');
    expect(END_PROCTORING_SESSION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = END_PROCTORING_SESSION_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('EndProctoringSession');
  });

  it('exports GET_PROCTORING_REPORT_QUERY as a query DocumentNode', () => {
    expect(GET_PROCTORING_REPORT_QUERY).toBeDefined();
    expect(GET_PROCTORING_REPORT_QUERY.kind).toBe('Document');
    expect(GET_PROCTORING_REPORT_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GET_PROCTORING_REPORT_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetProctoringReport');
  });

});
