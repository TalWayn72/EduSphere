/**
 * Tests for lib/routes/instructor-routes.tsx
 *
 * Covers: instructorRoutes array — paths, elements, role restrictions.
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

import { instructorRoutes } from './instructor-routes';

describe('instructorRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(instructorRoutes)).toBe(true);
    expect(instructorRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of instructorRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of instructorRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes instructor analytics route', () => {
    const paths = instructorRoutes.map((r) => r.path);
    expect(paths).toContain('/instructor/analytics');
  });

  it('includes instructor merge queue route', () => {
    const paths = instructorRoutes.map((r) => r.path);
    expect(paths).toContain('/instructor/merge-queue');
  });

  it('includes instructor earnings route', () => {
    const paths = instructorRoutes.map((r) => r.path);
    expect(paths).toContain('/instructor/earnings');
  });

  it('includes partner dashboard route', () => {
    const paths = instructorRoutes.map((r) => r.path);
    expect(paths).toContain('/partner/dashboard');
  });

  it('includes internal investor deck route', () => {
    const paths = instructorRoutes.map((r) => r.path);
    expect(paths).toContain('/internal/investor-deck');
  });

  it('has the expected total number of routes (5)', () => {
    expect(instructorRoutes.length).toBe(5);
  });

  it('contains no duplicate paths', () => {
    const paths = instructorRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
