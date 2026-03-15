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

// ── Suite 3: GraphQL error handling and edge cases ─────────────────────────────

test.describe('Manager Dashboard — error handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('manager dashboard handles GraphQL network failure gracefully', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('managerStats') ||
        body.includes('orgMetrics') ||
        body.includes('dashboardData')
      ) {
        await route.abort('connectionrefused');
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('ERR_CONNECTION_REFUSED');
    expect(body).not.toContain('NetworkError');
    expect(body).not.toContain('[Network]');

    await expect(page).toHaveScreenshot('manager-dashboard-network-error.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('manager dashboard handles 500 server error without exposing internals', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('managerStats') ||
        body.includes('orgMetrics') ||
        body.includes('dashboardData')
      ) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: 'PostgreSQL pool exhausted: max_connections=100',
                extensions: { code: 'INTERNAL_SERVER_ERROR' },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('PostgreSQL pool exhausted');
    expect(body).not.toContain('max_connections');
    expect(body).not.toContain('INTERNAL_SERVER_ERROR');
  });

  test('manager dashboard empty state when no data returned', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('managerStats') ||
        body.includes('orgMetrics') ||
        body.includes('dashboardData')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              managerStats: null,
              orgMetrics: null,
              dashboardData: { users: [], courses: [], activeCount: 0 },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });

    await expect(page).toHaveScreenshot('manager-dashboard-empty-state.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('no raw i18n keys visible on manager dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    // Must not show untranslated keys like "manager.stats.title"
    expect(body).not.toMatch(/\bmanager\.[a-z]+\.[a-z]+\b/);
    expect(body).not.toMatch(/\bdashboard\.[a-z]+\.[a-z]+\b/);
  });

  test('manager dashboard visual regression — DEV_MODE', async ({ page }) => {
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('manager-dashboard-devmode.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('no raw GraphQL error strings on manager dashboard', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('[Network]');
    expect(body).not.toContain('CombinedError');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('[GraphQL]');
  });
});
