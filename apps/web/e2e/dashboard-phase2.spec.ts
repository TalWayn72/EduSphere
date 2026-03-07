/**
 * Dashboard Phase 2 Redesign — E2E stubs
 *
 * Tests for the Phase 2 dashboard redesign components:
 *   - StreakWidget (data-testid="streak-widget")
 *   - Continue Learning section (data-testid="continue-learning-section")
 *   - Mastery Overview panel (data-testid="mastery-overview")
 *   - Collapsible App Sidebar (data-testid="app-sidebar")
 *
 * These tests target data-testid selectors that Phase 2 implementation
 * must attach to the new dashboard components.
 *
 * Run (DEV_MODE — CI default):
 *   pnpm --filter @edusphere/web exec playwright test e2e/dashboard-phase2.spec.ts
 *
 * Environment:
 *   VITE_DEV_MODE=true (default) — all GraphQL requests are intercepted with
 *   mock responses so no backend is required.
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Shared GraphQL mock ─────────────────────────────────────────────────────

/**
 * Intercept ALL GraphQL requests and return an empty success response.
 * Phase 2 components must render a useful shell even with no data — this
 * assertion validates that no crash overlay is shown on a data-empty state.
 */
async function mockGraphQL(
  page: import('@playwright/test').Page
): Promise<void> {
  await page.route('**/graphql', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

// ─── Suite 1: Phase 2 widget presence ────────────────────────────────────────

test.describe('Dashboard — Phase 2 redesign (widget presence)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockGraphQL(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  });

  test('renders the streak widget', async ({ page }) => {
    // Phase 2: StreakWidget must carry data-testid="streak-widget"
    await expect(page.locator('[data-testid="streak-widget"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('renders the continue learning section', async ({ page }) => {
    // Phase 2: CourseContinueSection must carry data-testid="continue-learning-section"
    await expect(
      page.locator('[data-testid="continue-learning-section"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('renders the mastery overview panel', async ({ page }) => {
    // Phase 2: MasteryOverview must carry data-testid="mastery-overview"
    await expect(
      page.locator('[data-testid="mastery-overview"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('renders the page heading', async ({ page }) => {
    // Phase 27: personalised welcome heading replaces generic "Dashboard" title
    await expect(page.getByTestId('welcome-heading')).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── Suite 2: App Sidebar ────────────────────────────────────────────────────

test.describe('Dashboard — Phase 2 App Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockGraphQL(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  });

  test('sidebar is present', async ({ page }) => {
    // Phase 2: AppSidebar must carry data-testid="app-sidebar"
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('sidebar collapse toggle is present', async ({ page }) => {
    // Phase 2: Collapse button must carry data-testid="sidebar-collapse-toggle"
    await expect(
      page.locator('[data-testid="sidebar-collapse-toggle"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar collapse toggle applies collapsed class', async ({ page }) => {
    const toggle = page.locator('[data-testid="sidebar-collapse-toggle"]');
    await toggle.waitFor({ timeout: 10_000 });
    await toggle.click();

    // Sidebar collapsed state: renders w-16 (narrow) instead of w-60 (wide)
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toHaveClass(/w-16/, { timeout: 5_000 });
  });
});

// ─── Suite 3: Clean rendering (no raw technical strings) ─────────────────────

test.describe('Dashboard — Phase 2 clean rendering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockGraphQL(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  });

  test('no raw "undefined" strings visible on page', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
  });

  test('no "[object Object]" serialization visible on page', async ({
    page,
  }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no crash overlay visible', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('visual regression — dashboard Phase 2 render', async ({ page }) => {
    // Disable animations for stable snapshot
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500); // allow React paint to settle

    await expect(page).toHaveScreenshot('dashboard-phase2.png', {
      fullPage: false,
      maxDiffPixels: 150,
      animations: 'disabled',
    });
  });
});
