import { describe, it, expect } from 'vitest';
import { INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY, INSTRUCTOR_AI_USAGE_QUERY } from './analytics.queries';

describe('analytics.queries', () => {
  it('exports INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY as a query DocumentNode', () => {
    expect(INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY).toBeDefined();
    expect(INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY.kind).toBe('Document');
    expect(INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('InstructorAnalyticsOverview');
  });

  it('exports INSTRUCTOR_AI_USAGE_QUERY as a query DocumentNode', () => {
    expect(INSTRUCTOR_AI_USAGE_QUERY).toBeDefined();
    expect(INSTRUCTOR_AI_USAGE_QUERY.kind).toBe('Document');
    expect(INSTRUCTOR_AI_USAGE_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = INSTRUCTOR_AI_USAGE_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('InstructorAiUsage');
  });

});
