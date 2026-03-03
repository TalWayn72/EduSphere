/**
 * Lesson Creation Wizard E2E Tests
 *
 * Covers the full 3-step wizard at /courses/:courseId/lessons/new.
 *
 * BUG-044: "Unexpected error" was shown when creating a lesson with a mock
 * courseId (non-UUID string). Fixed by:
 *   - Backend: UUID validation + try/catch in lesson.service.ts create()
 *   - Frontend: Descriptive error message + data-testid="create-lesson-error"
 *
 * These tests verify:
 *   1. The wizard renders and all 3 steps are navigable
 *   2. Attempting to create a lesson with an invalid courseId shows a
 *      user-friendly error (NOT "Unexpected error")
 *   3. Error element has correct role="alert" for accessibility
 *   4. Visual screenshot captures the error state
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// Mock courseId that was reported in the bug (not a real UUID)
const MOCK_COURSE_ID = 'mock-course-1';
const LESSON_NEW_URL = `${BASE_URL}/courses/${MOCK_COURSE_ID}/lessons/new`;

test.beforeEach(async ({ page }) => {
  await login(page);
});

test.describe('Lesson Creation Wizard — BUG-044 regression', () => {
  test('wizard page loads at /courses/:courseId/lessons/new', async ({
    page,
  }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('יצירת שיעור חדש')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('step 1 — progress bar shows first step active', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Step indicator: 3 bars, first is blue
    const bars = page.locator('.flex.gap-2.mb-8 > div');
    await expect(bars).toHaveCount(3);
    // First bar should be blue (active)
    const firstBar = bars.nth(0);
    await expect(firstBar).toHaveClass(/bg-blue-600/);
  });

  test('step 1 — title and type fields are present', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Title field
    await expect(page.locator('input[name="title"], input[placeholder*="שיעור"], input[placeholder*="title"]').first()).toBeVisible({ timeout: 8_000 });
  });

  test('step 1 — can fill form and proceed to step 2', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Fill title
    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור בדיקה E2E');

    // Submit step 1
    const nextBtn = page.getByRole('button', { name: /המשך|הבא|next/i });
    await nextBtn.click();

    // Should now be on step 2 (add assets)
    await expect(page.locator('.flex.gap-2.mb-8 > div').nth(1)).toHaveClass(
      /bg-blue-600/,
      { timeout: 5_000 }
    );
  });

  test('step 3 — template selection is visible', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Navigate through steps
    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור E2E');
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);

    // Should see template selection
    await expect(page.getByText('בחר תבנית Pipeline')).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByText('שיעור הגות')).toBeVisible();
    await expect(page.getByText('ספר עץ חיים')).toBeVisible();
  });

  test('step 3 — create button is disabled until template is selected', async ({
    page,
  }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to step 3
    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור E2E');
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);

    // Create button should be disabled until template selected
    const createBtn = page.getByRole('button', {
      name: /צור שיעור והמשך ל-Pipeline/i,
    });
    await expect(createBtn).toBeDisabled();
  });

  test('step 3 — clicking create with mock courseId shows error (not "Unexpected error")', async ({
    page,
  }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Navigate through all 3 steps
    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור E2E בדיקת שגיאה');
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);

    // Select a template
    await page.getByText('שיעור הגות').click();

    // Click create (will fail because mock-course-1 is not in DB)
    const createBtn = page.getByRole('button', {
      name: /צור שיעור והמשך ל-Pipeline/i,
    });
    await createBtn.click();

    // Wait for error to appear
    const errorEl = page.locator('[data-testid="create-lesson-error"]');
    await expect(errorEl).toBeVisible({ timeout: 15_000 });

    // The error message must NOT be the generic "Unexpected error"
    const errorText = await errorEl.textContent();
    expect(errorText).not.toBe('Unexpected error.');
    expect(errorText).not.toBeNull();
    expect(errorText!.length).toBeGreaterThan(5);

    // error element must have role=alert for accessibility
    await expect(errorEl).toHaveAttribute('role', 'alert');

    // Take a screenshot for visual verification
    await page.screenshot({
      path: 'test-results/screenshots/bug-042-lesson-creation-error.png',
      fullPage: false,
    });
  });

  test('step 3 — error element has accessible role=alert', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור E2E');
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);

    await page.getByText('שיעור הגות').click();
    await page
      .getByRole('button', { name: /צור שיעור והמשך ל-Pipeline/i })
      .click();

    const errorEl = page.locator('[data-testid="create-lesson-error"]');
    await expect(errorEl).toBeVisible({ timeout: 15_000 });
    await expect(errorEl).toHaveAttribute('role', 'alert');
  });

  test('back button on step 3 returns to step 2', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to step 3
    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור E2E');
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);

    // Click back button
    await page.getByRole('button', { name: 'חזרה' }).click();

    // Should be back on step 2 (third bar should be gray)
    const thirdBar = page.locator('.flex.gap-2.mb-8 > div').nth(2);
    await expect(thirdBar).toHaveClass(/bg-gray-200/, { timeout: 3_000 });
  });

  test('visual — step 3 template selection screenshot', async ({ page }) => {
    await page.goto(LESSON_NEW_URL);
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('input').first();
    await titleInput.fill('שיעור E2E ויזואלי');
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /המשך|הבא|next/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('בחר תבנית Pipeline')).toBeVisible({
      timeout: 8_000,
    });

    await page.screenshot({
      path: 'test-results/screenshots/lesson-creation-step3.png',
    });
  });
});
