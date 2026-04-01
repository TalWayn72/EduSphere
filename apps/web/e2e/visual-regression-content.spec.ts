/**
 * Visual Regression Tests — Content Management Pages
 *
 * Covers content import, drive import, course creation, course editing, and portal builder.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-content --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/** Try element screenshot, fall back to full page if element not visible */
async function elementOrPage(
  page: Page,
  selectors: string[],
  name: string,
  opts: Record<string, unknown> = { animations: 'disabled' as const }
) {
  const locator = selectors.reduce(
    (loc, sel, i) => (i === 0 ? page.locator(sel) : loc.or(page.locator(sel))),
    page.locator(selectors[0])
  );
  const el = locator.first();
  if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT IMPORT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Content Import @visual-content', () => {
  test.setTimeout(60_000);

  test('content import — full page', async ({ page }) => {
    await goTo(page, '/content-import');
    await expect(page).toHaveScreenshot('content-import-full.png', STABLE_OPTS);
  });

  test('content import — header section', async ({ page }) => {
    await goTo(page, '/content-import');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'content-import-header.png'
    );
  });

  test('content import — upload area', async ({ page }) => {
    await goTo(page, '/content-import');
    await elementOrPage(
      page,
      [
        '[data-testid="upload-area"]',
        '[role="button"]',
        '.upload-zone',
        'main',
      ],
      'content-import-upload.png'
    );
  });

  test('content import — format options', async ({ page }) => {
    await goTo(page, '/content-import');
    await elementOrPage(
      page,
      ['[data-testid="format-options"]', '.format-list', 'section'],
      'content-import-formats.png'
    );
  });

  test('content import — recent imports', async ({ page }) => {
    await goTo(page, '/content-import');
    await elementOrPage(
      page,
      ['[data-testid="recent-imports"]', 'table', '[role="table"]'],
      'content-import-recent.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE IMPORT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Drive Import @visual-content', () => {
  test.setTimeout(60_000);

  test('drive import — full page', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    await expect(page).toHaveScreenshot('content-drive-full.png', STABLE_OPTS);
  });

  test('drive import — header section', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'content-drive-header.png'
    );
  });

  test('drive import — file browser', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    await elementOrPage(
      page,
      ['[data-testid="file-browser"]', '[role="tree"]', 'main'],
      'content-drive-browser.png'
    );
  });

  test('drive import — connection status', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    await elementOrPage(
      page,
      ['[data-testid="connection-status"]', '.status', 'section'],
      'content-drive-status.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE CREATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Course Creation @visual-content', () => {
  test.setTimeout(60_000);

  test('course creation — full page', async ({ page }) => {
    await goTo(page, '/courses/create');
    await expect(page).toHaveScreenshot(
      'content-coursecreate-full.png',
      STABLE_OPTS
    );
  });

  test('course creation — header section', async ({ page }) => {
    await goTo(page, '/courses/create');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'content-coursecreate-header.png'
    );
  });

  test('course creation — form fields', async ({ page }) => {
    await goTo(page, '/courses/create');
    await elementOrPage(
      page,
      ['form', '[data-testid="course-form"]', 'main'],
      'content-coursecreate-form.png'
    );
  });

  test('course creation — action buttons', async ({ page }) => {
    await goTo(page, '/courses/create');
    await elementOrPage(
      page,
      ['[data-testid="form-actions"]', '.actions', 'footer', 'button'],
      'content-coursecreate-actions.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE EDITING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Course Editing @visual-content', () => {
  test.setTimeout(60_000);

  test('course editing — full page', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    await expect(page).toHaveScreenshot(
      'content-courseedit-full.png',
      STABLE_OPTS
    );
  });

  test('course editing — header section', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'content-courseedit-header.png'
    );
  });

  test('course editing — editor area', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    await elementOrPage(
      page,
      ['[data-testid="course-editor"]', 'form', 'main'],
      'content-courseedit-editor.png'
    );
  });

  test('course editing — module list', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    await elementOrPage(
      page,
      ['[data-testid="module-list"]', '[role="list"]', 'aside'],
      'content-courseedit-modules.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL BUILDER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Portal Builder @visual-content', () => {
  test.setTimeout(60_000);

  test('portal builder — full page', async ({ page }) => {
    await goTo(page, '/portal-builder');
    await expect(page).toHaveScreenshot('content-portal-full.png', STABLE_OPTS);
  });

  test('portal builder — header section', async ({ page }) => {
    await goTo(page, '/portal-builder');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'content-portal-header.png'
    );
  });

  test('portal builder — design canvas', async ({ page }) => {
    await goTo(page, '/portal-builder');
    await elementOrPage(
      page,
      ['[data-testid="portal-canvas"]', '.canvas', 'main'],
      'content-portal-canvas.png'
    );
  });

  test('portal builder — component palette', async ({ page }) => {
    await goTo(page, '/portal-builder');
    await elementOrPage(
      page,
      ['[data-testid="component-palette"]', 'aside', 'nav'],
      'content-portal-palette.png'
    );
  });

  test('content import — sidebar navigation', async ({ page }) => {
    await goTo(page, '/content-import');
    await elementOrPage(
      page,
      ['aside', '[data-testid="sidebar"]', 'nav'],
      'content-import-sidebar.png'
    );
  });

  test('course creation — metadata section', async ({ page }) => {
    await goTo(page, '/courses/create');
    await elementOrPage(
      page,
      ['[data-testid="course-metadata"]', '.metadata', 'section'],
      'content-coursecreate-metadata.png'
    );
  });

  test('course editing — toolbar', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    await elementOrPage(
      page,
      ['[data-testid="editor-toolbar"]', '[role="toolbar"]', '.toolbar'],
      'content-courseedit-toolbar.png'
    );
  });

  test('portal builder — preview panel', async ({ page }) => {
    await goTo(page, '/portal-builder');
    await elementOrPage(
      page,
      ['[data-testid="portal-preview"]', '.preview', 'iframe'],
      'content-portal-preview.png'
    );
  });
});
