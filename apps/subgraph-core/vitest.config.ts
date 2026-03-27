import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: [
      // Orphaned specs — source modules not yet implemented
      'src/org/org-analytics.service.spec.ts',
      'src/org/org-provisioning.service.memory.spec.ts',
      'src/org/api-key.service.spec.ts',
      'src/org/org-provisioning.service.spec.ts',
      'src/org/org-invitation.service.spec.ts',
      'src/org/webhook.service.spec.ts',
      'src/org/org-gamification.service.spec.ts',
      'src/org/marketplace.service.spec.ts',
      'src/org/trial.service.spec.ts',
    ],
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/**/*.module.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
