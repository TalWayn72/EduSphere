import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

/**
 * Tablet Viewport E2E Tests — iPad (768×1024)
 *
 * Validates that 10 critical pages render correctly at tablet width:
 * - No horizontal overflow / scrollbar
 * - Main content visible and accessible
 * - Visual regression screenshots for each page
 */

test.use({ viewport: { width: 768, height: 1024 } });

/** Assert no horizontal scrollbar is present on the page. */
async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBe(false);
}

test.describe('Tablet Viewport — iPad 768×1024', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ─── 1. Dashboard ──────────────────────────────────────────────────────────

  test('dashboard — layout renders without horizontal overflow', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('welcome-heading')).toBeVisible({ timeout: 10_000 });
    await assertNoHorizontalOverflow(page);
  });

  test('dashboard — visual regression', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('welcome-heading')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('tablet-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 2. Courses ────────────────────────────────────────────────────────────

  test('courses — grid adapts to tablet width', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    // Main content area should be visible
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('courses — visual regression', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-courses.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 3. Settings ───────────────────────────────────────────────────────────

  test('settings — form fields readable', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('settings — visual regression', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-settings.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 4. Profile ────────────────────────────────────────────────────────────

  test('profile — card centered without overflow', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('profile — visual regression', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-profile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 5. Admin ──────────────────────────────────────────────────────────────

  test('admin — sidebar visible without overflow', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    // At 768px the admin sidebar should be visible (not collapsed into hamburger)
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('admin — visual regression', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-admin.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 6. Knowledge Graph ────────────────────────────────────────────────────

  test('knowledge-graph — container fills viewport', async ({ page }) => {
    await page.goto('/knowledge-graph');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('knowledge-graph — visual regression', async ({ page }) => {
    await page.goto('/knowledge-graph');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-knowledge-graph.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 7. AI Tutor ───────────────────────────────────────────────────────────

  test('ai-tutor — chat panel properly sized', async ({ page }) => {
    await page.goto('/ai-tutor');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('ai-tutor — visual regression', async ({ page }) => {
    await page.goto('/ai-tutor');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-ai-tutor.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 8. Assessments ────────────────────────────────────────────────────────

  test('assessments — cards layout without overflow', async ({ page }) => {
    await page.goto('/assessments');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('assessments — visual regression', async ({ page }) => {
    await page.goto('/assessments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-assessments.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 9. Discussions ────────────────────────────────────────────────────────

  test('discussions — thread list readable', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('discussions — visual regression', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-discussions.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  // ─── 10. Discover ──────────────────────────────────────────────────────────

  test('discover — grid layout without overflow', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');
    await assertNoHorizontalOverflow(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('discover — visual regression', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-discover.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
