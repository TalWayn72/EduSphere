/**
 * Tests for lib/routes/exam-routes.tsx
 *
 * Covers: examRoutes array — instructor paths, student paths, parameterized routes.
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

import { examRoutes } from './exam-routes';

describe('examRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(examRoutes)).toBe(true);
    expect(examRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of examRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of examRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes instructor item bank routes', () => {
    const paths = examRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/exams/items');
    expect(paths).toContain('/courses/:courseId/exams/items/new');
    expect(paths).toContain('/courses/:courseId/exams/items/:itemId');
  });

  it('includes instructor blueprint routes', () => {
    const paths = examRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/exams/blueprints');
    expect(paths).toContain('/courses/:courseId/exams/blueprints/new');
    expect(paths).toContain('/courses/:courseId/exams/blueprints/:blueprintId');
  });

  it('includes instructor analytics and generation routes', () => {
    const paths = examRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/exams/analytics');
    expect(paths).toContain('/courses/:courseId/exams/generate');
  });

  it('includes student exam session routes', () => {
    const paths = examRoutes.map((r) => r.path);
    expect(paths).toContain('/exams/:blueprintId/start');
    expect(paths).toContain('/exams/session/:sessionId');
    expect(paths).toContain('/exams/session/:sessionId/results');
  });

  it('has the expected total number of routes (11)', () => {
    expect(examRoutes.length).toBe(11);
  });

  it('contains no duplicate paths', () => {
    const paths = examRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
