import { test, expect } from '@playwright/test';
import {
  STABLE_OPTS,
  LOOSE_OPTS,
  dynamicMasks,
} from './helpers/visual-test-utils';
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
    await expect(page).toHaveScreenshot(
      'flow-instructor-01-login.png',
      STABLE_OPTS
    );

    // Step 2: Instructor dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-02-dashboard.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 3: Course management list
    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-03-courses.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 4: Create new course form
    await page.goto('/courses/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-04-create-course.png',
      STABLE_OPTS
    );

    // Step 5: Add content to course
    await page.goto('/courses/1/content');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-05-add-content.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 6: Course publish / review
    await page.goto('/courses/1/publish');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-06-publish.png',
      STABLE_OPTS
    );

    // Step 7: Course analytics
    await page.goto('/courses/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-instructor-07-analytics.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 8: Student progress overview
    await page.goto('/courses/1/students');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-08-student-progress.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );
  });

  // === EXPANDED — Header & main area per step ===

  test('instructor flow — header sections', async ({ page }) => {
    const steps = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/create', name: 'create' },
      { path: '/courses/1/content', name: 'content' },
      { path: '/courses/1/analytics', name: 'analytics' },
      { path: '/courses/1/students', name: 'students' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const header = page
        .locator('header, nav, [data-testid="app-header"]')
        .first();
      if (await header.isVisible().catch(() => false)) {
        await expect(header).toHaveScreenshot(
          `flow-instructor-header-${step.name}.png`,
          { maxDiffPixelRatio: 0.01, animations: 'disabled' as const }
        );
      }
    }
  });

  test('instructor flow — main content areas', async ({ page }) => {
    const steps = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/create', name: 'create' },
      { path: '/courses/1/content', name: 'content' },
      { path: '/courses/1/publish', name: 'publish' },
      { path: '/courses/1/analytics', name: 'analytics' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible().catch(() => false)) {
        await expect(main).toHaveScreenshot(
          `flow-instructor-main-${step.name}.png`,
          { ...LOOSE_OPTS, mask: dynamicMasks(page) }
        );
      }
    }
  });

  // === EXPANDED — Tablet viewport journey ===

  test('instructor course creation at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-01-dashboard.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-02-courses.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-03-create.png',
      STABLE_OPTS
    );

    await page.goto('/courses/1/content');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-04-content.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/publish');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-05-publish.png',
      STABLE_OPTS
    );

    await page.goto('/courses/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-06-analytics.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/students');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-tablet-07-students.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );
  });

  // === EXPANDED — Mobile viewport journey ===

  test('instructor course creation at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-01-dashboard.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-02-courses.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-03-create.png',
      STABLE_OPTS
    );

    await page.goto('/courses/1/content');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-04-content.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/publish');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-05-publish.png',
      STABLE_OPTS
    );

    await page.goto('/courses/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-06-analytics.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );

    await page.goto('/courses/1/students');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-instructor-mobile-07-students.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) }
    );
  });
});
