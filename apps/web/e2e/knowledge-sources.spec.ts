/**
 * Knowledge Sources E2E Test Suite
 *
 * Tests the NotebookLM-style SourceManager panel embedded in /courses/:courseId.
 *
 * Two suites:
 *   Suite 1 — DEV_MODE (default, no backend required):
 *     Validates the collapsible panel toggle, Add Source modal tabs
 *     (URL, Text, File, YouTube), and empty state UI.
 *
 *   Suite 2 — Live backend (VITE_DEV_MODE=false):
 *     Validates full mutation flow: add URL source, verify PENDING → READY,
 *     and delete source. Skipped when running without a live backend.
 *
 * Run (DEV_MODE, no backend needed — CI default):
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-sources.spec.ts
 *
 * Run (live backend full flow):
 *   VITE_DEV_MODE=false E2E_BASE_URL=http://localhost:5175 \
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-sources.spec.ts \
 *   --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, IS_DEV_MODE, RUN_WRITE_TESTS } from './env';
import { login } from './auth.helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Demo course ID from seed data */
const DEMO_COURSE_ID = 'cc000000-0000-0000-0000-000000000002';
const COURSE_URL = `${BASE_URL}/courses/${DEMO_COURSE_ID}`;

/** Timeout for UI transitions (animations, modal open) */
const UI_TIMEOUT = 5_000;
/** Timeout for source processing (PENDING → READY) when live backend is running */
const PROCESSING_TIMEOUT = 30_000;

// ─── Suite 1: DEV_MODE — UI structure tests (no backend) ─────────────────────

test.describe('Knowledge Sources — DEV_MODE (UI structure)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(COURSE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000); // let React settle
  });

  test('course detail page loads without crash', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: UI_TIMEOUT,
    });
    await expect(page.locator('body')).toBeVisible();
  });

  test('Knowledge Sources toggle button is visible', async ({ page }) => {
    const toggle = page.getByTestId('toggle-sources');
    await expect(toggle).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(toggle).toContainText('מקורות מידע');
  });

  test('sources panel is hidden initially (collapsed)', async ({ page }) => {
    await expect(page.getByTestId('sources-panel')).not.toBeVisible();
  });

  test('clicking toggle expands the sources panel', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await expect(page.getByTestId('sources-panel')).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('clicking toggle again collapses the sources panel', async ({
    page,
  }) => {
    const toggle = page.getByTestId('toggle-sources');
    await toggle.click();
    await expect(page.getByTestId('sources-panel')).toBeVisible({
      timeout: UI_TIMEOUT,
    });
    await toggle.click();
    await expect(page.getByTestId('sources-panel')).not.toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('sources panel shows "Add source" button when expanded', async ({
    page,
  }) => {
    await page.getByTestId('toggle-sources').click();
    await expect(page.getByRole('button', { name: /Add source|Add Source/i })).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('"Add source" button opens the Add Source modal', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    // Modal should appear with tab selector
    await expect(page.getByText(/URL|Link|Add Knowledge Source/i).first()).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has URL tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await expect(
      page.getByRole('button', { name: /URL|Link/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has Text tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await expect(
      page.getByRole('button', { name: /text/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has File tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await expect(
      page.getByRole('button', { name: /file/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has YouTube tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await expect(
      page.getByRole('button', { name: /YouTube/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('pressing Escape closes the Add Source modal', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    // Wait for modal to appear
    await expect(page.getByText(/URL|Link|Add Knowledge Source/i).first()).toBeVisible({
      timeout: UI_TIMEOUT,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByText(/כתובת URL/i)).not.toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('no crash overlay visible after opening the panel', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });
});

// ─── Suite 2: Live backend — mutation flow ────────────────────────────────────

test.describe('Knowledge Sources — Live backend (full mutation flow)', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');
  test.skip(
    !RUN_WRITE_TESTS,
    'Write tests disabled by E2E_RUN_WRITE_TESTS=false'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(COURSE_URL, { waitUntil: 'domcontentloaded' });
    // Open the sources panel
    await page.getByTestId('toggle-sources').click();
    await expect(page.getByTestId('sources-panel')).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('can add a URL source and it appears in the list', async ({ page }) => {
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    // URL tab is default — fill in the form
    await page
      .getByPlaceholder(/https?:\/\//i)
      .fill('https://example.com/test-source');
    await page
      .getByRole('button', { name: /הוסף|שמור|submit/i })
      .last()
      .click();

    // Modal closes
    await expect(
      page.getByText(/https:\/\/example.com\/test-source/i)
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('new URL source starts in PENDING or PROCESSING status', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await page
      .getByPlaceholder(/https?:\/\//i)
      .fill('https://example.com/e2e-test');
    await page
      .getByRole('button', { name: /הוסף|שמור|submit/i })
      .last()
      .click();

    // Status should be PENDING or PROCESSING initially
    const statusEl = page.getByText(/ממתין|מעבד|pending|processing/i).first();
    await expect(statusEl).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('URL source eventually reaches READY or FAILED status', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await page
      .getByPlaceholder(/https?:\/\//i)
      .fill('https://example.com/e2e-ready');
    await page
      .getByRole('button', { name: /הוסף|שמור|submit/i })
      .last()
      .click();

    // Wait for READY or FAILED (panel auto-polls every 3s)
    await expect(page.getByText(/מוכן|נכשל|ready|failed/i).first()).toBeVisible(
      { timeout: PROCESSING_TIMEOUT }
    );
  });

  test('can add raw text source', async ({ page }) => {
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    // Click Text tab
    await page
      .getByRole('button', { name: /text/i })
      .first()
      .click();
    await page
      .getByPlaceholder(/הדבק טקסט|paste text/i)
      .fill('Test raw text content for E2E');
    await page
      .getByRole('button', { name: /הוסף|שמור|submit/i })
      .last()
      .click();

    await expect(
      page.getByText(/ממתין|מוכן|pending|ready/i).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('can add a YouTube source', async ({ page }) => {
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    // Click YouTube tab
    await page
      .getByRole('button', { name: /YouTube/i })
      .first()
      .click();
    await page
      .getByPlaceholder(/youtube.com\/watch|youtu.be/i)
      .fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page
      .getByRole('button', { name: /הוסף|שמור|submit/i })
      .last()
      .click();

    // Source should appear with YouTube icon or title
    await expect(page.getByText(/dQw4w9WgXcQ|youtube/i).first()).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  // ── BUG-055 regression: raw errorMessage must never appear in UI ─────────────
  // This test skipped in live-backend mode (requires mock GraphQL response).
  // Covered by the dedicated DEV_MODE suite below.
  test('can delete a source', async ({ page }) => {
    // Add a source first
    await page.getByRole('button', { name: /Add source|Add Source/i }).click();
    await page
      .getByPlaceholder(/https?:\/\//i)
      .fill('https://example.com/to-delete');
    await page
      .getByRole('button', { name: /הוסף|שמור|submit/i })
      .last()
      .click();
    await expect(page.getByText('https://example.com/to-delete')).toBeVisible({
      timeout: UI_TIMEOUT,
    });

    // Hover to reveal delete button (✕), then click with confirm dialog
    const sourceItem = page
      .locator('[class*="group"]')
      .filter({ hasText: 'to-delete' })
      .first();
    await sourceItem.hover();
    page.on('dialog', (dialog) => dialog.accept());
    await sourceItem.getByTitle(/הסר מקור/i).click();

    // Source should disappear
    await expect(
      page.getByText('https://example.com/to-delete')
    ).not.toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });
});

// ─── Suite 3: BUG-055 regression — raw errorMessage never shown in UI ─────────
//
// Intercepts the GraphQL courseKnowledgeSources query and returns a FAILED
// source whose errorMessage is the raw backend string used in production.
// Asserts that the raw string is never rendered; only a user-friendly
// i18n message appears.

test.describe('Knowledge Sources — BUG-055 (raw errorMessage must not reach UI)', () => {
  const RAW_BACKEND_ERROR = 'Processing was interrupted (service restarted)';

  test.beforeEach(async ({ page }) => {
    await login(page);

    // Intercept GraphQL requests and inject a FAILED source with raw errorMessage
    await page.route('**/graphql', async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as { query?: string } | null;
      if (body?.query?.includes('courseKnowledgeSources')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              courseKnowledgeSources: [
                {
                  id: 'failed-src-1',
                  title: 'ספר נהר שלום — הרש"ש (טקסט מלא)',
                  sourceType: 'FILE_DOCX',
                  origin: 'nahar-shalom.docx',
                  preview: null,
                  status: 'FAILED',
                  chunkCount: 0,
                  errorMessage: RAW_BACKEND_ERROR,
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(COURSE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // Open sources panel
    await page.getByTestId('toggle-sources').click();
    await expect(page.getByTestId('sources-panel')).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('BUG-055: raw backend errorMessage is NOT visible in the UI', async ({
    page,
  }) => {
    await expect(page.getByText(RAW_BACKEND_ERROR)).not.toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('BUG-055: raw "service restarted" technical string is NOT in page text', async ({
    page,
  }) => {
    const bodyText = await page.evaluate(() => document.body.textContent ?? '');
    expect(bodyText).not.toContain('service restarted');
    expect(bodyText).not.toContain('Processing was interrupted');
  });

  test('BUG-055: FAILED source shows user-friendly error (not raw string)', async ({
    page,
  }) => {
    // The source should be visible with FAILED status indicator
    await expect(
      page.getByText(/שגיאה|Error|interrupted|failed/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
    // But the raw technical string must be absent
    const bodyText = await page.evaluate(() => document.body.textContent ?? '');
    expect(bodyText).not.toContain('service restarted');
  });

  test('BUG-055: visual regression — sources panel with FAILED source', async ({
    page,
  }) => {
    await expect(page.getByTestId('sources-panel')).toHaveScreenshot(
      'sources-panel-failed-source.png'
    );
  });
});

// ─── Suite 4: BUG-056 regression — subscription auth warning fires at most once ─
//
// Navigates to a course page and monitors console.warn calls.
// The urql subscription auth warning must fire at most ONCE per subscription
// operation name, not 5+ times due to reconnect loops.

test.describe('Knowledge Sources — BUG-056 (subscription auth warning rate-limit)', () => {
  test('BUG-056: subscription auth console.warn fires at most once', async ({
    page,
  }) => {
    const authWarnings: string[] = [];

    page.on('console', (msg) => {
      if (
        msg.type() === 'warning' &&
        msg.text().includes('Subscription auth error')
      ) {
        authWarnings.push(msg.text());
      }
    });

    await login(page);
    await page.goto(COURSE_URL, { waitUntil: 'domcontentloaded' });
    // Wait long enough for any reconnect loops to manifest
    await page.waitForTimeout(3_000);

    // Rate limiter must prevent the same warning from appearing more than once
    // per subscription operation name
    const uniqueWarnings = new Set(authWarnings);
    for (const warning of uniqueWarnings) {
      const count = authWarnings.filter((w) => w === warning).length;
      expect(
        count,
        `Subscription auth warning "${warning}" fired ${count} times — expected ≤ 1`
      ).toBeLessThanOrEqual(1);
    }
  });
});
