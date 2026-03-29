/**
 * Visual Regression — Viewport Matrix: Learning Pages
 *
 * Tests learning/assessment pages at 4 viewports (mobile, tablet, desktop, wide).
 * Each page gets full-page + primary section + secondary section screenshots.
 * Total: ~60 assertions.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-viewport-matrix-learning.spec.ts
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

const LEARNING_PAGES = [
  {
    path: '/exams',
    name: 'exams',
    section: '[data-testid="exams-list"], [data-testid="exam-content"], main',
  },
  {
    path: '/assessments',
    name: 'assessments',
    section: '[data-testid="assessments-list"], [data-testid="assessment-content"], main',
  },
  {
    path: '/social',
    name: 'social',
    section: '[data-testid="social-feed"], [data-testid="social-content"], main',
  },
  {
    path: '/knowledge-graph',
    name: 'knowledge-graph',
    section: '[data-testid="graph-canvas"], [data-testid="knowledge-graph"], canvas, main',
  },
  {
    path: '/analytics',
    name: 'analytics',
    section: '[data-testid="analytics-charts"], [data-testid="analytics-content"], main',
  },
] as const;

test.describe('Viewport Matrix — Learning Pages @visual', () => {
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

      for (const pg of LEARNING_PAGES) {
        test(`${pg.name} — full page`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(
            `vp-${vp.name}-${pg.name}-full.png`,
            { ...LOOSE_OPTS, mask: dynamicMasks(page) },
          );
        });

        test(`${pg.name} — primary section`, async ({ page }) => {
          await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          const section = page.locator(pg.section).first();
          if (await section.isVisible().catch(() => false)) {
            await expect(section).toHaveScreenshot(
              `vp-${vp.name}-${pg.name}-section.png`,
              { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
            );
          }
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
    });
  }

  // === EXPANDED COVERAGE — Footer & sidebar per viewport ===
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} — footer & sidebar`, () => {
      test(`learning footer at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const footer = page.locator('footer, [data-testid="app-footer"]').first();
        if (await footer.isVisible().catch(() => false)) {
          await expect(footer).toHaveScreenshot(
            `vp-${vp.name}-learning-footer.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      test(`learning sidebar at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const sidebar = page.locator('aside, [data-testid="app-sidebar"], [role="complementary"]').first();
        if (await sidebar.isVisible().catch(() => false)) {
          await expect(sidebar).toHaveScreenshot(
            `vp-${vp.name}-learning-sidebar.png`,
            { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
          );
        }
      });

      test(`social page content at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const content = page.locator('main, [role="main"]').first();
        if (await content.isVisible().catch(() => false)) {
          await expect(content).toHaveScreenshot(
            `vp-${vp.name}-social-content.png`,
            { maxDiffPixelRatio: 0.05, animations: 'disabled' as const, mask: dynamicMasks(page) },
          );
        }
      });
    });
  }
});
