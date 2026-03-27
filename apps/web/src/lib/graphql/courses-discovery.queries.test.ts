import { describe, it, expect } from 'vitest';
import { COURSES_DISCOVERY_QUERY, SEARCH_COURSES_DISCOVERY_QUERY } from './courses-discovery.queries';

describe('courses-discovery.queries', () => {
  it('exports COURSES_DISCOVERY_QUERY as a query DocumentNode', () => {
    expect(COURSES_DISCOVERY_QUERY).toBeDefined();
    expect(COURSES_DISCOVERY_QUERY.kind).toBe('Document');
    expect(COURSES_DISCOVERY_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSES_DISCOVERY_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CoursesDiscovery');
  });

  it('exports SEARCH_COURSES_DISCOVERY_QUERY as a query DocumentNode', () => {
    expect(SEARCH_COURSES_DISCOVERY_QUERY).toBeDefined();
    expect(SEARCH_COURSES_DISCOVERY_QUERY.kind).toBe('Document');
    expect(SEARCH_COURSES_DISCOVERY_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEARCH_COURSES_DISCOVERY_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SearchCoursesDiscovery');
  });

});
