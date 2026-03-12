/**
 * org-usage.spec.ts — Org Usage Dashboard E2E Tests
 *
 * Route: /admin/usage  (ORG_ADMIN authenticated — DEV_MODE provides auto-auth)
 *
 * Covers:
 *   - Page loads and renders [data-testid="org-usage-page"]
 *   - UsageMeter SVG circular progress element visible
 *   - YAU count displays in "X / Y" format inside the SVG
 *   - Utilization percentage stat card visible
 *   - Green stroke color when utilization < 80%
 *   - Yellow/warning stroke color when utilization is 95%
 *   - Red stroke color + overage callout when utilization exceeds 100%
 *   - MAU stat card visible
 *   - Visual screenshot of normal state (< 80%)
 *   - Visual screenshot of overage state (>= 100%)
 *
 * All GraphQL calls are intercepted via page.route('**\/graphql', …) so no
 * live GraphQL server is required.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/org-usage.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── GraphQL mock helpers ──────────────────────────────────────────────────────

interface UsageOverride {
  yearlyActiveUsers: number;
  seatLimit: number;
  seatUtilizationPct: number;
  overageUsers: number;
  monthlyActiveUsers?: number;
}

/**
 * Build a fake MyTenantUsage GraphQL response and wire it up for the current page.
 * All requests matching the graphql glob are intercepted; the mock is applied for every request
 * so even retried queries inside the component get the same data.
 */
async function mockUsageResponse(
  page: Page,
  override: UsageOverride,
): Promise<void> {
  const payload = {
    data: {
      myTenantUsage: {
        tenantId: 'tenant-e2e-test',
        tenantName: 'Acme University',
        plan: 'GROWTH',
        yearlyActiveUsers: override.yearlyActiveUsers,
        monthlyActiveUsers: override.monthlyActiveUsers ?? 28,
        seatLimit: override.seatLimit,
        seatUtilizationPct: override.seatUtilizationPct,
        overageUsers: override.overageUsers,
      },
    },
  };

  await routeGraphQL(page, (op) => {
    if (op === 'MyTenantUsage') {
      return JSON.stringify(payload);
    }
    return null;
  });
}

// ─── Anti-regression helpers ──────────────────────────────────────────────────

async function assertNoRawErrors(page: Page): Promise<void> {
  const body = await page.textContent('body') ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('Error:');
}

// ─── Suite 1: Page load ───────────────────────────────────────────────────────

test.describe('Org Usage Page — Page Load', () => {
  test.beforeEach(async ({ page }) => {
    // Register mock BEFORE login so urql never sees connection-refused during
    // the login-time navigation (prevents urql from caching a network error).
    await mockUsageResponse(page, {
      yearlyActiveUsers: 342,
      seatLimit: 500,
      seatUtilizationPct: 68,
      overageUsers: 0,
      monthlyActiveUsers: 87,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
  });

  test('org-usage page container is rendered', async ({ page }) => {
    await expect(page.locator('[data-testid="org-usage-page"]')).toBeVisible({ timeout: 15_000 });
  });

  test('page title is "Usage & Seats"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Usage & Seats/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw technical error strings visible', async ({ page }) => {
    await page.locator('[data-testid="org-usage-page"]').waitFor({ timeout: 10_000 });
    await assertNoRawErrors(page);
  });
});

// ─── Suite 2: UsageMeter SVG ──────────────────────────────────────────────────

test.describe('Org Usage Page — UsageMeter SVG', () => {
  test.beforeEach(async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 342,
      seatLimit: 500,
      seatUtilizationPct: 68,
      overageUsers: 0,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });
  });

  test('UsageMeter SVG element is visible', async ({ page }) => {
    const meter = page.locator('[data-testid="usage-meter"]');
    await expect(meter).toBeVisible({ timeout: 10_000 });

    // SVG element must exist within the meter container
    await expect(meter.locator('svg')).toBeVisible({ timeout: 5_000 });
  });

  test('YAU current value matches mocked data (342)', async ({ page }) => {
    // The SVG text element with data-testid="usage-meter-current" holds the current count
    const currentText = page.locator('[data-testid="usage-meter-current"]');
    await expect(currentText).toHaveText('342', { timeout: 10_000 });
  });

  test('SVG displays seat limit denominator "/ 500"', async ({ page }) => {
    // The second SVG text element renders "/ {limit}"
    const svgElement = page.locator('[data-testid="usage-meter"] svg');
    const svgContent = await svgElement.textContent();
    expect(svgContent).toContain('/ 500');
  });

  test('utilization percentage stat card shows "68%"', async ({ page }) => {
    // The stats row card shows seatUtilizationPct
    await expect(page.locator('[data-testid="usage-meter-pct"]')).toContainText('68%', { timeout: 10_000 });
  });

  test('MAU stat card is visible with mocked monthly value', async ({ page }) => {
    // "Monthly Active" label in the stats grid
    const mauLabel = page.getByText(/Monthly Active/i).first();
    await expect(mauLabel).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 3: Color States ────────────────────────────────────────────────────

test.describe('Org Usage Page — Utilization Color States', () => {
  test('stroke is green (#22c55e) when utilization is below 80%', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 300,
      seatLimit: 500,
      seatUtilizationPct: 60,
      overageUsers: 0,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });

    // The progress arc is the second <circle> within the SVG
    const progressArc = page
      .locator('[data-testid="usage-meter"] svg circle')
      .nth(1);

    const strokeColor = await progressArc.getAttribute('stroke');
    expect(strokeColor).toBe('#22c55e');
  });

  test('stroke is yellow (#eab308) when utilization is 95%', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 475,
      seatLimit: 500,
      seatUtilizationPct: 95,
      overageUsers: 0,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });

    const progressArc = page
      .locator('[data-testid="usage-meter"] svg circle')
      .nth(1);

    const strokeColor = await progressArc.getAttribute('stroke');
    expect(strokeColor).toBe('#eab308');
  });

  test('stroke is red (#ef4444) when utilization exceeds 100%', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 510,
      seatLimit: 500,
      seatUtilizationPct: 102,
      overageUsers: 10,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });

    const progressArc = page
      .locator('[data-testid="usage-meter"] svg circle')
      .nth(1);

    const strokeColor = await progressArc.getAttribute('stroke');
    expect(strokeColor).toBe('#ef4444');
  });

  test('overage callout is visible when overageUsers > 0', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 510,
      seatLimit: 500,
      seatUtilizationPct: 102,
      overageUsers: 10,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="overage-callout"]').waitFor({ timeout: 15_000 });

    const callout = page.locator('[data-testid="overage-callout"]');
    await expect(callout).toBeVisible({ timeout: 5_000 });

    // Must mention "over your" to confirm the overage message is present
    await expect(callout).toContainText(/over your/i);
  });

  test('overage callout is NOT shown when utilization is below 100%', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 342,
      seatLimit: 500,
      seatUtilizationPct: 68,
      overageUsers: 0,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });

    await expect(page.locator('[data-testid="overage-callout"]')).not.toBeVisible();
  });
});

// ─── Suite 4: Visual Regression ───────────────────────────────────────────────

test.describe('Org Usage Page — Visual Regression', () => {
  test('visual screenshot — normal state (68% utilization, green)', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 342,
      seatLimit: 500,
      seatUtilizationPct: 68,
      overageUsers: 0,
      monthlyActiveUsers: 87,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });

    // Allow SVG transition to settle (0.4s ease in UsageMeter)
    await page.waitForTimeout(600);

    await expect(page).toHaveScreenshot('org-usage-normal.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  });

  test('visual screenshot — overage state (102% utilization, red + callout)', async ({ page }) => {
    await mockUsageResponse(page, {
      yearlyActiveUsers: 510,
      seatLimit: 500,
      seatUtilizationPct: 102,
      overageUsers: 10,
      monthlyActiveUsers: 112,
    });
    await login(page);
    await page.goto(`${BASE_URL}/admin/usage`, { waitUntil: 'domcontentloaded' });

    // Wait for both the meter and the overage callout to render
    await page.locator('[data-testid="usage-meter"]').waitFor({ timeout: 15_000 });
    await page.locator('[data-testid="overage-callout"]').waitFor({ timeout: 5_000 });

    await page.waitForTimeout(600);

    await expect(page).toHaveScreenshot('org-usage-overage.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  });
});
