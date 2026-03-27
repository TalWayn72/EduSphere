import { describe, it, expect } from 'vitest';
import { UPDATE_CONSENT_MUTATION } from './consent.queries';

describe('consent.queries', () => {
  it('exports UPDATE_CONSENT_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_CONSENT_MUTATION).toBeDefined();
    expect(UPDATE_CONSENT_MUTATION.kind).toBe('Document');
    expect(UPDATE_CONSENT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_CONSENT_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateConsent');
  });

});
