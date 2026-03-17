import React, { Suspense } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ── Loading fallback ──────────────────────────────────────────────────────────
export function PageLoader() {
  return <LoadingSpinner containerHeight="h-screen" />;
}

// ── Wrap element in ErrorBoundary + ProtectedRoute + Suspense ─────────────────
// Each route gets its own ErrorBoundary so a crash in one page won't kill the shell.
export function guarded(
  element: React.ReactNode,
  options?: { requiredRoles?: string[] }
) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute requiredRoles={options?.requiredRoles}>
          {element}
        </ProtectedRoute>
      </Suspense>
    </ErrorBoundary>
  );
}

// ── Public Suspense wrapper with ErrorBoundary ────────────────────────────────
export function publicPage(element: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ErrorBoundary>
  );
}
