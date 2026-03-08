/**
 * SrsReviewPage — E2E regression guard (Phase 38)
 *
 * Verifies that the SRS Review page renders without technical error strings,
 * handles empty card queue gracefully, and shows correct UI states.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('SrsReviewPage — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('SrsReview') ||
        body.includes('srsReview') ||
        body.includes('DueSrs') ||
        body.includes('dueSrs') ||
        body.includes('myDueSrsCards')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { myDueSrsCards: [] } }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('renders SRS Review page without error', async ({ page }) => {
    // Should show either a flashcard or "no cards due" state — not an error page
    const hasFlashcard = await page
      .locator('[data-testid="flashcard"]')
      .isVisible()
      .catch(() => false);
    const hasNoCards = await page
      .getByText(/no cards due|no cards|all caught up/i)
      .isVisible()
      .catch(() => false);
    const hasHeading = await page
      .getByRole('heading')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasFlashcard || hasNoCards || hasHeading).toBe(true);
  });

  test('no raw error string in DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Network error');
    expect(body).not.toContain('undefined');
  });

  test('no MOCK_ sentinel strings in SRS review DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('srs review page renders without crash overlay', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('empty state does not show raw GraphQL errors', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('GraphQL error');
    expect(body).not.toContain('Cannot read');
  });
});

// ── Suite 2: Live backend — real data + visual regression ─────────────────────

test.describe('SrsReviewPage — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('srs review page loads for authenticated student', async ({ page }) => {
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Either shows flashcards or empty state — both are correct
    const hasFlashcard = await page
      .locator('[data-testid="flashcard"]')
      .count();
    const hasEmptyState = await page
      .getByText(/no cards due|all caught up/i)
      .count();
    const hasHeading = await page.getByRole('heading').first().isVisible();

    expect(hasFlashcard + hasEmptyState + (hasHeading ? 1 : 0)).toBeGreaterThan(
      0
    );
    await expect(page).toHaveScreenshot('srs-review-page.png', {
      maxDiffPixels: 200,
    });
  });
});
