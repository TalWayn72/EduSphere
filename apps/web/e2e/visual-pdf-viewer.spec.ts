/**
 * Visual Regression Tests — PDF Viewer States
 *
 * Covers PDF viewer at different states: initial load, zoom, pagination,
 * annotations overlay, and mobile viewport.
 * 15 visual assertions total.
 *
 * Snapshots stored in: apps/web/e2e/visual-pdf-viewer.spec.ts-snapshots/
 *
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test visual-pdf-viewer --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="@visual-pdf"
 */

import { test, expect, type Page } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';
import { GRAPHQL_URL } from './env';

test.use({ reducedMotion: 'reduce' });

// ── GraphQL mock for PDF content ────────────────────────────────────────────

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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  // Allow PDF rendering / canvas paint to stabilize
  await page.waitForTimeout(2000);
}

// ── Visual Regression Tests ─────────────────────────────────────────────────

test.describe('Visual Regression — PDF Viewer @visual-pdf', () => {
  test.setTimeout(45_000);

  test.beforeEach(async ({ page }) => {
    await mockPdfContent(page);
  });

  // ── Initial Load States ─────────────────────────────────────────────────

  test('pdf viewer — initial loaded state full page', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    await expect(page).toHaveScreenshot('pdf-viewer-initial-full.png', LOOSE_OPTS);
  });

  test('pdf viewer — toolbar controls', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const toolbar = page.locator('[role="toolbar"], [data-testid="pdf-toolbar"], .pdf-toolbar, header').first();
    await expect(toolbar).toHaveScreenshot('pdf-viewer-toolbar-controls.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  test('pdf viewer — document area', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const docArea = page.locator('[data-testid="pdf-document"], canvas, .pdf-container, main').first();
    await expect(docArea).toHaveScreenshot('pdf-viewer-document-area.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  // ── Zoom States ─────────────────────────────────────────────────────────

  test('pdf viewer — zoomed in state', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    // Attempt to click zoom-in button if available
    const zoomIn = page.locator('[data-testid="zoom-in"], [aria-label="Zoom in"], button:has-text("+")')
      .first();
    if (await zoomIn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zoomIn.click();
      await page.waitForTimeout(500);
      await zoomIn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-zoomed-in.png', LOOSE_OPTS);
  });

  test('pdf viewer — zoomed out state', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const zoomOut = page.locator('[data-testid="zoom-out"], [aria-label="Zoom out"], button:has-text("-")')
      .first();
    if (await zoomOut.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zoomOut.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-zoomed-out.png', LOOSE_OPTS);
  });

  // ── Pagination ──────────────────────────────────────────────────────────

  test('pdf viewer — page navigation controls', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const pagination = page.locator('[data-testid="pdf-pagination"], [data-testid="page-nav"], .page-controls, nav')
      .first();
    await expect(pagination).toHaveScreenshot('pdf-viewer-pagination-controls.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  test('pdf viewer — second page view', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const nextPage = page.locator('[data-testid="next-page"], [aria-label="Next page"], button:has-text("Next")')
      .first();
    if (await nextPage.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextPage.click();
      await page.waitForTimeout(1500);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-page-two.png', LOOSE_OPTS);
  });

  // ── Annotations Overlay ─────────────────────────────────────────────────

  test('pdf viewer — with annotations overlay', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    // Toggle annotations if there is a button
    const annotToggle = page.locator(
      '[data-testid="toggle-annotations"], [aria-label*="annotation"], button:has-text("Annotations")',
    ).first();
    if (await annotToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await annotToggle.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-annotations-overlay.png', LOOSE_OPTS);
  });

  test('pdf viewer — annotation highlight detail', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const highlight = page.locator('[data-testid="annotation-marker"], .annotation-highlight, .highlight-marker')
      .first();
    if (await highlight.isVisible({ timeout: 3000 }).catch(() => false)) {
      await highlight.hover();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot('pdf-viewer-annotation-detail.png', LOOSE_OPTS);
  });

  // ── Sidebar / Table of Contents ─────────────────────────────────────────

  test('pdf viewer — sidebar table of contents', async ({ page }) => {
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    const tocToggle = page.locator(
      '[data-testid="toggle-toc"], [aria-label*="Table of contents"], [aria-label*="Sidebar"]',
    ).first();
    if (await tocToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tocToggle.click();
      await page.waitForTimeout(500);
    }
    const sidebar = page.locator('[data-testid="pdf-sidebar"], aside, [role="complementary"]').first();
    await expect(sidebar).toHaveScreenshot('pdf-viewer-sidebar-toc.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  // ── Content / Course Context ────────────────────────────────────────────

  test('pdf viewer — course content page with PDF listing', async ({ page }) => {
    await goTo(page, '/learn/courses/c1');
    await expect(page).toHaveScreenshot('pdf-viewer-course-content.png', LOOSE_OPTS);
  });

  test('pdf viewer — learn page with sources', async ({ page }) => {
    await goTo(page, '/learn');
    await expect(page).toHaveScreenshot('pdf-viewer-learn-sources.png', LOOSE_OPTS);
  });

  // ── Mobile Viewport ─────────────────────────────────────────────────────

  test('pdf viewer — mobile viewport portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    await expect(page).toHaveScreenshot('pdf-viewer-mobile-portrait.png', LOOSE_OPTS);
  });

  test('pdf viewer — mobile viewport landscape', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    await expect(page).toHaveScreenshot('pdf-viewer-mobile-landscape.png', LOOSE_OPTS);
  });

  test('pdf viewer — tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/learn/courses/c1/lessons/lesson-pdf-1');
    await expect(page).toHaveScreenshot('pdf-viewer-tablet.png', LOOSE_OPTS);
  });
});
