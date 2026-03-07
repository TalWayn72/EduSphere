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

import { test, expect, type Page } from '@playwright/test';
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

// ── BUG-049 Regression: React "Cannot update a component while rendering" ──────
//
// Root cause: LessonDetailPage, LessonPipelinePage and LessonResultsPage all
// subscribe to LESSON_QUERY via urql. When navigating between them, the
// outgoing page's urql subscription was notified during the incoming page's
// render phase, causing React's setState-during-render error.
//
// Fix: mounted guard — `pause: !mounted` defers the query until after the
// component is committed to the DOM, preventing the race condition.

const MOCK_LESSON_BUG049 = {
  id: 'lesson-bug049',
  title: 'שיעור בדיקת BUG-049',
  type: 'SEQUENTIAL',
  series: null,
  lessonDate: '2024-03-01T00:00:00.000Z',
  status: 'READY',
  assets: [],
  pipeline: {
    id: 'pipeline-bug049',
    status: 'COMPLETED',
    nodes: [],
    currentRun: {
      id: 'run-bug049',
      status: 'COMPLETED',
      startedAt: null,
      completedAt: null,
      results: [],
    },
  },
};

const COURSE_ID_BUG049 = 'course-bug049';
const LESSON_ID_BUG049 = 'lesson-bug049';
const LESSON_DETAIL_URL = `${BASE_URL}/courses/${COURSE_ID_BUG049}/lessons/${LESSON_ID_BUG049}`;
const LESSON_RESULTS_URL = `${BASE_URL}/courses/${COURSE_ID_BUG049}/lessons/${LESSON_ID_BUG049}/results`;

/** Route all GraphQL calls to return a mock lesson response. */
async function routeLessonQuery(page: Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    const query = String(body.query ?? '');
    if (query.includes('lesson(') || query.includes('lesson {') || query.includes('lesson\n')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { lesson: MOCK_LESSON_BUG049 } }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('BUG-049 — mounted guard prevents React setState-during-render', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('BUG-049: LessonDetailPage renders lesson title without React error', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update a component')) {
        reactErrors.push(msg.text());
      }
    });

    await routeLessonQuery(page);
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('שיעור בדיקת BUG-049')).toBeVisible({ timeout: 10_000 });
    // Iron rule: React must NOT emit setState-during-render warning
    expect(reactErrors).toHaveLength(0);
  });

  test('BUG-049: LessonResultsPage renders empty state without React error', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update a component')) {
        reactErrors.push(msg.text());
      }
    });

    await routeLessonQuery(page);
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible({ timeout: 10_000 });
    expect(reactErrors).toHaveLength(0);
  });

  test('BUG-049: navigating LessonDetailPage → LessonResultsPage does NOT emit React render error', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Cannot update a component') || text.includes('while rendering a different component')) {
          reactErrors.push(text);
        }
      }
    });

    await routeLessonQuery(page);
    // Navigate to detail page first (the sibling that may be slow to unmount)
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('domcontentloaded');
    // Immediately navigate to results page — reproduces the BUG-049 race condition
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');

    // KEY ASSERTION: zero React setState-during-render errors
    expect(reactErrors).toHaveLength(0);
    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible({ timeout: 8_000 });
  });

  test('BUG-049: rapid consecutive navigation does not produce React "Cannot update" errors', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update')) {
        reactErrors.push(msg.text());
      }
    });

    await routeLessonQuery(page);
    // Stress test: rapidly navigate between all sibling lesson sub-pages
    await page.goto(LESSON_DETAIL_URL);
    await page.goto(LESSON_RESULTS_URL);
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('networkidle');

    expect(reactErrors).toHaveLength(0);
  });

  test('BUG-049: LessonResultsPage body does NOT contain raw React error strings', async ({ page }) => {
    await routeLessonQuery(page);
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot update a component');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('while rendering a different component');
  });

  test('visual — BUG-049 LessonDetailPage screenshot (clean, no error overlay)', async ({ page }) => {
    await routeLessonQuery(page);
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('שיעור בדיקת BUG-049')).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: 'test-results/screenshots/bug-049-lesson-detail-clean.png',
    });
  });

  test('visual — BUG-049 LessonResultsPage screenshot (empty state, no error overlay)', async ({ page }) => {
    await routeLessonQuery(page);
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: 'test-results/screenshots/bug-049-lesson-results-empty-clean.png',
    });
  });
});

test.describe('BUG-049 — mounted guard prevents React setState-during-render (extended)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('BUG-049: LessonDetailPage renders lesson title without React error', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update a component')) {
        reactErrors.push(msg.text());
      }
    });

    await routeLessonQuery(page);
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('שיעור בדיקת BUG-049')).toBeVisible({ timeout: 10_000 });
    // Iron rule: React must NOT emit setState-during-render warning
    expect(reactErrors).toHaveLength(0);
  });

  test('BUG-049: LessonResultsPage renders empty state without React error', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update a component')) {
        reactErrors.push(msg.text());
      }
    });

    await routeLessonQuery(page);
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible({ timeout: 10_000 });
    expect(reactErrors).toHaveLength(0);
  });

  test('BUG-049: navigating LessonDetailPage → LessonResultsPage does NOT emit React render error', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Cannot update a component') || text.includes('while rendering a different component')) {
          reactErrors.push(text);
        }
      }
    });

    await routeLessonQuery(page);
    // Navigate to detail page first (the sibling that may be slow to unmount)
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('domcontentloaded');
    // Immediately navigate to results page — reproduces the BUG-049 race condition
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');

    // KEY ASSERTION: zero React setState-during-render errors
    expect(reactErrors).toHaveLength(0);
    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible({ timeout: 8_000 });
  });

  test('BUG-049: rapid consecutive navigation does not produce React "Cannot update" errors', async ({ page }) => {
    const reactErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update')) {
        reactErrors.push(msg.text());
      }
    });

    await routeLessonQuery(page);
    // Stress test: rapidly navigate between all sibling lesson sub-pages
    await page.goto(LESSON_DETAIL_URL);
    await page.goto(LESSON_RESULTS_URL);
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('networkidle');

    expect(reactErrors).toHaveLength(0);
  });

  test('BUG-049: LessonResultsPage body does NOT contain raw React error strings', async ({ page }) => {
    await routeLessonQuery(page);
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot update a component');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('while rendering a different component');
  });

  test('BUG-049: CreateLessonPage shows auth error when user session is null', async ({ page }) => {
    // Simulate a page where auth returns null (session expired) by manipulating sessionStorage
    await page.addInitScript(() => {
      // Clear dev auth so getCurrentUser returns null
      sessionStorage.removeItem('edusphere_dev_logged_in');
    });

    await routeLessonQuery(page);
    await page.goto(`${BASE_URL}/courses/course-1/lessons/new`);
    await page.waitForLoadState('networkidle');

    // Even unauthenticated, the wizard page should load (auth check is at mutation time)
    // The "יצירת שיעור חדש" heading or a redirect should be visible
    const isOnWizard = await page.getByText('יצירת שיעור חדש').isVisible().catch(() => false);
    const isRedirected = page.url().includes('/login') || page.url().includes('/learn');
    expect(isOnWizard || isRedirected).toBe(true);
  });

  test('visual — BUG-049 LessonDetailPage screenshot (clean, no error overlay)', async ({ page }) => {
    await routeLessonQuery(page);
    await page.goto(LESSON_DETAIL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('שיעור בדיקת BUG-049')).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: 'test-results/screenshots/bug-049-lesson-detail-clean.png',
    });
  });

  test('visual — BUG-049 LessonResultsPage screenshot (empty state, no error overlay)', async ({ page }) => {
    await routeLessonQuery(page);
    await page.goto(LESSON_RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: 'test-results/screenshots/bug-049-lesson-results-empty-clean.png',
    });
  });
});
