import { describe, it, expect } from 'vitest';
import { MY_TENANT_LANGUAGE_SETTINGS_QUERY, UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION } from './tenant-language.queries';

describe('tenant-language.queries', () => {
  it('exports MY_TENANT_LANGUAGE_SETTINGS_QUERY as a query DocumentNode', () => {
    expect(MY_TENANT_LANGUAGE_SETTINGS_QUERY).toBeDefined();
    expect(MY_TENANT_LANGUAGE_SETTINGS_QUERY.kind).toBe('Document');
    expect(MY_TENANT_LANGUAGE_SETTINGS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_TENANT_LANGUAGE_SETTINGS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyTenantLanguageSettings');
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
