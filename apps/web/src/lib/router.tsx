import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SmartRoot } from '@/components/SmartRoot';

// ── Lazy loaded: heavy feature pages ─────────────────────────────────────────
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard }))
);
// UnifiedLearningPage replaces ContentViewer + DocumentAnnotationPage
const UnifiedLearningPage = lazy(() =>
  import('@/pages/UnifiedLearningPage').then((m) => ({
    default: m.UnifiedLearningPage,
  }))
);
// Keep ContentViewer + DocumentAnnotationPage lazy-loaded so existing imports don't break
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ContentViewer = lazy(() =>
  import('@/pages/ContentViewer').then((m) => ({ default: m.ContentViewer }))
);
const QuizContentPage = lazy(() =>
  import('@/pages/QuizContentPage').then((m) => ({
    default: m.QuizContentPage,
  }))
);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RichDocumentPage = lazy(() =>
  import('@/pages/RichDocumentPage').then((m) => ({
    default: m.RichDocumentPage,
  }))
);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DocumentAnnotationPage = lazy(() =>
  import('@/pages/DocumentAnnotationPage').then((m) => ({
    default: m.DocumentAnnotationPage,
  }))
);
const CourseList = lazy(() =>
  import('@/pages/CourseList').then((m) => ({ default: m.CourseList }))
);
const KnowledgeGraph = lazy(() =>
  import('@/pages/KnowledgeGraph').then((m) => ({ default: m.KnowledgeGraph }))
);
const AgentsPage = lazy(() =>
  import('@/pages/AgentsPage').then((m) => ({ default: m.AgentsPage }))
);
const AgentStudioPage = lazy(() =>
  import('@/pages/AgentStudioPage').then((m) => ({ default: m.AgentStudioPage }))
);
const AnnotationsPage = lazy(() =>
  import('@/pages/AnnotationsPage').then((m) => ({
    default: m.AnnotationsPage,
  }))
);
const CollaborationPage = lazy(() =>
  import('@/pages/CollaborationPage').then((m) => ({
    default: m.CollaborationPage,
  }))
);
const CollaborationSessionPage = lazy(() =>
  import('@/pages/CollaborationSessionPage').then((m) => ({
    default: m.CollaborationSessionPage,
  }))
);
const SearchPage = lazy(() =>
  import('@/pages/Search').then((m) => ({ default: m.SearchPage }))
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const CourseCreatePage = lazy(() =>
  import('@/pages/CourseCreatePage').then((m) => ({
    default: m.CourseCreatePage,
  }))
);
const CourseDetailPage = lazy(() =>
  import('@/pages/CourseDetailPage').then((m) => ({
    default: m.CourseDetailPage,
  }))
);
const CourseEditPage = lazy(() =>
  import('@/pages/CourseEditPage').then((m) => ({
    default: m.CourseEditPage,
  }))
);
const CourseAnalyticsPage = lazy(() =>
  import('@/pages/CourseAnalyticsPage').then((m) => ({
    default: m.CourseAnalyticsPage,
  }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ComplianceReportsPage = lazy(() =>
  import('@/pages/ComplianceReportsPage').then((m) => ({
    default: m.ComplianceReportsPage,
  }))
);
const ScimSettingsPage = lazy(() =>
  import('@/pages/ScimSettingsPage').then((m) => ({
    default: m.ScimSettingsPage,
  }))
);
const XapiSettingsPage = lazy(() =>
  import('@/pages/XapiSettingsPage').then((m) => ({
    default: m.XapiSettingsPage,
  }))
);
const AnnotationDemo = lazy(() => import('@/pages/AnnotationDemo'));
const ChavrutaPage = lazy(() =>
  import('@/pages/chavruta/ChavrutaPage').then((m) => ({
    default: m.ChavrutaPage,
  }))
);
const LtiSettingsPage = lazy(() =>
  import('@/pages/LtiSettingsPage').then((m) => ({
    default: m.LtiSettingsPage,
  }))
);
const ScenariosPage = lazy(() =>
  import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage }))
);
const PublicProfilePage = lazy(() =>
  import('@/pages/PublicProfilePage').then((m) => ({
    default: m.PublicProfilePage,
  }))
);
const AccessibilityStatementPage = lazy(() =>
  import('@/pages/AccessibilityStatementPage').then((m) => ({
    default: m.AccessibilityStatementPage,
  }))
);
const ProgramsPage = lazy(() =>
  import('@/pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
);
const ProgramDetailPage = lazy(() =>
  import('@/pages/ProgramDetailPage').then((m) => ({
    default: m.ProgramDetailPage,
  }))
);
const AssessmentCampaignPage = lazy(() =>
  import('@/pages/AssessmentCampaignPage').then((m) => ({
    default: m.AssessmentCampaignPage,
  }))
);
const AssessmentPage = lazy(() =>
  import('@/pages/AssessmentPage').then((m) => ({
    default: m.AssessmentPage,
  }))
);
const CrmSettingsPage = lazy(() =>
  import('@/pages/CrmSettingsPage').then((m) => ({
    default: m.CrmSettingsPage,
  }))
);
const MarketplacePage = lazy(() =>
  import('@/pages/MarketplacePage').then((m) => ({
    default: m.MarketplacePage,
  }))
);
const SrsReviewPage = lazy(() =>
  import('@/pages/SrsReviewPage').then((m) => ({
    default: m.SrsReviewPage,
  }))
);
const InstructorEarningsPage = lazy(() =>
  import('@/pages/InstructorEarningsPage').then((m) => ({
    default: m.InstructorEarningsPage,
  }))
);
const BadgeVerifierPage = lazy(() =>
  import('@/pages/BadgeVerifierPage').then((m) => ({
    default: m.BadgeVerifierPage,
  }))
);
const CourseLibraryPage = lazy(() =>
  import('@/pages/CourseLibraryPage').then((m) => ({
    default: m.CourseLibraryPage,
  }))
);
const PortalBuilderPage = lazy(() =>
  import('@/pages/PortalBuilderPage').then((m) => ({
    default: m.PortalBuilderPage,
  }))
);
const PortalPage = lazy(() =>
  import('@/pages/PortalPage').then((m) => ({ default: m.PortalPage }))
);
const LanguageSettingsPage = lazy(() =>
  import('@/pages/LanguageSettingsPage').then((m) => ({
    default: m.LanguageSettingsPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const BrandingSettingsPage = lazy(() =>
  import('@/pages/BrandingSettingsPage').then((m) => ({
    default: m.BrandingSettingsPage,
  }))
);
const UserManagementPage = lazy(() =>
  import('@/pages/UserManagementPage').then((m) => ({
    default: m.UserManagementPage,
  }))
);
const RoleManagementPage = lazy(() =>
  import('@/pages/RoleManagementPage').then((m) => ({
    default: m.RoleManagementPage,
  }))
);
const GamificationSettingsPage = lazy(() =>
  import('@/pages/GamificationSettingsPage').then((m) => ({
    default: m.GamificationSettingsPage,
  }))
);
const AnnouncementsPage = lazy(() =>
  import('@/pages/AnnouncementsPage').then((m) => ({
    default: m.AnnouncementsPage,
  }))
);
const EnrollmentManagementPage = lazy(() =>
  import('@/pages/EnrollmentManagementPage').then((m) => ({
    default: m.EnrollmentManagementPage,
  }))
);
const AtRiskDashboardPage = lazy(() =>
  import('@/pages/AtRiskDashboardPage').then((m) => ({
    default: m.AtRiskDashboardPage,
  }))
);
const SecuritySettingsPage = lazy(() =>
  import('@/pages/SecuritySettingsPage').then((m) => ({
    default: m.SecuritySettingsPage,
  }))
);
const AuditLogPage = lazy(() =>
  import('@/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
);
const AuditLogAdminPage = lazy(() =>
  import('@/pages/AuditLogAdminPage').then((m) => ({
    default: m.AuditLogAdminPage,
  }))
);
const NotificationTemplatesPage = lazy(() =>
  import('@/pages/NotificationTemplatesPage').then((m) => ({
    default: m.NotificationTemplatesPage,
  }))
);
const BiExportSettingsPage = lazy(() =>
  import('@/pages/BiExportSettingsPage').then((m) => ({
    default: m.BiExportSettingsPage,
  }))
);
const CpdSettingsPage = lazy(() =>
  import('@/pages/CPDSettingsPage').then((m) => ({
    default: m.CPDSettingsPage,
  }))
);
const LtiLaunchPage = lazy(() =>
  import('@/pages/LtiLaunchPage').then((m) => ({ default: m.LtiLaunchPage }))
);
const MyOpenBadgesPage = lazy(() =>
  import('@/pages/MyOpenBadgesPage').then((m) => ({
    default: m.MyOpenBadgesPage,
  }))
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  }))
);
const LeaderboardPage = lazy(() =>
  import('@/pages/LeaderboardPage').then((m) => ({
    default: m.LeaderboardPage,
  }))
);
const CreateLessonPage = lazy(() =>
  import('@/pages/CreateLessonPage').then((m) => ({
    default: m.CreateLessonPage,
  }))
);
const QuizBuilderPage = lazy(() =>
  import('@/pages/QuizBuilderPage').then((m) => ({
    default: m.QuizBuilderPage,
  }))
);
const LessonDetailPage = lazy(() =>
  import('@/pages/LessonDetailPage').then((m) => ({
    default: m.LessonDetailPage,
  }))
);
const LessonPipelinePage = lazy(() =>
  import('@/pages/LessonPipelinePage').then((m) => ({
    default: m.LessonPipelinePage,
  }))
);
const LessonResultsPage = lazy(() =>
  import('@/pages/LessonResultsPage').then((m) => ({
    default: m.LessonResultsPage,
  }))
);
const KnowledgeGraphPage = lazy(() => import('@/pages/KnowledgeGraphPage'));
const ThemeSettingsPage = lazy(() =>
  import('@/pages/ThemeSettingsPage').then((m) => ({
    default: m.ThemeSettingsPage,
  }))
);
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const CoursesDiscoveryPage = lazy(() =>
  import('@/pages/CoursesDiscoveryPage').then((m) => ({
    default: m.CoursesDiscoveryPage,
  }))
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  }))
);
const LiveSessionsPage = lazy(() =>
  import('@/pages/LiveSessionsPage').then((m) => ({
    default: m.LiveSessionsPage,
  }))
);
const LiveSessionDetailPage = lazy(() =>
  import('@/pages/LiveSessionDetailPage').then((m) => ({
    default: m.LiveSessionDetailPage,
  }))
);
const SkillTreePage = lazy(() =>
  import('@/pages/SkillTreePage').then((m) => ({ default: m.SkillTreePage }))
);
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const InstructorMergeQueuePage = lazy(() =>
  import('@/pages/InstructorMergeQueuePage').then((m) => ({
    default: m.InstructorMergeQueuePage,
  }))
);
const Model3DPage = lazy(() =>
  import('@/pages/Model3DPage').then((m) => ({ default: m.Model3DPage }))
);
const TenantAnalyticsPage = lazy(() =>
  import('@/pages/TenantAnalyticsPage').then((m) => ({
    default: m.TenantAnalyticsPage,
  }))
);
const LessonPipelineBuilderPage = lazy(() =>
  import('@/pages/LessonPipelineBuilderPage').then((m) => ({
    default: m.LessonPipelineBuilderPage,
  }))
);
const GamificationPage = lazy(() =>
  import('@/pages/GamificationPage').then((m) => ({
    default: m.GamificationPage,
  }))
);
const ManagerDashboardPage = lazy(() =>
  import('@/pages/ManagerDashboardPage').then((m) => ({
    default: m.ManagerDashboardPage,
  }))
);
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const CertificatesPage = lazy(() =>
  import('@/pages/CertificatesPage').then((m) => ({
    default: m.CertificatesPage,
  }))
);
const ContentImportPage = lazy(() =>
  import('@/pages/ContentImportPage').then((m) => ({
    default: m.ContentImportPage,
  }))
);
const OAuthCallbackPage = lazy(() =>
  import('@/pages/OAuthCallbackPage').then((m) => ({
    default: m.OAuthCallbackPage,
  }))
);
const InstructorAnalyticsDashboard = lazy(() =>
  import('@/pages/InstructorAnalyticsDashboard').then((m) => ({
    default: m.InstructorAnalyticsDashboard,
  }))
);
const MyProgressPage = lazy(() =>
  import('@/pages/MyProgressPage').then((m) => ({ default: m.MyProgressPage }))
);
const SkillPathPage = lazy(() =>
  import('@/pages/SkillPathPage').then((m) => ({ default: m.SkillPathPage }))
);
const SkillGapDashboard = lazy(() =>
  import('@/pages/SkillGapDashboard').then((m) => ({ default: m.SkillGapDashboard }))
);
const DiscussionsPage = lazy(() =>
  import('@/pages/DiscussionsPage').then((m) => ({ default: m.DiscussionsPage }))
);
const DiscussionDetailPage = lazy(() =>
  import('@/pages/DiscussionDetailPage').then((m) => ({
    default: m.DiscussionDetailPage,
  }))
);
const SocialFeedPage = lazy(() =>
  import('@/pages/SocialFeedPage').then((m) => ({ default: m.SocialFeedPage }))
);
const UserSearchPage = lazy(() =>
  import('@/pages/UserSearchPage').then((m) => ({
    default: m.UserSearchPage,
  }))
);
const PeerReviewPage = lazy(() =>
  import('@/pages/PeerReviewPage').then((m) => ({ default: m.PeerReviewPage }))
);
const ReviewAssignmentPage = lazy(() =>
  import('@/pages/ReviewAssignmentPage').then((m) => ({
    default: m.ReviewAssignmentPage,
  }))
);
const AssessmentCampaignsPage = lazy(() =>
  import('@/pages/AssessmentCampaignsPage').then((m) => ({
    default: m.AssessmentCampaignsPage,
  }))
);
const AssessmentResponsePage = lazy(() =>
  import('@/pages/AssessmentResponsePage').then((m) => ({
    default: m.AssessmentResponsePage,
  }))
);
const AssessmentResultPage = lazy(() =>
  import('@/pages/AssessmentResultPage').then((m) => ({
    default: m.AssessmentResultPage,
  }))
);
const GroupChallengesPage = lazy(() =>
  import('@/pages/GroupChallengesPage').then((m) => ({
    default: m.GroupChallengesPage,
  }))
);
const ChallengeDetailPage = lazy(() =>
  import('@/pages/ChallengeDetailPage').then((m) => ({
    default: m.ChallengeDetailPage,
  }))
);
const PeerMatchingPage = lazy(() =>
  import('@/pages/PeerMatchingPage').then((m) => ({
    default: m.PeerMatchingPage,
  }))
);
const ChavrutaPartnerPage = lazy(() =>
  import('@/pages/chavruta/ChavrutaPartnerPage').then((m) => ({
    default: m.ChavrutaPartnerPage,
  }))
);
const MentorDiscoveryPage = lazy(() =>
  import('@/pages/mentor/MentorDiscoveryPage').then((m) => ({
    default: m.MentorDiscoveryPage,
  }))
);
const CohortInsightsPage = lazy(() =>
  import('@/pages/CohortInsightsPage').then((m) => ({
    default: m.CohortInsightsPage,
  }))
);
const PilotSignupPage = lazy(() =>
  import('@/pages/PilotSignupPage').then((m) => ({ default: m.PilotSignupPage }))
);
const PilotRequestsAdminPage = lazy(() =>
  import('@/pages/PilotRequestsAdminPage').then((m) => ({ default: m.PilotRequestsAdminPage }))
);
const OrgUsagePage = lazy(() =>
  import('@/pages/OrgUsagePage').then((m) => ({ default: m.OrgUsagePage }))
);
const PlatformUsageDashboardPage = lazy(() =>
  import('@/pages/PlatformUsageDashboardPage').then((m) => ({
    default: m.PlatformUsageDashboardPage,
  }))
);
const ROIAnalyticsDashboardPage = lazy(() =>
  import('@/pages/ROIAnalyticsDashboardPage').then((m) => ({
    default: m.ROIAnalyticsDashboardPage,
  }))
);
const FaqPage = lazy(() =>
  import('@/pages/FaqPage').then((m) => ({ default: m.FaqPage }))
);
const FeaturesPage = lazy(() =>
  import('@/pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage }))
);
const GlossaryPage = lazy(() =>
  import('@/pages/GlossaryPage').then((m) => ({ default: m.GlossaryPage }))
);
const PricingPage = lazy(() =>
  import('@/pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const PartnerSignupPage = lazy(() =>
  import('@/pages/PartnerSignupPage').then((m) => ({ default: m.PartnerSignupPage }))
);
const PartnerDashboardPage = lazy(() =>
  import('@/pages/PartnerDashboardPage').then((m) => ({ default: m.PartnerDashboardPage }))
);
const InvestorDeckPage = lazy(() =>
  import('@/pages/InvestorDeckPage').then((m) => ({ default: m.InvestorDeckPage }))
);
const HrisConfigPage = lazy(() =>
  import('@/pages/HrisConfigPage').then((m) => ({ default: m.HrisConfigPage }))
);
const AutoGradingResultsPage = lazy(() =>
  import('@/pages/AutoGradingResultsPage').then((m) => ({ default: m.AutoGradingResultsPage }))
);
const GapAnalysisDashboardPage = lazy(() =>
  import('@/pages/GapAnalysisDashboardPage').then((m) => ({ default: m.GapAnalysisDashboardPage }))
);
const StripeInvoicePage = lazy(() =>
  import('@/pages/admin/StripeInvoicePage').then((m) => ({ default: m.StripeInvoicePage }))
);

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// ── Wrap element in ProtectedRoute + Suspense ─────────────────────────────────
function guarded(element: React.ReactNode) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ProtectedRoute>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  // LTI 1.3 deep-link handler — intentionally public (not wrapped in ProtectedRoute)
  {
    path: '/lti/launch',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LtiLaunchPage />
      </Suspense>
    ),
  },
  {
    // Public marketing landing page — no auth required
    path: '/landing',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    // Public route — no authentication required
    path: '/accessibility',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AccessibilityStatementPage />
      </Suspense>
    ),
  },
  {
    // Public AEO pages — no authentication required
    path: '/faq',
    element: (
      <Suspense fallback={<PageLoader />}>
        <FaqPage />
      </Suspense>
    ),
  },
  {
    path: '/features',
    element: (
      <Suspense fallback={<PageLoader />}>
        <FeaturesPage />
      </Suspense>
    ),
  },
  {
    path: '/glossary',
    element: (
      <Suspense fallback={<PageLoader />}>
        <GlossaryPage />
      </Suspense>
    ),
  },
  {
    // Public pricing page — no authentication required
    path: '/pricing',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PricingPage />
      </Suspense>
    ),
  },
  {
    // Public route — OpenBadge 3.0 verifier (no auth, shareable link)
    path: '/verify/badge/:assertionId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <BadgeVerifierPage />
      </Suspense>
    ),
  },
  {
    // Unified learning interface for all content types (video, document, etc.)
    path: '/learn/:contentId',
    element: guarded(<UnifiedLearningPage />),
  },
  {
    // /document/ also renders the unified page (contentType detected inside)
    path: '/document/:contentId',
    element: guarded(<UnifiedLearningPage />),
  },
  {
    // SRS review session — SM-2 flashcard review
    path: '/srs-review',
    element: guarded(
      <Suspense fallback={<PageLoader />}>
        <SrsReviewPage />
      </Suspense>
    ),
  },
  {
    // Notifications full dashboard — all notifications with filters + date grouping
    path: '/notifications',
    element: guarded(
      <Suspense fallback={<PageLoader />}>
        <NotificationsPage />
      </Suspense>
    ),
  },
  {
    // Leaderboard — top 50 users by XP points
    path: '/leaderboard',
    element: guarded(<LeaderboardPage />),
  },
  {
    // Dedicated route for QUIZ content items
    path: '/quiz/:contentId',
    element: guarded(<QuizContentPage />),
  },
  {
    // Course discovery / explore page — linked from AppSidebar "Discover" item
    path: '/explore',
    element: guarded(<CoursesDiscoveryPage />),
  },
  {
    // Primary discovery route — canonical URL
    path: '/discover',
    element: guarded(<CoursesDiscoveryPage />),
  },
  {
    // Alias: /courses/discover → same page (used by E2E specs)
    path: '/courses/discover',
    element: guarded(<CoursesDiscoveryPage />),
  },
  {
    path: '/courses',
    element: guarded(<CourseList />),
  },
  {
    path: '/courses/new',
    element: guarded(<CourseCreatePage />),
  },
  {
    path: '/courses/:courseId/analytics',
    element: guarded(<CourseAnalyticsPage />),
  },
  {
    path: '/courses/:courseId/edit',
    element: guarded(<CourseEditPage />),
  },
  {
    // Lesson Pipeline Builder — WYSIWYG authoring (Phase 36)
    path: '/courses/:courseId/pipeline/builder',
    element: guarded(<LessonPipelineBuilderPage />),
  },
  {
    // Quiz Builder — instructor creates a quiz for a module
    path: '/courses/:courseId/modules/:moduleId/quiz/new',
    element: guarded(<QuizBuilderPage />),
  },
  {
    // Create lesson — must come before :courseId to avoid route shadowing
    path: '/courses/:courseId/lessons/new',
    element: guarded(<CreateLessonPage />),
  },
  {
    path: '/courses/:courseId/lessons/:lessonId/pipeline',
    element: guarded(<LessonPipelinePage />),
  },
  {
    path: '/courses/:courseId/lessons/:lessonId/results',
    element: guarded(<LessonResultsPage />),
  },
  {
    path: '/courses/:courseId/lessons/:lessonId',
    element: guarded(<LessonDetailPage />),
  },
  {
    path: '/courses/:courseId',
    element: guarded(<CourseDetailPage />),
  },
  {
    path: '/admin/lti',
    element: guarded(<LtiSettingsPage />),
  },
  {
    path: '/admin/compliance',
    element: guarded(<ComplianceReportsPage />),
  },
  {
    path: '/admin/scim',
    element: guarded(<ScimSettingsPage />),
  },
  {
    path: '/admin/xapi',
    element: guarded(<XapiSettingsPage />),
  },
  {
    path: '/admin/assessments',
    element: guarded(<AssessmentCampaignPage />),
  },
  {
    // 360° Assessment learner view — list of campaigns targeting me + campaigns to respond
    path: '/assessments',
    element: guarded(<AssessmentCampaignsPage />),
  },
  {
    // Submit a 360° assessment response
    path: '/assessments/:id/respond',
    element: guarded(<AssessmentResponsePage />),
  },
  {
    // View aggregated results for a 360° campaign
    path: '/assessments/:id/results',
    element: guarded(<AssessmentResultPage />),
  },
  {
    path: '/assessment/:assessmentId',
    element: guarded(<AssessmentPage />),
  },
  {
    path: '/admin/crm',
    element: guarded(<CrmSettingsPage />),
  },
  {
    path: '/admin/language',
    element: guarded(<LanguageSettingsPage />),
  },
  {
    // Portal builder — ORG_ADMIN only (protected)
    path: '/admin/portal',
    element: guarded(<PortalBuilderPage />),
  },
  {
    // Public portal viewer — no auth required
    path: '/portal',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PortalPage />
      </Suspense>
    ),
  },
  {
    path: '/marketplace',
    element: guarded(<MarketplacePage />),
  },
  {
    // Stripe checkout — reached from PurchaseCourseButton via ?secret=&session=&course=
    path: '/checkout',
    element: guarded(<CheckoutPage />),
  },
  {
    // Instructor Analytics Dashboard — aggregate analytics across all courses
    path: '/instructor/analytics',
    element: guarded(<InstructorAnalyticsDashboard />),
  },
  {
    // Instructor annotation merge queue — PRD §4.3
    path: '/instructor/merge-queue',
    element: guarded(<InstructorMergeQueuePage />),
  },
  {
    // 3D model viewer — PRD §3.3 G-1
    path: '/model3d/:assetId',
    element: guarded(<Model3DPage />),
  },
  {
    path: '/library',
    element: guarded(<CourseLibraryPage />),
  },
  {
    path: '/instructor/earnings',
    element: guarded(<InstructorEarningsPage />),
  },
  {
    // Legacy dashboard — kept for backward compatibility
    path: '/dashboard/legacy',
    element: guarded(<Dashboard />),
  },
  {
    // New Session 25 dashboard — primary learner home
    path: '/dashboard',
    element: guarded(<DashboardPage />),
  },
  {
    path: '/graph',
    element: guarded(<KnowledgeGraph />),
  },
  {
    // Standalone knowledge graph page — optional course filter via :courseId
    path: '/knowledge-graph',
    element: guarded(<KnowledgeGraphPage />),
  },
  {
    path: '/knowledge-graph/:courseId',
    element: guarded(<KnowledgeGraphPage />),
  },
  {
    // Visual skill tree — course-specific or global ('all')
    path: '/skill-tree',
    element: guarded(<SkillTreePage />),
  },
  {
    path: '/skill-tree/:courseId',
    element: guarded(<SkillTreePage />),
  },
  {
    // Live Sessions list
    path: '/sessions',
    element: guarded(<LiveSessionsPage />),
  },
  {
    // Live Session detail / join
    path: '/sessions/:sessionId',
    element: guarded(<LiveSessionDetailPage />),
  },
  {
    path: '/agents',
    element: guarded(<AgentsPage />),
  },
  {
    path: '/agents/studio',
    element: guarded(<AgentStudioPage />),
  },
  {
    path: '/gamification',
    element: guarded(<GamificationPage />),
  },
  {
    path: '/my-badges',
    element: guarded(<MyOpenBadgesPage />),
  },
  {
    // Student self-analytics page — shows streak, challenges, leaderboard position
    path: '/my-progress',
    element: guarded(<MyProgressPage />),
  },
  {
    // Skills-based learning paths — grid of all published skill paths
    path: '/skills',
    element: guarded(<SkillPathPage />),
  },
  {
    // Skill gap analysis — detailed view for a specific path
    path: '/skills/gap/:pathId',
    element: guarded(<SkillGapDashboard />),
  },
  {
    // Social learning feed — following activity + recommendations
    path: '/social',
    element: guarded(<SocialFeedPage />),
  },
  {
    path: '/annotations',
    element: guarded(<AnnotationsPage />),
  },
  {
    path: '/collaboration',
    element: guarded(<CollaborationPage />),
  },
  {
    path: '/collaboration/session',
    element: guarded(<CollaborationSessionPage />),
  },
  {
    path: '/search',
    element: guarded(<SearchPage />),
  },
  {
    path: '/profile',
    element: guarded(<ProfilePage />),
  },
  {
    path: '/settings',
    element: guarded(<SettingsPage />),
  },
  {
    path: '/settings/theme',
    element: guarded(<ThemeSettingsPage />),
  },
  {
    path: '/annotations-demo',
    element: guarded(<AnnotationDemo />),
  },
  {
    path: '/chavruta',
    element: guarded(<ChavrutaPage />),
  },
  {
    path: '/scenarios',
    element: guarded(<ScenariosPage />),
  },
  {
    path: '/programs',
    element: guarded(<ProgramsPage />),
  },
  {
    path: '/programs/:id',
    element: guarded(<ProgramDetailPage />),
  },
  {
    path: '/chavruta/:topicId',
    element: guarded(<ChavrutaPage />),
  },
  { path: '/admin', element: guarded(<AdminDashboardPage />) },
  { path: '/admin/branding', element: guarded(<BrandingSettingsPage />) },
  { path: '/admin/languages', element: guarded(<LanguageSettingsPage />) },
  { path: '/admin/users', element: guarded(<UserManagementPage />) },
  { path: '/admin/roles', element: guarded(<RoleManagementPage />) },
  {
    path: '/admin/gamification',
    element: guarded(<GamificationSettingsPage />),
  },
  { path: '/admin/announcements', element: guarded(<AnnouncementsPage />) },
  { path: '/admin/enrollment', element: guarded(<EnrollmentManagementPage />) },
  { path: '/admin/at-risk', element: guarded(<AtRiskDashboardPage />) },
  { path: '/admin/security', element: guarded(<SecuritySettingsPage />) },
  { path: '/admin/audit', element: guarded(<AuditLogPage />) },
  { path: '/admin/audit-log', element: guarded(<AuditLogAdminPage />) },
  {
    path: '/admin/notifications',
    element: guarded(<NotificationTemplatesPage />),
  },
  { path: '/admin/bi-export', element: guarded(<BiExportSettingsPage />) },
  { path: '/admin/cpd', element: guarded(<CpdSettingsPage />) },
  { path: '/admin/analytics', element: guarded(<TenantAnalyticsPage />) },
  { path: '/admin/usage', element: guarded(<OrgUsagePage />) },
  { path: '/admin/platform-usage', element: guarded(<PlatformUsageDashboardPage />) },
  { path: '/admin/roi-analytics', element: guarded(<ROIAnalyticsDashboardPage />) },
  {
    // Manager Dashboard — MANAGER / ORG_ADMIN / SUPER_ADMIN only
    path: '/manager',
    element: guarded(<ManagerDashboardPage />),
  },
  {
    // Onboarding wizard — shown to new users on first login
    path: '/onboarding',
    element: guarded(<OnboardingPage />),
  },
  {
    // Quiz Builder — top-level entry point for instructors (sidebar link)
    path: '/quiz-builder',
    element: guarded(<QuizBuilderPage />),
  },
  {
    // Certificates — earned course completion certificates
    path: '/certificates',
    element: guarded(<CertificatesPage />),
  },
  {
    // Content Import — bulk import lessons from YouTube/website/folder/Google Drive
    path: '/courses/:courseId/import',
    element: guarded(<ContentImportPage />),
  },
  {
    // Google OAuth 2.0 callback — public route, postMessage to opener
    path: '/oauth/google/callback',
    element: (
      <Suspense fallback={<PageLoader />}>
        <OAuthCallbackPage />
      </Suspense>
    ),
  },
  {
    path: '/discussions',
    element: guarded(<DiscussionsPage />),
  },
  {
    path: '/discussions/:id',
    element: guarded(<DiscussionDetailPage />),
  },
  {
    path: '/peer-review',
    element: guarded(<PeerReviewPage />),
  },
  {
    path: '/peer-review/:id',
    element: guarded(<ReviewAssignmentPage />),
  },
  {
    // Social Feed — activity stream from followed users
    path: '/social-feed',
    element: guarded(<SocialFeedPage />),
  },
  {
    // People search — find and follow other learners
    path: '/people',
    element: guarded(<UserSearchPage />),
  },
  {
    // Group Challenges — competitive learning challenges
    path: '/challenges',
    element: guarded(<GroupChallengesPage />),
  },
  {
    // Challenge Detail — leaderboard + score submission
    path: '/challenges/:id',
    element: guarded(<ChallengeDetailPage />),
  },
  {
    // Peer Matching — AI-powered learner matching
    path: '/peer-matching',
    element: guarded(<PeerMatchingPage />),
  },
  {
    // Chavruta Partner Finder — find a human debate partner
    path: '/chavruta/partner',
    element: guarded(<ChavrutaPartnerPage />),
  },
  {
    // Mentor Discovery — find a mentor by knowledge path topology
    path: '/mentor/discover/:courseId?',
    element: guarded(<MentorDiscoveryPage />),
  },
  {
    // Cohort Insights — GAP-7: cross-cohort institutional knowledge
    path: '/cohort-insights',
    element: guarded(<CohortInsightsPage />),
  },
  {
    // Public partner program signup — no auth required
    path: '/partners',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PartnerSignupPage />
      </Suspense>
    ),
  },
  {
    // Partner revenue + API key dashboard
    path: '/partner/dashboard',
    element: guarded(<PartnerDashboardPage />),
  },
  {
    // Internal investor deck — SUPER_ADMIN only (role guard inside component)
    path: '/internal/investor-deck',
    element: guarded(<InvestorDeckPage />),
  },
  {
    // Public B2B pilot signup — no auth required
    path: '/pilot',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PilotSignupPage />
      </Suspense>
    ),
  },
  {
    // SUPER_ADMIN pilot request management
    path: '/admin/pilot-requests',
    element: guarded(<PilotRequestsAdminPage />),
  },
  {
    // Phase 52 — HRIS & Enterprise Integrations config (ORG_ADMIN / SUPER_ADMIN)
    path: '/admin/hris-config',
    element: guarded(<HrisConfigPage />),
  },
  {
    // Phase 53 — AI auto-grading results (INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN)
    path: '/admin/auto-grading',
    element: guarded(<AutoGradingResultsPage />),
  },
  {
    // Phase 53 — Knowledge gap analysis dashboard (ORG_ADMIN | SUPER_ADMIN)
    path: '/admin/gap-analysis',
    element: guarded(<GapAnalysisDashboardPage />),
  },
  {
    // Phase 53 — Stripe invoice management (SUPER_ADMIN only)
    path: '/admin/invoices',
    element: guarded(<StripeInvoicePage />),
  },
  {
    path: '/',
    element: <SmartRoot />,
  },
  {
    path: '/u/:userId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicProfilePage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
