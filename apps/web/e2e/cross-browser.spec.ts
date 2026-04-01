/**
 * Cross-Browser Smoke Tests — Playwright
 *
 * Basic smoke tests that verify core functionality across browsers.
 * These tests run on all configured browser projects (chromium, firefox, webkit
 * when PLAYWRIGHT_ALL_BROWSERS=true).
 *
 * Each test is independent — no shared state between tests.
 * All GraphQL calls are mocked via page.route() for self-contained execution.
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="Cross-Browser"
 *
 * Run with all browsers:
 *   PLAYWRIGHT_ALL_BROWSERS=true pnpm --filter @edusphere/web test:e2e -- --grep="Cross-Browser"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';

// ── Cross-Browser Smoke Tests ────────────────────────────────────────────────

test.describe('Cross-Browser Smoke Tests', () => {
  test('login flow completes successfully', async ({ page }) => {
    await login(page);

    // After login, we should be on an authenticated route (not /login)
    const url = page.url();
    expect(url).not.toContain('/login');

    // Page should have rendered content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test('dashboard loads after authentication', async ({ page }) => {
    await login(page);

    await routeGraphQL(page, (opName) => {
      if (opName.includes('Dashboard') || opName.includes('Stats')) {
        return JSON.stringify({
          data: {
            dashboardStats: {
              totalCourses: 5,
              completedCourses: 2,
              streakDays: 7,
              totalXp: 1500,
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Dashboard page should render without crashing
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    // Should not show raw GraphQL errors
    expect(bodyText).not.toContain('Cannot query field');
    expect(bodyText).not.toContain('[object Object]');
  });

  test('source manager renders on courses page', async ({ page }) => {
    await login(page);

    await routeGraphQL(page, (opName) => {
      if (opName.includes('Courses') || opName.includes('CourseList')) {
        return JSON.stringify({
          data: {
            courses: {
              edges: [
                {
                  node: {
                    id: 'c1',
                    title: 'Test Course',
                    description: 'A test course',
                    status: 'PUBLISHED',
                    thumbnailUrl: null,
                  },
                  cursor: 'c1',
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'c1' },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/learn/courses`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    // Page should render without errors
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText).not.toContain('Cannot query field');
  });

  test('search page renders and accepts input', async ({ page }) => {
    await login(page);

    await routeGraphQL(page, (opName) => {
      if (opName.includes('Search') || opName.includes('SemanticSearch')) {
        return JSON.stringify({
          data: { search: { results: [], totalCount: 0 } },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Search input should be present and interactive
    const searchInput = page.locator('input[placeholder]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Type into search input
    await searchInput.fill('test query');
    const value = await searchInput.inputValue();
    expect(value).toBe('test query');
  });

  test('admin pages load for authenticated users', async ({ page }) => {
    await login(page);

    await routeGraphQL(page, () => null);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Admin page should render content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    // No raw technical errors in the UI
    expect(bodyText).not.toContain('Cannot query field');
    expect(bodyText).not.toContain('Unexpected token');
  });

  test('page navigation does not break on browser back/forward', async ({
    page,
  }) => {
    await login(page);

    await routeGraphQL(page, () => null);

    // Navigate to search
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Navigate to admin
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Go back to search
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');

    // Should not crash — page should have content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('responsive layout does not overflow on narrow viewport', async ({
    page,
  }) => {
    await login(page);

    await routeGraphQL(page, () => null);

    // Set narrow viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Check no horizontal scrollbar
    const hasHorizontalScroll = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    // Allow small overflow (scrollbar width) but not major overflow
    const scrollDiff = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      );
    });
    expect(scrollDiff).toBeLessThan(20);
  });
});
