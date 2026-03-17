import React, { Suspense } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// ── Loading fallback ──────────────────────────────────────────────────────────
export function PageLoader() {
  return <LoadingSpinner containerHeight="h-screen" />;
}

// ── Wrap element in ProtectedRoute + Suspense ─────────────────────────────────
export function guarded(element: React.ReactNode) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ProtectedRoute>
  );
}

// ── Public Suspense wrapper ───────────────────────────────────────────────────
export function publicPage(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}
