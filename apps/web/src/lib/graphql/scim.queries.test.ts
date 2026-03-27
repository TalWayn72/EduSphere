import { describe, it, expect } from 'vitest';
import { SCIM_TOKENS_QUERY, SCIM_SYNC_LOG_QUERY, GENERATE_SCIM_TOKEN_MUTATION, REVOKE_SCIM_TOKEN_MUTATION } from './scim.queries';

describe('scim.queries', () => {
  it('exports SCIM_TOKENS_QUERY as a query DocumentNode', () => {
    expect(SCIM_TOKENS_QUERY).toBeDefined();
    expect(SCIM_TOKENS_QUERY.kind).toBe('Document');
    expect(SCIM_TOKENS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SCIM_TOKENS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ScimTokens');
  });

  it('exports SCIM_SYNC_LOG_QUERY as a query DocumentNode', () => {
    expect(SCIM_SYNC_LOG_QUERY).toBeDefined();
    expect(SCIM_SYNC_LOG_QUERY.kind).toBe('Document');
    expect(SCIM_SYNC_LOG_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SCIM_SYNC_LOG_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ScimSyncLog');
  });

  it('exports GENERATE_SCIM_TOKEN_MUTATION as a mutation DocumentNode', () => {
    expect(GENERATE_SCIM_TOKEN_MUTATION).toBeDefined();
    expect(GENERATE_SCIM_TOKEN_MUTATION.kind).toBe('Document');
    expect(GENERATE_SCIM_TOKEN_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GENERATE_SCIM_TOKEN_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('GenerateScimToken');
  });

  it('exports REVOKE_SCIM_TOKEN_MUTATION as a mutation DocumentNode', () => {
    expect(REVOKE_SCIM_TOKEN_MUTATION).toBeDefined();
    expect(REVOKE_SCIM_TOKEN_MUTATION.kind).toBe('Document');
    expect(REVOKE_SCIM_TOKEN_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REVOKE_SCIM_TOKEN_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RevokeScimToken');
  });

});
