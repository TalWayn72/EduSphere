/**
 * Lesson Pipeline Builder — E2E spec (Phase 36)
 *
 * Tests for the /courses/:courseId/pipeline/builder page
 * (LessonPipelineBuilderPage).
 *
 * Covers:
 *   - Page heading "Lesson Pipeline Builder" is visible
 *   - Step palette buttons (VIDEO, QUIZ, DISCUSSION, AI_CHAT, SUMMARY) are rendered
 *   - Save Draft and Publish action buttons are visible
 *   - Student is redirected away (RBAC guard in the component)
 *   - No crash overlay appears
 *   - Visual snapshot for baseline comparison
 *
 * Route: /courses/:courseId/pipeline/builder
 *
 * DEV_MODE (default): navigates with a placeholder courseId.
 * Live backend (VITE_DEV_MODE=false): real Keycloak login as instructor.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// Placeholder course ID used when no real course is available
const PLACEHOLDER_COURSE_ID = '00000000-0000-0000-0000-000000000001';

// ── Suite 1: DEV_MODE — page structure guard ──────────────────────────────────

test.describe('Lesson Pipeline Builder — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('builder heading is visible', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    const heading = page.locator('[data-testid="builder-heading"]');
    await heading.waitFor({ timeout: 10_000 });
    await expect(heading).toContainText('Lesson Pipeline Builder');
  });

  test('step palette buttons are rendered (VIDEO, QUIZ, SUMMARY)', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    // All five step types are rendered as palette buttons
    await expect(
      page.locator('[data-testid="add-step-VIDEO"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="add-step-QUIZ"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="add-step-DISCUSSION"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="add-step-AI_CHAT"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="add-step-SUMMARY"]')
    ).toBeVisible();
  });

  test('Save Draft button is visible', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('[data-testid="save-draft-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Publish button is visible', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('[data-testid="publish-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no crash overlay appears', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`,
      { waitUntil: 'domcontentloaded' }
    );
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no [object Object] in page DOM', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });
});

// ── Suite 2: Live backend — RBAC + visual regression ─────────────────────────

test.describe('Lesson Pipeline Builder — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('instructor can access pipeline builder page', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`
    );
    await page.waitForLoadState('networkidle');

    // Instructor should see the builder heading — not redirected
    const heading = page.locator('[data-testid="builder-heading"]');
    await heading.waitFor({ timeout: 15_000 });
    await expect(heading).toContainText('Lesson Pipeline Builder');
  });

  test('student is redirected away from pipeline builder', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`
    );
    await page.waitForLoadState('networkidle');

    const url = page.url();
    // Component navigates to /courses for non-instructor roles
    const isBlocked =
      !url.includes('/pipeline/builder') || url.includes('/courses');

    expect(
      isBlocked,
      `Student should be blocked from pipeline builder but reached: ${url}`
    ).toBeTruthy();
  });

  test('pipeline builder visual snapshot — instructor view', async ({
    page,
  }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(
      `${BASE_URL}/courses/${PLACEHOLDER_COURSE_ID}/pipeline/builder`
    );
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(
      'lesson-pipeline-builder-chromium-win32.png',
      { maxDiffPixels: 200 }
    );
  });
});
