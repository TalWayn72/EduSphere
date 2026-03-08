/**
 * Recommendations Real Data — E2E regression guard (Phase 36)
 *
 * Verifies that the dashboard Recommendations section renders real data from
 * the backend and does not leak serialized JavaScript objects or N+1 warnings
 * into the DOM.
 *
 * Suite 1 — DEV_MODE (default):
 *   Asserts the recommendations section exists and is free of bad strings.
 *
 * Suite 2 — Live backend (VITE_DEV_MODE=false):
 *   Performs Keycloak login as student, asserts recommended courses section is
 *   populated and free of raw object serialization, takes a visual snapshot.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — sentinel string guard ─────────────────────────────────

test.describe('Recommendations Real Data — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('recommendations section is present on dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // data-testid="recommendations" is rendered by DashboardPage
    const section = page.locator('[data-testid="recommendations"]');
    await section.waitFor({ timeout: 10_000 });
    await expect(section).toBeVisible();
  });

  test('no [object Object] serialization in DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no MOCK_ sentinel strings in dashboard DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('no N+1 query warning string visible in DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('N+1 query detected');
    expect(body).not.toContain('N+1 query');
  });

  test('no empty stringified array visible in DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Stringified empty array leaked into the DOM is a bug
    expect(body).not.toMatch(/^\[\]$/m);
  });

  test('recommendations section renders without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — real API + visual regression ──────────────────────

test.describe('Recommendations Real Data — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('recommendations section visible with real data', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const section = page.locator('[data-testid="recommendations"]');
    await section.waitFor({ timeout: 10_000 });
    await expect(section).toBeVisible();
  });

  test('no raw object serialization in live-backend render', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('MOCK_');
    expect(body).not.toContain('N+1 query');
  });

  test('visual snapshot — recommendations section', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'recommendations-with-reason-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});
