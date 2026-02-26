import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/sync/__tests__/**/*.test.ts',
      'src/hooks/__tests__/**/*.test.ts',
      'src/hooks/__tests__/**/*.test.tsx',
      'src/screens/__tests__/**/*.test.tsx',
    ],
    // useOfflineAnnotations.test.tsx imports @testing-library/react-hooks which
    // is not installed — exclude until the package is added as a dev dependency
    exclude: ['src/hooks/__tests__/useOfflineAnnotations.test.tsx'],
    passWithNoTests: true,
    restoreAllMocks: true,
    clearMocks: true,
    testTimeout: 15000,
  },
});
