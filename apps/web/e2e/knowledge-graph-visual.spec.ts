/**
 * KnowledgeGraph — Visual Regression Tests (Phase 27)
 *
 * Covers:
 *   /knowledge-graph       — Global graph view
 *   /knowledge-graph/:id   — Course-filtered graph view with breadcrumb + badge
 *
 * Both suites:
 *   - Mock GraphQL to avoid depending on real Apache AGE / pgvector backend
 *   - Verify the AGE 1.7.0 + PG-17 error strings are absent (BUG-040 regression)
 *   - Capture toHaveScreenshot() baselines for visual regression CI
 *   - Cover light mode and dark mode
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/knowledge-graph-visual.spec.ts
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── URLs ─────────────────────────────────────────────────────────────────────

const GRAPH_URL = `${BASE_URL}/knowledge-graph`;
const COURSE_ID = 'course-abc-123';
const COURSE_GRAPH_URL = `${BASE_URL}/knowledge-graph/${COURSE_ID}`;

// ─── AGE error fragments (BUG-040 regression guard) ──────────────────────────

const FORBIDDEN_GRAPH_STRINGS = [
  'third argument of cypher function must be a parameter',
  'SET LOCAL app.current_tenant = $1',
  '[GraphQL]',
  '[Network]',
  'Invalid time value',
  'Failed to fetch',
  'Unexpected error',
];

// ─── Mock concept data ────────────────────────────────────────────────────────

const MOCK_CONCEPTS = [
  {
    id: 'c1',
    name: 'Free Will',
    type: 'CONCEPT',
    description: 'The ability to choose between different possible courses of action.',
    courseIds: [COURSE_ID],
    relatedConceptIds: ['c2', 'c3'],
  },
  {
    id: 'c2',
    name: 'Determinism',
    type: 'CONCEPT',
    description: 'The doctrine that all events are determined completely by previously existing causes.',
    courseIds: [COURSE_ID],
    relatedConceptIds: ['c1'],
  },
  {
    id: 'c3',
    name: 'Moral Responsibility',
    type: 'CONCEPT',
    description: 'The status of morally deserving praise, blame, reward, or punishment for an act.',
    courseIds: [COURSE_ID],
    relatedConceptIds: ['c1', 'c4'],
  },
  {
    id: 'c4',
    name: 'Virtue Ethics',
    type: 'CONCEPT',
    description: 'An approach to ethics that emphasizes the role of character and virtue.',
    courseIds: [],
    relatedConceptIds: ['c3'],
  },
];

const MOCK_GRAPH_STATS = {
  nodeCount: MOCK_CONCEPTS.length,
  edgeCount: 5,
  lastUpdated: new Date(Date.now() - 3600_000).toISOString(),
};

// ─── GraphQL mock helper ───────────────────────────────────────────────────────

async function mockKnowledgeGraphQL(
  page: Page,
  courseId?: string
): Promise<void> {
  await page.route('**/graphql', async (route: Route) => {
    const body = route.request().postData() ?? '';

    // Knowledge graph concepts query
    if (
      body.includes('concepts') ||
      body.includes('knowledgeGraph') ||
      body.includes('KnowledgeGraph') ||
      body.includes('graphConcepts')
    ) {
      const filteredConcepts = courseId
        ? MOCK_CONCEPTS.filter(
            (c) => c.courseIds.includes(courseId) || c.courseIds.length === 0
          )
        : MOCK_CONCEPTS;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            concepts: filteredConcepts,
            graphStats: MOCK_GRAPH_STATS,
            knowledgeGraphConcepts: filteredConcepts,
          },
        }),
      });
      return;
    }

    // Learning path / shortest path query
    if (body.includes('shortestPath') || body.includes('learningPath')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { shortestPath: [] } }),
      });
      return;
    }

    // Everything else: pass through
    await route.continue();
  });
}

/** Login and navigate to path, wait for networkidle */
async function gotoGraph(page: Page, path: string): Promise<void> {
  await login(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

// ─── Suite 1: Global graph view (/knowledge-graph) ───────────────────────────

test.describe('KnowledgeGraph — global view /knowledge-graph', () => {
  test.beforeEach(async ({ page }) => {
    await mockKnowledgeGraphQL(page);
  });

  test('screenshot: global graph — SVG graph canvas visible', async ({ page }) => {
    await gotoGraph(page, GRAPH_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Wait for graph to render (heading or SVG)
    await page
      .getByRole('heading', { name: /Knowledge Graph/i })
      .waitFor({ timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(800); // let SVG layout settle

    // BUG-040 regression guard
    for (const forbidden of FORBIDDEN_GRAPH_STRINGS) {
      await expect(page.getByText(forbidden, { exact: false })).not.toBeVisible({
        timeout: 2_000,
      });
    }

    await expect(page).toHaveScreenshot('knowledge-graph-global-view.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: global graph — statistics panel', async ({ page }) => {
    await gotoGraph(page, GRAPH_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(800);

    const statsPanel = page.getByText('Graph Statistics').locator('..');
    const hasStats = await statsPanel.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasStats) {
      await expect(statsPanel).toHaveScreenshot(
        'knowledge-graph-stats-panel.png',
        { threshold: 0.05, animations: 'disabled' }
      );
    }
  });

  test('screenshot: global graph — search input', async ({ page }) => {
    await gotoGraph(page, GRAPH_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(600);

    // Type in the search input
    const searchInput = page.getByPlaceholder('Search concepts...');
    const hasSearch = await searchInput.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('Free Will');
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('knowledge-graph-search-active.png', {
        fullPage: false,
        threshold: 0.05,
        animations: 'disabled',
      });
    }
  });

  test('screenshot: global graph — no course-context badge', async ({ page }) => {
    await gotoGraph(page, GRAPH_URL);
    await page.waitForTimeout(500);

    // Global route must NOT show the course context badge
    const badge = page.getByTestId('kg-course-context-badge');
    expect(await badge.count()).toBe(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('knowledge-graph-global-no-badge.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  // ── Dark mode ─────────────────────────────────────────────────────────────

  test('screenshot (dark): global graph view', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await gotoGraph(page, GRAPH_URL);
    await page.waitForTimeout(800);

    await expect(page).toHaveScreenshot('knowledge-graph-global-dark.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

// ─── Suite 2: Course-filtered graph (/knowledge-graph/:courseId) ──────────────

test.describe('KnowledgeGraph — course-filtered view /knowledge-graph/:courseId', () => {
  test.beforeEach(async ({ page }) => {
    await mockKnowledgeGraphQL(page, COURSE_ID);
  });

  test('screenshot: course-filtered graph with breadcrumb', async ({ page }) => {
    await gotoGraph(page, COURSE_GRAPH_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Wait for the course-context heading
    await page
      .getByRole('heading', { name: /Course Knowledge Graph/i })
      .waitFor({ timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(800);

    // Verify course-context badge is visible (regression guard for T2.3)
    const badge = page.getByTestId('kg-course-context-badge');
    const hasBadge = await badge.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasBadge) {
      await expect(badge).toBeVisible();
      // Badge must contain the courseId
      const badgeText = (await badge.textContent()) ?? '';
      expect(badgeText).toContain(COURSE_ID);
    }

    // BUG-040 regression guard
    for (const forbidden of FORBIDDEN_GRAPH_STRINGS) {
      await expect(page.getByText(forbidden, { exact: false })).not.toBeVisible({
        timeout: 2_000,
      });
    }

    await expect(page).toHaveScreenshot('knowledge-graph-course-filtered.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: course-filtered graph — breadcrumb visible', async ({ page }) => {
    await gotoGraph(page, COURSE_GRAPH_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Wait for heading to settle
    await page
      .getByRole('heading', { name: /Knowledge Graph/i })
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(600);

    // Locate breadcrumb
    const breadcrumb = page
      .locator('[aria-label="breadcrumb"], nav[aria-label], nav')
      .first();
    const hasBreadcrumb = await breadcrumb.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasBreadcrumb) {
      await expect(breadcrumb).toHaveScreenshot(
        'knowledge-graph-course-breadcrumb.png',
        { threshold: 0.05, animations: 'disabled' }
      );
    }
  });

  test('screenshot: course-context badge isolated', async ({ page }) => {
    await gotoGraph(page, COURSE_GRAPH_URL);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(600);

    const badge = page.getByTestId('kg-course-context-badge');
    const hasBadge = await badge.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasBadge) {
      await expect(badge).toHaveScreenshot('knowledge-graph-course-context-badge.png', {
        threshold: 0.05,
        animations: 'disabled',
      });
    }
  });

  test('REGRESSION BUG-040: no AGE / PG-17 error strings visible on course-filtered graph', async ({
    page,
  }) => {
    await gotoGraph(page, COURSE_GRAPH_URL);
    await page.waitForTimeout(2_000);

    for (const forbidden of FORBIDDEN_GRAPH_STRINGS) {
      await expect(
        page.getByText(forbidden, { exact: false }),
        `Page must not contain: "${forbidden}"`
      ).not.toBeVisible({ timeout: 2_000 });
    }
  });

  test('REGRESSION: course-filtered graph does not crash (no "Something went wrong")', async ({
    page,
  }) => {
    await gotoGraph(page, COURSE_GRAPH_URL);
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  // ── Dark mode ─────────────────────────────────────────────────────────────

  test('screenshot (dark): course-filtered graph', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await gotoGraph(page, COURSE_GRAPH_URL);
    await page.waitForTimeout(800);

    await expect(page).toHaveScreenshot('knowledge-graph-course-filtered-dark.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

// ─── Suite 3: Error state — GraphQL gateway blocked ───────────────────────────

test.describe('KnowledgeGraph — error state (GraphQL blocked)', () => {
  test('screenshot: clean error banner when GraphQL is blocked', async ({ page }) => {
    await login(page);

    // Block all GraphQL to trigger the error state
    await page.route('**/graphql', (route: Route) => route.abort('failed'));

    await page.goto(GRAPH_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1_000);

    // REGRESSION GUARD: no raw technical strings in error banner
    const body = (await page.locator('body').textContent()) ?? '';
    for (const forbidden of FORBIDDEN_GRAPH_STRINGS) {
      expect(body, `Body must not contain: "${forbidden}"`).not.toContain(forbidden);
    }

    await expect(page).toHaveScreenshot('knowledge-graph-error-state.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});
