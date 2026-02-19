import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/lib/urql-client';
import { queryClient } from '@/lib/query-client';
import { initKeycloak } from '@/lib/auth';
import { Login } from '@/pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';

// ── Lazy loaded: heavy feature pages ────────────────────────────────────────
// Each lazy import creates a separate JS chunk. React suspends the subtree
// until the chunk is ready, then swaps in the real component.
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
const AnnotationDemo = lazy(() => import('@/pages/AnnotationDemo'));

// ── Loading fallback ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [keycloakReady, setKeycloakReady] = useState(false);

  useEffect(() => {
    initKeycloak()
      .then(() => {
        setKeycloakReady(true);
      })
      .catch((error) => {
        console.error('Keycloak initialization error:', error);
        setKeycloakReady(true);
      });
  }, []);

  if (!keycloakReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Initializing authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UrqlProvider value={urqlClient}>
        <Toaster />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/learn/:contentId"
              element={
                <ProtectedRoute>
                  <ContentViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <CourseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/new"
              element={
                <ProtectedRoute>
                  <CourseCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedRoute>
                  <CourseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/graph"
              element={
                <ProtectedRoute>
                  <KnowledgeGraph />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <ProtectedRoute>
                  <AgentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/annotations"
              element={
                <ProtectedRoute>
                  <AnnotationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collaboration"
              element={
                <ProtectedRoute>
                  <CollaborationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collaboration/session"
              element={
                <ProtectedRoute>
                  <CollaborationSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/annotations-demo"
              element={
                <ProtectedRoute>
                  <AnnotationDemo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={<Navigate to="/learn/content-1" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/learn/content-1" replace />}
            />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </UrqlProvider>
    </QueryClientProvider>
  );
}

export default App;
