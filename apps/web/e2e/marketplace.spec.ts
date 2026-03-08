/**
 * Marketplace Page — E2E regression guard (Phase 37)
 *
 * Verifies that the MarketplacePage loads real listings (mounted guard fix)
 * and is not stuck in a paused query state.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Marketplace Page — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('marketplace page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no MOCK_ sentinel strings in marketplace DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('marketplace page is not stuck in an infinite loading spinner', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Loading spinners should NOT be visible after networkidle
    const loadingSpinners = await page.locator('[aria-label="loading"]').count();
    expect(loadingSpinners).toBe(0);
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Marketplace Page — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('marketplace page loads real listings (not paused query)', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Mounted guard fix: query should execute, not remain paused
    const content = await page.content();
    // Should not contain raw "pause: true" in DOM (regression guard for mounted-guard bug)
    expect(content).not.toContain('pause: true');

    // Loading spinner should not remain stuck
    const loadingSpinners = await page.locator('[aria-label="loading"]').count();
    expect(loadingSpinners).toBe(0);

    await expect(page).toHaveScreenshot('marketplace-loaded.png', {
      maxDiffPixels: 200,
    });
  });

  test('marketplace shows course listing cards or empty state', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasCourses = await page
      .locator('[data-testid="course-card"], [data-testid="listing-card"]')
      .count();
    const hasEmpty = await page.getByText(/no courses available/i).count();

    // Either listings or an empty state — not a blank page with no content
    expect(hasCourses + hasEmpty).toBeGreaterThan(0);
  });
});
