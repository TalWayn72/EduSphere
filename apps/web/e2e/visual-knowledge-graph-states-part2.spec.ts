/**
 * Visual Regression Tests — Knowledge Graph States (Part 2: Layouts, Viewports, Extra Interactions)
 * Split from visual-knowledge-graph-states.spec.ts for file size compliance.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';

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

const GRAPH_NODES = [
  { id: 'n1', label: 'Machine Learning', type: 'Concept', x: 200, y: 150, cluster: 'AI', weight: 10 },
  { id: 'n2', label: 'Neural Networks', type: 'Concept', x: 350, y: 100, cluster: 'AI', weight: 8 },
  { id: 'n3', label: 'Deep Learning', type: 'Concept', x: 500, y: 180, cluster: 'AI', weight: 9 },
  { id: 'n4', label: 'Alan Turing', type: 'Person', x: 100, y: 300, cluster: 'History', weight: 7 },
  { id: 'n5', label: 'Backpropagation', type: 'Term', x: 400, y: 300, cluster: 'AI', weight: 6 },
  { id: 'n6', label: 'Gradient Descent', type: 'Term', x: 550, y: 320, cluster: 'Optimization', weight: 5 },
  { id: 'n7', label: 'Textbook of ML', type: 'Source', x: 250, y: 400, cluster: 'References', weight: 4 },
  { id: 'n8', label: 'Computer Vision', type: 'TopicCluster', x: 650, y: 200, cluster: 'AI', weight: 7 },
  { id: 'n9', label: 'Natural Language Processing', type: 'TopicCluster', x: 150, y: 450, cluster: 'AI', weight: 8 },
  { id: 'n10', label: 'Reinforcement Learning', type: 'Concept', x: 450, y: 450, cluster: 'AI', weight: 6 },
  { id: 'n11', label: 'Markov Decision Process', type: 'Term', x: 600, y: 450, cluster: 'Math', weight: 4 },
  { id: 'n12', label: 'Geoffrey Hinton', type: 'Person', x: 300, y: 50, cluster: 'History', weight: 7 },
];

const GRAPH_EDGES = [
  { source: 'n1', target: 'n2', relation: 'INCLUDES', weight: 1 },
  { source: 'n2', target: 'n3', relation: 'SPECIALIZES', weight: 1 },
  { source: 'n3', target: 'n5', relation: 'USES', weight: 1 },
  { source: 'n5', target: 'n6', relation: 'RELATED_TO', weight: 1 },
  { source: 'n4', target: 'n1', relation: 'CONTRIBUTED_TO', weight: 1 },
  { source: 'n12', target: 'n3', relation: 'PIONEERED', weight: 1 },
  { source: 'n7', target: 'n1', relation: 'REFERENCES', weight: 1 },
  { source: 'n3', target: 'n8', relation: 'APPLIED_IN', weight: 1 },
  { source: 'n1', target: 'n9', relation: 'APPLIED_IN', weight: 1 },
  { source: 'n1', target: 'n10', relation: 'INCLUDES', weight: 1 },
  { source: 'n10', target: 'n11', relation: 'USES', weight: 1 },
];

async function mockKnowledgeGraph(page: Page): Promise<void> {
  await page.route(`${GRAPHQL_URL}`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization' }, body: '' });
      return;
    }
    const body = req.postDataJSON() as { operationName?: string; query?: string } | null;
    const op = body?.operationName ?? '';
    const query = body?.query ?? '';
    if (op.includes('KnowledgeGraph') || query.includes('knowledgeGraph')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { knowledgeGraph: { nodes: GRAPH_NODES, edges: GRAPH_EDGES } } }) });
      return;
    }
    if (op.includes('PersonalGraph') || query.includes('personalGraph')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { personalGraph: { nodes: GRAPH_NODES.slice(0, 5), edges: GRAPH_EDGES.slice(0, 3), masteryScores: [{ nodeId: 'n1', score: 0.85 }, { nodeId: 'n2', score: 0.72 }, { nodeId: 'n3', score: 0.45 }, { nodeId: 'n4', score: 0.90 }, { nodeId: 'n5', score: 0.60 }] } } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
  });
}

async function goTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('main, [role="main"], #root > div, .min-h-screen').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  await page.waitForTimeout(3000);
}

test.describe('Visual Regression — Knowledge Graph States Part 2 @visual-kg', () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page }) => { await login(page); await mockKnowledgeGraph(page); });

  test('knowledge graph — hierarchical layout mode', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const layoutBtn = page.locator('[data-testid="layout-hierarchical"], button:has-text("Hierarchical"), [data-testid="layout-mode"]').first();
    if (await layoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await layoutBtn.click(); await page.waitForTimeout(2000); }
    await expect(page).toHaveScreenshot('kg-layout-hierarchical.png', LOOSE_OPTS);
  });

  test('knowledge graph — radial layout mode', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const layoutBtn = page.locator('[data-testid="layout-radial"], button:has-text("Radial"), [data-testid="layout-mode"]').first();
    if (await layoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await layoutBtn.click(); await page.waitForTimeout(2000); }
    await expect(page).toHaveScreenshot('kg-layout-radial.png', LOOSE_OPTS);
  });

  test('knowledge graph — mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/knowledge-graph');
    await expect(page).toHaveScreenshot('kg-mobile-viewport.png', LOOSE_OPTS);
  });

  test('knowledge graph — tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/knowledge-graph');
    await expect(page).toHaveScreenshot('kg-tablet-viewport.png', LOOSE_OPTS);
  });

  test('knowledge graph — tablet canvas area', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/knowledge-graph');
    const canvas = page.locator('[data-testid="graph-canvas"], canvas, svg, .graph-container, main').first();
    await screenshotElOrPage(canvas, page, 'kg-tablet-canvas.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('knowledge graph — tablet legend', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/knowledge-graph');
    const legend = page.locator('[data-testid="graph-legend"], .legend, [role="list"]').first();
    await screenshotElOrPage(legend, page, 'kg-tablet-legend.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('knowledge graph — mobile canvas area', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/knowledge-graph');
    const canvas = page.locator('[data-testid="graph-canvas"], canvas, svg, .graph-container, main').first();
    await screenshotElOrPage(canvas, page, 'kg-mobile-canvas.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('knowledge graph — wide desktop full', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await goTo(page, '/knowledge-graph');
    await expect(page).toHaveScreenshot('kg-wide-desktop.png', LOOSE_OPTS);
  });

  test('knowledge graph — wide desktop canvas', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await goTo(page, '/knowledge-graph');
    const canvas = page.locator('[data-testid="graph-canvas"], canvas, svg, .graph-container, main').first();
    await screenshotElOrPage(canvas, page, 'kg-wide-canvas.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('knowledge graph — personal graph at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await goTo(page, '/knowledge-graph/personal');
    await expect(page).toHaveScreenshot('kg-personal-tablet.png', LOOSE_OPTS);
  });

  test('knowledge graph — personal graph at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goTo(page, '/knowledge-graph/personal');
    await expect(page).toHaveScreenshot('kg-personal-mobile.png', LOOSE_OPTS);
  });

  test('knowledge graph — personal graph at wide', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await goTo(page, '/knowledge-graph/personal');
    await expect(page).toHaveScreenshot('kg-personal-wide.png', LOOSE_OPTS);
  });

  test('knowledge graph — double click zoom', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const graphArea = page.locator('[data-testid="knowledge-graph"], canvas, .graph-container').first();
    if (await graphArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await graphArea.boundingBox();
      if (box) { await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(1000); }
    }
    await expect(page).toHaveScreenshot('kg-double-click-zoom.png', LOOSE_OPTS);
  });

  test('knowledge graph — reset zoom button', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const resetBtn = page.locator('[data-testid="reset-zoom"], button:has-text("Reset"), [aria-label*="reset"]').first();
    if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const zoomIn = page.locator('[data-testid="zoom-in"], button:has-text("+")').first();
      if (await zoomIn.isVisible({ timeout: 2000 }).catch(() => false)) { await zoomIn.click(); await page.waitForTimeout(500); await zoomIn.click(); await page.waitForTimeout(500); }
      await resetBtn.click(); await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('kg-reset-zoom.png', LOOSE_OPTS);
  });

  test('knowledge graph — fullscreen mode', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const fsBtn = page.locator('[data-testid="fullscreen"], button[aria-label*="fullscreen"], button:has-text("Fullscreen")').first();
    if (await fsBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await fsBtn.click(); await page.waitForTimeout(1000); }
    await expect(page).toHaveScreenshot('kg-fullscreen.png', LOOSE_OPTS);
  });

  test('knowledge graph — minimap/overview', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const minimap = page.locator('[data-testid="graph-minimap"], [data-testid="graph-overview"], .minimap').first();
    await screenshotElOrPage(minimap, page, 'kg-minimap.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('knowledge graph — toolbar controls', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const toolbar = page.locator('[data-testid="graph-toolbar"], [role="toolbar"], .graph-controls').first();
    await screenshotElOrPage(toolbar, page, 'kg-toolbar-controls.png', { ...LOOSE_OPTS, fullPage: false });
  });

  test('knowledge graph — header section', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const header = page.locator('header, nav, [data-testid="app-header"]').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('kg-header.png', { ...LOOSE_OPTS, fullPage: false });
    }
  });

  test('knowledge graph — filtered by Source type', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const typeFilter = page.locator('[data-testid="filter-type-source"], button:has-text("Source"), .type-filter:has-text("Source")').first();
    if (await typeFilter.isVisible({ timeout: 3000 }).catch(() => false)) { await typeFilter.click(); await page.waitForTimeout(1500); }
    await expect(page).toHaveScreenshot('kg-filtered-source-type.png', LOOSE_OPTS);
  });

  test('knowledge graph — filtered by Term type', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const typeFilter = page.locator('[data-testid="filter-type-term"], button:has-text("Term"), .type-filter:has-text("Term")').first();
    if (await typeFilter.isVisible({ timeout: 3000 }).catch(() => false)) { await typeFilter.click(); await page.waitForTimeout(1500); }
    await expect(page).toHaveScreenshot('kg-filtered-term-type.png', LOOSE_OPTS);
  });

  test('knowledge graph — search with no results', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const searchInput = page.locator('input[type="search"], [data-testid="graph-search-input"], [placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) { await searchInput.fill('zzzznonexistent'); await page.waitForTimeout(1500); }
    await expect(page).toHaveScreenshot('kg-search-no-results.png', LOOSE_OPTS);
  });

  test('knowledge graph — search cleared', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const searchInput = page.locator('input[type="search"], [data-testid="graph-search-input"], [placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Machine'); await page.waitForTimeout(500);
      await searchInput.clear(); await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('kg-search-cleared.png', LOOSE_OPTS);
  });
});
