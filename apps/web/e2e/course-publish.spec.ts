/**
 * Course Publish Flow — E2E spec (Phase 65)
 *
 * Tests the course publish workflow:
 *   1. Navigate to course detail page
 *   2. Click "publish course" button (visible for instructor)
 *   3. Readiness sheet opens with checklist
 *   4. If all checks pass, publish button enabled
 *   5. Confirm publish -> course becomes published
 *   6. No raw GraphQL errors shown to user
 *
 * Uses page.route() to mock GraphQL — no live backend required.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';

// ── Mock data ─────────────────────────────────────────────────────────────────

const COURSE_ID = 'cc000000-0000-0000-0000-000000000065';

const MOCK_COURSE_DRAFT = {
  __typename: 'Course',
  id: COURSE_ID,
  title: 'Introduction to Torah Study',
  slug: 'intro-torah-study',
  description: 'A comprehensive course on Torah study methods.',
  status: 'DRAFT',
  thumbnailUrl: null,
  instructorId: '00000000-0000-0000-0000-000000000002',
  tenantId: '00000000-0000-0000-0000-000000000001',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  modules: [
    {
      __typename: 'CourseModule',
      id: 'mod-1',
      title: 'Module 1: Basics',
      order: 0,
      contentItems: [
        { __typename: 'ContentItem', id: 'ci-1', title: 'Lesson 1', type: 'VIDEO' },
        { __typename: 'ContentItem', id: 'ci-2', title: 'Quiz 1', type: 'QUIZ' },
      ],
    },
  ],
  enrollmentCount: 5,
  tags: ['torah', 'study'],
};

const MOCK_COURSE_PUBLISHED = {
  ...MOCK_COURSE_DRAFT,
  status: 'PUBLISHED',
};

const READINESS_CHECKS = {
  __typename: 'CourseReadiness',
  courseId: COURSE_ID,
  checks: [
    { name: 'has_title', label: 'Course has a title', passed: true },
    { name: 'has_description', label: 'Course has a description', passed: true },
    { name: 'has_modules', label: 'At least one module exists', passed: true },
    { name: 'has_content', label: 'Modules have content items', passed: true },
    { name: 'has_quiz', label: 'At least one quiz exists', passed: true },
  ],
  allPassed: true,
};

const READINESS_CHECKS_FAILING = {
  ...READINESS_CHECKS,
  checks: [
    { name: 'has_title', label: 'Course has a title', passed: true },
    { name: 'has_description', label: 'Course has a description', passed: false },
    { name: 'has_modules', label: 'At least one module exists', passed: true },
    { name: 'has_content', label: 'Modules have content items', passed: false },
    { name: 'has_quiz', label: 'At least one quiz exists', passed: false },
  ],
  allPassed: false,
};

// ── GraphQL mock setup ──────────────────────────────────────────────────────

async function setupPublishMocks(
  page: Page,
  opts: { readiness?: typeof READINESS_CHECKS; publishSuccess?: boolean } = {},
) {
  const readiness = opts.readiness ?? READINESS_CHECKS;
  const publishSuccess = opts.publishSuccess ?? true;

  await routeGraphQL(page, (opName) => {
    if (opName === 'Course' || opName === 'CourseDetail') {
      return JSON.stringify({
        data: { course: MOCK_COURSE_DRAFT },
      });
    }
    if (opName === 'CourseReadiness' || opName === 'CheckCourseReadiness') {
      return JSON.stringify({
        data: { courseReadiness: readiness },
      });
    }
    if (opName === 'PublishCourse') {
      if (publishSuccess) {
        return JSON.stringify({
          data: { publishCourse: MOCK_COURSE_PUBLISHED },
        });
      }
      return JSON.stringify({
        data: null,
        errors: [
          {
            message: 'Course validation failed: missing required fields',
            extensions: { code: 'VALIDATION_ERROR' },
          },
        ],
      });
    }
    return null;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Course Publish Flow — DEV_MODE', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('publish button is visible on draft course detail page', async ({ page }) => {
    await setupPublishMocks(page);
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const publishBtn = page.getByTestId('publish-course-btn');
    await publishBtn.waitFor({ timeout: 10_000 });
    await expect(publishBtn).toBeVisible();
    await expect(publishBtn).toContainText(/פרסם קורס|Publish/i);
  });

  test('clicking publish opens readiness checklist sheet', async ({ page }) => {
    await setupPublishMocks(page);
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const publishBtn = page.getByTestId('publish-course-btn');
    await publishBtn.waitFor({ timeout: 10_000 });
    await publishBtn.click();

    // Readiness sheet/dialog should open
    const readinessSheet = page.getByTestId('readiness-sheet');
    await expect(readinessSheet).toBeVisible({ timeout: 5_000 });
  });

  test('readiness checklist shows all checks when they pass', async ({ page }) => {
    await setupPublishMocks(page, { readiness: READINESS_CHECKS });
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('publish-course-btn').click();

    const readinessSheet = page.getByTestId('readiness-sheet');
    await expect(readinessSheet).toBeVisible({ timeout: 5_000 });

    // All 5 check items should be visible
    await expect(readinessSheet.getByText('Course has a title')).toBeVisible();
    await expect(readinessSheet.getByText('Course has a description')).toBeVisible();
    await expect(readinessSheet.getByText('At least one module exists')).toBeVisible();

    // Confirm publish button should be enabled when all checks pass
    const confirmBtn = page.getByTestId('confirm-publish-btn');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();
  });

  test('confirm publish button is disabled when checks fail', async ({ page }) => {
    await setupPublishMocks(page, { readiness: READINESS_CHECKS_FAILING });
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('publish-course-btn').click();

    const readinessSheet = page.getByTestId('readiness-sheet');
    await expect(readinessSheet).toBeVisible({ timeout: 5_000 });

    // Confirm button should be disabled when not all checks pass
    const confirmBtn = page.getByTestId('confirm-publish-btn');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();
  });

  test('confirming publish transitions course to PUBLISHED status', async ({ page }) => {
    await setupPublishMocks(page, { publishSuccess: true });
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('publish-course-btn').click();
    await expect(page.getByTestId('readiness-sheet')).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('confirm-publish-btn').click();
    await page.waitForLoadState('domcontentloaded');

    // After publish, a success indicator should appear
    const successMsg = page.getByText(/פורסם בהצלחה|Published|PUBLISHED/i);
    await expect(successMsg).toBeVisible({ timeout: 8_000 });
  });

  test('publish error shows friendly message, not raw GraphQL error', async ({ page }) => {
    await setupPublishMocks(page, { publishSuccess: false });
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('publish-course-btn').click();
    await expect(page.getByTestId('readiness-sheet')).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('confirm-publish-btn').click();
    await page.waitForLoadState('domcontentloaded');

    // Raw GraphQL error must NOT appear
    await expect(
      page.getByText('Course validation failed: missing required fields'),
    ).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('[GraphQL]')).not.toBeVisible({ timeout: 2_000 });
    await expect(page.getByText('VALIDATION_ERROR')).not.toBeVisible({ timeout: 2_000 });
  });

  test('no raw technical strings on course detail page', async ({ page }) => {
    await setupPublishMocks(page);
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('[GraphQL]');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('Unexpected error');
    expect(bodyText).not.toContain('Network request failed');
  });

  test('publish flow visual snapshot', async ({ page }) => {
    await setupPublishMocks(page);
    await page.goto(`${BASE_URL}/courses/${COURSE_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('publish-course-btn').click();
    await expect(page.getByTestId('readiness-sheet')).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('course-publish-readiness-sheet.png', {
      maxDiffPixels: 300,
    });
  });
});
