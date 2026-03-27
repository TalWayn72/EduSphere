import { describe, it, expect } from 'vitest';
import { TENANT_SOCIAL_LINKS_QUERY, UPDATE_TENANT_SOCIAL_LINKS_MUTATION } from './social-links.queries';

describe('social-links.queries', () => {
  it('exports TENANT_SOCIAL_LINKS_QUERY as a query DocumentNode', () => {
    expect(TENANT_SOCIAL_LINKS_QUERY).toBeDefined();
    expect(TENANT_SOCIAL_LINKS_QUERY.kind).toBe('Document');
    expect(TENANT_SOCIAL_LINKS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = TENANT_SOCIAL_LINKS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('TenantSocialLinks');
  });

  it('exports UPDATE_TENANT_SOCIAL_LINKS_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_TENANT_SOCIAL_LINKS_MUTATION).toBeDefined();
    expect(UPDATE_TENANT_SOCIAL_LINKS_MUTATION.kind).toBe('Document');
    expect(UPDATE_TENANT_SOCIAL_LINKS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_TENANT_SOCIAL_LINKS_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateTenantSocialLinks');
  });

});
