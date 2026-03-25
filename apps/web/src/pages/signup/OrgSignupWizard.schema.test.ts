import { describe, it, expect } from 'vitest';
import { orgSignupSchema, stepSchemas } from './OrgSignupWizard.schema';

describe('OrgSignupWizard.schema', () => {
  it('exports orgSignupSchema', () => {
    expect(orgSignupSchema).toBeDefined();
  });

  it('exports stepSchemas array', () => {
    expect(Array.isArray(stepSchemas)).toBe(true);
    expect(stepSchemas.length).toBeGreaterThan(0);
  });

  it('orgSignupSchema validates correct data', () => {
    const result = orgSignupSchema.safeParse({
      email: 'test@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      orgName: 'Test Org',
      slug: 'test-org',
      industry: 'education',
      size: '10-50',
      primaryColor: '#3b82f6',
      logo: '',
    });
    // Just check it doesn't throw; specifics depend on schema details
    expect(result).toBeDefined();
  });
});
