import { describe, it, expect } from 'vitest';
import { XAPI_TOKENS_QUERY, XAPI_STATEMENTS_QUERY, GENERATE_XAPI_TOKEN_MUTATION, REVOKE_XAPI_TOKEN_MUTATION } from './xapi.queries';

describe('xapi.queries', () => {
  it('exports XAPI_TOKENS_QUERY as a query DocumentNode', () => {
    expect(XAPI_TOKENS_QUERY).toBeDefined();
    expect(XAPI_TOKENS_QUERY.kind).toBe('Document');
    expect(XAPI_TOKENS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = XAPI_TOKENS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('XapiTokens');
  });

  it('exports XAPI_STATEMENTS_QUERY as a query DocumentNode', () => {
    expect(XAPI_STATEMENTS_QUERY).toBeDefined();
    expect(XAPI_STATEMENTS_QUERY.kind).toBe('Document');
    expect(XAPI_STATEMENTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = XAPI_STATEMENTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('XapiStatements');
  });

  it('exports GENERATE_XAPI_TOKEN_MUTATION as a mutation DocumentNode', () => {
    expect(GENERATE_XAPI_TOKEN_MUTATION).toBeDefined();
    expect(GENERATE_XAPI_TOKEN_MUTATION.kind).toBe('Document');
    expect(GENERATE_XAPI_TOKEN_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GENERATE_XAPI_TOKEN_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('GenerateXapiToken');
  });

  it('exports REVOKE_XAPI_TOKEN_MUTATION as a mutation DocumentNode', () => {
    expect(REVOKE_XAPI_TOKEN_MUTATION).toBeDefined();
    expect(REVOKE_XAPI_TOKEN_MUTATION.kind).toBe('Document');
    expect(REVOKE_XAPI_TOKEN_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REVOKE_XAPI_TOKEN_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RevokeXapiToken');
  });

});
