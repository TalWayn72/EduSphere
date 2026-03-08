/**
 * Manager Dashboard — E2E regression guard (Phase 37)
 *
 * Verifies that the ManagerDashboardPage renders for authorized roles and
 * correctly gates access for unauthorized roles (STUDENT).
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Manager Dashboard — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('no MOCK_ sentinel strings in manager dashboard DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('manager page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — role-based access + visual regression ─────────────

test.describe('Manager Dashboard — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('org admin can access /manager', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.superAdmin);
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Manager Dashboard/i)).toBeVisible();
    await expect(page).toHaveScreenshot('manager-dashboard-admin.png', {
      maxDiffPixels: 200,
    });
  });

  test('student is redirected away from /manager', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should redirect to home, not see Manager Dashboard
    await expect(page.getByText(/Manager Dashboard/i)).not.toBeVisible();
  });
});
