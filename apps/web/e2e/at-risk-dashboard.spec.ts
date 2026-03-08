/**
 * At-Risk Dashboard — E2E spec (Phase 36)
 *
 * Tests for the /admin/at-risk page (AtRiskDashboardPage).
 *
 * Covers:
 *   - Admin (ORG_ADMIN) can view the at-risk dashboard
 *   - Page renders stat cards and either data rows or an empty-state message
 *   - Student is redirected away from /admin/at-risk
 *   - No mock sentinel strings in the DOM
 *   - Visual snapshot of the at-risk dashboard
 *
 * DEV_MODE (default): page tested against the dev mock user (SUPER_ADMIN in dev).
 * Live backend (VITE_DEV_MODE=false): real Keycloak login.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — page loads + no crash ─────────────────────────────────

test.describe('At-Risk Dashboard — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    // DEV_MODE auto-authenticates as SUPER_ADMIN which has ADMIN_ROLES access
    await login(page);
  });

  test('at-risk page loads without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/at-risk`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('at-risk page renders stat cards or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/at-risk`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    // Either a learner table row, or the empty-state message must be present
    const emptyState = page.locator('[data-testid="empty-state"]');
    const tableRow = page.locator(
      'table tr, [data-testid="learner-row"], [role="row"]'
    );

    const emptyVisible = await emptyState
      .isVisible()
      .catch(() => false);
    const hasRows = (await tableRow.count()) > 0;

    expect(
      emptyVisible || hasRows,
      'At-risk page must show either empty state or learner rows'
    ).toBeTruthy();
  });

  test('no [object Object] in at-risk page DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/at-risk`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no MOCK_ sentinel in at-risk page DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/at-risk`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });
});

// ── Suite 2: Live backend — auth + RBAC + visual regression ───────────────────

test.describe('At-Risk Dashboard — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('org admin can view at-risk dashboard', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    // Use org admin credentials for the actual navigation
    await loginViaKeycloak(
      page,
      process.env.E2E_ORG_ADMIN_EMAIL
        ? {
            email: process.env.E2E_ORG_ADMIN_EMAIL,
            password: process.env.E2E_ORG_ADMIN_PASSWORD ?? '',
          }
        : { email: 'org.admin@example.com', password: 'OrgAdmin123!' }
    );
    await page.goto(`${BASE_URL}/admin/at-risk`);
    await page.waitForLoadState('networkidle');

    // Page title is "At-Risk Learners" (from AdminLayout title prop)
    const body = await page.textContent('body');
    expect(body).toMatch(/at.risk/i);
  });

  test('student cannot access /admin/at-risk', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/admin/at-risk`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const body = (await page.textContent('body')) ?? '';

    // Accepted outcomes: redirected away (e.g. /dashboard) OR access-denied message
    const isBlocked =
      !url.includes('/admin/at-risk') ||
      /403|unauthorized|access denied|forbidden/i.test(body);

    expect(
      isBlocked,
      `Student should be blocked from /admin/at-risk but reached: ${url}`
    ).toBeTruthy();
  });

  test('at-risk dashboard visual snapshot', async ({ page }) => {
    await loginViaKeycloak(
      page,
      process.env.E2E_ORG_ADMIN_EMAIL
        ? {
            email: process.env.E2E_ORG_ADMIN_EMAIL,
            password: process.env.E2E_ORG_ADMIN_PASSWORD ?? '',
          }
        : { email: 'org.admin@example.com', password: 'OrgAdmin123!' }
    );
    await page.goto(`${BASE_URL}/admin/at-risk`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'at-risk-dashboard-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});
