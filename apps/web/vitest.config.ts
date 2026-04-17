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
    // 'vmThreads' shares a single Node process (one V8 isolate per worker) so
    // fork-spawn overhead is eliminated.  GitHub-hosted runners have 2 vCPUs;
    // 2 workers saturates them without OOM risk.  Memory cap raised from 512 MB
    // to 1 GB to reduce GC pressure across the 4,400+ test suite.
    pool: 'vmThreads',
    vmThreadOptions: {
      memoryLimit: '1gb',
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
