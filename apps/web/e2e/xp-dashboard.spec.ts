/**
 * XP Dashboard — E2E regression guard (Phase 36)
 *
 * Verifies that the dashboard XP/level widgets render correctly and do not
 * contain mock-data sentinel strings.
 *
 * DashboardPage (Session 25+) renders:
 *   - data-testid="xp-widget"  — XP points row
 *   - data-testid="xp-level-badge" — "Lv. N" badge
 *   - data-testid="streak-widget" — streak flame row
 *
 * Suite 1 — DEV_MODE (default, no backend required):
 *   Asserts XP widget and level badge are visible, no MOCK_XP sentinel string.
 *
 * Suite 2 — Live backend (VITE_DEV_MODE=false):
 *   Real Keycloak login as student; asserts level badge shows a numeric level,
 *   and takes a visual snapshot.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — XP widget guard ──────────────────────────────────────

test.describe('XP Dashboard — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('no MOCK_XP sentinel string in DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Phase 36 regression guard: MOCK_XP must never appear in the UI
    expect(body).not.toContain('MOCK_XP');
    expect(body).not.toContain('MOCK_');
  });

  test('xp-widget section is rendered', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const widget = page.locator('[data-testid="xp-widget"]');
    await widget.waitFor({ timeout: 10_000 });
    await expect(widget).toBeVisible();
  });

  test('xp-level-badge is rendered', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const badge = page.locator('[data-testid="xp-level-badge"]');
    await badge.waitFor({ timeout: 10_000 });
    await expect(badge).toBeVisible();
  });

  test('xp-level-badge contains "Lv." prefix', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const badge = page.locator('[data-testid="xp-level-badge"]');
    await badge.waitFor({ timeout: 10_000 });
    const text = await badge.textContent();
    expect(text).toMatch(/Lv\.\s*\d+/);
  });

  test('no [object Object] serialization in dashboard DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('dashboard renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — real XP data + visual regression ──────────────────

test.describe('XP Dashboard — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('xp level badge shows a numeric level in live-backend mode', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const badge = page.locator('[data-testid="xp-level-badge"]');
    await badge.waitFor({ timeout: 10_000 });
    const text = await badge.textContent();
    // Must match "Lv. N" where N is an integer >= 1
    expect(text?.trim()).toMatch(/^Lv\.\s*\d+$/);
  });

  test('xp widget shows numeric xp value', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const widget = page.locator('[data-testid="xp-widget"]');
    await widget.waitFor({ timeout: 10_000 });
    const text = await widget.textContent();
    // Must contain a number (xp count)
    expect(text).toMatch(/\d+/);
  });

  test('no mock sentinel strings in live-backend render', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_XP');
    expect(body).not.toContain('MOCK_');
    expect(body).not.toContain('[object Object]');
  });

  test('visual snapshot — XP dashboard widgets', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('xp-dashboard-chromium-win32.png', {
      maxDiffPixels: 200,
    });
  });
});
