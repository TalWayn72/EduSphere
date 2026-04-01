import { describe, it, expect } from 'vitest';
import {
  MY_COMPETENCY_GOALS_QUERY,
  MY_LEARNING_PATH_QUERY,
  ADD_COMPETENCY_GOAL_MUTATION,
  REMOVE_COMPETENCY_GOAL_MUTATION,
} from './competency.queries';

describe('competency.queries', () => {
  it('exports MY_COMPETENCY_GOALS_QUERY as a query DocumentNode', () => {
    expect(MY_COMPETENCY_GOALS_QUERY).toBeDefined();
    expect(MY_COMPETENCY_GOALS_QUERY.kind).toBe('Document');
    expect(MY_COMPETENCY_GOALS_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = MY_COMPETENCY_GOALS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyCompetencyGoals');
  });

  it('exports MY_LEARNING_PATH_QUERY as a query DocumentNode', () => {
    expect(MY_LEARNING_PATH_QUERY).toBeDefined();
    expect(MY_LEARNING_PATH_QUERY.kind).toBe('Document');
    expect(MY_LEARNING_PATH_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_LEARNING_PATH_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyLearningPath');
  });

  it('exports ADD_COMPETENCY_GOAL_MUTATION as a mutation DocumentNode', () => {
    expect(ADD_COMPETENCY_GOAL_MUTATION).toBeDefined();
    expect(ADD_COMPETENCY_GOAL_MUTATION.kind).toBe('Document');
    expect(
      ADD_COMPETENCY_GOAL_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = ADD_COMPETENCY_GOAL_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddCompetencyGoal');
  });

  it('exports REMOVE_COMPETENCY_GOAL_MUTATION as a mutation DocumentNode', () => {
    expect(REMOVE_COMPETENCY_GOAL_MUTATION).toBeDefined();
    expect(REMOVE_COMPETENCY_GOAL_MUTATION.kind).toBe('Document');
    expect(
      REMOVE_COMPETENCY_GOAL_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = REMOVE_COMPETENCY_GOAL_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RemoveCompetencyGoal');
  });
});
