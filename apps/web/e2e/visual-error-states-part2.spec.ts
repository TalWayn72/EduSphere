/**
 * Visual Regression — Error States (Part 2)
 *
 * Covers: Tablet viewport errors, Mobile viewport errors,
 * Additional empty states, Additional network errors.
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
    })
  );
}

/** Intercept all GraphQL calls and respond with empty data. */
function mockGraphQLEmpty(page: import('@playwright/test').Page) {
  return page.route('**/graphql', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    })
  );
}

/** Intercept all GraphQL calls and simulate a network failure. */
function mockNetworkError(page: import('@playwright/test').Page) {
  return page.route('**/graphql', (route) => route.abort('connectionrefused'));
}

test.describe('Visual Regression — Error States', () => {
  test.describe('Error states at tablet viewport', () => {
    test('404 at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/nonexistent-page-12345');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-404-tablet.png', STABLE_OPTS);
    });

    test('GraphQL error on dashboard at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await mockGraphQLError(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-graphql-dashboard-tablet.png',
        STABLE_OPTS
      );
    });

    test('GraphQL error on courses at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await mockGraphQLError(page);
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-graphql-courses-tablet.png',
        STABLE_OPTS
      );
    });

    test('empty dashboard at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await mockGraphQLEmpty(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-empty-dashboard-tablet.png',
        STABLE_OPTS
      );
    });

    test('network error on dashboard at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await mockNetworkError(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(
        'error-network-dashboard-tablet.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Error states at mobile viewport', () => {
    test('404 at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/nonexistent-page-12345');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('error-404-mobile.png', STABLE_OPTS);
    });

    test('GraphQL error on dashboard at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockGraphQLError(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-graphql-dashboard-mobile.png',
        STABLE_OPTS
      );
    });

    test('GraphQL error on courses at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockGraphQLError(page);
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-graphql-courses-mobile.png',
        STABLE_OPTS
      );
    });

    test('empty courses at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { courses: { edges: [], pageInfo: { hasNextPage: false } } },
          }),
        })
      );
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-empty-courses-mobile.png',
        STABLE_OPTS
      );
    });

    test('network error on courses at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockNetworkError(page);
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(
        'error-network-courses-mobile.png',
        STABLE_OPTS
      );
    });

    test('500 on dashboard at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        })
      );
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(
        'error-500-dashboard-mobile.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Additional empty states', () => {
    test('notifications with no notifications', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: { edges: [], pageInfo: { hasNextPage: false } },
            },
          }),
        })
      );
      await page.goto('/notifications');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-empty-notifications.png',
        STABLE_OPTS
      );
    });

    test('achievements with no badges', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { achievements: [], badges: [] } }),
        })
      );
      await page.goto('/achievements');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-empty-achievements.png',
        STABLE_OPTS
      );
    });

    test('analytics with no data', async ({ page }) => {
      await mockGraphQLEmpty(page);
      await page.goto('/analytics');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-empty-analytics.png',
        STABLE_OPTS
      );
    });

    test('knowledge graph with no nodes', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { knowledgeGraph: { nodes: [], edges: [] } },
          }),
        })
      );
      await page.goto('/knowledge-graph');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        'error-empty-knowledge-graph.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Additional network errors', () => {
    test('network error on exams', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/exams');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(
        'error-network-exams.png',
        STABLE_OPTS
      );
    });

    test('network error on social', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/social');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(
        'error-network-social.png',
        STABLE_OPTS
      );
    });

    test('network error on admin', async ({ page }) => {
      await mockNetworkError(page);
      await page.goto('/admin');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(
        'error-network-admin.png',
        STABLE_OPTS
      );
    });
  });
});
