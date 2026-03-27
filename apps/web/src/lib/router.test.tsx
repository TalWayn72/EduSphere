/**
 * Tests for lib/router.tsx — Router configuration
 *
 * Covers: router export exists, is a valid router object,
 * route groups are combined correctly.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('./routes', () => ({
  publicRoutes: [{ path: '/', element: null }],
  courseRoutes: [{ path: '/courses', element: null }],
  adminRoutes: [{ path: '/admin', element: null }],
  assessmentRoutes: [{ path: '/assessments', element: null }],
  examRoutes: [{ path: '/exams', element: null }],
  socialRoutes: [{ path: '/social', element: null }],
  learnerRoutes: [{ path: '/learner', element: null }],
  instructorRoutes: [{ path: '/instructor', element: null }],
}));

vi.mock('react-router-dom', () => ({
  createBrowserRouter: (routes: unknown[]) => {
    // Self-initializing capture array on globalThis (survives vi.mock hoisting)
    const g = globalThis as Record<string, unknown>;
    if (!g.__routerTestCaptured) g.__routerTestCaptured = [];
    (g.__routerTestCaptured as unknown[][]).push(routes);
    return {
      _routes: routes,
      navigate: vi.fn(),
      state: {},
    };
  },
}));

// Importing triggers createBrowserRouter at module scope
import { router } from './router';

function getCaptured(): unknown[][] {
  return ((globalThis as Record<string, unknown>).__routerTestCaptured as unknown[][]) ?? [];
}

describe('router', () => {
  it('is exported and defined', () => {
    expect(router).toBeDefined();
  });

  it('was created with all 8 route groups merged', () => {
    const captured = getCaptured();
    expect(captured.length).toBeGreaterThanOrEqual(1);
    const routes = captured[0]!;
    expect(routes.length).toBeGreaterThanOrEqual(8);
  });

  it('places publicRoutes last (catch-all)', () => {
    const routes = getCaptured()[0] as Array<{ path: string }>;
    const lastRoute = routes[routes.length - 1]!;
    expect(lastRoute.path).toBe('/');
  });

  it('places courseRoutes before publicRoutes', () => {
    const routes = getCaptured()[0] as Array<{ path: string }>;
    const courseIdx = routes.findIndex((r) => r.path === '/courses');
    const publicIdx = routes.findIndex((r) => r.path === '/');
    expect(courseIdx).toBeLessThan(publicIdx);
  });

  it('has a navigate function on the router', () => {
    expect(typeof (router as Record<string, unknown>).navigate).toBe('function');
  });
});
