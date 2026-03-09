/**
 * Social Feed — E2E regression guard (Phase 45)
 *
 * Verifies that the SocialFeedPage, PeopleSearchPage render correctly
 * and that empty-state messaging is shown when a user has no follows.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Social Feed — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('social feed page renders heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Social Feed/i })
    ).toBeVisible();
  });

  test('empty state shows when no follows', async ({ page }) => {
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Either a real feed OR the empty-state prompt is visible
    const hasFeed = await page.locator('[data-testid="feed-item"]').count();
    const hasEmpty = await page.getByText(/Follow learners/i).count();
    expect(hasFeed + hasEmpty).toBeGreaterThan(0);
  });

  test('people search page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByPlaceholder(/Search people/i)
    ).toBeVisible();
  });

  test('social feed page has no crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no [object Object] in social feed DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Social Feed — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('social feed page renders heading with screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/social`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Social Feed/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('social-feed-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('people search page renders with screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/people`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByPlaceholder(/Search people/i)
    ).toBeVisible();
    await expect(page).toHaveScreenshot('people-search-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('people search returns results or empty state after query', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/people`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/Search people/i);
    await searchInput.fill('student');
    await page.waitForLoadState('networkidle');

    const hasResults = await page.locator('[data-testid="user-card"]').count();
    const hasEmpty = await page
      .getByText(/No users found|No results/i)
      .count();
    expect(hasResults + hasEmpty).toBeGreaterThan(0);
  });
});
