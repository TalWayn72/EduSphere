import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/integration/**/*.spec.ts'],
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
