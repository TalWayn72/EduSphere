/**
 * Peer Review — E2E regression guard (Phase 45)
 *
 * Verifies the PeerReviewDashboard renders correctly and that assigned
 * review tasks are visible without leaking technical error strings.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Peer Review — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('peer review dashboard renders heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Peer Review/i })
    ).toBeVisible();
  });

  test('peer review page has no crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no [object Object] in peer review DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('peer review shows assignments or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasAssignments = await page.locator('[data-testid="peer-review-assignment"]').count();
    const hasEmpty = await page
      .getByText(/No reviews assigned|No pending reviews|No assignments/i)
      .count();
    expect(hasAssignments + hasEmpty).toBeGreaterThan(0);
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Peer Review — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('peer review dashboard renders with screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Peer Review/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('peer-review-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('IDOR guard — raw GraphQL error not shown for unauthorized review', async ({
    page,
  }) => {
    // Mock a 403 GraphQL response and verify no raw error string is exposed
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { query?: string } | null;
      if (body?.query?.includes('submitPeerReview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            errors: [{ message: 'UnauthorizedException: not your review' }],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Raw exception class name must not be visible to the user
    const body = await page.textContent('body');
    expect(body).not.toContain('UnauthorizedException');
  });
});
