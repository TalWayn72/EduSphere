import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// ── Lazy loaded: heavy feature pages ─────────────────────────────────────────
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard }))
);
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
    // Public route — OpenBadge 3.0 verifier (no auth, shareable link)
    path: '/verify/badge/:assertionId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <BadgeVerifierPage />
      </Suspense>
    ),
  },
  {
    path: '/learn/:contentId',
    element: guarded(<ContentViewer />),
  },
  {
    // Dedicated route for QUIZ content items
    path: '/quiz/:contentId',
    element: guarded(<QuizContentPage />),
  },
  {
    // Dedicated route for RICH_DOCUMENT content items
    path: '/document/:contentId',
    element: guarded(<DocumentAnnotationPage />),
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
    path: '/library',
    element: guarded(<CourseLibraryPage />),
  },
  {
    path: '/instructor/earnings',
    element: guarded(<InstructorEarningsPage />),
  },
  {
    path: '/dashboard',
    element: guarded(<Dashboard />),
  },
  {
    path: '/graph',
    element: guarded(<KnowledgeGraph />),
  },
  {
    path: '/agents',
    element: guarded(<AgentsPage />),
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
  {
    path: '/admin/notifications',
    element: guarded(<NotificationTemplatesPage />),
  },
  { path: '/admin/bi-export', element: guarded(<BiExportSettingsPage />) },
  { path: '/admin/cpd', element: guarded(<CpdSettingsPage />) },
  {
    path: '/',
    element: <Navigate to="/learn/content-1" replace />,
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
    element: <Navigate to="/learn/content-1" replace />,
  },
]);
