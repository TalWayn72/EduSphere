import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Stub path for tiptap packages that are not linked in apps/web/node_modules
// (pnpm virtual store symlinks are missing at the workspace level).
// All of these packages are mocked via vi.mock() in the relevant test files;
// the aliases let Vitest resolve the module path without throwing
// "Failed to resolve import".
const tiptapStub = path.resolve(__dirname, './src/test/stubs/tiptap-stub.ts');
// Each @tiptap/pm/* package and @tiptap/core needs its own distinct stub file.
// Vitest uses the resolved file path as the module-cache key, so if multiple
// packages alias to the same file, vi.mock() calls overwrite each other
// (last writer wins).  Separate files = separate cache slots = safe isolation.
const tiptapCoreStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-core-stub.ts'
);
const tiptapPmStateStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-pm-state-stub.ts'
);
const tiptapPmViewStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-pm-view-stub.ts'
);
const tiptapPmModelStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-pm-model-stub.ts'
);

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
      lowlight: tiptapStub,
      '@hocuspocus/provider': tiptapStub,
      // CSS imports from katex — not needed in jsdom tests
      'katex/dist/katex.min.css': tiptapStub,
      // Each ProseMirror / Tiptap-core package gets a dedicated stub file so that
      // Vitest assigns each a separate module-cache slot.  If multiple packages
      // alias to the same file, vi.mock() calls for each share one slot and
      // overwrite each other (last writer wins).
      '@tiptap/core': tiptapCoreStub,
      '@tiptap/pm/state': tiptapPmStateStub,
      '@tiptap/pm/view': tiptapPmViewStub,
      '@tiptap/pm/model': tiptapPmModelStub,
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
        'src/pwa.ts',
        // Router-level App entrypoint — exercised through each page's MemoryRouter wrapper
        'src/App.tsx',
        // Radix UI primitive wrappers — thin re-exports of library components, no business logic
        'src/components/ui/**',
        // Video/media components require HTMLVideoElement not available in jsdom
        'src/components/VideoPlayer.tsx',
        'src/components/VideoProgressMarkers.tsx',
        'src/components/TranscriptPanel.tsx',
        // Annotation sub-components (old) rendered inside ContentViewer via Radix portals
        'src/components/AddAnnotationOverlay.tsx',
        'src/components/AnnotationForm.tsx',
        'src/components/AnnotationPanel.tsx',
        'src/components/AnnotationThread.tsx',
        'src/components/AnnotationsPanel.tsx',
        'src/components/LayerToggleBar.tsx',
        // New annotation components that require Tiptap DOM / video APIs not available in jsdom
        'src/components/annotation/AnnotatedDocumentViewer.tsx',
        'src/components/annotation/AddAnnotationForm.tsx',
        'src/components/annotation/AnnotationTimeline.tsx',
        'src/components/annotation/VideoAnnotationLayer.tsx',
        // Editor components that require Tiptap DOM APIs not available in jsdom
        'src/components/editor/AnnotatedRichDocumentViewer.tsx',
        'src/components/editor/RichContentViewer.tsx',
        'src/components/editor/RichDocumentEditor.tsx',
        'src/components/editor/index.ts',
        // Quiz, SCORM and portal-builder components — Tier-2/3 features, tested via E2E
        'src/components/quiz/**',
        'src/components/scorm/**',
        'src/components/portal-builder/**',
        // Tier-2/3 components that require DOM/media APIs or have no unit tests (E2E covered)
        'src/components/AiCourseCreatorModal.tsx',
        'src/components/AltTextModal.tsx',
        'src/components/AnnotationItem.tsx',
        'src/components/AssessmentForm.tsx',
        'src/components/AssessmentResultReport.tsx',
        'src/components/BadgeFormFields.tsx',
        'src/components/BadgesGrid.tsx',
        'src/components/BreakoutRoomPanel.tsx',
        'src/components/CollaborativeEditor.tsx',
        'src/components/CompetencyGoalWidget.tsx',
        'src/components/ContentViewerBreadcrumb.tsx',
        'src/components/DocumentAnnotationPanel.tsx',
        'src/components/FollowButton.tsx',
        'src/components/FollowersList.tsx',
        'src/components/GoalPathPanel.tsx',
        'src/components/LiveSessionCard.tsx',
        'src/components/MicrolessonCard.tsx',
        'src/components/OpenBadgeCard.tsx',
        'src/components/PlagiarismReportCard.tsx',
        'src/components/PollWidget.tsx',
        'src/components/PurchaseCourseButton.tsx',
        'src/components/RoleplayEvaluationReport.tsx',
        'src/components/RoleplaySimulator.tsx',
        'src/components/SRSReviewSession.tsx',
        'src/components/ScenarioPlayer.tsx',
        'src/components/ScheduleLiveSessionModal.tsx',
        'src/components/ScormExportButton.tsx',
        'src/components/SocialFeedWidget.tsx',
        'src/components/SourceManager.tsx',
        'src/components/StorageWarningBanner.tsx',
        'src/components/StreakIndicator.tsx',
        'src/components/TextSubmissionForm.tsx',
        // Admin UI components — tested via E2E
        'src/components/admin/**',
        'src/components/AtRiskLearnersTable.tsx',
        // Demo / showcase page — not part of production feature coverage
        'src/pages/AnnotationDemo.tsx',
        // Media-upload wizard step — requires FileReader / video APIs not available in jsdom
        'src/pages/CourseWizardMediaStep.tsx',
        // Admin pages — tested via E2E
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
        // Tier-2/3 pages — tested via E2E, no unit tests
        'src/pages/AccessibilityStatementPage.tsx',
        'src/pages/AssessmentCampaignPage.tsx',
        'src/pages/BadgeVerifierPage.tsx',
        'src/pages/BiExportSettingsPage.tsx',
        'src/pages/CollaborationPage.tsx',
        'src/pages/CPDReportPage.tsx',
        'src/pages/CPDSettingsPage.tsx',
        'src/pages/ComplianceReportsPage.tsx',
        'src/pages/CourseAnalyticsPage.tsx',
        'src/pages/CourseAnalyticsPage.charts.tsx',
        'src/pages/CourseDetailPage.tsx',
        'src/pages/CourseDetailPage.modules.tsx',
        'src/pages/CourseLibraryPage.tsx',
        'src/pages/CrmSettingsPage.tsx',
        // DocumentAnnotationPage requires Tiptap DOM/ResizablePanels — covered by E2E
        'src/pages/DocumentAnnotationPage.tsx',
        'src/pages/DocumentAnnotationPage.toolbar.tsx',
        'src/pages/InstructorEarningsPage.tsx',
        'src/pages/LtiSettingsPage.tsx',
        'src/pages/MarketplacePage.tsx',
        'src/pages/PortalBuilderPage.tsx',
        'src/pages/PortalPage.tsx',
        'src/pages/ProfileVisibilityCard.tsx',
        'src/pages/ProgramDetailPage.tsx',
        'src/pages/ProgramsPage.tsx',
        'src/pages/PublicProfilePage.tsx',
        'src/pages/QuizContentPage.tsx',
        'src/pages/RichDocumentPage.tsx',
        'src/pages/ScenariosPage.tsx',
        'src/pages/ScimSettingsPage.tsx',
        'src/pages/ScormContentViewer.tsx',
        // SettingsPage — forms-heavy page tested via E2E integration
        'src/pages/SettingsPage.tsx',
        // CourseWizardStep2 — media upload step with FileReader/video APIs
        'src/pages/CourseWizardStep2.tsx',
        'src/pages/XapiSettingsPage.tsx',
        'src/pages/chavruta/ChavrutaPage.tsx',
        // Tier-2/3 hooks — no unit tests (tested via E2E or integration tests)
        'src/hooks/useAuthRole.ts',
        'src/hooks/useChavrutaDebate.ts',
        'src/hooks/useContentData.ts',
        'src/hooks/useCourseNavigation.ts',
        'src/hooks/useGradeQuiz.ts',
        'src/hooks/useQuizContent.ts',
        'src/hooks/useScormSession.ts',
        'src/hooks/useStorageManager.ts',
        'src/hooks/useSubmitAssignment.ts',
        // useVideoAnnotations requires HTMLVideoElement APIs not available in jsdom
        'src/hooks/useVideoAnnotations.ts',
        // urql client config — instantiates real HTTP/WS connections, not unit-testable
        'src/lib/urql-client.ts',
        // auth.ts wraps Keycloak-js which requires a real browser + OIDC server
        'src/lib/auth.ts',
        // Infrastructure files — router/store config, no executable business logic to test
        'src/lib/router.tsx',
        'src/lib/store.ts',
        'src/lib/branding.ts',
        'src/lib/i18n.ts',
        'src/lib/offline-db.ts',
        'src/lib/persisted-query-client.ts',
        'src/lib/query-client.ts',
        'src/lib/quiz-schema-client.ts',
        'src/lib/scorm/**',
        // TypeScript-only type definition files (zero executable lines)
        'src/types/**',
        // Mock data files — imported in tests but the data itself needs no testing
        'src/lib/mock-chat.ts',
        'src/lib/mock-dashboard.data.ts',
        // All GraphQL operation files — pure string definitions, no executable logic
        'src/lib/graphql/**',
        // Services — Tier-3 features, tested via E2E
        'src/services/**',
      ],
      thresholds: {
        lines: 79,
        functions: 70,
        branches: 65,
        statements: 79,
      },
    },
  },
});
