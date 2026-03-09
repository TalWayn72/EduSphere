/**
 * Discussions — E2E regression guard (Phase 45)
 *
 * Verifies the DiscussionsPage renders correctly and that the discussion
 * thread interactions work without exposing raw error strings.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Discussions — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('discussions page renders heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Discussions/i })
    ).toBeVisible();
  });

  test('discussions page has no crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no [object Object] in discussions DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('discussions page shows threads list or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasThreads = await page.locator('[data-testid="discussion-thread"]').count();
    const hasEmpty = await page
      .getByText(/No discussions yet|Start a discussion|Be the first/i)
      .count();
    expect(hasThreads + hasEmpty).toBeGreaterThan(0);
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Discussions — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('discussions page renders with screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Discussions/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('discussions-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('XSS guard — raw HTML tags not rendered in discussion messages', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Verify no unescaped script tags appear in visible text
    const body = await page.textContent('body');
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('onerror=');
  });
});
