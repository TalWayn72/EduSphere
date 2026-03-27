/**
 * Tests for lib/routes/public-routes.tsx
 *
 * Covers: publicRoutes array — marketing, legal, auth, AEO, catch-all paths.
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
vi.mock('@/pages/Login', () => ({
  Login: () => null,
}));
vi.mock('@/components/SmartRoot', () => ({
  SmartRoot: () => null,
}));

import { publicRoutes } from './public-routes';

describe('publicRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(publicRoutes)).toBe(true);
    expect(publicRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of publicRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element', () => {
    for (const route of publicRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('includes login route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/login');
  });

  it('includes root route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/');
  });

  it('includes catch-all 404 route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('*');
  });

  it('includes marketing pages', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/landing');
    expect(paths).toContain('/features');
    expect(paths).toContain('/pricing');
    expect(paths).toContain('/about');
    expect(paths).toContain('/contact');
    expect(paths).toContain('/careers');
  });

  it('includes legal pages', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/privacy');
    expect(paths).toContain('/terms');
    expect(paths).toContain('/compliance');
    expect(paths).toContain('/accessibility');
  });

  it('includes AEO pages', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/faq');
    expect(paths).toContain('/glossary');
    expect(paths).toContain('/catalog');
    expect(paths).toContain('/instructors');
  });

  it('includes blog routes', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/blog');
    expect(paths).toContain('/blog/:slug');
  });

  it('includes auth callback routes', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/oauth/google/callback');
    expect(paths).toContain('/lti/launch');
  });

  it('includes signup routes', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/pilot');
    expect(paths).toContain('/partners');
    expect(paths).toContain('/signup/org');
  });

  it('includes branded login route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/org/:slug/login');
  });

  it('includes public profile route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/u/:userId');
  });

  it('includes badge verifier route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/verify/badge/:assertionId');
  });

  it('includes redirect routes (demo, features/:featureSlug)', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/demo');
    expect(paths).toContain('/features/:featureSlug');
  });

  it('includes solutions routes', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/solutions');
    expect(paths).toContain('/solutions/:solutionSlug');
  });

  it('includes portal route', () => {
    const paths = publicRoutes.map((r) => r.path);
    expect(paths).toContain('/portal');
  });
});
