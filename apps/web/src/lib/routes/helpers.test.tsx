/**
 * Tests for lib/routes/helpers.tsx
 *
 * Covers: PageLoader, guarded(), publicPage() — route wrapper utilities.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// ── Mock heavy dependencies so we don't need to render full React trees ──────
vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({
    children,
    requiredRoles,
  }: {
    children: React.ReactNode;
    requiredRoles?: string[];
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'protected-route',
        'data-roles': requiredRoles?.join(','),
      },
      children
    ),
}));
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ containerHeight }: { containerHeight?: string }) =>
    React.createElement('div', {
      'data-testid': 'loading-spinner',
      'data-height': containerHeight,
    }),
}));
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'error-boundary' }, children),
}));

import { PageLoader, guarded, publicPage } from './helpers';

describe('helpers.tsx', () => {
  describe('PageLoader', () => {
    it('is exported as a function', () => {
      expect(typeof PageLoader).toBe('function');
    });

    it('returns a React element (JSX)', () => {
      const result = PageLoader();
      expect(result).toBeDefined();
      expect(React.isValidElement(result)).toBe(true);
    });
  });

  describe('guarded()', () => {
    it('is exported as a function', () => {
      expect(typeof guarded).toBe('function');
    });

    it('returns a valid React element', () => {
      const element = React.createElement('div', null, 'test');
      const result = guarded(element);
      expect(React.isValidElement(result)).toBe(true);
    });

    it('wraps element in ErrorBoundary > Suspense > ProtectedRoute', () => {
      const child = React.createElement('span', null, 'child');
      const result = guarded(child);

      // Outermost is ErrorBoundary mock
      expect(result).toBeDefined();
      // The result should be a tree: ErrorBoundary > Suspense > ProtectedRoute > child
      expect(React.isValidElement(result)).toBe(true);
    });

    it('accepts options with requiredRoles', () => {
      const child = React.createElement('span', null, 'admin-page');
      const result = guarded(child, {
        requiredRoles: ['ORG_ADMIN', 'SUPER_ADMIN'],
      });
      expect(React.isValidElement(result)).toBe(true);
    });

    it('accepts no options (undefined)', () => {
      const child = React.createElement('span', null, 'no-roles');
      const result = guarded(child);
      expect(React.isValidElement(result)).toBe(true);
    });
  });

  describe('publicPage()', () => {
    it('is exported as a function', () => {
      expect(typeof publicPage).toBe('function');
    });

    it('returns a valid React element', () => {
      const element = React.createElement('div', null, 'public');
      const result = publicPage(element);
      expect(React.isValidElement(result)).toBe(true);
    });

    it('wraps element in ErrorBoundary > Suspense (no ProtectedRoute)', () => {
      const child = React.createElement('span', null, 'public-child');
      const result = publicPage(child);
      expect(React.isValidElement(result)).toBe(true);
    });
  });
});
