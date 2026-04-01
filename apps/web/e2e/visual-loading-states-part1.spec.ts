/**
 * Visual Regression — Loading States (Part 1)
 *
 * Covers: Core pages, Analytics & Exams, Social & Community,
 * Admin & Management, Knowledge & Content loading skeletons.
 */
import { test, expect } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Intercept all GraphQL calls and hold them indefinitely so the page
 * stays in its loading/skeleton state.
 */
function holdGraphQL(page: import('@playwright/test').Page) {
  return page.route('**/graphql', async (route) => {
    await new Promise(() => {});
    route.abort();
  });
}

/** Time (ms) to wait after navigation for skeletons to paint. */
const SKELETON_RENDER_DELAY = 800;

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test.describe('Visual Regression — Loading States (Part 1)', () => {
  test.describe('Core pages', () => {
    test('dashboard loading skeleton', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-dashboard-skeleton.png',
        STABLE_OPTS
      );
    });

    test('course list loading skeleton', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-courses-skeleton.png',
        STABLE_OPTS
      );
    });

    test('course detail loading skeleton', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/courses/course-1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-course-detail-skeleton.png',
        STABLE_OPTS
      );
    });

    test('search results loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/search?q=mathematics', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-search-skeleton.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Analytics & Exams', () => {
    test('analytics charts loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-analytics-skeleton.png',
        STABLE_OPTS
      );
    });

    test('analytics detail loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/analytics/overview', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-analytics-detail-skeleton.png',
        STABLE_OPTS
      );
    });

    test('exam list loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/exams', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-exams-skeleton.png',
        STABLE_OPTS
      );
    });

    test('exam detail loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/exams/exam-1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-exam-detail-skeleton.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Social & Community', () => {
    test('social feed loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/social', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-social-skeleton.png',
        STABLE_OPTS
      );
    });

    test('social profile loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/social/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-social-profile-skeleton.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Admin & Management', () => {
    test('admin dashboard loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-admin-skeleton.png',
        STABLE_OPTS
      );
    });

    test('admin users loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-admin-users-skeleton.png',
        STABLE_OPTS
      );
    });
  });

  test.describe('Knowledge & Content', () => {
    test('knowledge graph loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/graph', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-knowledge-graph-skeleton.png',
        STABLE_OPTS
      );
    });

    test('content library loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/content', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-content-skeleton.png',
        STABLE_OPTS
      );
    });

    test('content import loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/content/import', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-content-import-skeleton.png',
        STABLE_OPTS
      );
    });
  });
});
