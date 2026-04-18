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
    // Reduced from 30 s — unit tests should never need 30 s; 10 s catches real
    // hangs much sooner and prevents a single flaky test burning 30 s of shard time.
    testTimeout: 10000,
    hookTimeout: 10000,
    // 'threads' runs in real V8 threads where Web globals (TransformStream, etc.)
    // are available — required by @mswjs/interceptors.  Faster than 'forks' since
    // it shares the Node process; vmThreads was dropped because VM contexts lack
    // TransformStream, breaking MSW.
    pool: 'threads',
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
