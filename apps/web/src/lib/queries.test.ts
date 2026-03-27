import { describe, it, expect } from 'vitest';
import {
  ME_QUERY,
  UPDATE_USER_PREFERENCES_MUTATION,
  TENANT_QUERY,
  COURSES_QUERY,
  MY_STATS_QUERY,
} from './queries';

describe('GraphQL query definitions', () => {
  it('ME_QUERY is defined and contains query Me', () => {
    expect(ME_QUERY).toBeDefined();
    expect(ME_QUERY.definitions).toBeDefined();
    expect(ME_QUERY.definitions.length).toBeGreaterThan(0);
    const def = ME_QUERY.definitions[0] as { kind: string; operation?: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Me');
  });

  it('UPDATE_USER_PREFERENCES_MUTATION is a mutation', () => {
    expect(UPDATE_USER_PREFERENCES_MUTATION).toBeDefined();
    expect(UPDATE_USER_PREFERENCES_MUTATION.definitions.length).toBeGreaterThan(0);
    const def = UPDATE_USER_PREFERENCES_MUTATION.definitions[0] as { kind: string; operation?: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateUserPreferences');
  });

  it('TENANT_QUERY is a query named Tenant', () => {
    expect(TENANT_QUERY).toBeDefined();
    const def = TENANT_QUERY.definitions[0] as { kind: string; operation?: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Tenant');
  });

  it('COURSES_QUERY is a query named Courses', () => {
    expect(COURSES_QUERY).toBeDefined();
    const def = COURSES_QUERY.definitions[0] as { kind: string; operation?: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Courses');
  });

  it('MY_STATS_QUERY is a query named MyStats', () => {
    expect(MY_STATS_QUERY).toBeDefined();
    const def = MY_STATS_QUERY.definitions[0] as { kind: string; operation?: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyStats');
  });

  it('all exports have at least one definition', () => {
    const queries = [ME_QUERY, UPDATE_USER_PREFERENCES_MUTATION, TENANT_QUERY, COURSES_QUERY, MY_STATS_QUERY];
    queries.forEach((q) => {
      expect(q.definitions).toBeDefined();
      expect(q.definitions.length).toBeGreaterThanOrEqual(1);
    });
  });
});
