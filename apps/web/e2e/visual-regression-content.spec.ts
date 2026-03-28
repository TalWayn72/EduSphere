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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT IMPORT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Content Import @visual-content', () => {
  test.setTimeout(30_000);

  test('content import — full page', async ({ page }) => {
    await goTo(page, '/content-import');
    await expect(page).toHaveScreenshot('content-import-full.png', STABLE_OPTS);
  });

  test('content import — header section', async ({ page }) => {
    await goTo(page, '/content-import');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('content-import-header.png', { animations: 'disabled' as const });
  });

  test('content import — upload area', async ({ page }) => {
    await goTo(page, '/content-import');
    const upload = page.locator('[data-testid="upload-area"], [role="button"], .upload-zone, main').first();
    await expect(upload).toHaveScreenshot('content-import-upload.png', { animations: 'disabled' as const });
  });

  test('content import — format options', async ({ page }) => {
    await goTo(page, '/content-import');
    const formats = page.locator('[data-testid="format-options"], .format-list, section').first();
    await expect(formats).toHaveScreenshot('content-import-formats.png', { animations: 'disabled' as const });
  });

  test('content import — recent imports', async ({ page }) => {
    await goTo(page, '/content-import');
    const recent = page.locator('[data-testid="recent-imports"], table, [role="table"]').first();
    await expect(recent).toHaveScreenshot('content-import-recent.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE IMPORT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Drive Import @visual-content', () => {
  test.setTimeout(30_000);

  test('drive import — full page', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    await expect(page).toHaveScreenshot('content-drive-full.png', STABLE_OPTS);
  });

  test('drive import — header section', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('content-drive-header.png', { animations: 'disabled' as const });
  });

  test('drive import — file browser', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    const browser = page.locator('[data-testid="file-browser"], [role="tree"], main').first();
    await expect(browser).toHaveScreenshot('content-drive-browser.png', { animations: 'disabled' as const });
  });

  test('drive import — connection status', async ({ page }) => {
    await goTo(page, '/content-import/drive');
    const status = page.locator('[data-testid="connection-status"], .status, section').first();
    await expect(status).toHaveScreenshot('content-drive-status.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE CREATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Course Creation @visual-content', () => {
  test.setTimeout(30_000);

  test('course creation — full page', async ({ page }) => {
    await goTo(page, '/courses/create');
    await expect(page).toHaveScreenshot('content-coursecreate-full.png', STABLE_OPTS);
  });

  test('course creation — header section', async ({ page }) => {
    await goTo(page, '/courses/create');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('content-coursecreate-header.png', { animations: 'disabled' as const });
  });

  test('course creation — form fields', async ({ page }) => {
    await goTo(page, '/courses/create');
    const form = page.locator('form, [data-testid="course-form"], main').first();
    await expect(form).toHaveScreenshot('content-coursecreate-form.png', { animations: 'disabled' as const });
  });

  test('course creation — action buttons', async ({ page }) => {
    await goTo(page, '/courses/create');
    const actions = page.locator('[data-testid="form-actions"], .actions, footer, button').first();
    await expect(actions).toHaveScreenshot('content-coursecreate-actions.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE EDITING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Course Editing @visual-content', () => {
  test.setTimeout(30_000);

  test('course editing — full page', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    await expect(page).toHaveScreenshot('content-courseedit-full.png', STABLE_OPTS);
  });

  test('course editing — header section', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('content-courseedit-header.png', { animations: 'disabled' as const });
  });

  test('course editing — editor area', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    const editor = page.locator('[data-testid="course-editor"], form, main').first();
    await expect(editor).toHaveScreenshot('content-courseedit-editor.png', { animations: 'disabled' as const });
  });

  test('course editing — module list', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    const modules = page.locator('[data-testid="module-list"], [role="list"], aside').first();
    await expect(modules).toHaveScreenshot('content-courseedit-modules.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL BUILDER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Portal Builder @visual-content', () => {
  test.setTimeout(30_000);

  test('portal builder — full page', async ({ page }) => {
    await goTo(page, '/portal-builder');
    await expect(page).toHaveScreenshot('content-portal-full.png', STABLE_OPTS);
  });

  test('portal builder — header section', async ({ page }) => {
    await goTo(page, '/portal-builder');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('content-portal-header.png', { animations: 'disabled' as const });
  });

  test('portal builder — design canvas', async ({ page }) => {
    await goTo(page, '/portal-builder');
    const canvas = page.locator('[data-testid="portal-canvas"], .canvas, main').first();
    await expect(canvas).toHaveScreenshot('content-portal-canvas.png', { animations: 'disabled' as const });
  });

  test('portal builder — component palette', async ({ page }) => {
    await goTo(page, '/portal-builder');
    const palette = page.locator('[data-testid="component-palette"], aside, nav').first();
    await expect(palette).toHaveScreenshot('content-portal-palette.png', { animations: 'disabled' as const });
  });

  test('content import — sidebar navigation', async ({ page }) => {
    await goTo(page, '/content-import');
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
    await expect(sidebar).toHaveScreenshot('content-import-sidebar.png', { animations: 'disabled' as const });
  });

  test('course creation — metadata section', async ({ page }) => {
    await goTo(page, '/courses/create');
    const metadata = page.locator('[data-testid="course-metadata"], .metadata, section').first();
    await expect(metadata).toHaveScreenshot('content-coursecreate-metadata.png', { animations: 'disabled' as const });
  });

  test('course editing — toolbar', async ({ page }) => {
    await goTo(page, '/courses/1/edit');
    const toolbar = page.locator('[data-testid="editor-toolbar"], [role="toolbar"], .toolbar').first();
    await expect(toolbar).toHaveScreenshot('content-courseedit-toolbar.png', { animations: 'disabled' as const });
  });

  test('portal builder — preview panel', async ({ page }) => {
    await goTo(page, '/portal-builder');
    const preview = page.locator('[data-testid="portal-preview"], .preview, iframe').first();
    await expect(preview).toHaveScreenshot('content-portal-preview.png', { animations: 'disabled' as const });
  });
});
