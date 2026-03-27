/**
 * Tests for lib/routes/assessment-routes.tsx
 *
 * Covers: assessmentRoutes array — paths, elements, parameterized routes.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}));
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

import { assessmentRoutes } from './assessment-routes';

describe('assessmentRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(assessmentRoutes)).toBe(true);
    expect(assessmentRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of assessmentRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of assessmentRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes assessment campaign routes', () => {
    const paths = assessmentRoutes.map((r) => r.path);
    expect(paths).toContain('/assessments');
    expect(paths).toContain('/assessments/:id/respond');
    expect(paths).toContain('/assessments/:id/results');
    expect(paths).toContain('/assessments/:id/results-detail');
  });

  it('includes assessment with assessmentId param', () => {
    const paths = assessmentRoutes.map((r) => r.path);
    expect(paths).toContain('/assessment/:assessmentId');
  });

  it('includes peer review routes', () => {
    const paths = assessmentRoutes.map((r) => r.path);
    expect(paths).toContain('/peer-review');
    expect(paths).toContain('/peer-review/:id');
  });

  it('has the expected total number of routes (7)', () => {
    expect(assessmentRoutes.length).toBe(7);
  });

  it('contains no duplicate paths', () => {
    const paths = assessmentRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
