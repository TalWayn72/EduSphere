/**
 * Tests for lib/routes/social-routes.tsx
 *
 * Covers: socialRoutes array — discussions, social feed, challenges, collaboration paths.
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

import { socialRoutes } from './social-routes';

describe('socialRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(socialRoutes)).toBe(true);
    expect(socialRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of socialRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of socialRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes discussion routes', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/discussions');
    expect(paths).toContain('/discussions/:id');
  });

  it('includes social feed routes', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/social');
    expect(paths).toContain('/social-feed');
  });

  it('includes people search route', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/people');
  });

  it('includes challenge routes', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/challenges');
    expect(paths).toContain('/challenges/:id');
  });

  it('includes peer matching route', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/peer-matching');
  });

  it('includes chavruta partner route', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/chavruta/partner');
  });

  it('includes mentor discovery route with optional param', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/mentor/discover/:courseId?');
  });

  it('includes cohort insights route', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/cohort-insights');
  });

  it('includes collaboration routes', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/collaboration');
    expect(paths).toContain('/collaboration/session');
  });

  it('includes annotations route', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(paths).toContain('/annotations');
  });

  it('has the expected total number of routes (14)', () => {
    expect(socialRoutes.length).toBe(14);
  });

  it('contains no duplicate paths', () => {
    const paths = socialRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
