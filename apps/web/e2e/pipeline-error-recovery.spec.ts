/**
 * Pipeline Error Recovery — E2E spec (Phase 65)
 *
 * Tests pipeline error states and recovery:
 *   1. Navigate to pipeline page
 *   2. Mock a failed pipeline run
 *   3. Verify stepper shows error state
 *   4. Click retry button
 *   5. Verify no raw GraphQL errors shown to user
 *
 * Uses page.route() to mock GraphQL — no live backend required.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ── Mock UUIDs ────────────────────────────────────────────────────────────────

const COURSE_ID = 'cc000000-0000-0000-0000-000000000065';
const LESSON_ID = 'ls000000-0000-0000-0000-000000000002';
const PIPELINE_ID = 'pp000000-0000-0000-0000-000000000002';
const RUN_ID = 'rr000000-0000-0000-0000-000000000002';

const PIPELINE_URL = `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/pipeline`;

// ── Mock data ─────────────────────────────────────────────────────────────────

const LESSON_BASE = {
  __typename: 'Lesson',
  id: LESSON_ID,
  courseId: COURSE_ID,
  moduleId: null,
  title: 'Lesson on Shabbat',
  type: 'THEMATIC',
  series: null,
  lessonDate: null,
  instructorId: '00000000-0000-0000-0000-000000000002',
  status: 'DRAFT',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  assets: [],
  citations: [],
};

const PIPELINE_FAILED = {
  __typename: 'LessonPipeline',
  id: PIPELINE_ID,
  lessonId: LESSON_ID,
  templateName: 'THEMATIC',
  nodes: [
    {
      id: 'n1',
      moduleType: 'INGESTION',
      label: 'Ingestion',
      enabled: true,
      order: 0,
      config: {},
    },
    {
      id: 'n2',
      moduleType: 'ASR',
      label: 'Transcription',
      enabled: true,
      order: 1,
      config: {},
    },
    {
      id: 'n3',
      moduleType: 'SUMMARIZATION',
      label: 'Summarization',
      enabled: true,
      order: 2,
      config: {},
    },
  ],
  config: {},
  status: 'FAILED',
  createdAt: '2025-01-01T00:00:00Z',
  currentRun: {
    __typename: 'PipelineRun',
    id: RUN_ID,
    pipelineId: PIPELINE_ID,
    status: 'FAILED',
    startedAt: '2025-03-01T09:00:00Z',
    completedAt: '2025-03-01T09:05:00Z',
    logs: [
      {
        level: 'ERROR',
        message: 'ASR module failed: audio format unsupported',
        timestamp: '2025-03-01T09:04:00Z',
      },
    ],
    results: [
      {
        __typename: 'PipelineResult',
        id: 'r1',
        moduleName: 'INGESTION',
        outputType: 'INGESTION',
        outputData: { ingestion: true },
        fileUrl: null,
        createdAt: '2025-03-01T09:01:00Z',
      },
    ],
    failedModule: 'ASR',
    errorMessage: 'ASR module failed: audio format unsupported',
  },
};

const PIPELINE_RETRIED = {
  ...PIPELINE_FAILED,
  status: 'RUNNING',
  currentRun: {
    ...PIPELINE_FAILED.currentRun,
    status: 'RUNNING',
    completedAt: null,
    failedModule: null,
    errorMessage: null,
  },
};

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

// ── GraphQL mock setup ──────────────────────────────────────────────────────

let retryTriggered = false;

async function setupErrorMocks(page: Page) {
  retryTriggered = false;

  await page.route('**/graphql', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    const rawBody = route.request().postData() ?? '';
    let op = '';
    let q = rawBody;
    try {
      const parsed = JSON.parse(rawBody) as {
        query?: string;
        operationName?: string;
      };
      op = parsed?.operationName ?? '';
      q = parsed?.query ?? rawBody;
    } catch {
      /* ignore */
    }

    // Lesson query
    if (
      op === 'Lesson' ||
      q.includes('lesson(id:') ||
      q.includes('query Lesson')
    ) {
      const pipeline = retryTriggered ? PIPELINE_RETRIED : PIPELINE_FAILED;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { lesson: { ...LESSON_BASE, pipeline } },
        }),
      });
    }

    // Retry mutation
    if (q.includes('retryPipelineModule') || op === 'RetryPipelineModule') {
      retryTriggered = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { retryPipelineModule: PIPELINE_RETRIED.currentRun },
        }),
      });
    }

    // RestoreRun mutation
    if (q.includes('restoreRun') || op === 'RestoreRun') {
      retryTriggered = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { restoreRun: PIPELINE_RETRIED.currentRun },
        }),
      });
    }

    // Fallback
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

async function setupGraphQLErrorOnRetry(page: Page) {
  await page.route('**/graphql', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    const rawBody = route.request().postData() ?? '';
    let op = '';
    let q = rawBody;
    try {
      const parsed = JSON.parse(rawBody) as {
        query?: string;
        operationName?: string;
      };
      op = parsed?.operationName ?? '';
      q = parsed?.query ?? rawBody;
    } catch {
      /* ignore */
    }

    // Lesson query always returns failed pipeline
    if (
      op === 'Lesson' ||
      q.includes('lesson(id:') ||
      q.includes('query Lesson')
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { lesson: { ...LESSON_BASE, pipeline: PIPELINE_FAILED } },
        }),
      });
    }

    // Retry returns GraphQL error
    if (q.includes('retryPipelineModule') || op === 'RetryPipelineModule') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: null,
          errors: [
            {
              message: 'Internal server error: worker pod OOMKilled',
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            },
          ],
        }),
      });
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Pipeline Error Recovery — failed run display', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await setupErrorMocks(page);
  });

  test('pipeline page shows error state for failed run', async ({ page }) => {
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Run status should show FAILED
    const statusBadge = page.getByTestId('run-status-label');
    await statusBadge.waitFor({ timeout: 10_000 });
    await expect(statusBadge).toContainText(/נכשל|FAILED/i);
  });

  test('stepper highlights the failed module', async ({ page }) => {
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // The ASR step should have an error indicator
    const asrNode = page.getByTestId('pipeline-node-ASR');
    await asrNode.waitFor({ timeout: 10_000 });
    // Error class or attribute should be present
    const hasError =
      (await asrNode.getAttribute('class'))?.includes('error') ||
      (await asrNode.getAttribute('data-status'))?.includes('FAILED') ||
      (await asrNode.getAttribute('aria-label'))?.includes('failed');
    expect(hasError).toBeTruthy();
  });

  test('retry button is visible on failed run', async ({ page }) => {
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const retryBtn = page.getByTestId('retry-pipeline-btn');
    await retryBtn.waitFor({ timeout: 10_000 });
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toContainText(/נסה שוב|Retry/i);
  });

  test('clicking retry transitions run to RUNNING state', async ({ page }) => {
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const retryBtn = page.getByTestId('retry-pipeline-btn');
    await retryBtn.waitFor({ timeout: 10_000 });
    await retryBtn.click();

    // After retry, status should change from FAILED to RUNNING
    const statusLabel = page.getByTestId('run-status-label');
    await expect(statusLabel).toContainText(/מריץ|RUNNING/i, {
      timeout: 8_000,
    });
  });

  test('no raw error strings visible on failed pipeline page', async ({
    page,
  }) => {
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to load
    await page.getByTestId('run-status-label').waitFor({ timeout: 10_000 });

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('[GraphQL]');
    expect(bodyText).not.toContain('CombinedError');
    expect(bodyText).not.toContain('Network request failed');
    expect(bodyText).not.toContain('[object Object]');
  });
});

test.describe('Pipeline Error Recovery — retry error handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('retry mutation error shows friendly message, not raw GraphQL', async ({
    page,
  }) => {
    await setupGraphQLErrorOnRetry(page);
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const retryBtn = page.getByTestId('retry-pipeline-btn');
    await retryBtn.waitFor({ timeout: 10_000 });
    await retryBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Raw server error must NOT be visible
    await expect(page.getByText('worker pod OOMKilled')).not.toBeVisible({
      timeout: 3_000,
    });
    await expect(page.getByText('Internal server error')).not.toBeVisible({
      timeout: 2_000,
    });
    await expect(page.getByText('[GraphQL]')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('failed pipeline page visual snapshot', async ({ page }) => {
    await setupErrorMocks(page);
    await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('run-status-label').waitFor({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('pipeline-error-recovery-failed.png', {
      maxDiffPixels: 300,
    });
  });
});
