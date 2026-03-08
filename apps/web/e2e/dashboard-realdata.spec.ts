/**
 * Dashboard Real Data — E2E regression guard (Phase 35)
 *
 * Verifies that the dashboard renders real data from the backend
 * (no mock strings, no object serialization) and that numeric
 * widgets show actual values.
 *
 * Suite 1 — DEV_MODE (default, no backend required):
 *   Uses loginInDevMode shortcut. Asserts mock-sentinel strings are absent
 *   and that the dashboard renders without crash.
 *
 * Suite 2 — Live backend (VITE_DEV_MODE=false):
 *   Performs real Keycloak login as student, asserts streak widget shows
 *   a numeric value pulled from the real API, and takes a visual snapshot.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — guard against mock-data sentinel strings ──────────────

test.describe('Dashboard Real Data — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('no known mock-data sentinel strings appear in the DOM', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');

    // These strings are seeded only in the DB seed — they must not appear as
    // hardcoded fallbacks in any UI component (Phase 35 regression guard).
    expect(body).not.toContain('Dr. Cohen');
    expect(body).not.toContain('Introduction to Talmud Study');
    expect(body).not.toContain('MOCK_');
  });

  test('no raw object serialization in the DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no crash overlay appears', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('dashboard renders welcome heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('welcome-heading')).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ── Suite 2: Live backend — real numeric data assertions ──────────────────────

test.describe('Dashboard Real Data — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('streak widget shows a numeric value', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    const streakEl = page.locator('[data-testid="streak-count"]');
    await streakEl.waitFor({ timeout: 10_000 });
    const text = await streakEl.textContent();
    // Must be a digit string (including zero)
    expect(text?.trim()).toMatch(/^\d+$/);
  });

  test('no mock sentinel strings visible in DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('Dr. Cohen');
    expect(body).not.toContain('Introduction to Talmud Study');
    expect(body).not.toContain('MOCK_');
    expect(body).not.toContain('[object Object]');
  });

  test('dashboard screenshot — live backend render', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard-realdata-chromium-win32.png', {
      maxDiffPixels: 200,
    });
  });
});
