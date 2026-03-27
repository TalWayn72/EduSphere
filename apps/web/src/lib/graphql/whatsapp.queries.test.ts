import { describe, it, expect } from 'vitest';
import { REGISTER_WHATSAPP_MUTATION, VERIFY_WHATSAPP_MUTATION } from './whatsapp.queries';

describe('whatsapp.queries', () => {
  it('exports REGISTER_WHATSAPP_MUTATION as a mutation DocumentNode', () => {
    expect(REGISTER_WHATSAPP_MUTATION).toBeDefined();
    expect(REGISTER_WHATSAPP_MUTATION.kind).toBe('Document');
    expect(REGISTER_WHATSAPP_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REGISTER_WHATSAPP_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RegisterWhatsApp');
  });

  it('exports VERIFY_WHATSAPP_MUTATION as a mutation DocumentNode', () => {
    expect(VERIFY_WHATSAPP_MUTATION).toBeDefined();
    expect(VERIFY_WHATSAPP_MUTATION.kind).toBe('Document');
    expect(VERIFY_WHATSAPP_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = VERIFY_WHATSAPP_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('VerifyWhatsApp');
  });

});
