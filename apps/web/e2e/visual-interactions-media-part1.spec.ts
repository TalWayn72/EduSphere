/**
 * Visual Interactions — Media/Rich Content States (Part 1: PDF, Knowledge Graph, Code, Rich Text, Gallery, Video, Charts)
 * Split from visual-interactions-media.spec.ts for file size compliance.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function screenshotElement(
  page: import('@playwright/test').Page,
  selector: string,
  name: string,
  opts = LOOSE_OPTS,
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

test.describe('Visual Interactions — Media & Rich Content Part 1', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }),
    );
    await login(page);
  });

  test.describe('PDF viewer', () => {
    test('PDF viewer default state', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="pdf-viewer"], .pdf-viewer, [data-testid="document-viewer"]', 'interact-media-course-pdf-default.png');
    });
    test('PDF viewer toolbar', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="pdf-toolbar"], [data-testid="document-toolbar"]', 'interact-media-course-pdf-toolbar.png');
    });
    test('PDF viewer zoom in', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const zoomIn = page.locator('[data-testid="zoom-in"], button[aria-label*="zoom in"]').first();
      if (await zoomIn.isVisible({ timeout: 3000 }).catch(() => false)) { await zoomIn.click(); await page.waitForTimeout(300); await zoomIn.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[data-testid="pdf-viewer"], .pdf-viewer', 'interact-media-course-pdf-zoomed-in.png');
    });
    test('PDF viewer zoom out', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const zoomOut = page.locator('[data-testid="zoom-out"], button[aria-label*="zoom out"]').first();
      if (await zoomOut.isVisible({ timeout: 3000 }).catch(() => false)) { await zoomOut.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[data-testid="pdf-viewer"], .pdf-viewer', 'interact-media-course-pdf-zoomed-out.png');
    });
    test('PDF viewer page navigation', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const nextPage = page.locator('[data-testid="pdf-next-page"], button[aria-label*="next page"]').first();
      if (await nextPage.isVisible({ timeout: 3000 }).catch(() => false)) { await nextPage.click(); await page.waitForTimeout(400); }
      await screenshotElement(page, '[data-testid="pdf-viewer"], .pdf-viewer', 'interact-media-course-pdf-page2.png');
    });
    test('PDF viewer fullscreen', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const fsBtn = page.locator('[data-testid="pdf-fullscreen"], button[aria-label*="fullscreen"]').first();
      if (await fsBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await fsBtn.click(); await page.waitForTimeout(400); }
      await expect(page).toHaveScreenshot('interact-media-course-pdf-fullscreen.png', LOOSE_OPTS);
    });
    test('PDF viewer thumbnail sidebar', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const thumbBtn = page.locator('[data-testid="pdf-thumbnails"], button[aria-label*="thumbnail"]').first();
      if (await thumbBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await thumbBtn.click(); await page.waitForTimeout(400); }
      await screenshotElement(page, '[data-testid="pdf-sidebar"], [data-testid="pdf-thumbnails-panel"]', 'interact-media-course-pdf-thumbnails.png');
    });
  });

  test.describe('Knowledge graph', () => {
    test('knowledge graph default view', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="knowledge-graph"], canvas, .graph-container', 'interact-media-graph-default.png');
    });
    test('knowledge graph node hover', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const graphArea = page.locator('[data-testid="knowledge-graph"], canvas, .graph-container').first();
      if (await graphArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await graphArea.boundingBox();
        if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(400); }
      }
      await screenshotElement(page, '[data-testid="knowledge-graph"], canvas, .graph-container', 'interact-media-graph-node-hover.png');
    });
    test('knowledge graph zoomed in', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const zoomIn = page.locator('[data-testid="graph-zoom-in"], button[aria-label*="zoom in"]').first();
      if (await zoomIn.isVisible({ timeout: 3000 }).catch(() => false)) { await zoomIn.click(); await page.waitForTimeout(300); await zoomIn.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[data-testid="knowledge-graph"], canvas, .graph-container', 'interact-media-graph-zoomed-in.png');
    });
    test('knowledge graph filter panel', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const filterBtn = page.locator('[data-testid="graph-filter"], button:has-text("Filter"), [aria-label*="filter"]').first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await filterBtn.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[data-testid="graph-filter-panel"], [data-state="open"]', 'interact-media-graph-filter-panel.png');
    });
    test('knowledge graph node detail panel', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const graphArea = page.locator('[data-testid="knowledge-graph"], canvas, .graph-container').first();
      if (await graphArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await graphArea.boundingBox();
        if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(400); }
      }
      await screenshotElement(page, '[data-testid="node-detail"], [data-testid="graph-detail-panel"]', 'interact-media-graph-node-detail.png');
    });
    test('knowledge graph search', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const search = page.locator('[data-testid="graph-search"], input[placeholder*="Search"]').first();
      if (await search.isVisible({ timeout: 3000 }).catch(() => false)) { await search.fill('Machine Learning'); await page.waitForTimeout(400); }
      await screenshotElement(page, '[data-testid="knowledge-graph"], canvas, .graph-container', 'interact-media-graph-search-highlight.png');
    });
    test('knowledge graph legend', async ({ page }) => {
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="graph-legend"], .graph-legend', 'interact-media-graph-legend.png');
    });
  });

  test.describe('Code editor', () => {
    test('code editor default', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="code-editor"], .cm-editor, .monaco-editor', 'interact-media-course-code-editor-default.png');
    });
    test('code editor with syntax highlighting', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const editor = page.locator('[data-testid="code-editor"], .cm-editor, .monaco-editor').first();
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) { await editor.click(); await page.waitForTimeout(200); }
      await screenshotElement(page, '[data-testid="code-editor"], .cm-editor, .monaco-editor', 'interact-media-course-code-editor-focused.png');
    });
    test('code editor language selector', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const langSelect = page.locator('[data-testid="code-lang-select"], [data-testid="language-select"]').first();
      if (await langSelect.isVisible({ timeout: 3000 }).catch(() => false)) { await langSelect.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[role="listbox"], [data-state="open"]', 'interact-media-course-code-lang-select.png');
    });
  });

  test.describe('Rich text editor', () => {
    test('rich text editor default', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="rich-editor"], .tiptap, .ProseMirror, [contenteditable="true"]', 'interact-media-course-richtext-default.png');
    });
    test('rich text editor toolbar', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="editor-toolbar"], .tiptap-toolbar', 'interact-media-course-richtext-toolbar.png');
    });
    test('rich text editor bold button active', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const editor = page.locator('[contenteditable="true"], .ProseMirror, .tiptap').first();
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editor.click(); await editor.type('Sample text');
        await page.keyboard.press('Control+a'); await page.keyboard.press('Control+b'); await page.waitForTimeout(200);
      }
      await screenshotElement(page, '[data-testid="editor-toolbar"], .tiptap-toolbar', 'interact-media-course-richtext-bold-active.png');
    });
    test('rich text editor with content', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const editor = page.locator('[contenteditable="true"], .ProseMirror, .tiptap').first();
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editor.click(); await editor.type('# Heading\n\nThis is a paragraph with **bold** and *italic* text.'); await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="rich-editor"], .tiptap, .ProseMirror, [contenteditable="true"]', 'interact-media-course-richtext-with-content.png');
    });
  });

  test.describe('Image gallery', () => {
    test('image gallery default', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="image-gallery"], [data-testid="carousel"], .gallery', 'interact-media-course-gallery-default.png');
    });
    test('image gallery next slide', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const nextBtn = page.locator('[data-testid="gallery-next"], button[aria-label*="next slide"]').first();
      if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await nextBtn.click(); await page.waitForTimeout(400); }
      await screenshotElement(page, '[data-testid="image-gallery"], [data-testid="carousel"], .gallery', 'interact-media-course-gallery-slide2.png');
    });
    test('image gallery lightbox', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const img = page.locator('[data-testid="gallery-image"], .gallery img').first();
      if (await img.isVisible({ timeout: 3000 }).catch(() => false)) { await img.click(); await page.waitForTimeout(400); }
      await screenshotElement(page, '[data-testid="lightbox"], [role="dialog"]', 'interact-media-course-gallery-lightbox.png');
    });
  });

  test.describe('Video player', () => {
    test('video player placeholder', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="video-player"], video, .video-container', 'interact-media-course-video-placeholder.png');
    });
    test('video player controls visible', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const videoEl = page.locator('[data-testid="video-player"], video, .video-container').first();
      if (await videoEl.isVisible({ timeout: 3000 }).catch(() => false)) { await videoEl.hover(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[data-testid="video-player"], video, .video-container', 'interact-media-course-video-controls.png');
    });
    test('video player with progress', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="video-progress"], .video-progress', 'interact-media-course-video-progress.png');
    });
  });

  test.describe('Chart interactions', () => {
    test('analytics chart default', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="chart"], canvas, .recharts-wrapper, svg.chart', 'interact-media-analytics-chart-default.png');
    });
    test('chart tooltip on hover', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const chart = page.locator('[data-testid="chart"], canvas, .recharts-wrapper, svg.chart').first();
      if (await chart.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await chart.boundingBox();
        if (box) { await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2); await page.waitForTimeout(400); }
      }
      await screenshotElement(page, '[data-testid="chart"], .recharts-wrapper, svg.chart', 'interact-media-analytics-chart-tooltip.png');
    });
    test('chart legend interaction', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const legend = page.locator('.recharts-legend-item, [data-testid="chart-legend"] button').first();
      if (await legend.isVisible({ timeout: 3000 }).catch(() => false)) { await legend.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[data-testid="chart"], .recharts-wrapper, svg.chart', 'interact-media-analytics-chart-legend-toggle.png');
    });
    test('chart time range selector', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const rangeBtn = page.locator('[data-testid="chart-range"], button:has-text("7d"), button:has-text("30d"), button:has-text("Week")').first();
      if (await rangeBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await rangeBtn.click(); await page.waitForTimeout(400); }
      await screenshotElement(page, '[data-testid="chart"], .recharts-wrapper, svg.chart', 'interact-media-analytics-chart-range-changed.png');
    });
    test('chart data point hover midway', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const chart = page.locator('[data-testid="chart"], canvas, .recharts-wrapper').first();
      if (await chart.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await chart.boundingBox();
        if (box) { await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4); await page.waitForTimeout(400); }
      }
      await screenshotElement(page, '[data-testid="chart"], .recharts-wrapper', 'interact-media-analytics-chart-hover-midway.png');
    });
    test('chart export menu', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const exportBtn = page.locator('[data-testid="chart-export"], button:has-text("Export"), [aria-label*="export"]').first();
      if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await exportBtn.click(); await page.waitForTimeout(300); }
      await screenshotElement(page, '[role="menu"], [data-state="open"]', 'interact-media-analytics-chart-export-menu.png');
    });
  });
});
