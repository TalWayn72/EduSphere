import { describe, it, expect } from 'vitest';
import { CONTENT_TRANSLATION_QUERY, REQUEST_CONTENT_TRANSLATION_MUTATION } from './translation.queries';

describe('translation.queries', () => {
  it('exports CONTENT_TRANSLATION_QUERY as a query DocumentNode', () => {
    expect(CONTENT_TRANSLATION_QUERY).toBeDefined();
    expect(CONTENT_TRANSLATION_QUERY.kind).toBe('Document');
    expect(CONTENT_TRANSLATION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CONTENT_TRANSLATION_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ContentTranslation');
  });

  it('exports REQUEST_CONTENT_TRANSLATION_MUTATION as a mutation DocumentNode', () => {
    expect(REQUEST_CONTENT_TRANSLATION_MUTATION).toBeDefined();
    expect(REQUEST_CONTENT_TRANSLATION_MUTATION.kind).toBe('Document');
    expect(REQUEST_CONTENT_TRANSLATION_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REQUEST_CONTENT_TRANSLATION_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RequestContentTranslation');
  });

});
