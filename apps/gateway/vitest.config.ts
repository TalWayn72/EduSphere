import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'tests/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30000,
  },
});
