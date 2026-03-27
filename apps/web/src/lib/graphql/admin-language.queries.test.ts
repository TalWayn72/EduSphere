import { describe, it, expect } from 'vitest';
import { TENANT_LANGUAGE_SETTINGS_QUERY, UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION } from './admin-language.queries';

describe('admin-language.queries', () => {
  it('exports TENANT_LANGUAGE_SETTINGS_QUERY as a query DocumentNode', () => {
    expect(TENANT_LANGUAGE_SETTINGS_QUERY).toBeDefined();
    expect(TENANT_LANGUAGE_SETTINGS_QUERY.kind).toBe('Document');
    expect(TENANT_LANGUAGE_SETTINGS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = TENANT_LANGUAGE_SETTINGS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('TenantLanguageSettings');
  });

  it('exports UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION).toBeDefined();
    expect(UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION.kind).toBe('Document');
    expect(UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateTenantLanguageSettings');
  });

});
