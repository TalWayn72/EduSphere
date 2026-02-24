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
  import('@/pages/AnnotationsPage').then((m) => ({ default: m.AnnotationsPage }))
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
const AnnotationDemo = lazy(() => import('@/pages/AnnotationDemo'));
const ChavrutaPage = lazy(() =>
  import('@/pages/chavruta/ChavrutaPage').then((m) => ({ default: m.ChavrutaPage }))
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
    path: '/learn/:contentId',
    element: guarded(<ContentViewer />),
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
    path: '/chavruta/:topicId',
    element: guarded(<ChavrutaPage />),
  },
  {
    path: '/',
    element: <Navigate to="/learn/content-1" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/learn/content-1" replace />,
  },
]);
