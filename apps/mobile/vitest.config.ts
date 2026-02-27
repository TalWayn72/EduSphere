import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // react-native uses Flow `import typeof` syntax which Vite/Rollup cannot
      // parse. Redirect to a hand-written vitest mock for all test files.
      'react-native': path.resolve(__dirname, 'src/__mocks__/react-native.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/sync/__tests__/**/*.test.ts',
      'src/hooks/__tests__/**/*.test.ts',
      'src/hooks/__tests__/**/*.test.tsx',
      'src/notifications/__tests__/**/*.test.ts',
      'src/auth/__tests__/**/*.test.ts',
      'src/screens/MyBadgesScreen.test.tsx',
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
