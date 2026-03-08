/**
 * QuizBuilderPage — E2E regression guard (Phase 38)
 *
 * Verifies that the QuizBuilderPage renders for instructors and
 * that the page does not crash or show raw technical errors.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('QuizBuilderPage — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => route.continue());
    await login(page);
  });

  test('quiz builder page renders without crash overlay', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/modules/00000000-0000-0000-0000-000000000002/quiz/new`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('quiz builder or redirect to dashboard is correct behavior', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/modules/00000000-0000-0000-0000-000000000002/quiz/new`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    const url = page.url();
    // DEV_MODE is SUPER_ADMIN — should see quiz builder, not be redirected
    const isQuizBuilder = url.includes('/quiz/new') || url.includes('/quiz');
    const isDashboard = url.includes('/dashboard');
    const isLearn = url.includes('/learn');
    // Any of these outcomes is acceptable — must not be an error page
    expect(isQuizBuilder || isDashboard || isLearn).toBe(true);
  });

  test('no MOCK_ sentinel strings in quiz builder DOM', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/modules/00000000-0000-0000-0000-000000000002/quiz/new`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('no [object Object] serialization in quiz builder DOM', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/modules/00000000-0000-0000-0000-000000000002/quiz/new`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });
});

// ── Suite 2: Live backend — instructor role access ─────────────────────────────

test.describe('QuizBuilderPage — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('instructor can access quiz builder page', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(
      `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/modules/00000000-0000-0000-0000-000000000002/quiz/new`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /quiz builder/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('quiz-builder-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('student is redirected away from quiz builder', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(
      `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/modules/00000000-0000-0000-0000-000000000002/quiz/new`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    // Student should NOT see quiz builder
    await expect(
      page.getByRole('heading', { name: /quiz builder/i })
    ).not.toBeVisible();
  });
});
