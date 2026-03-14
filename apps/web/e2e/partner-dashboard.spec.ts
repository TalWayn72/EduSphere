/**
 * partner-dashboard.spec.ts — E2E tests for PartnerDashboardPage
 * wired to real GraphQL (page.route intercepted).
 *
 * Route: /partner/dashboard (protected)
 *
 * Tests: revenue data display, regenerate API key with confirmation dialog,
 *        new key shown once, empty state, loading skeleton, no MOCK_REVENUE,
 *        no raw error strings.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/partner-dashboard.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Anti-regression ────────────────────────────────────────────────────────

async function assertNoRawErrors(page: Page): Promise<void> {
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('MOCK_REVENUE');
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_DASHBOARD = {
  status: 'ACTIVE',
  apiKey: 'esph_live_abc123def456ghi789',
  revenueByMonth: [
    { month: '2026-01', grossRevenue: 10000, platformCut: 3000, payout: 7000, status: 'PAID' },
    { month: '2026-02', grossRevenue: 12500, platformCut: 3750, payout: 8750, status: 'PAID' },
    { month: '2026-03', grossRevenue: 15000, platformCut: 4500, payout: 10500, status: 'PENDING' },
  ],
};

const NEW_API_KEY = 'esph_live_newkey_xyz999abc111';

function mockPartnerWithData(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('myPartnerDashboard') || op === 'PartnerDashboard') {
      return JSON.stringify({
        data: { myPartnerDashboard: MOCK_DASHBOARD },
      });
    }
    if (q.includes('regeneratePartnerApiKey') || op === 'RegeneratePartnerApiKey') {
      return JSON.stringify({
        data: { regeneratePartnerApiKey: { apiKey: NEW_API_KEY } },
      });
    }
    return null;
  });
}

function mockPartnerEmpty(page: Page): Promise<void> {
  return routeGraphQL(page, (op, body) => {
    const q = (body.query as string | undefined) ?? '';
    if (q.includes('myPartnerDashboard') || op === 'PartnerDashboard') {
      return JSON.stringify({ data: { myPartnerDashboard: null } });
    }
    return null;
  });
}

const DASHBOARD_URL = `${BASE_URL}/partner/dashboard`;

// ─── Data-loaded state ──────────────────────────────────────────────────────

test.describe('Partner Dashboard — Revenue Data', () => {
  test.beforeEach(async ({ page }) => {
    await mockPartnerWithData(page);
    await login(page);
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('page loads with partner dashboard container', async ({ page }) => {
    await expect(
      page.locator('[data-testid="partner-dashboard-page"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('partner status badge shows ACTIVE', async ({ page }) => {
    const badge = page.locator('[data-testid="partner-status-badge"]');
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect(badge).toHaveText('ACTIVE');
  });

  test('revenue table is visible with month data', async ({ page }) => {
    const table = page.locator('[data-testid="revenue-table"]');
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('2026-01')).toBeVisible();
    await expect(table.getByText('2026-02')).toBeVisible();
    await expect(table.getByText('2026-03')).toBeVisible();
  });

  test('revenue table shows payout amounts', async ({ page }) => {
    const table = page.locator('[data-testid="revenue-table"]');
    const text = (await table.textContent()) ?? '';
    expect(text).toContain('$7,000');
    expect(text).toContain('$8,750');
    expect(text).toContain('$10,500');
  });

  test('revenue table shows PAID and PENDING status badges', async ({ page }) => {
    const table = page.locator('[data-testid="revenue-table"]');
    await expect(table.getByText('PAID').first()).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText('PENDING')).toBeVisible({ timeout: 10_000 });
  });

  test('no MOCK_REVENUE text visible on the page', async ({ page }) => {
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('MOCK_REVENUE');
    expect(body).not.toContain('mock_revenue');
  });

  test('API key section is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="api-key-section"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('API key is masked by default (not shown in plain)', async ({ page }) => {
    const display = page.locator('[data-testid="api-key-display"]');
    await expect(display).toBeVisible({ timeout: 10_000 });
    const text = (await display.textContent()) ?? '';
    // Should show masked key with dots
    expect(text).toContain('esph_liv');
    expect(text).toContain('\u2022'); // bullet character from maskKey()
  });

  test('no raw error strings visible', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Regenerate API key ─────────────────────────────────────────────────────

test.describe('Partner Dashboard — API Key Regeneration', () => {
  test.beforeEach(async ({ page }) => {
    await mockPartnerWithData(page);
    await login(page);
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('regenerate button shows confirmation dialog', async ({ page }) => {
    const regenBtn = page.locator('[data-testid="regenerate-key-btn"]');
    await expect(regenBtn).toBeVisible({ timeout: 10_000 });
    await regenBtn.click();

    // Confirmation dialog should appear
    await expect(
      page.getByRole('heading', { name: /Regenerate API Key/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('confirmation dialog warns about invalidating current key', async ({ page }) => {
    await page.locator('[data-testid="regenerate-key-btn"]').click();
    const dialogBody = (await page.textContent('[role="dialog"]')) ?? '';
    expect(dialogBody).toMatch(/permanently invalidate/i);
  });

  test('confirming regeneration shows new key in plain text', async ({ page }) => {
    await page.locator('[data-testid="regenerate-key-btn"]').click();
    await page.locator('[data-testid="confirm-regenerate-btn"]').click();

    // Wait for mutation to resolve and new key to display
    const display = page.locator('[data-testid="api-key-display"]');
    await expect(display).toContainText(NEW_API_KEY, { timeout: 10_000 });
  });

  test('new key notice is shown after regeneration', async ({ page }) => {
    await page.locator('[data-testid="regenerate-key-btn"]').click();
    await page.locator('[data-testid="confirm-regenerate-btn"]').click();

    await expect(
      page.locator('[data-testid="new-key-notice"]')
    ).toBeVisible({ timeout: 10_000 });

    const notice = (await page.locator('[data-testid="new-key-notice"]').textContent()) ?? '';
    expect(notice).toMatch(/will not be shown again/i);
  });
});

// ─── Empty state ────────────────────────────────────────────────────────────

test.describe('Partner Dashboard — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await mockPartnerEmpty(page);
    await login(page);
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('empty state shows "No partner account found"', async ({ page }) => {
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="empty-state"]')).toHaveText(
      /No partner account found/i
    );
  });

  test('revenue table is NOT visible in empty state', async ({ page }) => {
    await expect(
      page.locator('[data-testid="revenue-table"]')
    ).not.toBeVisible();
  });

  test('no raw errors in empty state', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Loading skeleton ───────────────────────────────────────────────────────

test.describe('Partner Dashboard — Loading Skeleton', () => {
  test('loading skeleton appears before data arrives', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type, authorization',
          },
          body: '',
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { myPartnerDashboard: MOCK_DASHBOARD },
        }),
      });
    });

    await login(page);
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-testid="partner-skeleton"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
