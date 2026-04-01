/**
 * Visual Regression Tests — Knowledge Graph States (Part 1: Default, Zoom, Filters, Interactions)
 * Split from visual-knowledge-graph-states.spec.ts for file size compliance.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';

async function screenshotElOrPage(
  el: Locator,
  page: Page,
  name: string,
  opts: object
): Promise<void> {
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
  {
    id: 'n1',
    label: 'Machine Learning',
    type: 'Concept',
    x: 200,
    y: 150,
    cluster: 'AI',
    weight: 10,
  },
  {
    id: 'n2',
    label: 'Neural Networks',
    type: 'Concept',
    x: 350,
    y: 100,
    cluster: 'AI',
    weight: 8,
  },
  {
    id: 'n3',
    label: 'Deep Learning',
    type: 'Concept',
    x: 500,
    y: 180,
    cluster: 'AI',
    weight: 9,
  },
  {
    id: 'n4',
    label: 'Alan Turing',
    type: 'Person',
    x: 100,
    y: 300,
    cluster: 'History',
    weight: 7,
  },
  {
    id: 'n5',
    label: 'Backpropagation',
    type: 'Term',
    x: 400,
    y: 300,
    cluster: 'AI',
    weight: 6,
  },
  {
    id: 'n6',
    label: 'Gradient Descent',
    type: 'Term',
    x: 550,
    y: 320,
    cluster: 'Optimization',
    weight: 5,
  },
  {
    id: 'n7',
    label: 'Textbook of ML',
    type: 'Source',
    x: 250,
    y: 400,
    cluster: 'References',
    weight: 4,
  },
  {
    id: 'n8',
    label: 'Computer Vision',
    type: 'TopicCluster',
    x: 650,
    y: 200,
    cluster: 'AI',
    weight: 7,
  },
  {
    id: 'n9',
    label: 'Natural Language Processing',
    type: 'TopicCluster',
    x: 150,
    y: 450,
    cluster: 'AI',
    weight: 8,
  },
  {
    id: 'n10',
    label: 'Reinforcement Learning',
    type: 'Concept',
    x: 450,
    y: 450,
    cluster: 'AI',
    weight: 6,
  },
  {
    id: 'n11',
    label: 'Markov Decision Process',
    type: 'Term',
    x: 600,
    y: 450,
    cluster: 'Math',
    weight: 4,
  },
  {
    id: 'n12',
    label: 'Geoffrey Hinton',
    type: 'Person',
    x: 300,
    y: 50,
    cluster: 'History',
    weight: 7,
  },
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

const TOPIC_CLUSTERS = [
  { id: 'tc1', name: 'AI', nodeCount: 8, color: '#4F46E5' },
  { id: 'tc2', name: 'History', nodeCount: 2, color: '#059669' },
  { id: 'tc3', name: 'Optimization', nodeCount: 1, color: '#D97706' },
  { id: 'tc4', name: 'Math', nodeCount: 1, color: '#DC2626' },
  { id: 'tc5', name: 'References', nodeCount: 1, color: '#7C3AED' },
];

async function mockKnowledgeGraph(page: Page): Promise<void> {
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
    const body = req.postDataJSON() as {
      operationName?: string;
      query?: string;
    } | null;
    const op = body?.operationName ?? '';
    const query = body?.query ?? '';
    if (op.includes('KnowledgeGraph') || query.includes('knowledgeGraph')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { knowledgeGraph: { nodes: GRAPH_NODES, edges: GRAPH_EDGES } },
        }),
      });
      return;
    }
    if (op.includes('TopicCluster') || query.includes('topicCluster')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { topicClusters: TOPIC_CLUSTERS } }),
      });
      return;
    }
    if (op.includes('PersonalGraph') || query.includes('personalGraph')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            personalGraph: {
              nodes: GRAPH_NODES.slice(0, 5),
              edges: GRAPH_EDGES.slice(0, 3),
              masteryScores: [
                { nodeId: 'n1', score: 0.85 },
                { nodeId: 'n2', score: 0.72 },
                { nodeId: 'n3', score: 0.45 },
                { nodeId: 'n4', score: 0.9 },
                { nodeId: 'n5', score: 0.6 },
              ],
            },
          },
        }),
      });
      return;
    }
    if (op.includes('SearchGraph') || query.includes('searchGraph')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            searchGraph: { results: GRAPH_NODES.slice(0, 4), totalCount: 4 },
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
  await page.waitForTimeout(3000);
}

test.describe('Visual Regression — Knowledge Graph States Part 1 @visual-kg', () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page }) => {
    await login(page);
    await mockKnowledgeGraph(page);
  });

  test('knowledge graph — default full view', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    await expect(page).toHaveScreenshot('kg-default-full.png', LOOSE_OPTS);
  });

  test('knowledge graph — graph canvas area', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const canvas = page
      .locator(
        '[data-testid="graph-canvas"], canvas, svg, .graph-container, main'
      )
      .first();
    await screenshotElOrPage(canvas, page, 'kg-canvas-area.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  test('knowledge graph — legend / node type indicators', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const legend = page
      .locator('[data-testid="graph-legend"], .legend, [role="list"]')
      .first();
    await screenshotElOrPage(legend, page, 'kg-legend.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  test('knowledge graph — zoomed in via controls', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const zoomIn = page
      .locator(
        '[data-testid="zoom-in"], [aria-label="Zoom in"], button:has-text("+")'
      )
      .first();
    if (await zoomIn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zoomIn.click();
      await page.waitForTimeout(500);
      await zoomIn.click();
      await page.waitForTimeout(500);
      await zoomIn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('kg-zoomed-in.png', LOOSE_OPTS);
  });

  test('knowledge graph — zoomed out via controls', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const zoomOut = page
      .locator(
        '[data-testid="zoom-out"], [aria-label="Zoom out"], button:has-text("-")'
      )
      .first();
    if (await zoomOut.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zoomOut.click();
      await page.waitForTimeout(500);
      await zoomOut.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('kg-zoomed-out.png', LOOSE_OPTS);
  });

  test('knowledge graph — filtered by AI cluster', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const filterBtn = page
      .locator(
        '[data-testid="filter-cluster"], [data-testid="cluster-AI"], button:has-text("AI"), .cluster-filter'
      )
      .first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(1500);
    }
    await expect(page).toHaveScreenshot(
      'kg-filtered-ai-cluster.png',
      LOOSE_OPTS
    );
  });

  test('knowledge graph — filtered by node type Concept', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const typeFilter = page
      .locator(
        '[data-testid="filter-type-concept"], [data-testid="type-filter"] >> text=Concept, button:has-text("Concept")'
      )
      .first();
    if (await typeFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(1500);
    }
    await expect(page).toHaveScreenshot(
      'kg-filtered-concept-type.png',
      LOOSE_OPTS
    );
  });

  test('knowledge graph — filtered by Person type', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const typeFilter = page
      .locator(
        '[data-testid="filter-type-person"], button:has-text("Person"), .type-filter:has-text("Person")'
      )
      .first();
    if (await typeFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeFilter.click();
      await page.waitForTimeout(1500);
    }
    await expect(page).toHaveScreenshot(
      'kg-filtered-person-type.png',
      LOOSE_OPTS
    );
  });

  test('knowledge graph — node hover state', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const node = page
      .locator(
        '[data-testid="graph-node"], .graph-node, circle, [data-node-id]'
      )
      .first();
    if (await node.isVisible({ timeout: 3000 }).catch(() => false)) {
      await node.hover();
      await page.waitForTimeout(800);
    }
    await expect(page).toHaveScreenshot('kg-node-hover.png', LOOSE_OPTS);
  });

  test('knowledge graph — node selected / detail panel', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const node = page
      .locator(
        '[data-testid="graph-node"], .graph-node, circle, [data-node-id]'
      )
      .first();
    if (await node.isVisible({ timeout: 3000 }).catch(() => false)) {
      await node.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).toHaveScreenshot('kg-node-selected.png', LOOSE_OPTS);
  });

  test('knowledge graph — node detail sidebar', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const node = page
      .locator(
        '[data-testid="graph-node"], .graph-node, circle, [data-node-id]'
      )
      .first();
    if (await node.isVisible({ timeout: 3000 }).catch(() => false)) {
      await node.click();
      await page.waitForTimeout(1000);
    }
    const sidebar = page
      .locator(
        '[data-testid="node-detail"], [data-testid="graph-sidebar"], aside, [role="complementary"]'
      )
      .first();
    await screenshotElOrPage(sidebar, page, 'kg-node-detail-sidebar.png', {
      ...LOOSE_OPTS,
      fullPage: false,
    });
  });

  test('knowledge graph — personal graph view', async ({ page }) => {
    await goTo(page, '/knowledge-graph/personal');
    await expect(page).toHaveScreenshot('kg-personal-graph.png', LOOSE_OPTS);
  });

  test('knowledge graph — personal mastery scores overlay', async ({
    page,
  }) => {
    await goTo(page, '/knowledge-graph/personal');
    const mastery = page
      .locator(
        '[data-testid="mastery-overlay"], [data-testid="mastery-scores"], .mastery-indicator'
      )
      .first();
    if (await mastery.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(mastery).toHaveScreenshot('kg-personal-mastery.png', {
        ...LOOSE_OPTS,
        fullPage: false,
      });
    } else {
      await expect(page).toHaveScreenshot(
        'kg-personal-mastery.png',
        LOOSE_OPTS
      );
    }
  });

  test('knowledge graph — search panel open', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const searchToggle = page
      .locator(
        '[data-testid="graph-search"], [aria-label*="Search"], input[type="search"], [placeholder*="Search"]'
      )
      .first();
    if (await searchToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchToggle.click();
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot('kg-search-panel-open.png', LOOSE_OPTS);
  });

  test('knowledge graph — search with results', async ({ page }) => {
    await goTo(page, '/knowledge-graph');
    const searchInput = page
      .locator(
        'input[type="search"], [data-testid="graph-search-input"], [placeholder*="Search"]'
      )
      .first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Machine Learning');
      await page.waitForTimeout(1500);
    }
    await expect(page).toHaveScreenshot('kg-search-results.png', LOOSE_OPTS);
  });
});
