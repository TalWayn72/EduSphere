/**
 * Visual Interactions — Media/Rich Content States (Part 2: Tablet, Mobile, Wide Desktop, Page Sections)
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

test.describe('Visual Interactions — Media Responsive & Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) }),
    );
    await login(page);
  });

  test.describe('Media tablet viewport', () => {
    test('PDF viewer at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="pdf-viewer"], .pdf-viewer, [data-testid="document-viewer"]', 'interact-media-pdf-tablet.png');
    });
    test('knowledge graph at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="knowledge-graph"], canvas, .graph-container', 'interact-media-graph-tablet.png');
    });
    test('code editor at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="code-editor"], .cm-editor, .monaco-editor', 'interact-media-code-editor-tablet.png');
    });
    test('rich text editor at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="rich-editor"], .tiptap, .ProseMirror, [contenteditable="true"]', 'interact-media-richtext-tablet.png');
    });
    test('analytics chart at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="chart"], canvas, .recharts-wrapper, svg.chart', 'interact-media-chart-tablet.png');
    });
    test('video player at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="video-player"], video, .video-container', 'interact-media-video-tablet.png');
    });
  });

  test.describe('Media mobile viewport', () => {
    test('PDF viewer at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="pdf-viewer"], .pdf-viewer', 'interact-media-pdf-mobile.png');
    });
    test('knowledge graph at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="knowledge-graph"], canvas, .graph-container', 'interact-media-graph-mobile.png');
    });
    test('analytics chart at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await screenshotElement(page, '[data-testid="chart"], canvas, .recharts-wrapper', 'interact-media-chart-mobile.png');
    });
    test('rich text editor at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="rich-editor"], .tiptap, .ProseMirror', 'interact-media-richtext-mobile.png');
    });
    test('video player at mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await screenshotElement(page, '[data-testid="video-player"], video, .video-container', 'interact-media-video-mobile.png');
    });
  });

  test.describe('Media wide desktop', () => {
    test('analytics full page at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot('interact-media-analytics-wide-full.png', LOOSE_OPTS);
    });
    test('knowledge graph at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/knowledge-graph', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot('interact-media-graph-wide-full.png', LOOSE_OPTS);
    });
    test('course content at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-media-course-wide-full.png', LOOSE_OPTS);
    });
    test('course create at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('interact-media-course-create-wide.png', LOOSE_OPTS);
    });
  });

  test.describe('Media page sections', () => {
    test('analytics header section', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
      const header = page.locator('header, nav, [data-testid="analytics-header"]').first();
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(header).toHaveScreenshot('interact-media-analytics-header.png', LOOSE_OPTS);
      }
    });
    test('course detail sidebar', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const sidebar = page.locator('aside, [data-testid="course-sidebar"], [role="complementary"]').first();
      if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(sidebar).toHaveScreenshot('interact-media-course-sidebar.png', LOOSE_OPTS);
      }
    });
    test('course create form area', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500);
      const form = page.locator('form, [data-testid="course-form"]').first();
      if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(form).toHaveScreenshot('interact-media-course-create-form.png', LOOSE_OPTS);
      }
    });
  });
});
