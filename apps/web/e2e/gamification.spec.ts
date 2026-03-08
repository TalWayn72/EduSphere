/**
 * Gamification Page — E2E regression guard (Phase 37)
 *
 * Verifies that the GamificationPage renders correctly with 3 tabs:
 * Progress, Challenges, Leaderboard. Tests both DEV_MODE and live-backend.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Gamification Page — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to /gamification and shows 3 tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: /progress/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /challenges/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /leaderboard/i })).toBeVisible();
  });

  test('no MOCK_ sentinel strings in gamification DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('no [object Object] serialization in gamification DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('challenges tab shows challenge cards or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /challenges/i }).click();

    // Either challenge cards OR empty state is visible — not a blank page
    const hasCards = await page.locator('[data-testid="challenge-card"]').count();
    const hasEmpty = await page.getByText(/no active challenges/i).count();
    expect(hasCards + hasEmpty).toBeGreaterThan(0);
  });

  test('gamification page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Gamification Page — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('progress tab is visible on /gamification', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: /progress/i })).toBeVisible();
    await expect(page).toHaveScreenshot('gamification-progress-tab.png', {
      maxDiffPixels: 200,
    });
  });

  test('challenges tab shows challenge cards or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /challenges/i }).click();

    const hasCards = await page.locator('[data-testid="challenge-card"]').count();
    const hasEmpty = await page.getByText(/no active challenges/i).count();
    expect(hasCards + hasEmpty).toBeGreaterThan(0);
    await expect(page).toHaveScreenshot('gamification-challenges-tab.png', {
      maxDiffPixels: 200,
    });
  });

  test('leaderboard tab renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/gamification`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /leaderboard/i }).click();
    await expect(page).toHaveScreenshot('gamification-leaderboard-tab.png', {
      maxDiffPixels: 200,
    });
  });
});
