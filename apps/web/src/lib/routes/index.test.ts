/**
 * Tests for lib/routes/index.ts
 *
 * Covers: barrel file re-exports all route arrays and helper utilities.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock all lazy-loaded page components to avoid importing real pages
vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}));
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/pages/Login', () => ({
  Login: () => null,
}));
vi.mock('@/components/SmartRoot', () => ({
  SmartRoot: () => null,
}));

import {
  publicRoutes,
  courseRoutes,
  adminRoutes,
  assessmentRoutes,
  examRoutes,
  socialRoutes,
  learnerRoutes,
  instructorRoutes,
  PageLoader,
  guarded,
  publicPage,
} from './index';

describe('routes/index.ts barrel exports', () => {
  it('exports publicRoutes as an array', () => {
    expect(Array.isArray(publicRoutes)).toBe(true);
    expect(publicRoutes.length).toBeGreaterThan(0);
  });

  it('exports courseRoutes as an array', () => {
    expect(Array.isArray(courseRoutes)).toBe(true);
    expect(courseRoutes.length).toBeGreaterThan(0);
  });

  it('exports adminRoutes as an array', () => {
    expect(Array.isArray(adminRoutes)).toBe(true);
    expect(adminRoutes.length).toBeGreaterThan(0);
  });

  it('exports assessmentRoutes as an array', () => {
    expect(Array.isArray(assessmentRoutes)).toBe(true);
    expect(assessmentRoutes.length).toBeGreaterThan(0);
  });

  it('exports examRoutes as an array', () => {
    expect(Array.isArray(examRoutes)).toBe(true);
    expect(examRoutes.length).toBeGreaterThan(0);
  });

  it('exports socialRoutes as an array', () => {
    expect(Array.isArray(socialRoutes)).toBe(true);
    expect(socialRoutes.length).toBeGreaterThan(0);
  });

  it('exports learnerRoutes as an array', () => {
    expect(Array.isArray(learnerRoutes)).toBe(true);
    expect(learnerRoutes.length).toBeGreaterThan(0);
  });

  it('exports instructorRoutes as an array', () => {
    expect(Array.isArray(instructorRoutes)).toBe(true);
    expect(instructorRoutes.length).toBeGreaterThan(0);
  });

  it('exports PageLoader function', () => {
    expect(typeof PageLoader).toBe('function');
  });

  it('exports guarded function', () => {
    expect(typeof guarded).toBe('function');
  });

  it('exports publicPage function', () => {
    expect(typeof publicPage).toBe('function');
  });
});
