import { describe, it, expect } from 'vitest';
import {
  SECURITY_SETTINGS_QUERY,
  UPDATE_SECURITY_SETTINGS_MUTATION,
} from './security.queries';

describe('security.queries', () => {
  it('exports SECURITY_SETTINGS_QUERY as a query DocumentNode', () => {
    expect(SECURITY_SETTINGS_QUERY).toBeDefined();
    expect(SECURITY_SETTINGS_QUERY.kind).toBe('Document');
    expect(SECURITY_SETTINGS_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = SECURITY_SETTINGS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MySecuritySettings');
  });

  it('exports UPDATE_SECURITY_SETTINGS_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_SECURITY_SETTINGS_MUTATION).toBeDefined();
    expect(UPDATE_SECURITY_SETTINGS_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_SECURITY_SETTINGS_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_SECURITY_SETTINGS_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateSecuritySettings');
  });
});
