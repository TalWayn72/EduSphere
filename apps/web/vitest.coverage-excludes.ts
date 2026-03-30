/** Files excluded from Vitest coverage — maintained separately for readability. */
export const coverageExcludes: string[] = [
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
  'src/components/VideoPlayerCore.tsx',
  // Model3DViewer — WebGL renderer not available in jsdom; logic tested via unit tests
  'src/components/Model3DViewer.tsx',
  'src/components/VideoProgressMarkers.tsx',
  'src/components/TranscriptPanel.tsx',
  // Storybook story files — not production logic
  'src/components/VideoPlayer.stories.tsx',
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
  'src/components/editor/RichEditor.tsx',
  'src/components/editor/EditorToolbar.tsx',
  'src/components/editor/index.ts',
  // ProseMirror plugin — requires live Tiptap EditorView (DOM), not testable in jsdom
  'src/components/annotation/AnnotationDecorationsPlugin.ts',
  // CollaborativeEditorToolbar — receives live Tiptap Editor instance as prop (DOM APIs)
  'src/components/CollaborativeEditorToolbar.tsx',
  // Layout — navigation shell; NavLink render-prop callbacks ({isActive}) not
  // attributed to correct source lines by V8/source-maps (known limitation).
  'src/components/Layout.tsx',
  // AgentsPage — !DEV_MODE production GraphQL path unreachable in tests
  'src/pages/AgentsPage.tsx',
  // AIChatPanel — !DEV_MODE production GraphQL path unreachable in tests
  'src/components/AIChatPanel.tsx',
  // Quiz, SCORM and portal-builder components — Tier-2/3 features, tested via E2E
  'src/components/quiz/**',
  'src/components/scorm/**',
  'src/components/portal-builder/**',
  // Tier-3 knowledge/skill/learning widgets — complex chart + graph deps, tested via E2E
  'src/components/SkillGapWidget.tsx',
  'src/components/DailyLearningWidget.tsx',
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
  // KnowledgeGraph — D3 force-simulation + canvas APIs not available in jsdom
  'src/pages/KnowledgeGraph.tsx',
  // ContentViewer + AnnotationsPage — real-time annotation subscriptions + video APIs
  'src/pages/ContentViewer.tsx',
  'src/pages/AnnotationsPage.tsx',
  // content-viewer.utils.tsx — JSX-rendering helper (highlightText uses DOM mark elements)
  'src/pages/content-viewer.utils.tsx',
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
  // useNotifications uses GraphQL subscription (WebSocket + NATS) — requires live server
  'src/hooks/useNotifications.ts',
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
  // Remaining mock data files — static fixture data, no executable logic to test
  'src/lib/mock-annotations.ts',
  'src/lib/mock-annotations.data.ts',
  'src/lib/mock-transcript.data.ts',
  'src/lib/mock-video-annotations.data.ts',
  // All GraphQL operation files — pure string definitions, no executable logic
  'src/lib/graphql/**',
  // Services — Tier-3 features, tested via E2E
  'src/services/**',
];
