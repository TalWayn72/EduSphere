/**
 * InstructorAnalyticsDashboard + MyProgressPage — E2E regression guard (Phase 43)
 *
 * Verifies that both analytics pages render correctly with mocked GraphQL data,
 * that no raw serialization artifacts appear in the DOM, and captures visual
 * regression screenshots.
 */
import { test, expect } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: InstructorAnalyticsDashboard — DEV_MODE guard ───────────────────

test.describe('InstructorAnalyticsDashboard — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('InstructorAnalytics') ||
        body.includes('instructorAnalytics') ||
        body.includes('InstructorAnalyticsOverview') ||
        body.includes('myCourses')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              myCourses: [
                {
                  id: 'course-001',
                  title: 'React Fundamentals',
                  courseAnalytics: {
                    courseId: 'course-001',
                    enrollmentCount: 150,
                    completionRate: 72,
                    avgQuizScore: 85,
                    activeLearnersLast7Days: 40,
                    dropOffFunnel: [
                      {
                        moduleId: 'mod-1',
                        moduleName: 'Introduction',
                        learnersStarted: 150,
                        learnersCompleted: 120,
                        dropOffRate: 0.2,
                      },
                    ],
                  },
                },
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/instructor/analytics`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
  });

  test('renders Instructor Analytics heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /instructor analytics/i })
    ).toBeVisible();
    await argosScreenshot(page, 'instructor-analytics-heading-visible');
  });

  test('renders Overview tab button', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /overview/i })
    ).toBeVisible();
  });

  test('renders all four tab buttons', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /learner engagement/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /at-risk learners/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /ai usage/i })).toBeVisible();
  });

  test('no [object Object] serialization in analytics DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no raw undefined in analytics DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
  });

  test('no MOCK_ sentinel strings in analytics DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('instructor analytics page renders without crash overlay', async ({
    page,
  }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('dashboard screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('instructor-analytics-dashboard.png', {
      maxDiffPixels: 200,
    });
  });
});

// ── Suite 2: InstructorAnalyticsDashboard — Live backend ─────────────────────

test.describe('InstructorAnalyticsDashboard — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
  });

  test('instructor analytics loads for authenticated instructor', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/instructor/analytics`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /instructor analytics/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('instructor-analytics-live.png', {
      maxDiffPixels: 200,
    });
    await argosScreenshot(page, 'instructor-analytics-live');
  });
});

// ── Suite 3: MyProgressPage — DEV_MODE guard ─────────────────────────────────

test.describe('MyProgressPage — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('MyGamificationStats') ||
        body.includes('myGamificationStats')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              myGamificationStats: {
                currentStreak: 7,
                longestStreak: 14,
                activeChallenges: [
                  { challengeId: 'ch-1', title: '7-Day Streak', completed: false },
                ],
                leaderboard: [
                  {
                    rank: 3,
                    userId: 'user-001',
                    displayName: 'Test User',
                    totalXp: 1200,
                    level: 5,
                  },
                ],
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/my-progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('renders My Progress heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /my progress/i })
    ).toBeVisible();
    await argosScreenshot(page, 'my-progress-heading-visible');
  });

  test('displays current streak days', async ({ page }) => {
    await expect(page.getByText(/7/)).toBeVisible();
  });

  test('displays leaderboard position', async ({ page }) => {
    await expect(page.getByText(/#3/)).toBeVisible();
  });

  test('no [object Object] serialization in progress DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no raw undefined in progress DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
  });

  test('my-progress page renders without crash overlay', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('my progress page screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('my-progress-page.png', {
      maxDiffPixels: 200,
    });
  });
});

// ── Suite 4: MyProgressPage — Live backend ────────────────────────────────────

test.describe('MyProgressPage — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('my progress page loads for authenticated student', async ({ page }) => {
    await page.goto(`${BASE_URL}/my-progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Either stats are displayed or the empty-state prompt is shown
    const hasHeading = await page
      .getByRole('heading', { name: /my progress/i })
      .isVisible();
    expect(hasHeading).toBe(true);

    await expect(page).toHaveScreenshot('my-progress-live.png', {
      maxDiffPixels: 200,
    });
    await argosScreenshot(page, 'my-progress-live');
  });
});
