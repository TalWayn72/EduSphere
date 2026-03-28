import { test, expect } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';

test.describe('Visual Flow — Student Onboarding', () => {
  test('complete student onboarding journey', async ({ page }) => {
    // Step 1: Landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('flow-student-01-landing.png', STABLE_OPTS);

    // Step 2: Login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('flow-student-02-login.png', STABLE_OPTS);

    // Step 3: Onboarding welcome
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('flow-student-03-onboarding-welcome.png', STABLE_OPTS);

    // Step 4: Onboarding profile setup
    await page.goto('/onboarding/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('flow-student-04-onboarding-profile.png', STABLE_OPTS);

    // Step 5: Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-student-05-dashboard.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 6: Course list
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-student-06-course-list.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 7: Course detail
    await page.goto('/courses/1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-student-07-course-detail.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 8: Quiz page
    await page.goto('/courses/1/quiz');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('flow-student-08-quiz.png', STABLE_OPTS);

    // Step 9: Quiz results
    await page.goto('/courses/1/quiz/results');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'flow-student-09-quiz-results.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 10: Profile settings
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('flow-student-10-profile-settings.png', STABLE_OPTS);
  });
});
