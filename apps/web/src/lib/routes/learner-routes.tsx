import React, { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded, PageLoader } from './helpers';

// ── Lazy loaded learner pages ────────────────────────────────────────────────
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  }))
);
const UnifiedLearningPage = lazy(() =>
  import('@/pages/UnifiedLearningPage').then((m) => ({
    default: m.UnifiedLearningPage,
  }))
);
const QuizContentPage = lazy(() =>
  import('@/pages/QuizContentPage').then((m) => ({
    default: m.QuizContentPage,
  }))
);
const SrsReviewPage = lazy(() =>
  import('@/pages/SrsReviewPage').then((m) => ({
    default: m.SrsReviewPage,
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
const MyProgressPage = lazy(() =>
  import('@/pages/MyProgressPage').then((m) => ({ default: m.MyProgressPage }))
);
const MyOpenBadgesPage = lazy(() =>
  import('@/pages/MyOpenBadgesPage').then((m) => ({
    default: m.MyOpenBadgesPage,
  }))
);
const CertificatesPage = lazy(() =>
  import('@/pages/CertificatesPage').then((m) => ({
    default: m.CertificatesPage,
  }))
);
const GamificationPage = lazy(() =>
  import('@/pages/GamificationPage').then((m) => ({
    default: m.GamificationPage,
  }))
);
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ThemeSettingsPage = lazy(() =>
  import('@/pages/ThemeSettingsPage').then((m) => ({
    default: m.ThemeSettingsPage,
  }))
);
const SearchPage = lazy(() =>
  import('@/pages/search').then((m) => ({ default: m.SearchPage }))
);
const SkillPathPage = lazy(() =>
  import('@/pages/SkillPathPage').then((m) => ({ default: m.SkillPathPage }))
);
const SkillGapDashboard = lazy(() =>
  import('@/pages/SkillGapDashboard').then((m) => ({
    default: m.SkillGapDashboard,
  }))
);
const SkillTreePage = lazy(() =>
  import('@/pages/SkillTreePage').then((m) => ({ default: m.SkillTreePage }))
);
const KnowledgeGraph = lazy(() =>
  import('@/pages/KnowledgeGraph').then((m) => ({ default: m.KnowledgeGraph }))
);
const KnowledgeGraphPage = lazy(() => import('@/pages/KnowledgeGraphPage'));
const MarketplacePage = lazy(() =>
  import('@/pages/MarketplacePage').then((m) => ({
    default: m.MarketplacePage,
  }))
);
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const ProgramsPage = lazy(() =>
  import('@/pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
);
const ProgramDetailPage = lazy(() =>
  import('@/pages/ProgramDetailPage').then((m) => ({
    default: m.ProgramDetailPage,
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
const ChavrutaPage = lazy(() =>
  import('@/pages/chavruta/ChavrutaPage').then((m) => ({
    default: m.ChavrutaPage,
  }))
);
const ScenariosPage = lazy(() =>
  import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage }))
);
const AnnotationDemo = lazy(() => import('@/pages/AnnotationDemo'));
const AgentsPage = lazy(() =>
  import('@/pages/AgentsPage').then((m) => ({ default: m.AgentsPage }))
);
const AgentStudioPage = lazy(() =>
  import('@/pages/AgentStudioPage').then((m) => ({
    default: m.AgentStudioPage,
  }))
);
const Model3DPage = lazy(() =>
  import('@/pages/Model3DPage').then((m) => ({ default: m.Model3DPage }))
);
const ManagerDashboardPage = lazy(() =>
  import('@/pages/ManagerDashboardPage').then((m) => ({
    default: m.ManagerDashboardPage,
  }))
);
const GlossaryWikiPage = lazy(() =>
  import('@/pages/GlossaryWikiPage').then((m) => ({
    default: m.GlossaryWikiPage,
  }))
);

/**
 * Learner, dashboard, and general authenticated routes.
 */
export const learnerRoutes: RouteObject[] = [
  // Unified learning interface for all content types
  { path: '/learn/:contentId', element: guarded(<UnifiedLearningPage />) },
  { path: '/document/:contentId', element: guarded(<UnifiedLearningPage />) },
  // SRS review session — SM-2 flashcard review
  {
    path: '/srs-review',
    element: guarded(
      <Suspense fallback={<PageLoader />}>
        <SrsReviewPage />
      </Suspense>
    ),
  },
  // Notifications
  {
    path: '/notifications',
    element: guarded(
      <Suspense fallback={<PageLoader />}>
        <NotificationsPage />
      </Suspense>
    ),
  },
  // Leaderboard
  { path: '/leaderboard', element: guarded(<LeaderboardPage />) },
  // Quiz
  { path: '/quiz/:contentId', element: guarded(<QuizContentPage />) },
  // Dashboard
  { path: '/dashboard/legacy', element: guarded(<Dashboard />) },
  { path: '/dashboard', element: guarded(<DashboardPage />) },
  // Knowledge graph
  { path: '/graph', element: guarded(<KnowledgeGraph />) },
  { path: '/knowledge-graph', element: guarded(<KnowledgeGraphPage />) },
  {
    path: '/knowledge-graph/:courseId',
    element: guarded(<KnowledgeGraphPage />),
  },
  // Skills
  { path: '/skill-tree', element: guarded(<SkillTreePage />) },
  { path: '/skill-tree/:courseId', element: guarded(<SkillTreePage />) },
  { path: '/skills', element: guarded(<SkillPathPage />) },
  { path: '/skills/gap/:pathId', element: guarded(<SkillGapDashboard />) },
  // Live sessions
  { path: '/sessions', element: guarded(<LiveSessionsPage />) },
  { path: '/sessions/:sessionId', element: guarded(<LiveSessionDetailPage />) },
  // Agents
  { path: '/agents', element: guarded(<AgentsPage />) },
  { path: '/agents/studio', element: guarded(<AgentStudioPage />) },
  // Gamification & progress
  { path: '/gamification', element: guarded(<GamificationPage />) },
  { path: '/my-badges', element: guarded(<MyOpenBadgesPage />) },
  { path: '/my-progress', element: guarded(<MyProgressPage />) },
  { path: '/certificates', element: guarded(<CertificatesPage />) },
  // Profile & settings
  { path: '/search', element: guarded(<SearchPage />) },
  { path: '/profile', element: guarded(<ProfilePage />) },
  { path: '/settings', element: guarded(<SettingsPage />) },
  { path: '/settings/theme', element: guarded(<ThemeSettingsPage />) },
  // Programs
  { path: '/programs', element: guarded(<ProgramsPage />) },
  { path: '/programs/:id', element: guarded(<ProgramDetailPage />) },
  // Chavruta & scenarios
  { path: '/chavruta', element: guarded(<ChavrutaPage />) },
  { path: '/chavruta/:topicId', element: guarded(<ChavrutaPage />) },
  { path: '/scenarios', element: guarded(<ScenariosPage />) },
  { path: '/annotations-demo', element: guarded(<AnnotationDemo />) },
  // Marketplace & checkout
  { path: '/marketplace', element: guarded(<MarketplacePage />) },
  { path: '/checkout', element: guarded(<CheckoutPage />) },
  // 3D model viewer
  { path: '/model3d/:assetId', element: guarded(<Model3DPage />) },
  // Manager Dashboard
  { path: '/manager', element: guarded(<ManagerDashboardPage />) },
  // Onboarding wizard
  { path: '/onboarding', element: guarded(<OnboardingPage />) },
  // Glossary wiki — list and term detail
  { path: '/glossary', element: guarded(<GlossaryWikiPage />) },
  { path: '/glossary/:termId', element: guarded(<GlossaryWikiPage />) },
];
