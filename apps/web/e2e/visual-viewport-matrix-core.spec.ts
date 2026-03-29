/**
 * Visual Regression — Viewport Matrix: Core Pages
 *
 * Tests core authenticated pages at 4 viewports (mobile, tablet, desktop, wide).
 * Each page gets full-page + header/nav element screenshots per viewport.
 * Total: ~70 assertions.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-matrix-core.spec.ts
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'wide', width: 1920, height: 1080 },
] as const;

const CORE_PAGES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/courses', name: 'courses' },
  { path: '/courses/1', name: 'course-detail' },
  { path: '/search', name: 'search' },
  { path: '/profile', name: 'profile' },
  { path: '/settings', name: 'settings' },
  { path: '/notifications', name: 'notifications' },
] as const;

test.describe('Viewport Matrix — Core Pages @visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
    await login(page);
  });

  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      for (const pg of CORE_PAGES) {
        test(`${pg.name} — full page`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(
            `vp-${vp.name}-${pg.name}-full.png`,
            { ...LOOSE_OPTS, mask: dynamicMasks(page) },
          );
        });

        test(`${pg.name} — header nav`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const header = page.locator('header, nav, [data-testid="app-header"]').first();
          if (await header.isVisible().catch(() => false)) {
            await expect(header).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-header.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });
      }

      // Extra: sidebar visibility check on dashboard
      test('dashboard — sidebar state', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        const sidebar = page.locator('[data-testid="app-sidebar"], aside').first();
        if (await sidebar.isVisible().catch(() => false)) {
          await expect(sidebar).toHaveScreenshot(
            `vp-${vp.name}-dashboard-sidebar.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      // ─── Main content area per page ──────────────────────────────────────
      for (const pg of CORE_PAGES) {
        test(`${pg.name} — main content area`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);
          const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
          if (await main.isVisible().catch(() => false)) {
            await expect(main).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-main.png`,
              { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
            );
          }
        });

        test(`${pg.name} — footer area`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);
          const footer = page.locator('footer, [data-testid="app-footer"]').first();
          if (await footer.isVisible().catch(() => false)) {
            await expect(footer).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-footer.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });
      }

      // ─── Dashboard widgets ───────────────────────────────────────────────
      test('dashboard — stats cards section', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const statsSection = page.locator('[data-testid="stats-cards"], [data-testid="dashboard-stats"], .stats-grid').first();
        if (await statsSection.isVisible().catch(() => false)) {
          await expect(statsSection).toHaveScreenshot(
            `vp-${vp.name}-dashboard-stats-cards.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
          );
        }
      });

      test('dashboard — recent activity section', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const activity = page.locator('[data-testid="recent-activity"], [data-testid="activity-feed"]').first();
        if (await activity.isVisible().catch(() => false)) {
          await expect(activity).toHaveScreenshot(
            `vp-${vp.name}-dashboard-recent-activity.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
          );
        }
      });

      // ─── Courses page sections ───────────────────────────────────────────
      test('courses — grid/list area', async ({ page }) => {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const courseList = page.locator('[data-testid="courses-grid"], [data-testid="courses-list"], .course-grid').first();
        if (await courseList.isVisible().catch(() => false)) {
          await expect(courseList).toHaveScreenshot(
            `vp-${vp.name}-courses-grid-area.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
          );
        }
      });

      test('courses — search/filter bar', async ({ page }) => {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const toolbar = page.locator('[data-testid="courses-toolbar"], [data-testid="filter-bar"], .toolbar').first();
        if (await toolbar.isVisible().catch(() => false)) {
          await expect(toolbar).toHaveScreenshot(
            `vp-${vp.name}-courses-toolbar.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      // ─── Profile page sections ───────────────────────────────────────────
      test('profile — avatar section', async ({ page }) => {
        await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const avatarSection = page.locator('[data-testid="profile-header"], [data-testid="avatar-section"]').first();
        if (await avatarSection.isVisible().catch(() => false)) {
          await expect(avatarSection).toHaveScreenshot(
            `vp-${vp.name}-profile-avatar-section.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const },
          );
        }
      });

      // ─── Settings page sections ──────────────────────────────────────────
      test('settings — form section', async ({ page }) => {
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const formSection = page.locator('form, [data-testid="settings-form"]').first();
        if (await formSection.isVisible().catch(() => false)) {
          await expect(formSection).toHaveScreenshot(
            `vp-${vp.name}-settings-form-section.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      // ─── Search page sections ────────────────────────────────────────────
      test('search — results area', async ({ page }) => {
        await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const results = page.locator('[data-testid="search-results"], [data-testid="results-area"], main').first();
        if (await results.isVisible().catch(() => false)) {
          await expect(results).toHaveScreenshot(
            `vp-${vp.name}-search-results-area.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
          );
        }
      });

      // ─── Notifications page sections ─────────────────────────────────────
      test('notifications — list area', async ({ page }) => {
        await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const notifList = page.locator('[data-testid="notifications-list"], [data-testid="notification-feed"]').first();
        if (await notifList.isVisible().catch(() => false)) {
          await expect(notifList).toHaveScreenshot(
            `vp-${vp.name}-notifications-list-area.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
          );
        }
      });
    });
  }
});
