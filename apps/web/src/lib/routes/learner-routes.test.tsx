/**
 * Tests for lib/routes/learner-routes.tsx
 *
 * Covers: learnerRoutes array — dashboard, learning, skills, social, marketplace paths.
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

import { learnerRoutes } from './learner-routes';

describe('learnerRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(learnerRoutes)).toBe(true);
    expect(learnerRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of learnerRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of learnerRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes dashboard routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/dashboard/legacy');
  });

  it('includes unified learning routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/learn/:contentId');
    expect(paths).toContain('/document/:contentId');
  });

  it('includes knowledge graph routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/graph');
    expect(paths).toContain('/knowledge-graph');
    expect(paths).toContain('/knowledge-graph/:courseId');
  });

  it('includes skill routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/skill-tree');
    expect(paths).toContain('/skill-tree/:courseId');
    expect(paths).toContain('/skills');
    expect(paths).toContain('/skills/gap/:pathId');
  });

  it('includes gamification and progress routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/gamification');
    expect(paths).toContain('/my-badges');
    expect(paths).toContain('/my-progress');
    expect(paths).toContain('/certificates');
    expect(paths).toContain('/leaderboard');
  });

  it('includes profile and settings routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/profile');
    expect(paths).toContain('/settings');
    expect(paths).toContain('/settings/theme');
    expect(paths).toContain('/search');
  });

  it('includes agent routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/agents');
    expect(paths).toContain('/agents/studio');
  });

  it('includes chavruta and scenario routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/chavruta');
    expect(paths).toContain('/chavruta/:topicId');
    expect(paths).toContain('/scenarios');
  });

  it('includes marketplace routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/marketplace');
    expect(paths).toContain('/checkout');
  });

  it('includes session routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/sessions');
    expect(paths).toContain('/sessions/:sessionId');
  });

  it('includes program routes', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/programs');
    expect(paths).toContain('/programs/:id');
  });

  it('includes SRS review route', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/srs-review');
  });

  it('includes manager dashboard', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/manager');
  });

  it('includes onboarding route', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(paths).toContain('/onboarding');
  });

  it('has the expected total number of routes (38)', () => {
    expect(learnerRoutes.length).toBe(38);
  });

  it('contains no duplicate paths', () => {
    const paths = learnerRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
