/**
 * Lesson Results Page — E2E Tests
 *
 * Covers the full pipeline output display:
 *   1. Page loads with "no results" empty state
 *   2. Video URL quick-add panel is present and functional
 *   3. All pipeline module sections render (ASR, INGESTION, SUMMARIZATION, etc.)
 *   4. Transcription text is visible and expandable
 *   5. Run status badges display correctly
 *   6. "Run Again" button navigates back to pipeline
 *   7. No raw technical strings shown to users
 *   8. Screenshots for visual regression
 *
 * Uses page.route() to mock GraphQL — no live backend required.
 */

import { test, expect, type Page } from '@playwright/test';
import { BASE_URL, RUN_WRITE_TESTS } from './env';

/**
 * DEV_MODE auth helper — sets sessionStorage before page loads so the app
 * auto-authenticates without needing the login UI or Keycloak flow.
 * This is faster and more reliable than `login(page)` for tests that only
 * need authenticated access (not auth flow testing).
 */
async function setDevAuth(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('edusphere_dev_logged_in', 'true');
  });
}

// ── IDs ───────────────────────────────────────────────────────────────────────

const COURSE_ID = 'cc000000-0000-0000-0000-000000000002';
const LESSON_ID = 'b06b38d9-93a3-4361-8b41-38b25ad322e2';
const RESULTS_URL = `${BASE_URL}/courses/${COURSE_ID}/lessons/${LESSON_ID}/results`;

// ── Mock data ─────────────────────────────────────────────────────────────────

const LESSON_BASE = {
  id: LESSON_ID,
  courseId: COURSE_ID,
  moduleId: null,
  title: 'שיעור בפורים',
  type: 'THEMATIC',
  series: null,
  lessonDate: null,
  instructorId: '00000000-0000-0000-0000-000000000002',
  status: 'READY',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  citations: [],
};

const VIDEO_ASSET = {
  id: 'asset-1',
  assetType: 'VIDEO',
  sourceUrl: 'https://www.youtube.com/watch?v=purim-lesson-2024',
  fileUrl: null,
  metadata: {},
};

const FULL_RESULTS = [
  {
    id: 'r-ingestion', moduleName: 'INGESTION', outputType: 'INGESTION',
    outputData: { sourceUrl: 'https://www.youtube.com/watch?v=purim-lesson-2024', assetType: 'VIDEO' },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-asr', moduleName: 'ASR', outputType: 'ASR',
    outputData: {
      transcript: 'ברוכים הבאים לשיעור על פורים. היום נלמד על מגילת אסתר ועל מצוות היום הגדול. ייחודו של פורים הוא ששמחתו גדולה מכל שאר המועדות. חז"ל אמרו: "מי שלא שמח בפורים לא קיים מצוות שמחה". הגמרא בתענית מספרת על רבא ועל שמחת פורים.',
      language: 'he',
      duration: 3600,
    },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-cleaning', moduleName: 'CONTENT_CLEANING', outputType: 'CONTENT_CLEANING',
    outputData: { cleanedText: 'ברוכים הבאים לשיעור על פורים היום נלמד על מגילת אסתר ועל מצוות היום הגדול' },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-ner', moduleName: 'NER_SOURCE_LINKING', outputType: 'NER_SOURCE_LINKING',
    outputData: {
      entities: [{ text: 'פורים', type: 'CONCEPT' }, { text: 'מגילת אסתר', type: 'SOURCE' }, { text: 'רבא', type: 'PERSON' }],
      linkedSources: [{ title: 'מגילת אסתר', url: null }, { title: 'תלמוד בבלי, תענית', url: null }],
    },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-summarize', moduleName: 'SUMMARIZATION', outputType: 'SUMMARIZATION',
    outputData: {
      shortSummary: 'שיעור מרתק על ייחודו של פורים ומצוות השמחה בו.',
      keyPoints: ['מגילת אסתר', 'מצוות שמחה', 'שיטת רבא'],
    },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-notes', moduleName: 'STRUCTURED_NOTES', outputType: 'STRUCTURED_NOTES',
    outputData: { outputMarkdown: '## פורים\n### מצוות\n- שמחה\n- מגילה\n- משלוח מנות\n- מתנות לאביונים' },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-diagram', moduleName: 'DIAGRAM_GENERATOR', outputType: 'DIAGRAM_GENERATOR',
    outputData: { mermaidSrc: 'graph LR\n  A[פורים] --> B[מגילת אסתר]\n  A --> C[שמחה]' },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-citations', moduleName: 'CITATION_VERIFIER', outputType: 'CITATION_VERIFIER',
    outputData: {
      verifiedCitations: [{ sourceText: 'מגילת אסתר' }, { sourceText: 'תלמוד בבלי, תענית' }],
      failedCitations: [],
      matchReport: '2 ציטוטים אומתו בהצלחה. לא נמצאו ציטוטים שגויים.',
    },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-qa', moduleName: 'QA_GATE', outputType: 'QA_GATE',
    outputData: { overallScore: 0.92, fixList: [] },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
  {
    id: 'r-publish', moduleName: 'PUBLISH_SHARE', outputType: 'PUBLISH_SHARE',
    outputData: { publishReady: true, publishedUrl: 'https://cdn.example.com/purim-lesson' },
    fileUrl: null, createdAt: new Date().toISOString(),
  },
];

const PIPELINE_COMPLETED = {
  id: 'pipeline-1',
  templateName: 'THEMATIC',
  nodes: [],
  config: {},
  status: 'COMPLETED',
  createdAt: '2025-01-01T00:00:00Z',
  currentRun: {
    id: 'run-1',
    status: 'COMPLETED',
    startedAt: '2025-03-01T09:00:00Z',
    completedAt: '2025-03-01T10:00:00Z',
    logs: [],
    results: FULL_RESULTS,
  },
};

const PIPELINE_RUNNING = {
  ...PIPELINE_COMPLETED,
  status: 'RUNNING',
  currentRun: {
    ...PIPELINE_COMPLETED.currentRun,
    status: 'RUNNING',
    completedAt: null,
    results: [],
  },
};

// ── GraphQL mock helper ───────────────────────────────────────────────────────

type ScenarioKey = 'empty' | 'running' | 'completed';

async function setupResultsMocks(page: Page, scenario: ScenarioKey = 'completed') {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as { query?: string; operationName?: string };
    const q = body?.query ?? '';
    const op = body?.operationName ?? '';

    // Lesson query
    if (q.includes('lesson(id:') || q.includes('query Lesson') || op === 'Lesson') {
      const pipeline =
        scenario === 'empty'     ? null :
        scenario === 'running'   ? PIPELINE_RUNNING :
                                   PIPELINE_COMPLETED;

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            lesson: { ...LESSON_BASE, assets: [VIDEO_ASSET], pipeline },
          },
        }),
      });
    }

    // addLessonAsset mutation
    if (q.includes('addLessonAsset') || op === 'AddLessonAsset') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { addLessonAsset: { id: 'asset-new', assetType: 'VIDEO', sourceUrl: 'https://youtube.com/test', fileUrl: null } },
        }),
      });
    }

    // Subscriptions / other
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await setDevAuth(page);
});

test.describe('Results Page — empty state', () => {
  test('shows empty state when no pipeline results', async ({ page }) => {
    await setupResultsMocks(page, 'empty');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('תוצאות Pipeline')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('empty-results')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/אין תוצאות עדיין/)).toBeVisible();
    await expect(page.getByTestId('open-pipeline-from-empty')).toBeVisible();
  });

  test('shows video URL quick-add panel in empty state', async ({ page }) => {
    await setupResultsMocks(page, 'empty');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('add-video-panel')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('video-url-input')).toBeVisible();
    await expect(page.getByTestId('add-video-btn')).toBeVisible();
  });

  test.skip(!RUN_WRITE_TESTS, 'Skipped in read-only mode');

  test('video URL validation: empty input shows error', async ({ page }) => {
    await setupResultsMocks(page, 'empty');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-testid="add-video-btn"]', { timeout: 10_000 });
    await page.click('[data-testid="add-video-btn"]');
    await expect(page.getByTestId('add-video-error')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('add-video-error')).toContainText('קישור');
  });

  test('video URL: fill and submit navigates to pipeline page', async ({ page }) => {
    await setupResultsMocks(page, 'empty');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-testid="video-url-input"]', { timeout: 10_000 });
    await page.fill('[data-testid="video-url-input"]', 'https://www.youtube.com/watch?v=purim-2024');
    await page.click('[data-testid="add-video-btn"]');

    await expect(page).toHaveURL(
      new RegExp(`/courses/${COURSE_ID}/lessons/${LESSON_ID}/pipeline`),
      { timeout: 10_000 }
    );
  });
});

test.describe('Results Page — RUNNING state', () => {
  test('shows RUNNING badge when pipeline is running', async ({ page }) => {
    await setupResultsMocks(page, 'running');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('run-status-badge')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('run-status-badge')).toContainText(/מריץ/);
  });
});

test.describe('Results Page — COMPLETED state with all outputs', () => {
  test.beforeEach(async ({ page }) => {
    await setupResultsMocks(page, 'completed');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('תוצאות Pipeline')).toBeVisible({ timeout: 10_000 });
  });

  test('shows COMPLETED run status badge', async ({ page }) => {
    await expect(page.getByTestId('run-status-badge')).toBeVisible();
    await expect(page.getByTestId('run-status-badge')).toContainText(/הושלם/);
  });

  test('INGESTION section shows processed video URL', async ({ page }) => {
    await expect(page.getByTestId('result-ingestion')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('ingestion-url')).toBeVisible();
    const ingestionText = await page.getByTestId('result-ingestion').textContent();
    expect(ingestionText).toContain('youtube.com');
  });

  test('ASR section shows transcription text', async ({ page }) => {
    await expect(page.getByTestId('result-asr')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('asr-transcript')).toBeVisible();
    const transcriptText = await page.getByTestId('asr-transcript').textContent();
    expect(transcriptText).toContain('ברוכים הבאים לשיעור על פורים');
  });

  test('ASR shows language label', async ({ page }) => {
    await expect(page.getByTestId('asr-language')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('asr-language')).toContainText('he');
  });

  test('ASR shows duration', async ({ page }) => {
    await expect(page.getByTestId('asr-duration')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('asr-duration')).toContainText('60');
  });

  test('CONTENT_CLEANING section renders cleaned text', async ({ page }) => {
    await expect(page.getByTestId('result-cleaning')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('cleaned-text')).toBeVisible();
  });

  test('NER section shows entity chips', async ({ page }) => {
    await expect(page.getByTestId('result-ner')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('entity-0')).toContainText('פורים');
    await expect(page.getByTestId('entity-1')).toContainText('מגילת אסתר');
  });

  test('NER section shows linked sources', async ({ page }) => {
    await expect(page.getByTestId('result-ner')).toBeVisible({ timeout: 5_000 });
    const nerText = await page.getByTestId('result-ner').textContent();
    expect(nerText).toContain('מגילת אסתר');
    expect(nerText).toContain('תלמוד בבלי');
  });

  test('SUMMARIZATION section shows short summary', async ({ page }) => {
    await expect(page.getByTestId('result-summarization')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('summary-short')).toContainText('שיעור מרתק על ייחודו של פורים');
  });

  test('SUMMARIZATION shows key points', async ({ page }) => {
    await expect(page.getByTestId('summary-keypoints')).toBeVisible({ timeout: 5_000 });
    const kpText = await page.getByTestId('summary-keypoints').textContent();
    expect(kpText).toContain('מגילת אסתר');
    expect(kpText).toContain('מצוות שמחה');
  });

  test('STRUCTURED_NOTES section shows markdown content', async ({ page }) => {
    await expect(page.getByTestId('result-structured-notes')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('notes-markdown')).toBeVisible();
    const notesText = await page.getByTestId('notes-markdown').textContent();
    expect(notesText).toContain('פורים');
    expect(notesText).toContain('מגילה');
  });

  test('DIAGRAM section shows mermaid source', async ({ page }) => {
    await expect(page.getByTestId('result-diagram')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('diagram-mermaid')).toBeVisible();
    const diagramText = await page.getByTestId('diagram-mermaid').textContent();
    expect(diagramText).toContain('graph LR');
    expect(diagramText).toContain('פורים');
  });

  test('CITATION_VERIFIER shows verified and failed counts', async ({ page }) => {
    await expect(page.getByTestId('result-citations')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('citations-verified')).toContainText('2');
    await expect(page.getByTestId('citations-failed')).toContainText('0');
  });

  test('CITATION_VERIFIER shows match report', async ({ page }) => {
    const report = await page.getByTestId('citations-report').textContent();
    expect(report).toContain('2 ציטוטים אומתו');
  });

  test('QA_GATE shows overall score as percentage', async ({ page }) => {
    await expect(page.getByTestId('result-qa')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('qa-score')).toContainText('92%');
  });

  test('PUBLISH section shows publishReady and URL', async ({ page }) => {
    await expect(page.getByTestId('result-publish')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('publish-ready')).toBeVisible();
    await expect(page.getByTestId('publish-url')).toBeVisible();
    await expect(page.getByTestId('publish-url')).toHaveAttribute('href', 'https://cdn.example.com/purim-lesson');
  });

  test('Run Pipeline Again button is visible', async ({ page }) => {
    await expect(page.getByTestId('run-pipeline-again-btn')).toBeVisible({ timeout: 5_000 });
  });

  test.skip(!RUN_WRITE_TESTS, 'Skipped in read-only mode');

  test('Run Pipeline Again button navigates to pipeline page', async ({ page }) => {
    await page.click('[data-testid="run-pipeline-again-btn"]');
    await expect(page).toHaveURL(
      new RegExp(`/courses/${COURSE_ID}/lessons/${LESSON_ID}/pipeline`),
      { timeout: 8_000 }
    );
  });
});

test.describe('Results Page — regression guards', () => {
  test('no raw technical strings shown to user in empty state', async ({ page }) => {
    await setupResultsMocks(page, 'empty');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="empty-results"]', { timeout: 10_000 });

    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('[GraphQL]');
    expect(pageText).not.toContain('Unexpected error');
    expect(pageText).not.toContain('[object Object]');
    expect(pageText).not.toContain('undefined');
  });

  test('no raw technical strings shown in completed state', async ({ page }) => {
    await setupResultsMocks(page, 'completed');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="result-asr"]', { timeout: 10_000 });

    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('[GraphQL]');
    expect(pageText).not.toContain('Unexpected error');
    expect(pageText).not.toContain('[object Object]');
    expect(pageText).not.toContain('undefined');
  });

  test('no Authentication required errors shown in console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Authentication required')) {
        // Only collect non-subscription auth errors (subscriptions degrading gracefully is OK)
        if (!msg.text().includes('subscription')) {
          consoleErrors.push(msg.text());
        }
      }
    });

    await setupResultsMocks(page, 'completed');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="result-asr"]', { timeout: 10_000 });

    // Main content errors (non-subscription) should not exist
    expect(consoleErrors.length).toBe(0);
  });
});

test.describe('Results Page — screenshots', () => {
  test('empty state screenshot is clean', async ({ page }) => {
    await setupResultsMocks(page, 'empty');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="empty-results"]', { timeout: 10_000 });

    await expect(page).toHaveScreenshot('lesson-results-empty.png', { maxDiffPixels: 400 });
  });

  test('completed results page screenshot', async ({ page }) => {
    await setupResultsMocks(page, 'completed');
    await page.goto(RESULTS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="result-asr"]', { timeout: 10_000 });

    await expect(page).toHaveScreenshot('lesson-results-completed.png', { maxDiffPixels: 400 });
  });
});
