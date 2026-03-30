import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { vitestAliases } from './vitest.aliases';
import { coverageExcludes } from './vitest.coverage-excludes';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEV_MODE': '"true"',
  },
  resolve: {
    alias: vitestAliases,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
    restoreAllMocks: true,
    clearMocks: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    forkOptions: {
      execArgv: ['--max-old-space-size=512'],
    },
    reporters: [
      'default',
      ['junit', { outputFile: './test-results/results.xml', suiteName: 'web' }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: coverageExcludes,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
