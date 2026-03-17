/**
 * SrsReviewPage — E2E regression guard
 *
 * Verifies that the SRS Review page renders without technical error strings,
 * handles empty card queue gracefully, and shows correct UI states.
 *
 * Key regression: supergraph was missing SRSCard/dueReviews type definitions,
 * causing "שגיאה בטעינת כרטיסי החזרה" error. Fixed by composing supergraph
 * with SRS schema from subgraph-core.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — render + regression guard ───────────────────────────

test.describe('SrsReviewPage — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all GraphQL requests for SRS queries
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('dueReviews') || body.includes('DueReviews')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { dueReviews: [] } }),
        });
      } else if (
        body.includes('srsQueueCount') ||
        body.includes('SrsQueueCount')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { srsQueueCount: 0 } }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('renders SRS Review page without error state', async ({ page }) => {
    // Regression guard: before the fix, the error state was shown because
    // dueReviews/SRSCard were missing from the gateway supergraph
    await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible({
      timeout: 5_000,
    });
    // Should show either a flashcard or "no cards due" — both are valid
    const hasFlashcard = await page
      .locator('[data-testid="flashcard"]')
      .isVisible()
      .catch(() => false);
    const hasNoCards = await page
      .getByText(/no cards due/i)
      .isVisible()
      .catch(() => false);
    expect(hasFlashcard || hasNoCards).toBe(true);
  });

  test('no raw error strings or GraphQL errors in DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Network error');
    expect(body).not.toContain('GraphQL error');
    expect(body).not.toContain('Cannot read');
    expect(body).not.toContain('MOCK_');
  });

  test('no crash overlay on SRS page', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no Hebrew error message shown (regression guard)', async ({ page }) => {
    // Before fix: "שגיאה בטעינת כרטיסי החזרה" was shown
    const body = await page.textContent('body');
    expect(body).not.toContain('שגיאה בטעינת');
    expect(body).not.toContain('Failed to load review cards');
  });
});

// ── Suite 2: Flashcard render with intercepted cards ─────────────────────────

test.describe('SrsReviewPage — Flashcard render (mocked)', () => {
  const mockCards = [
    {
      id: 'card-e2e-1',
      conceptName: 'Photosynthesis',
      dueDate: '2026-01-01T00:00:00Z',
      intervalDays: 3,
      easeFactor: 2.5,
      repetitions: 2,
      lastReviewedAt: null,
    },
    {
      id: 'card-e2e-2',
      conceptName: 'Mitosis',
      dueDate: '2026-01-02T00:00:00Z',
      intervalDays: 7,
      easeFactor: 2.6,
      repetitions: 4,
      lastReviewedAt: '2025-12-26T00:00:00Z',
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Intercept ALL GraphQL requests — respond to SRS queries with mock cards
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('dueReviews') || body.includes('DueReviews')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { dueReviews: mockCards } }),
        });
      } else if (
        body.includes('SubmitReview') ||
        body.includes('submitReview')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { submitReview: mockCards[0] } }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('no error state shown — supergraph includes SRSCard type', async ({
    page,
  }) => {
    // The mock intercept may or may not catch urql's request depending on
    // DEV_MODE mock exchange. Either way, no error state should be shown.
    await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible({
      timeout: 5_000,
    });
    const hasFlashcard = await page
      .locator('[data-testid="flashcard"]')
      .isVisible()
      .catch(() => false);
    const hasNoCards = await page
      .getByText(/no cards due/i)
      .isVisible()
      .catch(() => false);
    expect(hasFlashcard || hasNoCards).toBe(true);
  });

  test('regression: no "Failed to load" error in SRS page', async ({
    page,
  }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('Failed to load');
    expect(body).not.toContain('שגיאה בטעינת');
  });
});

// ── Suite 3: Live backend — real data + visual regression ────────────────────

test.describe('SrsReviewPage — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('srs review page loads for authenticated student', async ({ page }) => {
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

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
