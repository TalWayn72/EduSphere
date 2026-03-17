/**
 * Lesson Preview — E2E spec (Phase 65)
 *
 * Tests the lesson preview mode:
 *   1. Navigate to lesson detail
 *   2. Click "preview" button
 *   3. Preview page loads with banner
 *   4. No edit buttons visible in preview
 *   5. Content renders correctly
 *   6. No raw GraphQL errors shown
 *
 * Uses page.route() to mock GraphQL — no live backend required.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';

// ── Mock data ─────────────────────────────────────────────────────────────────

const COURSE_ID = 'cc000000-0000-0000-0000-000000000065';
const LESSON_ID = 'ls000000-0000-0000-0000-000000000001';

const MOCK_LESSON = {
  __typename: 'Lesson',
  id: LESSON_ID,
  courseId: COURSE_ID,
  moduleId: null,
  title: 'Introduction to Mishnah',
  type: 'THEMATIC',
  series: null,
  lessonDate: null,
  instructorId: '00000000-0000-0000-0000-000000000002',
  status: 'READY',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  assets: [
    {
      __typename: 'LessonAsset',
      id: 'asset-1',
      assetType: 'VIDEO',
      sourceUrl: 'https://www.youtube.com/watch?v=mishnah-intro',
      fileUrl: null,
      metadata: {},
    },
  ],
  pipeline: {
    __typename: 'LessonPipeline',
    id: 'pipeline-1',
    templateName: 'THEMATIC',
    nodes: [],
    config: {},
    status: 'COMPLETED',
    createdAt: '2025-01-01T00:00:00Z',
    currentRun: {
      __typename: 'PipelineRun',
      id: 'run-1',
      status: 'COMPLETED',
      startedAt: '2025-03-01T09:00:00Z',
      completedAt: '2025-03-01T10:00:00Z',
      logs: [],
      results: [
        {
          __typename: 'PipelineResult',
          id: 'r-summary',
          moduleName: 'SUMMARIZATION',
          outputType: 'SUMMARIZATION',
          outputData: {
            shortSummary: 'An introduction to the structure and study of the Mishnah.',
            keyPoints: ['Oral Torah', 'Six Orders', 'Rabbi Yehuda HaNasi'],
          },
          fileUrl: null,
          createdAt: '2025-03-01T10:00:00Z',
        },
      ],
    },
  },
  citations: [],
};

// ── GraphQL mock ──────────────────────────────────────────────────────────────

async function setupPreviewMocks(page: Page) {
  await routeGraphQL(page, (opName) => {
    if (
      opName === 'Lesson' ||
      opName === 'LessonDetail' ||
      opName === 'LessonPreview'
    ) {
      return JSON.stringify({
        data: { lesson: MOCK_LESSON },
      });
    }
    return null;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Lesson Preview — DEV_MODE', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await setupPreviewMocks(page);
  });

  test('preview button is visible on lesson detail page', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    const previewBtn = page.getByTestId('lesson-preview-btn');
    await previewBtn.waitFor({ timeout: 10_000 });
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toContainText(/תצוגה מקדימה|Preview/i);
  });

  test('clicking preview navigates to preview page', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    const previewBtn = page.getByTestId('lesson-preview-btn');
    await previewBtn.waitFor({ timeout: 10_000 });
    await previewBtn.click();

    // Should navigate to preview URL
    await expect(page).toHaveURL(
      new RegExp(`/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`),
      { timeout: 8_000 },
    );
  });

  test('preview page shows preview banner', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    const banner = page.getByTestId('preview-banner');
    await banner.waitFor({ timeout: 10_000 });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/תצוגה מקדימה|Preview/i);
  });

  test('preview page does not show edit buttons', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    // Wait for preview content to render
    await page.getByTestId('preview-banner').waitFor({ timeout: 10_000 });

    // Edit-related buttons must NOT be visible in preview mode
    await expect(page.getByTestId('edit-lesson-btn')).not.toBeVisible({
      timeout: 3_000,
    });
    await expect(page.getByTestId('save-btn')).not.toBeVisible({
      timeout: 2_000,
    });
    await expect(page.getByTestId('delete-lesson-btn')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('preview page renders lesson content correctly', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('preview-banner').waitFor({ timeout: 10_000 });

    // Lesson title should be visible
    await expect(page.getByText('Introduction to Mishnah')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('preview page shows no raw GraphQL errors', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('[GraphQL]');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('Unexpected error');
    expect(bodyText).not.toContain('Network request failed');
    expect(bodyText).not.toContain('undefined');
  });

  test('preview page shows no [object Object] in DOM', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('preview page visual snapshot', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/preview`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('preview-banner').waitFor({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('lesson-preview-page.png', {
      maxDiffPixels: 300,
    });
  });
});
