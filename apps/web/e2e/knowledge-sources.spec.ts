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
 *   VITE_DEV_MODE=false E2E_BASE_URL=http://localhost:5173 \
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-sources.spec.ts \
 *   --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, IS_DEV_MODE, RUN_WRITE_TESTS } from './env';

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

  test('sources panel shows "הוסף מקור" button when expanded', async ({
    page,
  }) => {
    await page.getByTestId('toggle-sources').click();
    await expect(page.getByRole('button', { name: /הוסף מקור/i })).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('"הוסף מקור" button opens the Add Source modal', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    // Modal should appear with tab selector
    await expect(page.getByText(/כתובת URL|URL/i).first()).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has URL tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    await expect(
      page.getByRole('button', { name: /URL|קישור/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has Text tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    await expect(
      page.getByRole('button', { name: /טקסט|text/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has File tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    await expect(
      page.getByRole('button', { name: /קובץ|file/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('Add Source modal has YouTube tab', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    await expect(
      page.getByRole('button', { name: /YouTube|יוטיוב/i }).first()
    ).toBeVisible({
      timeout: UI_TIMEOUT,
    });
  });

  test('pressing Escape closes the Add Source modal', async ({ page }) => {
    await page.getByTestId('toggle-sources').click();
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    // Wait for modal to appear
    await expect(page.getByText(/כתובת URL|URL/i).first()).toBeVisible({
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
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
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
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
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
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
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
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    // Click Text tab
    await page
      .getByRole('button', { name: /טקסט|text/i })
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
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
    // Click YouTube tab
    await page
      .getByRole('button', { name: /YouTube|יוטיוב/i })
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

  test('can delete a source', async ({ page }) => {
    // Add a source first
    await page.getByRole('button', { name: /הוסף מקור/i }).click();
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
