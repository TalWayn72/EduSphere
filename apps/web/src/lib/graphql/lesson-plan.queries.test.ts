import { describe, it, expect } from 'vitest';
import { MY_COURSE_LESSON_PLANS_QUERY, COURSE_LESSON_PLAN_QUERY, CREATE_LESSON_PLAN_MUTATION, ADD_LESSON_STEP_MUTATION, REORDER_LESSON_STEPS_MUTATION, PUBLISH_LESSON_PLAN_MUTATION } from './lesson-plan.queries';

describe('lesson-plan.queries', () => {
  it('exports MY_COURSE_LESSON_PLANS_QUERY as a query DocumentNode', () => {
    expect(MY_COURSE_LESSON_PLANS_QUERY).toBeDefined();
    expect(MY_COURSE_LESSON_PLANS_QUERY.kind).toBe('Document');
    expect(MY_COURSE_LESSON_PLANS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_COURSE_LESSON_PLANS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyCourseLessonPlans');
  });

  it('exports COURSE_LESSON_PLAN_QUERY as a query DocumentNode', () => {
    expect(COURSE_LESSON_PLAN_QUERY).toBeDefined();
    expect(COURSE_LESSON_PLAN_QUERY.kind).toBe('Document');
    expect(COURSE_LESSON_PLAN_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSE_LESSON_PLAN_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseLessonPlan');
  });

  it('exports CREATE_LESSON_PLAN_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_LESSON_PLAN_MUTATION).toBeDefined();
    expect(CREATE_LESSON_PLAN_MUTATION.kind).toBe('Document');
    expect(CREATE_LESSON_PLAN_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_LESSON_PLAN_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateLessonPlan');
  });

  it('exports ADD_LESSON_STEP_MUTATION as a mutation DocumentNode', () => {
    expect(ADD_LESSON_STEP_MUTATION).toBeDefined();
    expect(ADD_LESSON_STEP_MUTATION.kind).toBe('Document');
    expect(ADD_LESSON_STEP_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_LESSON_STEP_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddLessonStep');
  });

  it('exports REORDER_LESSON_STEPS_MUTATION as a mutation DocumentNode', () => {
    expect(REORDER_LESSON_STEPS_MUTATION).toBeDefined();
    expect(REORDER_LESSON_STEPS_MUTATION.kind).toBe('Document');
    expect(REORDER_LESSON_STEPS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REORDER_LESSON_STEPS_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ReorderLessonSteps');
  });

  it('exports PUBLISH_LESSON_PLAN_MUTATION as a mutation DocumentNode', () => {
    expect(PUBLISH_LESSON_PLAN_MUTATION).toBeDefined();
    expect(PUBLISH_LESSON_PLAN_MUTATION.kind).toBe('Document');
    expect(PUBLISH_LESSON_PLAN_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PUBLISH_LESSON_PLAN_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('PublishLessonPlan');
  });

});
