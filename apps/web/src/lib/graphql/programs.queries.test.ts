import { describe, it, expect } from 'vitest';
import {
  PROGRAMS_QUERY,
  PROGRAM_QUERY,
  MY_PROGRAM_ENROLLMENTS_QUERY,
  PROGRAM_PROGRESS_QUERY,
  ENROLL_IN_PROGRAM_MUTATION,
  CREATE_PROGRAM_MUTATION,
  UPDATE_PROGRAM_MUTATION,
} from './programs.queries';

describe('programs.queries', () => {
  it('exports PROGRAMS_QUERY as a query DocumentNode', () => {
    expect(PROGRAMS_QUERY).toBeDefined();
    expect(PROGRAMS_QUERY.kind).toBe('Document');
    expect(PROGRAMS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PROGRAMS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Programs');
  });

  it('exports PROGRAM_QUERY as a query DocumentNode', () => {
    expect(PROGRAM_QUERY).toBeDefined();
    expect(PROGRAM_QUERY.kind).toBe('Document');
    expect(PROGRAM_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PROGRAM_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Program');
  });

  it('exports MY_PROGRAM_ENROLLMENTS_QUERY as a query DocumentNode', () => {
    expect(MY_PROGRAM_ENROLLMENTS_QUERY).toBeDefined();
    expect(MY_PROGRAM_ENROLLMENTS_QUERY.kind).toBe('Document');
    expect(
      MY_PROGRAM_ENROLLMENTS_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = MY_PROGRAM_ENROLLMENTS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyProgramEnrollments');
  });

  it('exports PROGRAM_PROGRESS_QUERY as a query DocumentNode', () => {
    expect(PROGRAM_PROGRESS_QUERY).toBeDefined();
    expect(PROGRAM_PROGRESS_QUERY.kind).toBe('Document');
    expect(PROGRAM_PROGRESS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PROGRAM_PROGRESS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ProgramProgress');
  });

  it('exports ENROLL_IN_PROGRAM_MUTATION as a mutation DocumentNode', () => {
    expect(ENROLL_IN_PROGRAM_MUTATION).toBeDefined();
    expect(ENROLL_IN_PROGRAM_MUTATION.kind).toBe('Document');
    expect(
      ENROLL_IN_PROGRAM_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ENROLL_IN_PROGRAM_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('EnrollInProgram');
  });

  it('exports CREATE_PROGRAM_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_PROGRAM_MUTATION).toBeDefined();
    expect(CREATE_PROGRAM_MUTATION.kind).toBe('Document');
    expect(CREATE_PROGRAM_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = CREATE_PROGRAM_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateProgram');
  });

  it('exports UPDATE_PROGRAM_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_PROGRAM_MUTATION).toBeDefined();
    expect(UPDATE_PROGRAM_MUTATION.kind).toBe('Document');
    expect(UPDATE_PROGRAM_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = UPDATE_PROGRAM_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateProgram');
  });
});
