import { describe, it, expect } from 'vitest';
import { SAVED_SEARCHES_QUERY, CREATE_SAVED_SEARCH_MUTATION, DELETE_SAVED_SEARCH_MUTATION } from './search.queries';

describe('search.queries', () => {
  it('exports SAVED_SEARCHES_QUERY as a query DocumentNode', () => {
    expect(SAVED_SEARCHES_QUERY).toBeDefined();
    expect(SAVED_SEARCHES_QUERY.kind).toBe('Document');
    expect(SAVED_SEARCHES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SAVED_SEARCHES_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SavedSearches');
  });

  it('exports CREATE_SAVED_SEARCH_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_SAVED_SEARCH_MUTATION).toBeDefined();
    expect(CREATE_SAVED_SEARCH_MUTATION.kind).toBe('Document');
    expect(CREATE_SAVED_SEARCH_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_SAVED_SEARCH_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateSavedSearch');
  });

  it('exports DELETE_SAVED_SEARCH_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_SAVED_SEARCH_MUTATION).toBeDefined();
    expect(DELETE_SAVED_SEARCH_MUTATION.kind).toBe('Document');
    expect(DELETE_SAVED_SEARCH_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DELETE_SAVED_SEARCH_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteSavedSearch');
  });

});
