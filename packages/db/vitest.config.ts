import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/migrate.ts',
        'src/seed.ts',
        'src/schema/index.ts',
        'src/graph/index.ts',
        'src/rls/index.ts',
        'src/index.ts',
        // Barrel re-export — no executable logic
        'src/helpers/index.ts',
        // Requires live DB replica connection — not unit-testable
        'src/helpers/readReplica.ts',
      ],
      thresholds: {
        // Drizzle schema files are declaration-heavy (pgTable column defs).
        // Thresholds reflect achievable coverage without a live DB connection.
        lines: 65,
        functions: 25,
        branches: 55,
        statements: 65,
      },
    },
  },
});
