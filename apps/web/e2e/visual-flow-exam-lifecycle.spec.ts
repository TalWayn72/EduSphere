import { test, expect } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
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
    await expect(page).toHaveScreenshot(
      'flow-exam-01-exams-list.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 2: Item bank
    await page.goto('/exams/item-bank');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-02-item-bank.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 3: Exam blueprint
    await page.goto('/exams/blueprint');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-03-blueprint.png', STABLE_OPTS);

    // Step 4: Create new exam
    await page.goto('/exams/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-04-create-exam.png', STABLE_OPTS);

    // Step 5: Exam configuration
    await page.goto('/exams/1/configure');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-05-configure.png', STABLE_OPTS);

    // Step 6: Take exam (student view)
    await page.goto('/exams/1/take');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-06-take-exam.png', STABLE_OPTS);

    // Step 7: Exam submission confirmation
    await page.goto('/exams/1/submitted');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('flow-exam-07-submitted.png', STABLE_OPTS);

    // Step 8: Exam results
    await page.goto('/exams/1/results');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-08-results.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 9: Exam analytics
    await page.goto('/exams/1/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-09-analytics.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );

    // Step 10: Exam review / item analysis
    await page.goto('/exams/1/review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'flow-exam-10-review.png',
      { ...LOOSE_OPTS, mask: dynamicMasks(page) },
    );
  });
});
