import { describe, it, expect } from 'vitest';
import { BI_API_TOKENS_QUERY, GENERATE_BI_API_KEY_MUTATION, REVOKE_BI_API_KEY_MUTATION } from './bi-export.queries';

describe('bi-export.queries', () => {
  it('exports BI_API_TOKENS_QUERY as a query DocumentNode', () => {
    expect(BI_API_TOKENS_QUERY).toBeDefined();
    expect(BI_API_TOKENS_QUERY.kind).toBe('Document');
    expect(BI_API_TOKENS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = BI_API_TOKENS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('BiApiTokens');
  });

  it('exports GENERATE_BI_API_KEY_MUTATION as a mutation DocumentNode', () => {
    expect(GENERATE_BI_API_KEY_MUTATION).toBeDefined();
    expect(GENERATE_BI_API_KEY_MUTATION.kind).toBe('Document');
    expect(GENERATE_BI_API_KEY_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GENERATE_BI_API_KEY_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('GenerateBIApiKey');
  });

  it('exports REVOKE_BI_API_KEY_MUTATION as a mutation DocumentNode', () => {
    expect(REVOKE_BI_API_KEY_MUTATION).toBeDefined();
    expect(REVOKE_BI_API_KEY_MUTATION.kind).toBe('Document');
    expect(REVOKE_BI_API_KEY_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REVOKE_BI_API_KEY_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RevokeBIApiKey');
  });

});
