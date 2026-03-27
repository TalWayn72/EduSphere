import { describe, it, expect } from 'vitest';
import { EXAM_ITEM_BANK_QUERY, EXAM_ITEM_QUERY, CREATE_EXAM_ITEM_MUTATION, UPDATE_EXAM_ITEM_MUTATION, RETIRE_EXAM_ITEM_MUTATION, GENERATE_EXAM_ITEMS_MUTATION, EXAM_BLUEPRINTS_QUERY, EXAM_BLUEPRINT_QUERY, CREATE_EXAM_BLUEPRINT_MUTATION, UPDATE_EXAM_BLUEPRINT_MUTATION, COURSE_MODULES_QUERY } from './exam.operations';

describe('exam.operations', () => {
  it('exports EXAM_ITEM_BANK_QUERY as a query DocumentNode', () => {
    expect(EXAM_ITEM_BANK_QUERY).toBeDefined();
    expect(EXAM_ITEM_BANK_QUERY.kind).toBe('Document');
    expect(EXAM_ITEM_BANK_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = EXAM_ITEM_BANK_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ExamItemBank');
  });

  it('exports EXAM_ITEM_QUERY as a query DocumentNode', () => {
    expect(EXAM_ITEM_QUERY).toBeDefined();
    expect(EXAM_ITEM_QUERY.kind).toBe('Document');
    expect(EXAM_ITEM_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = EXAM_ITEM_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ExamItem');
  });

  it('exports CREATE_EXAM_ITEM_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_EXAM_ITEM_MUTATION).toBeDefined();
    expect(CREATE_EXAM_ITEM_MUTATION.kind).toBe('Document');
    expect(CREATE_EXAM_ITEM_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_EXAM_ITEM_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateExamItem');
  });

  it('exports UPDATE_EXAM_ITEM_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_EXAM_ITEM_MUTATION).toBeDefined();
    expect(UPDATE_EXAM_ITEM_MUTATION.kind).toBe('Document');
    expect(UPDATE_EXAM_ITEM_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_EXAM_ITEM_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateExamItem');
  });

  it('exports RETIRE_EXAM_ITEM_MUTATION as a mutation DocumentNode', () => {
    expect(RETIRE_EXAM_ITEM_MUTATION).toBeDefined();
    expect(RETIRE_EXAM_ITEM_MUTATION.kind).toBe('Document');
    expect(RETIRE_EXAM_ITEM_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = RETIRE_EXAM_ITEM_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RetireExamItem');
  });

  it('exports GENERATE_EXAM_ITEMS_MUTATION as a mutation DocumentNode', () => {
    expect(GENERATE_EXAM_ITEMS_MUTATION).toBeDefined();
    expect(GENERATE_EXAM_ITEMS_MUTATION.kind).toBe('Document');
    expect(GENERATE_EXAM_ITEMS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GENERATE_EXAM_ITEMS_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('GenerateExamItems');
  });

  it('exports EXAM_BLUEPRINTS_QUERY as a query DocumentNode', () => {
    expect(EXAM_BLUEPRINTS_QUERY).toBeDefined();
    expect(EXAM_BLUEPRINTS_QUERY.kind).toBe('Document');
    expect(EXAM_BLUEPRINTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = EXAM_BLUEPRINTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ExamBlueprints');
  });

  it('exports EXAM_BLUEPRINT_QUERY as a query DocumentNode', () => {
    expect(EXAM_BLUEPRINT_QUERY).toBeDefined();
    expect(EXAM_BLUEPRINT_QUERY.kind).toBe('Document');
    expect(EXAM_BLUEPRINT_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = EXAM_BLUEPRINT_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ExamBlueprint');
  });

  it('exports CREATE_EXAM_BLUEPRINT_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_EXAM_BLUEPRINT_MUTATION).toBeDefined();
    expect(CREATE_EXAM_BLUEPRINT_MUTATION.kind).toBe('Document');
    expect(CREATE_EXAM_BLUEPRINT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_EXAM_BLUEPRINT_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateExamBlueprint');
  });

  it('exports UPDATE_EXAM_BLUEPRINT_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_EXAM_BLUEPRINT_MUTATION).toBeDefined();
    expect(UPDATE_EXAM_BLUEPRINT_MUTATION.kind).toBe('Document');
    expect(UPDATE_EXAM_BLUEPRINT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_EXAM_BLUEPRINT_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateExamBlueprint');
  });

  it('exports COURSE_MODULES_QUERY as a query DocumentNode', () => {
    expect(COURSE_MODULES_QUERY).toBeDefined();
    expect(COURSE_MODULES_QUERY.kind).toBe('Document');
    expect(COURSE_MODULES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSE_MODULES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseModulesForExam');
  });

});
