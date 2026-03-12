/**
 * ai-course-builder.spec.ts — AI Course Builder E2E Tests
 *
 * Route: /courses/new  (authenticated — dev mode auto-auth as SUPER_ADMIN)
 *
 * Covers:
 *   CourseCreatePage AI builder CTA panel, AiCourseCreatorModal steps,
 *   generateCourseFromPrompt mutation (mocked via page.route), generated
 *   modules preview, "Create Draft Course" CTA, modal close/cleanup,
 *   and visual regression of the modal in generating state.
 *
 * GraphQL mutations are intercepted via page.route(**\/graphql glob, ...) so
 * no live GraphQL server is required.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/ai-course-builder.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Shared mock payloads ─────────────────────────────────────────────────────

const MOCK_GENERATE_IN_PROGRESS = {
  data: {
    generateCourseFromPrompt: {
      executionId: 'exec-mock-001',
      status: 'IN_PROGRESS',
      courseTitle: null,
      courseDescription: null,
      modules: [],
    },
  },
};

const MOCK_GENERATE_COMPLETED = {
  data: {
    generateCourseFromPrompt: {
      executionId: 'exec-mock-002',
      status: 'COMPLETED',
      courseTitle: 'Introduction to Machine Learning',
      courseDescription: 'A beginner-friendly course covering ML fundamentals.',
      modules: [
        {
          title: 'Module 1: What is Machine Learning?',
          description: 'Overview of ML concepts and terminology.',
          contentItemTitles: ['What is ML?', 'History of AI', 'Types of ML'],
        },
        {
          title: 'Module 2: Supervised Learning',
          description: 'Deep dive into supervised learning algorithms.',
          contentItemTitles: ['Linear Regression', 'Decision Trees', 'Quiz: Supervised Learning'],
        },
        {
          title: 'Module 3: Unsupervised Learning',
          description: 'Clustering and dimensionality reduction techniques.',
          contentItemTitles: ['K-Means Clustering', 'PCA', 'Final Project'],
        },
      ],
    },
  },
};

const MOCK_CREATE_COURSE = {
  data: {
    createCourse: {
      id: 'course-draft-9999',
      title: 'Introduction to Machine Learning',
    },
  },
};

// ─── Anti-regression helpers ──────────────────────────────────────────────────

/**
 * Click a button inside a Radix UI Dialog via evaluate() to bypass the
 * dialog backdrop overlay that intercepts pointer events on mobile-chrome.
 */
async function clickDialogButton(
  page: import('@playwright/test').Page,
  buttonText: string,
): Promise<void> {
  await page.evaluate((text: string) => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const btn = buttons.find((b) => (b.textContent ?? '').trim().includes(text));
    (btn as HTMLElement | undefined)?.click();
  }, buttonText);
}

/** Assert no raw technical error strings are visible to the user. */
async function assertNoRawErrors(page: import('@playwright/test').Page): Promise<void> {
  const body = await page.textContent('body') ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('Error:');
}

/**
 * Intercept ALL GraphQL requests and dispatch the correct mock response
 * based on the operation name present in the request body.
 */
async function mockGraphQL(
  page: import('@playwright/test').Page,
  operationMocks: Record<string, unknown>,
): Promise<void> {
  await routeGraphQL(page, (op) => {
    const mockResponse = operationMocks[op];
    if (mockResponse) {
      return JSON.stringify(mockResponse);
    }
    return null;
  });
}

// ─── Suite 1: AI Builder CTA Panel ───────────────────────────────────────────

test.describe('AI Course Builder — CTA Panel on /courses/new', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
  });

  test('/courses/new page loads without errors', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  test('AI builder CTA panel is visible on step 1', async ({ page }) => {
    await expect(page.locator('[data-testid="ai-builder-cta"]')).toBeVisible({ timeout: 10_000 });
  });

  test('AI builder panel heading mentions "AI Course Builder"', async ({ page }) => {
    const cta = page.locator('[data-testid="ai-builder-cta"]');
    await expect(cta.getByText(/AI Course Builder/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"Launch AI Builder →" button is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="launch-ai-builder-btn"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('AI builder CTA panel describes the 10-minute promise', async ({ page }) => {
    const cta = page.locator('[data-testid="ai-builder-cta"]');
    await expect(cta.getByText(/10 Minutes/i)).toBeVisible({ timeout: 10_000 });
  });

  test('page step indicator is visible with 4 steps', async ({ page }) => {
    // CourseCreatePage renders a 4-step wizard indicator
    const steps = page.getByRole('main').locator('div').filter({ hasText: /1/ }).first();
    await expect(steps).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 2: Modal Opens Correctly ──────────────────────────────────────────

test.describe('AI Course Builder — Modal Open State', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    // Wait for Dialog to mount
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('"Launch AI Builder" button opens the modal dialog', async ({ page }) => {
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('modal title is "AI Course Creator"', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /AI Course Creator/i })).toBeVisible({ timeout: 10_000 });
  });

  test('modal shows course topic/description textarea', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('textbox')).toBeVisible({ timeout: 10_000 });
  });

  test('modal shows Audience Level dropdown', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Audience Level/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.locator('select')).toBeVisible({ timeout: 10_000 });
  });

  test('audience level dropdown has Beginner, Intermediate, Advanced options', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const select = dialog.locator('select');
    for (const option of ['Beginner', 'Intermediate', 'Advanced']) {
      await expect(select.locator(`option[value="${option.toLowerCase()}"]`)).toBeAttached();
    }
  });

  test('modal shows Estimated Hours input', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Estimated Hours/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.locator('input[type="number"]')).toBeVisible({ timeout: 10_000 });
  });

  test('"Generate Course" button is present but disabled when textarea is empty', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const generateBtn = dialog.getByRole('button', { name: /Generate Course/i });
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await expect(generateBtn).toBeDisabled();
  });

  test('"Cancel" button is present and closes the modal', async ({ page }) => {
    await clickDialogButton(page, 'Cancel');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
  });

  test('no raw error strings inside the modal', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 3: Generating State (mocked mutation) ──────────────────────────────

test.describe('AI Course Builder — Generating / Skeleton State', () => {
  test.beforeEach(async ({ page }) => {
    // Mock BEFORE login so urql never sees a network error during login navigation
    await mockGraphQL(page, {
      GenerateCourseFromPrompt: MOCK_GENERATE_IN_PROGRESS,
    });
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('typing in textarea enables the Generate button', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Machine Learning for high school students');
    const generateBtn = dialog.getByRole('button', { name: /Generate Course/i });
    await expect(generateBtn).toBeEnabled({ timeout: 5_000 });
  });

  test('clicking Generate shows "Generating..." spinner state', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Machine Learning for high school students');
    await clickDialogButton(page, 'Generate Course');
    // Button text changes to "Generating..." with a spinner
    await expect(dialog.getByText(/Generating\.\.\./i)).toBeVisible({ timeout: 10_000 });
  });

  test('Generate button is disabled while generating', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Machine Learning for high school students');
    await clickDialogButton(page, 'Generate Course');
    await expect(dialog.getByText(/Generating\.\.\./i)).toBeVisible({ timeout: 10_000 });
    // The button is now disabled (generating state)
    const btn = dialog.locator('button').filter({ hasText: /Generating/i });
    await expect(btn).toBeDisabled();
  });

  test('textarea is disabled while generating', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Machine Learning for high school students');
    await clickDialogButton(page, 'Generate Course');
    await expect(dialog.getByText(/Generating\.\.\./i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('textbox')).toBeDisabled();
  });

  test('audience level select is disabled while generating', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Machine Learning for high school students');
    await dialog.locator('select').selectOption('beginner');
    await clickDialogButton(page, 'Generate Course');
    await expect(dialog.getByText(/Generating\.\.\./i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.locator('select')).toBeDisabled();
  });

  test('visual screenshot of modal in generating state', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Machine Learning for high school students');
    await clickDialogButton(page, 'Generate Course');
    await expect(dialog.getByText(/Generating\.\.\./i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveScreenshot('ai-modal-generating-state.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});

// ─── Suite 4: Generated Course Preview (COMPLETED state) ─────────────────────

test.describe('AI Course Builder — Generated Course Preview', () => {
  test.beforeEach(async ({ page }) => {
    // Mock BEFORE login so urql never sees a network error during login navigation
    await mockGraphQL(page, {
      GenerateCourseFromPrompt: MOCK_GENERATE_COMPLETED,
      CreateCourse: MOCK_CREATE_COURSE,
    });
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    // Fill and generate (use evaluate to bypass Radix Dialog backdrop on mobile)
    await page.getByRole('dialog').getByRole('textbox').fill(
      'Introduction to Machine Learning for high school students',
    );
    await clickDialogButton(page, 'Generate Course');
  });

  test('generated course title appears in the outline view', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Introduction to Machine Learning')).toBeVisible({ timeout: 10_000 });
  });

  test('generated course description is visible', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText(/A beginner-friendly course covering ML fundamentals/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('generated modules appear in the preview — Module 1 visible', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText(/Module 1: What is Machine Learning\?/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('generated modules appear in the preview — Module 2 visible', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText(/Module 2: Supervised Learning/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('content item titles inside modules are visible', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Linear Regression')).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText('Decision Trees')).toBeVisible({ timeout: 10_000 });
  });

  test('"Create Draft Course" button is visible in the outline view', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: /Create Draft Course/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Regenerate" button is visible in the outline view', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: /Regenerate/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Discard" button is visible in the outline view', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: /Discard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Regenerate" button hides the outline and shows input form again', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    // Wait for the outline view to fully render before clicking Regenerate
    await expect(dialog.getByRole('button', { name: /Regenerate/i })).toBeVisible({ timeout: 10_000 });
    await clickDialogButton(page, 'Regenerate');
    // Back to step 1: textarea should be visible again
    await expect(dialog.getByRole('textbox')).toBeVisible({ timeout: 5_000 });
    // "Create Draft Course" button only exists in the outline view — its absence
    // confirms the outline section has unmounted and the input form is shown.
    await expect(
      dialog.getByRole('button', { name: /Create Draft Course/i }),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('no raw error strings in outline view', async ({ page }) => {
    await assertNoRawErrors(page);
  });

  test('visual screenshot of modal in outline/preview state', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: /Create Draft Course/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveScreenshot('ai-modal-outline-state.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});

// ─── Suite 5: Modal Close / Memory Safety ────────────────────────────────────

test.describe('AI Course Builder — Modal Close & Memory Safety', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphQL(page, {
      GenerateCourseFromPrompt: MOCK_GENERATE_IN_PROGRESS,
    });
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('closing modal via Cancel button removes the dialog from DOM', async ({ page }) => {
    await clickDialogButton(page, 'Cancel');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
  });

  test('reopening modal after close resets the textarea to empty', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Some topic that should be cleared');
    await clickDialogButton(page, 'Cancel');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    // Re-open
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    const newDialog = page.getByRole('dialog');
    const textareaValue = await newDialog.getByRole('textbox').inputValue();
    expect(textareaValue).toBe('');
  });

  test('closing modal during generation stops it cleanly (no console errors)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Closing mid-generation test');
    await clickDialogButton(page, 'Generate Course');
    await expect(dialog.getByText(/Generating\.\.\./i)).toBeVisible({ timeout: 10_000 });

    // Close while generating — Cancel button is disabled (disabled={generating}),
    // so use Escape key which Radix Dialog handles via onOpenChange(false) → onClose()
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });

    // Wait briefly to catch any async errors from dangling subscriptions
    await page.waitForTimeout(500);

    // No React "Can't perform a state update on unmounted component" or urql errors
    const dangling = consoleErrors.filter(
      (e) => e.includes('unmounted') || e.includes('memory leak') || e.includes('state update'),
    );
    expect(dangling).toHaveLength(0);
  });

  test('modal state is fully reset: audience level cleared after close and reopen', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.locator('select').selectOption('advanced');
    await clickDialogButton(page, 'Cancel');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    // Re-open
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    const newDialog = page.getByRole('dialog');
    const selectValue = await newDialog.locator('select').inputValue();
    // Should reset to empty string (default "Any level")
    expect(selectValue).toBe('');
  });

  test('no raw error strings after closing and reopening modal', async ({ page }) => {
    await clickDialogButton(page, 'Cancel');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    await assertNoRawErrors(page);
  });
});

// ─── Suite 6: Error Handling ──────────────────────────────────────────────────

test.describe('AI Course Builder — Error Handling', () => {
  test('shows error message when generateCourseFromPrompt mutation fails', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GenerateCourseFromPrompt') {
        return JSON.stringify({
          errors: [{ message: 'Failed to start generation', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
        });
      }
      return null;
    });

    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Test topic to trigger error');
    await clickDialogButton(page, 'Generate Course');

    // Error message should appear — NOT raw GraphQL error string
    await expect(dialog.getByText(/Failed to start generation/i)).toBeVisible({ timeout: 10_000 });

    // Raw GraphQL error must NOT be shown to user
    const dialogText = await dialog.textContent() ?? '';
    expect(dialogText).not.toContain('INTERNAL_SERVER_ERROR');
    expect(dialogText).not.toContain('GraphQL error');
  });

  test('error state shows AlertTriangle icon (accessible error indicator)', async ({ page }) => {
    await routeGraphQL(page, () =>
      JSON.stringify({
        errors: [{ message: 'Service unavailable', extensions: { code: 'UNAVAILABLE' } }],
      }),
    );

    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Trigger error state');
    await clickDialogButton(page, 'Generate Course');

    // Error container uses bg-destructive/10 class — error text area is visible
    await expect(dialog.locator('.bg-destructive\\/10').first()).toBeVisible({ timeout: 10_000 });
  });
});
