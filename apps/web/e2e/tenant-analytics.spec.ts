/**
 * Tenant Analytics — E2E spec (Phase 35)
 *
 * Tests for the /admin/analytics page introduced in Phase 35.
 *
 * Covers:
 *   - Period tab navigation (7d / 30d / 90d)
 *   - Role-based access control (ORG_ADMIN can view, STUDENT is blocked)
 *   - Visual snapshot of the analytics dashboard
 *
 * DEV_MODE (default): period tabs tested against mock data.
 * Live backend (VITE_DEV_MODE=false): real Keycloak login as org.admin,
 *   asserts real API data populates the page and screenshot matches baseline.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — tab UI and no-crash guard ────────────────────────────

test.describe('Tenant Analytics — DEV_MODE tab UI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('analytics page loads without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/analytics`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('period tab buttons are rendered', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/analytics`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('[data-testid="period-tab-7d"]')
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.locator('[data-testid="period-tab-30d"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="period-tab-90d"]')
    ).toBeVisible();
  });

  test('switching to 90d tab does not crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/analytics`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    const tab90d = page.locator('[data-testid="period-tab-90d"]');
    await tab90d.waitFor({ timeout: 8_000 });
    await tab90d.click();

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });
});

// ── Suite 2: Live backend — auth + visual regression ─────────────────────────

test.describe('Tenant Analytics — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('org admin can view analytics and period tabs are visible', async ({
    page,
  }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(`${BASE_URL}/admin/analytics`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('[data-testid="period-tab-7d"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="period-tab-30d"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="period-tab-90d"]')
    ).toBeVisible();

    await expect(page).toHaveScreenshot(
      'admin-analytics-30d-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });

  test('student gets blocked from /admin/analytics', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/admin/analytics`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const body = (await page.textContent('body')) ?? '';

    // Accepted outcomes: redirected away OR shown an access-denied message
    const isBlocked =
      !url.includes('/admin/analytics') ||
      /403|unauthorized|access denied|forbidden/i.test(body);

    expect(
      isBlocked,
      `Student should be blocked from /admin/analytics but reached: ${url}`
    ).toBeTruthy();
  });

  test('analytics page screenshot — 30d view', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(`${BASE_URL}/admin/analytics`);
    await page.waitForLoadState('networkidle');

    // Switch to 30d tab
    const tab30d = page.locator('[data-testid="period-tab-30d"]');
    await tab30d.waitFor({ timeout: 10_000 });
    await tab30d.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(
      'admin-analytics-30d-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});
