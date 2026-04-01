/**
 * Visual Regression — Loading States (Part 2)
 *
 * Covers: Profile & Settings, Tablet viewport, Mobile viewport loading skeletons.
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

test.describe('Visual Regression — Loading States (Part 2)', () => {
  test.describe('Profile & Settings', () => {
    test('profile page loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-profile-skeleton.png',
        STABLE_OPTS
      );
    });

    test('settings page loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-settings-skeleton.png',
        STABLE_OPTS
      );
    });

    test('notifications loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-notifications-skeleton.png',
        STABLE_OPTS
      );
    });

    test('lesson viewer loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/learn/content-1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-lesson-viewer-skeleton.png',
        STABLE_OPTS
      );
    });

    test('calendar loading', async ({ page }) => {
      await holdGraphQL(page);
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(SKELETON_RENDER_DELAY);
      await expect(page).toHaveScreenshot(
        'loading-calendar-skeleton.png',
        STABLE_OPTS
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Tablet viewport loading states                                   */
  /* ---------------------------------------------------------------- */

  test.describe('Tablet viewport loading', () => {
    const TABLET_PAGES = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/course-1', name: 'course-detail' },
      { path: '/analytics', name: 'analytics' },
      { path: '/exams', name: 'exams' },
      { path: '/social', name: 'social' },
      { path: '/admin', name: 'admin' },
      { path: '/graph', name: 'graph' },
      { path: '/profile', name: 'profile' },
      { path: '/notifications', name: 'notifications' },
    ];

    for (const pg of TABLET_PAGES) {
      test(`${pg.name} loading at tablet`, async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await holdGraphQL(page);
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(SKELETON_RENDER_DELAY);
        await expect(page).toHaveScreenshot(
          `loading-${pg.name}-tablet-skeleton.png`,
          STABLE_OPTS
        );
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /*  Mobile viewport loading states                                   */
  /* ---------------------------------------------------------------- */

  test.describe('Mobile viewport loading', () => {
    const MOBILE_PAGES = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/course-1', name: 'course-detail' },
      { path: '/analytics', name: 'analytics' },
      { path: '/exams', name: 'exams' },
      { path: '/social', name: 'social' },
      { path: '/graph', name: 'graph' },
      { path: '/profile', name: 'profile' },
      { path: '/notifications', name: 'notifications' },
      { path: '/settings', name: 'settings' },
    ];

    for (const pg of MOBILE_PAGES) {
      test(`${pg.name} loading at mobile`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await holdGraphQL(page);
        await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(SKELETON_RENDER_DELAY);
        await expect(page).toHaveScreenshot(
          `loading-${pg.name}-mobile-skeleton.png`,
          STABLE_OPTS
        );
      });
    }
  });
});
