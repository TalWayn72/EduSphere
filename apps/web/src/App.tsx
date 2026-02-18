import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/lib/urql-client';
import { initKeycloak } from '@/lib/auth';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { ContentViewer } from '@/pages/ContentViewer';
import { CourseList } from '@/pages/CourseList';
import { KnowledgeGraph } from '@/pages/KnowledgeGraph';
import { AgentsPage } from '@/pages/AgentsPage';
import { AnnotationsPage } from '@/pages/AnnotationsPage';
import { CollaborationPage } from '@/pages/CollaborationPage';
import AnnotationDemo from '@/pages/AnnotationDemo';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
    <UrqlProvider value={urqlClient}>
      <BrowserRouter>
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
      </BrowserRouter>
    </UrqlProvider>
  );
}

export default App;
