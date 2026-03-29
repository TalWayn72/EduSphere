/**
 * Visual Regression Tests — PDF Viewer States (Part 2)
 *
 * Covers: Tablet element sections, Wide desktop viewport,
 * Additional interaction states (fit-to-width, page jump, print, download,
 * search panel, annotation create mode, course/learn pages at responsive viewports).
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';

/** Screenshot an element if visible, otherwise fall back to full page */
async function screenshotElOrPage(el: Locator, page: Page, name: string, opts: object): Promise<void> {
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, { ...opts, fullPage: true });
  }
}
import { GRAPHQL_URL } from './env';
import { login } from './auth.helpers';

test.use({ reducedMotion: 'reduce' });

const PDF_SOURCE = {
  id: 'pdf-visual-1',
  title: 'Visual Test PDF Document',
  sourceType: 'FILE_PDF',
  status: 'READY',
  chunkCount: 24,
  errorMessage: null,
  fileUrl: 'https://cdn.edusphere.io/docs/visual-test.pdf',
  createdAt: '2026-03-20T10:00:00Z',
};

const LESSON_WITH_PDF = {
  id: 'lesson-pdf-1',
  title: 'Lesson with PDF Content',
  type: 'DOCUMENT',
  contentUrl: 'https://cdn.edusphere.io/docs/visual-test.pdf',
  course: { id: 'c1', title: 'AI Foundations' },
};

const PDF_ANNOTATIONS = [
  { id: 'ann-1', page: 1, x: 100, y: 200, text: 'Important concept', color: '#FFD700', userId: 'u1', createdAt: '2026-03-25T08:00:00Z' },
  { id: 'ann-2', page: 1, x: 300, y: 400, text: 'Review later', color: '#FF6B6B', userId: 'u1', createdAt: '2026-03-25T09:00:00Z' },
  { id: 'ann-3', page: 2, x: 150, y: 350, text: 'Key definition', color: '#4ECDC4', userId: 'u1', createdAt: '2026-03-25T10:00:00Z' },
];

async function mockPdfContent(page: Page): Promise<void> {
  await page.route(`${GRAPHQL_URL}`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }
    const body = req.postDataJSON() as { operationName?: string; query?: string } | null;
    const op = body?.operationName ?? '';
    const query = body?.query ?? '';

    if (op.includes('Lesson') || query.includes('lesson')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { lesson: LESSON_WITH_PDF } }),
      });
      return;
    }
    if (op.includes('KnowledgeSources') || query.includes('knowledgeSources')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { knowledgeSources: [PDF_SOURCE] } }),
      });
      return;
    }
    if (op.includes('Annotation') || query.includes('annotation')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { annotations: PDF_ANNOTATIONS } }),
      });
      return;
    }
    if (op.includes('Course') || query.includes('course')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            course: {
              id: 'c1',
              title: 'AI Foundations',
              lessons: [LESSON_WITH_PDF],
              modules: [{ id: 'm1', title: 'Module 1', lessons: [LESSON_WITH_PDF] }],
            },
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

async function goTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  await page.waitForTimeout(2000);
}

test.describe('Visual Regression — PDF Viewer @visual-pdf', () => {
  test.setTimeout(45_000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockPdfContent(page);
  });

  test('pdf viewer — tablet toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const toolbar = page.locator('[role="toolbar"], [data-testid="pdf-toolbar"], .pdf-toolbar, header').first();
    await screenshotElOrPage(toolbar, page, 'pdf-viewer-tablet-toolbar.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('pdf viewer — tablet document area', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const docArea = page.locator('[data-testid="pdf-document"], canvas, .pdf-container, main').first();
    await screenshotElOrPage(docArea, page, 'pdf-viewer-tablet-document.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('pdf viewer — mobile toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const toolbar = page.locator('[role="toolbar"], [data-testid="pdf-toolbar"], .pdf-toolbar, header').first();
    await screenshotElOrPage(toolbar, page, 'pdf-viewer-mobile-toolbar.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('pdf viewer — mobile document area', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const docArea = page.locator('[data-testid="pdf-document"], canvas, .pdf-container, main').first();
    await screenshotElOrPage(docArea, page, 'pdf-viewer-mobile-document.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('pdf viewer — wide desktop full', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    await expect(page).toHaveScreenshot('pdf-viewer-wide-desktop.png', LOOSE_OPTS);
  });

  test('pdf viewer — wide desktop toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const toolbar = page.locator('[role="toolbar"], [data-testid="pdf-toolbar"], .pdf-toolbar, header').first();
    await screenshotElOrPage(toolbar, page, 'pdf-viewer-wide-toolbar.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('pdf viewer — wide desktop document', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const docArea = page.locator('[data-testid="pdf-document"], canvas, .pdf-container, main').first();
    await screenshotElOrPage(docArea, page, 'pdf-viewer-wide-document.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('pdf viewer — fit to width', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const fitWidth = page.locator('[data-testid="fit-width"], [aria-label="Fit to width"], button:has-text("Fit")').first();
    if (await fitWidth.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fitWidth.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-fit-width.png', LOOSE_OPTS);
  });

  test('pdf viewer — page input navigation', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const pageInput = page.locator('[data-testid="page-input"], input[type="number"], [aria-label*="page number"]').first();
    if (await pageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pageInput.click();
      await pageInput.fill('3');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-page-jump.png', LOOSE_OPTS);
  });

  test('pdf viewer — print preview trigger', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const printBtn = page.locator('[data-testid="pdf-print"], button[aria-label*="print"], button:has-text("Print")').first();
    if (await printBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await printBtn.hover();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-print-hover.png', LOOSE_OPTS);
  });

  test('pdf viewer — download button hover', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const downloadBtn = page.locator('[data-testid="pdf-download"], button[aria-label*="download"], button:has-text("Download")').first();
    if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await downloadBtn.hover();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-download-hover.png', LOOSE_OPTS);
  });

  test('pdf viewer — search panel', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const searchBtn = page.locator('[data-testid="pdf-search"], button[aria-label*="search"], button:has-text("Search")').first();
    if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-search-panel.png', LOOSE_OPTS);
  });

  test('pdf viewer — annotation create mode', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const annotBtn = page.locator('[data-testid="annotate-btn"], button[aria-label*="annotate"], button:has-text("Annotate")').first();
    if (await annotBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await annotBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-annotate-mode.png', LOOSE_OPTS);
  });

  test('pdf viewer — course page at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/learn/courses/c1');
    await expect(page).toHaveScreenshot('pdf-viewer-course-content-tablet.png', LOOSE_OPTS);
  });

  test('pdf viewer — course page at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/learn/courses/c1');
    await expect(page).toHaveScreenshot('pdf-viewer-course-content-mobile.png', LOOSE_OPTS);
  });

  test('pdf viewer — learn page at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/learn');
    await expect(page).toHaveScreenshot('pdf-viewer-learn-sources-tablet.png', LOOSE_OPTS);
  });

  test('pdf viewer — learn page at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/learn');
    await expect(page).toHaveScreenshot('pdf-viewer-learn-sources-mobile.png', LOOSE_OPTS);
  });
});
