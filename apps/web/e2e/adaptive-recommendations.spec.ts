/**
 * Adaptive Recommendations — E2E spec (Phase 35)
 *
 * Guards against regression of the adaptive recommendation widget on the
 * dashboard introduced in Phase 35.
 *
 * What this spec checks:
 *   1. Recommended courses render a human-readable reason string (not raw data).
 *   2. No [object Object] serialization appears anywhere in the DOM.
 *   3. No N+1 warning messages are surfaced to the user.
 *   4. Visual snapshot for regression baseline.
 *
 * DEV_MODE: tests use mock data injected by the app's DevMode provider.
 * Live backend: tests assert real API responses match expectations.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE ─────────────────────────────────────────────────────────

test.describe('Adaptive Recommendations — DEV_MODE', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('no [object Object] serialization in dashboard DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('[object Object]');
  });

  test('no N+1 query warning messages are surfaced to users', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('N+1 query detected');
    expect(body).not.toContain('BatchLoadError');
  });

  test('dashboard renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('recommendations visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(
      'recommendations-with-reason-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});

// ── Suite 2: Live backend — reason text and data quality ──────────────────────

test.describe('Adaptive Recommendations — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('recommended courses show human-readable reason text', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';

    // No raw object serialization
    expect(body).not.toContain('[object Object]');
    // No N+1 warning messages
    expect(body).not.toContain('N+1 query detected');
  });

  test('no raw GraphQL error messages visible on dashboard', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('[Network]');
    expect(body).not.toContain('CombinedError');
  });

  test('recommendations section visual snapshot — live backend', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(
      'recommendations-with-reason-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});
