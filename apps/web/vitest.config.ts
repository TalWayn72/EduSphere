import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Stub path for tiptap packages that are not linked in apps/web/node_modules
// (pnpm virtual store symlinks are missing at the workspace level).
// All of these packages are mocked via vi.mock() in the relevant test files;
// the aliases let Vitest resolve the module path without throwing
// "Failed to resolve import".
const tiptapStub = path.resolve(__dirname, './src/test/stubs/tiptap-stub.ts');

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEV_MODE': '"true"',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Tiptap extension stubs — packages exist in pnpm virtual store but
      // are not symlinked into apps/web/node_modules. vi.mock() intercepts
      // these in tests; the alias just provides a resolvable path.
      '@tiptap/extension-code-block-lowlight': tiptapStub,
      '@tiptap/extension-collaboration': tiptapStub,
      '@tiptap/extension-collaboration-cursor': tiptapStub,
      '@tiptap/extension-mathematics': tiptapStub,
      '@tiptap/extension-mention': tiptapStub,
      '@tiptap/extension-placeholder': tiptapStub,
      '@tiptap/extension-table': tiptapStub,
      '@tiptap/extension-table-row': tiptapStub,
      '@tiptap/extension-table-cell': tiptapStub,
      '@tiptap/extension-table-header': tiptapStub,
      '@tiptap/extension-task-list': tiptapStub,
      '@tiptap/extension-task-item': tiptapStub,
      '@tiptap/extension-image': tiptapStub,
      '@tiptap/react': tiptapStub,
      '@tiptap/starter-kit': tiptapStub,
      'lowlight': tiptapStub,
      '@hocuspocus/provider': tiptapStub,
      // CSS imports from katex — not needed in jsdom tests
      'katex/dist/katex.min.css': tiptapStub,
      // ProseMirror packages used by AnnotationDecorationsPlugin — real packages that work in jsdom
      // but alias them to stub for test isolation
      '@tiptap/pm/state': tiptapStub,
      '@tiptap/pm/view': tiptapStub,
      '@tiptap/pm/model': tiptapStub,
      // react-resizable-panels — not testable in jsdom, stub for UI component tests
      'react-resizable-panels': tiptapStub,
    },
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Router-level App entrypoint — exercised through each page's MemoryRouter wrapper
        'src/App.tsx',
        // Radix UI primitive wrappers — thin re-exports of library components, no business logic
        'src/components/ui/**',
        // Custom hooks covered by dedicated *.test.ts files in src/hooks/
        // Only exclude hooks that genuinely can't be unit-tested (none currently).
        // Video/media components require HTMLVideoElement not available in jsdom
        'src/components/VideoPlayer.tsx',
        'src/components/VideoProgressMarkers.tsx',
        'src/components/TranscriptPanel.tsx',
        // Annotation sub-components rendered inside ContentViewer via Radix portals — covered indirectly
        'src/components/AddAnnotationOverlay.tsx',
        'src/components/AnnotationForm.tsx',
        'src/components/AnnotationPanel.tsx',
        'src/components/AnnotationThread.tsx',
        'src/components/AnnotationsPanel.tsx',
        'src/components/LayerToggleBar.tsx',
        // Demo / showcase page — not part of production feature coverage
        'src/pages/AnnotationDemo.tsx',
        // Media-upload wizard step — requires FileReader / video APIs not available in jsdom
        'src/pages/CourseWizardMediaStep.tsx',
        // urql client config — instantiates real HTTP/WS connections, not unit-testable
        'src/lib/urql-client.ts',
        // auth.ts wraps Keycloak-js which requires a real browser + OIDC server
        'src/lib/auth.ts',
        // GraphQL query / mutation strings (no executable logic)
        'src/lib/graphql/index.ts',
        'src/lib/graphql/content.mutations.ts',
        'src/lib/graphql/content.queries.ts',
        'src/lib/graphql/annotation.mutations.ts',
        // TypeScript-only type definition files (zero executable lines)
        'src/types/**',
        // Mock data files — imported in tests but the data itself needs no testing
        'src/lib/mock-chat.ts',
        'src/lib/mock-dashboard.data.ts',
        // Admin UI pages — tested via E2E (apps/web/e2e/admin-*.spec.ts); excluded from unit coverage
        'src/components/admin/**',
        'src/components/AtRiskLearnersTable.tsx',
        'src/pages/AdminDashboardPage.tsx',
        'src/pages/AnnouncementsPage.tsx',
        'src/pages/AnnouncementsPage.form.tsx',
        'src/pages/AtRiskDashboardPage.tsx',
        'src/pages/AtRiskDashboardPage.config.tsx',
        'src/pages/AuditLogPage.tsx',
        'src/pages/BrandingSettingsPage.tsx',
        'src/pages/BrandingSettingsPage.form.tsx',
        'src/pages/EnrollmentManagementPage.tsx',
        'src/pages/GamificationSettingsPage.tsx',
        'src/pages/LanguageSettingsPage.tsx',
        'src/pages/NotificationTemplatesPage.tsx',
        'src/pages/NotificationTemplatesPage.editor.tsx',
        'src/pages/RoleManagementPage.tsx',
        'src/pages/RoleManagementPage.detail.tsx',
        'src/pages/RoleManagementPage.modal.tsx',
        'src/pages/SecuritySettingsPage.tsx',
        'src/pages/SecuritySettingsPage.sections.tsx',
        'src/pages/UserManagementPage.tsx',
        'src/pages/UserManagementPage.modals.tsx',
        // GraphQL query/mutation files for Admin + Tier-3 features — no executable logic
        'src/lib/graphql/admin-*.ts',
        'src/lib/graphql/announcements.queries.ts',
        'src/lib/graphql/audit.queries.ts',
        'src/lib/graphql/branding.queries.ts',
        'src/lib/graphql/security.queries.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
