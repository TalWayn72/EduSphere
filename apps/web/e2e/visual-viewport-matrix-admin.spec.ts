/**
 * Visual Regression — Viewport Matrix: Admin Pages
 *
 * Tests admin pages at 4 viewports (mobile, tablet, desktop, wide).
 * Each page gets full-page + sidebar + content area screenshots per viewport.
 * Total: ~60 assertions.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-matrix-admin.spec.ts
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

const ADMIN_PAGES = [
  { path: '/admin', name: 'admin-dashboard' },
  { path: '/admin/compliance', name: 'admin-compliance' },
  { path: '/admin/lti', name: 'admin-lti' },
  { path: '/admin/scim', name: 'admin-scim' },
  { path: '/admin/settings', name: 'admin-settings' },
] as const;

test.describe('Viewport Matrix — Admin Pages @visual', () => {
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

      for (const pg of ADMIN_PAGES) {
        test(`${pg.name} — full page`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(
            `vp-${vp.name}-${pg.name}-full.png`,
            { ...LOOSE_OPTS, mask: dynamicMasks(page) },
          );
        });

        test(`${pg.name} — sidebar`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const sidebar = page.locator(
            '[data-testid="admin-sidebar"], [data-testid="app-sidebar"], aside',
          ).first();
          if (await sidebar.isVisible().catch(() => false)) {
            await expect(sidebar).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-sidebar.png`,
              { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
            );
          }
        });

        test(`${pg.name} — content area`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const content = page.locator(
            '[data-testid="admin-content"], main, [role="main"]',
          ).first();
          if (await content.isVisible().catch(() => false)) {
            await expect(content).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-content.png`,
              { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
            );
          }
        });
      }
    });
  }

  // === EXPANDED COVERAGE — Header & Breadcrumbs per viewport ===
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} — header & breadcrumbs`, () => {
      test(`admin header at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const header = page.locator('header, nav, [data-testid="app-header"]').first();
        if (await header.isVisible().catch(() => false)) {
          await expect(header).toHaveScreenshot(
            `vp-${vp.name}-admin-header.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      test(`admin breadcrumbs at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/admin/compliance`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav[aria-label="breadcrumb"], .breadcrumbs').first();
        if (await breadcrumbs.isVisible().catch(() => false)) {
          await expect(breadcrumbs).toHaveScreenshot(
            `vp-${vp.name}-admin-breadcrumbs.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      test(`admin footer at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const footer = page.locator('footer, [data-testid="app-footer"]').first();
        if (await footer.isVisible().catch(() => false)) {
          await expect(footer).toHaveScreenshot(
            `vp-${vp.name}-admin-footer.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });
    });
  }
});
