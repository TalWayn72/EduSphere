/**
 * Tests for lib/routes/course-routes.tsx
 *
 * Covers: courseRoutes array — paths, elements, parameterized routes.
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

import { courseRoutes } from './course-routes';

describe('courseRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(courseRoutes)).toBe(true);
    expect(courseRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of courseRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of courseRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes discovery routes', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/explore');
    expect(paths).toContain('/discover');
    expect(paths).toContain('/courses/discover');
  });

  it('includes course CRUD routes', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/courses');
    expect(paths).toContain('/courses/new');
    expect(paths).toContain('/courses/:courseId');
    expect(paths).toContain('/courses/:courseId/edit');
    expect(paths).toContain('/courses/:courseId/analytics');
  });

  it('includes lesson routes with nested params', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/lessons/new');
    expect(paths).toContain('/courses/:courseId/lessons/:lessonId');
    expect(paths).toContain('/courses/:courseId/lessons/:lessonId/pipeline');
    expect(paths).toContain('/courses/:courseId/lessons/:lessonId/results');
    expect(paths).toContain('/courses/:courseId/lessons/:lessonId/preview');
  });

  it('includes pipeline builder route', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/pipeline/builder');
  });

  it('includes quiz builder routes', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/modules/:moduleId/quiz/new');
    expect(paths).toContain('/quiz-builder');
  });

  it('includes library routes', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/library');
    expect(paths).toContain('/library/compliance');
  });

  it('includes content import route', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(paths).toContain('/courses/:courseId/import');
  });

  it('has the expected total number of routes (19)', () => {
    expect(courseRoutes.length).toBe(19);
  });

  it('contains no duplicate paths', () => {
    const paths = courseRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
