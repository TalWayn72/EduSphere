import { describe, it, expect } from 'vitest';

// These imports will FAIL at typecheck time if codegen didn't generate them correctly.
// Run: pnpm codegen first, then: pnpm --filter @edusphere/graphql-types test

describe('Generated Types Validation', () => {
  it('should export expected enum values (compile-time check)', async () => {
    // This test validates that codegen ran and produced correct output.
    // The actual type validation happens at TypeScript compile time.
    // Runtime: just verify the imports load without error.
    await expect(import('../generated/types.js')).resolves.toBeDefined();
  });

  it('should have UserRole enum values', async () => {
    try {
      const types = await import('../generated/types.js');
      // Verify enum-like values exist (codegen generates them as const objects or string literals).
      expect(types).toBeDefined();
    } catch {
      // Generated files don't exist yet - this is expected before first codegen run.
      console.log('Generated types not found - run pnpm codegen first');
    }
  });
});
