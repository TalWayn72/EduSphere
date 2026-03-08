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
  define: {
    // React Native global — always true in test (enables DEV_MODE mock data)
    __DEV__: true,
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
      'src/screens/HomeScreen.test.tsx',
      'src/screens/CoursesScreen.test.tsx',
      'src/screens/AITutorScreen.test.ts',
      'src/screens/LiveSessionsScreen.test.tsx',
      'src/screens/SkillTreeScreen.test.tsx',
      'src/screens/ModelViewerScreen.test.tsx',
      'src/screens/__tests__/GamificationScreen.test.ts',
      'src/screens/__tests__/DiscussionsScreen.test.ts',
      'src/screens/__tests__/ProfileScreen.test.ts',
      'src/screens/__tests__/SettingsScreen.test.ts',
      'src/screens/__tests__/KnowledgeGraphScreen.test.ts',
      'src/screens/__tests__/OnboardingScreen.test.ts',
      'src/components/MasteryBadge.test.tsx',
      'src/components/VisualBottomSheet.test.tsx',
      'src/components/WeeklyActivityBar.test.tsx',
      'src/lib/theme.test.ts',
    ],
    // useOfflineAnnotations.test.tsx imports @testing-library/react-hooks which
    // is not installed — exclude until the package is added as a dev dependency
    exclude: ['src/hooks/__tests__/useOfflineAnnotations.test.tsx'],
    passWithNoTests: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 15000,
  },
});
