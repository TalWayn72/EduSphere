import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    // Ensure vitest doesn't pick up the root workspace tsconfig
    alias: {},
  },
  // Point to the isolated tsconfig for performance tests
  root: resolve(__dirname, '..'),
});
