import { test, expect } from '@playwright/test';
import {
  STABLE_OPTS,
  LOOSE_OPTS,
  dynamicMasks,
} from './helpers/visual-test-utils';
import { login } from './auth.helpers';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual Flow — Exam Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('complete exam lifecycle journey', async ({ page }) => {
    // Step 1: Exams list
    await page.goto('/exams');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-01-exams-list.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 2: Item bank
    await page.goto('/exams/item-bank');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-02-item-bank.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 3: Exam blueprint
    await page.goto('/exams/blueprint');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-03-blueprint.png',
      STABLE_OPTS
    );

    // Step 4: Create new exam
    await page.goto('/exams/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-04-create-exam.png',
      STABLE_OPTS
    );

    // Step 5: Exam configuration
    await page.goto('/exams/1/configure');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-05-configure.png',
      STABLE_OPTS
    );

    // Step 6: Take exam (student view)
    await page.goto('/exams/1/take');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-06-take-exam.png',
      STABLE_OPTS
    );

    // Step 7: Exam submission confirmation
    await page.goto('/exams/1/submitted');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-07-submitted.png',
      STABLE_OPTS
    );

    // Step 8: Exam results
    await page.goto('/exams/1/results');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-08-results.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 9: Exam analytics
    await page.goto('/exams/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-09-analytics.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    // Step 10: Exam review / item analysis
    await page.goto('/exams/1/review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-10-review.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  // === EXPANDED — Header & main per step ===

  test('exam flow — header sections', async ({ page }) => {
    const steps = [
      { path: '/exams', name: 'list' },
      { path: '/exams/item-bank', name: 'item-bank' },
      { path: '/exams/blueprint', name: 'blueprint' },
      { path: '/exams/create', name: 'create' },
      { path: '/exams/1/configure', name: 'configure' },
      { path: '/exams/1/take', name: 'take' },
      { path: '/exams/1/results', name: 'results' },
      { path: '/exams/1/analytics', name: 'analytics' },
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
          `flow-exam-header-${step.name}.png`,
          { maxDiffPixelRatio: 0.01, animations: 'disabled' as const }
        );
      }
    }
  });

  test('exam flow — main content areas', async ({ page }) => {
    const steps = [
      { path: '/exams', name: 'list' },
      { path: '/exams/create', name: 'create' },
      { path: '/exams/1/take', name: 'take' },
      { path: '/exams/1/results', name: 'results' },
      { path: '/exams/1/review', name: 'review' },
    ];
    for (const step of steps) {
      await page.goto(step.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible().catch(() => false)) {
        await expect(main).toHaveScreenshot(`flow-exam-main-${step.name}.png`, {
          ...LOOSE_OPTS,
          mask: dynamicMasks(page),
        });
      }
    }
  });

  // === EXPANDED — Tablet viewport ===

  test('exam lifecycle at tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/exams');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-tablet-01-list.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/exams/item-bank');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-tablet-02-item-bank.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/exams/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-tablet-03-create.png',
      STABLE_OPTS
    );

    await page.goto('/exams/1/configure');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-tablet-04-configure.png',
      STABLE_OPTS
    );

    await page.goto('/exams/1/take');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-tablet-05-take.png',
      STABLE_OPTS
    );

    await page.goto('/exams/1/results');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-tablet-06-results.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/exams/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-tablet-07-analytics.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/exams/1/review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-tablet-08-review.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  // === EXPANDED — Mobile viewport ===

  test('exam lifecycle at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/exams');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-mobile-01-list.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/exams/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-mobile-02-create.png',
      STABLE_OPTS
    );

    await page.goto('/exams/1/take');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-mobile-03-take.png',
      STABLE_OPTS
    );

    await page.goto('/exams/1/submitted');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-mobile-04-submitted.png',
      STABLE_OPTS
    );

    await page.goto('/exams/1/results');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-mobile-05-results.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });

    await page.goto('/exams/1/review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-mobile-06-review.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });
});
