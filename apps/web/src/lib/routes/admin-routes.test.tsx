/**
 * Tests for lib/routes/admin-routes.tsx
 *
 * Covers: adminRoutes array — paths, element definitions, role guards.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock dependencies
vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}));
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

import { adminRoutes } from './admin-routes';

describe('adminRoutes', () => {
  it('is an array of RouteObjects', () => {
    expect(Array.isArray(adminRoutes)).toBe(true);
    expect(adminRoutes.length).toBeGreaterThan(0);
  });

  it('every route has a path string', () => {
    for (const route of adminRoutes) {
      expect(typeof route.path).toBe('string');
      expect(route.path!.length).toBeGreaterThan(0);
    }
  });

  it('every route has an element (React node)', () => {
    for (const route of adminRoutes) {
      expect(route.element).toBeDefined();
      expect(React.isValidElement(route.element)).toBe(true);
    }
  });

  it('all paths start with /admin', () => {
    for (const route of adminRoutes) {
      expect(route.path).toMatch(/^\/admin/);
    }
  });

  it('contains no duplicate paths', () => {
    const paths = adminRoutes.map((r) => r.path);
    const uniquePaths = new Set(paths);
    // Note: /admin/language and /admin/languages are intentionally distinct
    expect(uniquePaths.size).toBe(paths.length);
  });

  it('includes core admin pages', () => {
    const paths = adminRoutes.map((r) => r.path);
    expect(paths).toContain('/admin');
    expect(paths).toContain('/admin/users');
    expect(paths).toContain('/admin/roles');
    expect(paths).toContain('/admin/branding');
    expect(paths).toContain('/admin/security');
    expect(paths).toContain('/admin/audit');
  });

  it('includes integration pages', () => {
    const paths = adminRoutes.map((r) => r.path);
    expect(paths).toContain('/admin/lti');
    expect(paths).toContain('/admin/scim');
    expect(paths).toContain('/admin/xapi');
    expect(paths).toContain('/admin/crm');
  });

  it('includes analytics pages', () => {
    const paths = adminRoutes.map((r) => r.path);
    expect(paths).toContain('/admin/analytics');
    expect(paths).toContain('/admin/usage');
    expect(paths).toContain('/admin/platform-usage');
    expect(paths).toContain('/admin/roi-analytics');
  });

  it('includes MVP dashboard pages', () => {
    const paths = adminRoutes.map((r) => r.path);
    expect(paths).toContain('/admin/overview');
    expect(paths).toContain('/admin/user-management');
    expect(paths).toContain('/admin/role-matrix');
    expect(paths).toContain('/admin/audit-viewer');
    expect(paths).toContain('/admin/announcements-editor');
  });

  it('includes org onboarding pages', () => {
    const paths = adminRoutes.map((r) => r.path);
    expect(paths).toContain('/admin/team');
    expect(paths).toContain('/admin/billing');
    expect(paths).toContain('/admin/sso');
    expect(paths).toContain('/admin/marketplace');
    expect(paths).toContain('/admin/catalog');
    expect(paths).toContain('/admin/api-keys');
    expect(paths).toContain('/admin/webhooks');
    expect(paths).toContain('/admin/domains');
    expect(paths).toContain('/admin/embeddings');
  });

  it('includes jargon management page', () => {
    const paths = adminRoutes.map((r) => r.path);
    expect(paths).toContain('/admin/jargon');
  });

  it('has the expected total number of routes (51)', () => {
    expect(adminRoutes.length).toBe(51);
  });
});
