/**
 * Visual Regression — Error States (Part 1)
 *
 * Covers: 404 page, GraphQL errors (7 pages), Empty states (5 pages),
 * Network errors (4 pages), HTTP 500 errors (3 pages).
 */
import { test, expect } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

/** Intercept all GraphQL calls and respond with a server error payload. */
function mockGraphQLError(page: import('@playwright/test').Page) {
  return page.route('**/graphql', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: [{ message: 'Internal Server Error' }],
      }),
    }),
  );
}

/** Intercept all GraphQL calls and respond with empty data. */
function mockGraphQLEmpty(page: import('@playwright/test').Page) {
  return page.route('**/graphql', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    }),
  );
}

/** Intercept all GraphQL calls and simulate a network failure. */
function mockNetworkError(page: import('@playwright/test').Page) {
  return page.route('**/graphql', (route) => route.abort('connectionrefused'));
}

test.describe('Visual Regression — Error States', () => {
  test.describe('404 — Not Found', () => {
    test('renders 404 page for nonexistent route', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-404-full.png', STABLE_OPTS);
    });
  });

  test.describe('GraphQL errors', () => {
    const PAGES = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/search', name: 'search' },
      { path: '/analytics', name: 'analytics' },
      { path: '/exams', name: 'exams' },
      { path: '/social', name: 'social' },
      { path: '/admin', name: 'admin' },
    ];

    for (const pg of PAGES) {
      test(`GraphQL error on ${pg.name}`, async ({ page }) => {
        await mockGraphQLError(page);
        await page.goto(pg.path);
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `error-graphql-${pg.name}.png`,
          STABLE_OPTS,
        );
      });
    }
  });

  test.describe('Empty states', () => {
    test('dashboard with no data', async ({ page }) => {
      await mockGraphQLEmpty(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-empty-dashboard.png', STABLE_OPTS);
    });

    test('courses list with no courses', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { courses: { edges: [], pageInfo: { hasNextPage: false } } } }),
        }),
      );
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-empty-courses.png', STABLE_OPTS);
    });

    test('search with no results', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { search: { results: [], totalCount: 0 } } }),
        }),
      );
      await page.goto('/search?q=zzzznonexistent');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-empty-search.png', STABLE_OPTS);
    });

    test('exams with no exams', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { exams: { edges: [], pageInfo: { hasNextPage: false } } } }),
        }),
      );
      await page.goto('/exams');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-empty-exams.png', STABLE_OPTS);
    });

    test('social feed with no posts', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { socialFeed: { edges: [], pageInfo: { hasNextPage: false } } } }),
        }),
      );
      await page.goto('/social');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-empty-social.png', STABLE_OPTS);
    });
  });

  test.describe('Network errors', () => {
    test('network error on dashboard', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('error-network-dashboard.png', STABLE_OPTS);
    });

    test('network error on courses', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('error-network-courses.png', STABLE_OPTS);
    });

    test('network error on analytics', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/analytics');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('error-network-analytics.png', STABLE_OPTS);
    });

    test('network error on knowledge graph', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/graph');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('error-network-graph.png', STABLE_OPTS);
    });
  });

  test.describe('HTTP 500 errors', () => {
    const PAGES_500 = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/admin', name: 'admin' },
    ];

    for (const pg of PAGES_500) {
      test(`500 error on ${pg.name}`, async ({ page }) => {
        await page.route('**/graphql', (route) =>
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          }),
        );
        await page.goto(pg.path);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        await expect(page).toHaveScreenshot(
          `error-500-${pg.name}.png`,
          STABLE_OPTS,
        );
      });
    }
  });
});
