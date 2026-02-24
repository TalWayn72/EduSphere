import { test, expect } from '@playwright/test';

/**
 * Visual regression tests — Playwright screenshot comparison
 *
 * Snapshots are stored in: apps/web/e2e/snapshots/
 * Update snapshots: pnpm --filter @edusphere/web exec playwright test visual-regression --update-snapshots
 *
 * Run: pnpm --filter @edusphere/web test:visual
 * Grep: pnpm --filter @edusphere/web test:e2e -- --grep="@visual"
 */

test.use({
  // Disable animations for stable snapshots
  reducedMotion: 'reduce',
});

test.describe('Visual Regression @visual', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('courses list page renders correctly', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('courses-list.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('course viewer renders correctly', async ({ page }) => {
    await page.goto('/learn/content-1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('course-viewer.png', {
      maxDiffPixels: 150,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="user-avatar"]'),
      ],
    });
  });

  test('knowledge graph renders correctly', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('knowledge-graph.png', {
      maxDiffPixels: 200, // Graph layouts may vary slightly
      animations: 'disabled',
    });
  });

  test('RTL layout (Hebrew) renders correctly', async ({ page }) => {
    await page.goto('/courses?lang=he');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('courses-rtl.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('mobile layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('courses-mobile.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });
});
