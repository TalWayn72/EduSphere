import { test, expect } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
import { login } from './auth.helpers';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual Flow — Instructor Course Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('complete instructor course creation journey', async ({ page }) => {
    // Step 1: Login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-01-login.png', STABLE_OPTS);

    // Step 2: Instructor dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-02-dashboard.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 3: Course management list
    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-03-courses.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 4: Create new course form
    await page.goto('/courses/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-04-create-course.png', STABLE_OPTS);

    // Step 5: Add content to course
    await page.goto('/courses/1/content');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-05-add-content.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 6: Course publish / review
    await page.goto('/courses/1/publish');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-06-publish.png', STABLE_OPTS);

    // Step 7: Course analytics
    await page.goto('/courses/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-07-analytics.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 8: Student progress overview
    await page.goto('/courses/1/students');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-08-student-progress.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );
  });
});
