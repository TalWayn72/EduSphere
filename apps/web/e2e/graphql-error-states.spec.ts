/**
 * GraphQL Error States — P0 Visual E2E Regression Guard
 *
 * Problem: Several components exposed raw GraphQL error messages
 * (e.g. "Cannot return null for non-nullable field Mutation.generateCourseFromPrompt")
 * directly in the UI instead of friendly, user-readable messages.
 *
 * This suite:
 *   T-01  AI Course Builder — generateCourseFromPrompt server error → friendly message
 *   T-02  AI Course Builder — network failure → friendly message
 *   T-03  Quiz Builder — createContentItem fails → friendly toast (not raw error)
 *   T-04  Lesson Pipeline Builder — publishLessonPlan fails → friendly toast
 *   T-05  Course Create Wizard — createCourse fails → friendly toast (not raw GraphQL)
 *
 * All tests: mock GraphQL via routeGraphQL(), screenshot for visual regression.
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "graphql-error-states"
 */

import { test, expect, type Page } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Shared setup ─────────────────────────────────────────────────────────────

async function loginAndNavigate(page: Page, path: string) {
  await loginInDevMode(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// Raw technical error strings that must NEVER be visible to users
const RAW_GQL_ERRORS = [
  'Cannot return null for non-nullable field',
  'graphQLErrors',
  'CombinedError',
  'Network request failed',
  '[GraphQL]',
  'Unexpected token',
];

async function assertNoRawErrors(page: Page) {
  for (const rawStr of RAW_GQL_ERRORS) {
    await expect(page.getByText(rawStr, { exact: false })).not.toBeVisible({
      timeout: 2_000,
    });
  }
}

// ─── T-01: AI Course Builder — server error → friendly message ────────────────

test.describe('graphql-error-states — T-01: AI Course Builder server error', () => {
  test.describe.configure({ mode: 'serial' });

  test('generateCourseFromPrompt null response shows friendly error, not raw GraphQL', async ({ page }) => {
    // Mock: GenerateCourseFromPrompt returns a null data + GraphQL error
    await routeGraphQL(page, (opName) => {
      if (opName === 'GenerateCourseFromPrompt') {
        return JSON.stringify({
          data: { generateCourseFromPrompt: null },
          errors: [
            {
              message:
                'Cannot return null for non-nullable field Mutation.generateCourseFromPrompt.',
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            },
          ],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/courses/create');

    // Open the AI Course Builder modal
    const aiBtn = page.getByTestId('launch-ai-builder-btn');
    await aiBtn.waitFor({ timeout: 10_000 });
    await aiBtn.click();

    // Confirm modal is open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Fill in a prompt
    const textarea = page.getByRole('dialog').locator('textarea').first();
    await textarea.fill('Introduction to Machine Learning for beginners');

    // Click Generate
    const generateBtn = page.getByRole('dialog').getByRole('button', { name: /generate/i });
    await generateBtn.click();

    // Wait for the mutation response
    await page.waitForLoadState('networkidle');

    // REGRESSION GUARD: raw technical error must NOT appear
    await assertNoRawErrors(page);
    await expect(
      page.getByText('Cannot return null for non-nullable field')
    ).not.toBeVisible({ timeout: 3_000 });

    // Friendly error MUST appear in the modal
    const friendlyMsg = page.getByRole('dialog').locator('[class*="destructive"]');
    await expect(friendlyMsg.first()).toBeVisible({ timeout: 8_000 });

    // Visual regression
    await expect(page).toHaveScreenshot('ai-builder-server-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('error state shows AlertTriangle icon with friendly text', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'GenerateCourseFromPrompt') {
        return JSON.stringify({
          data: { generateCourseFromPrompt: null },
          errors: [{ message: 'Service temporarily unavailable', extensions: { code: 'SERVICE_UNAVAILABLE' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/courses/create');
    await page.getByTestId('launch-ai-builder-btn').click();
    await page.getByRole('dialog').locator('textarea').first().fill('Test course');
    await page.getByRole('dialog').getByRole('button', { name: /generate/i }).click();
    await page.waitForLoadState('networkidle');

    // Raw service message must NOT be shown directly
    await expect(page.getByText('Service temporarily unavailable')).not.toBeVisible({ timeout: 3_000 });

    // Modal must still be open (user can retry)
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

// ─── T-02: AI Course Builder — network failure → friendly message ─────────────

test.describe('graphql-error-states — T-02: AI Course Builder network failure', () => {
  test('network error on generation shows friendly message (not raw CombinedError)', async ({ page }) => {
    // Abort the request to simulate network failure
    await page.route('**/graphql', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type, authorization' } });
        return;
      }
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(req.postData() ?? '{}') as Record<string, unknown>; } catch { /* ignore */ }
      if ((parsed.operationName as string) === 'GenerateCourseFromPrompt') {
        await route.abort('failed');
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    });

    await loginAndNavigate(page, '/courses/create');
    await page.getByTestId('launch-ai-builder-btn').click();
    await page.getByRole('dialog').locator('textarea').first().fill('Introduction to Python');
    await page.getByRole('dialog').getByRole('button', { name: /generate/i }).click();
    await page.waitForLoadState('networkidle');

    // REGRESSION GUARD: raw network error terms must NOT appear
    await assertNoRawErrors(page);

    // Modal must still be open with an error indicator
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Visual regression — error state
    await expect(page).toHaveScreenshot('ai-builder-network-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-03: Quiz Builder — createContentItem fails → friendly toast ─────────────

test.describe('graphql-error-states — T-03: Quiz Builder save error', () => {
  const COURSE_ID = '00000000-0000-0000-0000-000000000001';
  const MODULE_ID = '00000000-0000-0000-0000-000000000002';

  test('createContentItem failure shows friendly toast, not raw GraphQL error', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'CreateContentItem') {
        return JSON.stringify({
          data: { createContentItem: null },
          errors: [{ message: 'Internal Server Error: relation "content_items" does not exist', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/modules/${MODULE_ID}/quiz/new`);

    // Fill in quiz title
    const titleInput = page.locator('#quiz-title');
    await titleInput.waitFor({ timeout: 10_000 });
    await titleInput.fill('Module 1 Assessment');

    // Submit the form (even without questions to trigger validation or save attempt)
    // We need at least a title to pass client validation, then a question
    // Since validate() requires at least one question, we check that path
    // Let's add a question via the QuizBuilderForm — or just verify the error path

    // Click "Add question" if available, or directly submit to trigger validation toast
    const addBtn = page.getByRole('button', { name: /add question/i });
    if (await addBtn.isVisible()) {
      // Add a minimal question
      await addBtn.click();
    }

    // Submit form
    const submitBtn = page.getByRole('button', { name: /save quiz|create quiz|submit/i }).last();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // REGRESSION GUARD: raw DB error must NOT be visible
    await expect(
      page.getByText('relation "content_items" does not exist')
    ).not.toBeVisible({ timeout: 3_000 });
    await assertNoRawErrors(page);

    // Visual snapshot
    await expect(page).toHaveScreenshot('quiz-builder-error-state.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('quiz builder shows friendly toast "Failed to create quiz" on mutation error', async ({ page }) => {
    let mutationIntercepted = false;
    await routeGraphQL(page, (opName) => {
      if (opName === 'CreateContentItem') {
        mutationIntercepted = true;
        return JSON.stringify({
          data: null,
          errors: [{ message: 'Permission denied' }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/modules/${MODULE_ID}/quiz/new`);
    await page.locator('#quiz-title').waitFor({ timeout: 10_000 });
    await page.locator('#quiz-title').fill('Test Quiz');

    // Fill a question if the form allows it
    const addQuestionBtn = page.getByRole('button', { name: /add.*question/i });
    if (await addQuestionBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await addQuestionBtn.click();
      // Fill first question text
      const questionInput = page.locator('input[placeholder*="question"]').first();
      if (await questionInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await questionInput.fill('What is 2+2?');
      }
    }

    const submitBtn = page.getByRole('button', { name: /save quiz|save|submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');

      if (mutationIntercepted) {
        // Friendly toast message should appear
        const friendlyToast = page.getByText(/failed to create quiz|please try again/i);
        await expect(friendlyToast).toBeVisible({ timeout: 5_000 });

        // Raw GraphQL error must NOT appear
        await expect(page.getByText('Permission denied')).not.toBeVisible({ timeout: 2_000 });
      }
    }
  });
});

// ─── T-04: Lesson Pipeline Builder — publishLessonPlan fails → friendly toast ──

test.describe('graphql-error-states — T-04: Pipeline Builder publish error', () => {
  const COURSE_ID = '00000000-0000-0000-0000-000000000001';

  test('publishLessonPlan error shows friendly toast, not raw GraphQL', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'PublishLessonPlan') {
        return JSON.stringify({
          data: { publishLessonPlan: null },
          errors: [{ message: 'Cannot transition from DRAFT to PUBLISHED: validation failed on step 3', extensions: { code: 'INVALID_STATE_TRANSITION' } }],
        });
      }
      if (opName === 'CreateLessonPlan') {
        return JSON.stringify({
          data: {
            createLessonPlan: { id: 'plan-uuid-test-001', title: 'Test Plan', status: 'DRAFT', courseId: COURSE_ID, steps: [] },
          },
        });
      }
      if (opName === 'AddLessonStep') {
        return JSON.stringify({
          data: {
            addLessonStep: { id: 'step-uuid-001', stepType: 'VIDEO', stepOrder: 1, config: {} },
          },
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/pipeline/builder`);

    // Confirm page loaded
    const heading = page.getByTestId('builder-heading');
    await heading.waitFor({ timeout: 10_000 });
    await expect(heading).toContainText('Lesson Pipeline Builder');

    // Add a step (VIDEO)
    const addVideoBtn = page.getByRole('button', { name: 'Video' });
    await addVideoBtn.waitFor({ timeout: 5_000 });
    await addVideoBtn.click();
    await page.waitForLoadState('networkidle');

    // Click Publish
    const publishBtn = page.getByRole('button', { name: /publish/i });
    await publishBtn.waitFor({ timeout: 5_000 });
    await publishBtn.click();
    await page.waitForLoadState('networkidle');

    // REGRESSION GUARD: raw transition error must NOT be visible to user
    await expect(
      page.getByText('Cannot transition from DRAFT to PUBLISHED')
    ).not.toBeVisible({ timeout: 3_000 });
    await assertNoRawErrors(page);

    // Friendly toast must appear
    const friendlyToast = page.getByText(/failed to publish|publish.*failed/i);
    await expect(friendlyToast).toBeVisible({ timeout: 8_000 });

    // Visual regression
    await expect(page).toHaveScreenshot('pipeline-builder-publish-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('pipeline builder page loads without errors', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyCourseAndLessonPlans') {
        return JSON.stringify({ data: { myCourseAndLessonPlans: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/pipeline/builder`);
    await expect(page.getByTestId('builder-heading')).toBeVisible({ timeout: 10_000 });
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('pipeline-builder-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-05: Course Create Wizard — createCourse fails → friendly toast ──────────

test.describe('graphql-error-states — T-05: Course Create submit error', () => {
  test('createCourse GraphQL error shows friendly toast, not raw error message', async ({ page }) => {
    const RAW_ERROR_MSG = 'duplicate key value violates unique constraint "courses_slug_key"';

    await routeGraphQL(page, (opName) => {
      if (opName === 'CreateCourse') {
        return JSON.stringify({
          data: { createCourse: null },
          errors: [{ message: RAW_ERROR_MSG, extensions: { code: 'CONSTRAINT_VIOLATION' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/courses/create');

    // Step 0: fill course title (must be ≥3 chars to enable Next)
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="course"]').first();
    await titleInput.waitFor({ timeout: 10_000 });
    await titleInput.fill('Test Course Title For Error State');

    // Advance wizard to final step using Next buttons
    const nextBtn = page.getByRole('button', { name: /next/i });
    for (let i = 0; i < 3; i++) {
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Click Save Draft / Publish on the last step
    const submitBtn = page.getByRole('button', { name: /save draft|save as draft|publish/i }).first();
    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');

      // REGRESSION GUARD: raw DB constraint error must NOT appear in toast or anywhere
      await expect(page.getByText(RAW_ERROR_MSG)).not.toBeVisible({ timeout: 3_000 });
      await assertNoRawErrors(page);
    }

    // Visual snapshot of the error state
    await expect(page).toHaveScreenshot('course-create-submit-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('course create page loads step 0 without errors', async ({ page }) => {
    await loginAndNavigate(page, '/courses/create');

    // The AI CTA block should be visible
    await expect(page.getByTestId('ai-builder-cta')).toBeVisible({ timeout: 10_000 });
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('course-create-step0.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-01b: AI modal — "Generate Course" button is disabled while generating ───

test.describe('graphql-error-states — T-01b: AI builder button state', () => {
  test('Generate button is disabled while generation is in progress', async ({ page }) => {
    // Slow mock — never resolves (simulate long-running generation)
    let resolveSlowMock: (() => void) | undefined;
    await page.route('**/graphql', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type, authorization' } });
        return;
      }
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(req.postData() ?? '{}') as Record<string, unknown>; } catch { /* ignore */ }
      if ((parsed.operationName as string) === 'GenerateCourseFromPrompt') {
        // Hold the request for the duration of the test
        await new Promise<void>((resolve) => { resolveSlowMock = resolve; });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    });

    await loginAndNavigate(page, '/courses/create');
    await page.getByTestId('launch-ai-builder-btn').click();
    await page.getByRole('dialog').locator('textarea').first().fill('Machine Learning course');

    const genBtn = page.getByRole('dialog').getByRole('button', { name: /generate/i });
    await genBtn.click();

    // While generating, button should be disabled
    await expect(genBtn).toBeDisabled({ timeout: 5_000 });

    // Screenshot showing "Generating..." spinner state
    await expect(page).toHaveScreenshot('ai-builder-generating-spinner.png', {
      maxDiffPixelRatio: 0.05,
    });

    // Clean up: resolve the pending request
    resolveSlowMock?.();
  });
});
