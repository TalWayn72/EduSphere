import { test, expect } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
import { login } from './auth.helpers';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual Flow — Student Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('complete student onboarding journey', async ({ page }) => {
    // Step 1: Landing page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-01-landing.png', STABLE_OPTS);

    // Step 2: Login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-02-login.png', STABLE_OPTS);

    // Step 3: Onboarding welcome
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-03-onboarding-welcome.png', STABLE_OPTS);

    // Step 4: Onboarding profile setup
    await page.goto('/onboarding/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-04-onboarding-profile.png', STABLE_OPTS);

    // Step 5: Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-student-05-dashboard.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 6: Course list
    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-student-06-course-list.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 7: Course detail
    await page.goto('/courses/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-student-07-course-detail.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 8: Quiz page
    await page.goto('/courses/1/quiz');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-08-quiz.png', STABLE_OPTS);

    // Step 9: Quiz results
    await page.goto('/courses/1/quiz/results');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-student-09-quiz-results.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 10: Profile settings
    await page.goto('/settings/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-10-profile-settings.png', STABLE_OPTS);
  });

  // === EXPANDED — Section-level screenshots per step ===

  test('student flow — header sections', async ({ page }) => {
    const steps = [
      { path: '/', name: 'landing' },
      { path: '/login', name: 'login' },
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/1', name: 'course-detail' },
      { path: '/settings/profile', name: 'profile' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const header = page.locator('header, nav, [data-testid="app-header"]').first();
      if (await header.isVisible().catch(() => false)) {
        await expect(header).toHaveScreenshot(
          `flow-student-header-${step.name}.png`,
          { maxDiffPixelRatio: 0.01, animations: 'disabled' as const },
        );
      }
    }
  });

  test('student flow — main content sections', async ({ page }) => {
    const steps = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/courses', name: 'courses' },
      { path: '/courses/1', name: 'course-detail' },
      { path: '/courses/1/quiz', name: 'quiz' },
      { path: '/settings/profile', name: 'profile' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible().catch(() => false)) {
        await expect(main).toHaveScreenshot(
          `flow-student-main-${step.name}.png`,
          { ...LOOSE_OPTS, mask: dynamicMasks(page) },
        );
      }
    }
  });

  // === EXPANDED — Tablet viewport journey ===

  test('student onboarding at tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-01-landing.png', STABLE_OPTS);

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-02-login.png', STABLE_OPTS);

    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-03-onboarding.png', STABLE_OPTS);

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-04-dashboard.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });

    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-05-courses.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });

    await page.goto('/courses/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-06-course-detail.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });

    await page.goto('/courses/1/quiz');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-07-quiz.png', STABLE_OPTS);

    await page.goto('/settings/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-tablet-08-profile.png', STABLE_OPTS);
  });

  // === EXPANDED — Mobile viewport journey ===

  test('student onboarding at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-01-landing.png', STABLE_OPTS);

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-02-login.png', STABLE_OPTS);

    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-03-onboarding.png', STABLE_OPTS);

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-04-dashboard.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });

    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-05-courses.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });

    await page.goto('/courses/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-06-course-detail.png', { ...LOOSE_OPTS, mask: dynamicMasks(page) });

    await page.goto('/courses/1/quiz');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-07-quiz.png', STABLE_OPTS);

    await page.goto('/settings/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-student-mobile-08-profile.png', STABLE_OPTS);
  });
});
