import { describe, it, expect } from 'vitest';
import { TENANT_BRANDING_QUERY, PUBLIC_BRANDING_QUERY, BRANDED_LOGIN_DATA_QUERY, UPDATE_TENANT_BRANDING_MUTATION } from './branding.queries';

describe('branding.queries', () => {
  it('exports TENANT_BRANDING_QUERY as a query DocumentNode', () => {
    expect(TENANT_BRANDING_QUERY).toBeDefined();
    expect(TENANT_BRANDING_QUERY.kind).toBe('Document');
    expect(TENANT_BRANDING_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = TENANT_BRANDING_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('TenantBranding');
  });

  it('exports PUBLIC_BRANDING_QUERY as a query DocumentNode', () => {
    expect(PUBLIC_BRANDING_QUERY).toBeDefined();
    expect(PUBLIC_BRANDING_QUERY.kind).toBe('Document');
    expect(PUBLIC_BRANDING_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PUBLIC_BRANDING_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PublicBranding');
  });

  it('exports BRANDED_LOGIN_DATA_QUERY as a query DocumentNode', () => {
    expect(BRANDED_LOGIN_DATA_QUERY).toBeDefined();
    expect(BRANDED_LOGIN_DATA_QUERY.kind).toBe('Document');
    expect(BRANDED_LOGIN_DATA_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = BRANDED_LOGIN_DATA_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('BrandedLoginData');
  });

  it('exports UPDATE_TENANT_BRANDING_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_TENANT_BRANDING_MUTATION).toBeDefined();
    expect(UPDATE_TENANT_BRANDING_MUTATION.kind).toBe('Document');
    expect(UPDATE_TENANT_BRANDING_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_TENANT_BRANDING_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateTenantBranding');
  });

});
