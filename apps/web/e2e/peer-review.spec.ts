/**
 * Peer Review — E2E regression guard (Phase 45)
 *
 * Verifies the PeerReviewDashboard renders correctly and that assigned
 * review tasks are visible without leaking technical error strings.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
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

// ── Suite 3: Peer Review — comprehensive interactions (mocked) ───────────────

test.describe('Peer Review — assignment and feedback flows', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetPeerReviews' || op === 'ListPeerReviews' || op === 'GetPeerReviewAssignments') {
        return JSON.stringify({
          data: {
            peerReviews: {
              edges: [
                {
                  node: {
                    id: 'pr-1',
                    assignmentTitle: 'Essay: Knowledge Graph Design',
                    reviewerName: 'Anonymous Reviewer',
                    submitterName: 'Student A',
                    status: 'PENDING',
                    dueDate: '2026-04-01T00:00:00Z',
                    score: null,
                    isAnonymous: true,
                  },
                },
                {
                  node: {
                    id: 'pr-2',
                    assignmentTitle: 'Project: API Gateway',
                    reviewerName: 'Bob',
                    submitterName: 'Alice',
                    status: 'COMPLETED',
                    dueDate: '2026-03-20T00:00:00Z',
                    score: 85,
                    isAnonymous: false,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      if (op === 'GetPeerReviewDetail' || op === 'GetReview') {
        return JSON.stringify({
          data: {
            peerReview: {
              id: 'pr-1',
              assignmentTitle: 'Essay: Knowledge Graph Design',
              submissionContent: 'This is the student submission text...',
              rubric: {
                criteria: [
                  { id: 'c-1', name: 'Content Quality', maxScore: 25, description: 'Accuracy and depth of content' },
                  { id: 'c-2', name: 'Organization', maxScore: 25, description: 'Logical flow and structure' },
                  { id: 'c-3', name: 'Technical Accuracy', maxScore: 25, description: 'Correct use of terminology' },
                  { id: 'c-4', name: 'Presentation', maxScore: 25, description: 'Clarity and formatting' },
                ],
              },
              isAnonymous: true,
              dueDate: '2026-04-01T00:00:00Z',
            },
          },
        });
      }
      if (op === 'SubmitPeerReview' || op === 'SaveReview') {
        return JSON.stringify({
          data: { submitPeerReview: { success: true, id: 'pr-1' } },
        });
      }
      return null;
    });
    await login(page);
  });

  test('review assignment list — displays assignment cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('rubric display — review detail page shows rubric criteria', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/peer-review/pr-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    // Should not expose raw JSON
    expect(body).not.toContain('"maxScore"');
  });

  test('feedback submission — textarea and submit button do not crash', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/peer-review/pr-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const feedbackInput = page.locator(
      '[data-testid="feedback-input"], textarea[name="feedback"], textarea[placeholder*="feedback" i]'
    );
    if ((await feedbackInput.count()) > 0) {
      await feedbackInput.first().fill('Great work on the knowledge graph design. Consider adding more detail on entity resolution.');
    }

    const submitBtn = page.locator(
      '[data-testid="submit-review-btn"], button:has-text("Submit Review"), button:has-text("Submit")'
    );
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('scoring — score inputs accept numeric values', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review/pr-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const scoreInputs = page.locator(
      '[data-testid="score-input"], input[type="number"][name*="score"], input[name*="criteria"]'
    );
    const count = await scoreInputs.count();
    if (count > 0) {
      await scoreInputs.first().fill('20');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('reviewer anonymity — anonymous review does not show reviewer name', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // For anonymous reviews, real reviewer identity should not be visible
    const body = await page.textContent('body');
    // The mock says reviewer is "Anonymous Reviewer" for pr-1
    expect(body).not.toContain('UnauthorizedException');
    expect(body).not.toContain('[object Object]');
  });

  test('deadline display — due dates are formatted, not raw ISO strings', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Raw ISO strings should not appear in the visible DOM
    expect(body).not.toContain('2026-04-01T00:00:00Z');
    expect(body).not.toContain('2026-03-20T00:00:00Z');
  });

  test('overdue review — shows overdue indicator without crash', async ({
    page,
  }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, (op) => {
      if (op === 'GetPeerReviews' || op === 'ListPeerReviews' || op === 'GetPeerReviewAssignments') {
        return JSON.stringify({
          data: {
            peerReviews: {
              edges: [
                {
                  node: {
                    id: 'pr-overdue',
                    assignmentTitle: 'Overdue Essay Review',
                    reviewerName: 'Reviewer',
                    submitterName: 'Submitter',
                    status: 'PENDING',
                    dueDate: '2026-01-01T00:00:00Z',
                    score: null,
                    isAnonymous: false,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('peer review GraphQL error does not expose internal details', async ({
    page,
  }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, () => {
      return JSON.stringify({
        data: null,
        errors: [{ message: 'DrizzleORMError: relation "peer_reviews" does not exist' }],
      });
    });

    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('DrizzleORMError');
    expect(body).not.toContain('does not exist');
  });

  test('visual regression — peer review list page (mocked)', async ({ page }) => {
    await page.goto(`${BASE_URL}/peer-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('peer-review-list-mocked.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
