/**
 * Visual Regression Tests — Assessment Pages
 *
 * Covers assessment list, 360 assessment, campaigns, peer review, and results.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-assessment --update-snapshots
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
// ASSESSMENT LIST
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Assessment List @visual-assessment', () => {
  test.setTimeout(30_000);

  test('assessment list — full page', async ({ page }) => {
    await goTo(page, '/assessments');
    await expect(page).toHaveScreenshot('assessment-list-full.png', STABLE_OPTS);
  });

  test('assessment list — header section', async ({ page }) => {
    await goTo(page, '/assessments');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('assessment-list-header.png', { animations: 'disabled' as const });
  });

  test('assessment list — main content', async ({ page }) => {
    await goTo(page, '/assessments');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('assessment-list-main.png', { animations: 'disabled' as const });
  });

  test('assessment list — assessment cards', async ({ page }) => {
    await goTo(page, '/assessments');
    const cards = page.locator('[data-testid="assessment-grid"], .grid, [role="list"]').first();
    await expect(cards).toHaveScreenshot('assessment-list-cards.png', { animations: 'disabled' as const });
  });

  test('assessment list — filter bar', async ({ page }) => {
    await goTo(page, '/assessments');
    const filters = page.locator('[data-testid="filter-bar"], [role="search"], .filters').first();
    await expect(filters).toHaveScreenshot('assessment-list-filters.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 360 ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — 360 Assessment @visual-assessment', () => {
  test.setTimeout(30_000);

  test('360 assessment — full page', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await expect(page).toHaveScreenshot('assessment-360-full.png', STABLE_OPTS);
  });

  test('360 assessment — header section', async ({ page }) => {
    await goTo(page, '/assessments/360');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('assessment-360-header.png', { animations: 'disabled' as const });
  });

  test('360 assessment — radar chart', async ({ page }) => {
    await goTo(page, '/assessments/360');
    const chart = page.locator('[data-testid="radar-chart"], canvas, svg, .recharts-wrapper').first();
    await expect(chart).toHaveScreenshot('assessment-360-radar.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('360 assessment — feedback summary', async ({ page }) => {
    await goTo(page, '/assessments/360');
    const summary = page.locator('[data-testid="feedback-summary"], .summary, main').first();
    await expect(summary).toHaveScreenshot('assessment-360-feedback.png', { animations: 'disabled' as const });
  });

  test('360 assessment — evaluator list', async ({ page }) => {
    await goTo(page, '/assessments/360');
    const evaluators = page.locator('[data-testid="evaluator-list"], [role="list"], table').first();
    await expect(evaluators).toHaveScreenshot('assessment-360-evaluators.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Assessment Campaigns @visual-assessment', () => {
  test.setTimeout(30_000);

  test('campaigns — full page', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    await expect(page).toHaveScreenshot('assessment-campaigns-full.png', STABLE_OPTS);
  });

  test('campaigns — header section', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('assessment-campaigns-header.png', { animations: 'disabled' as const });
  });

  test('campaigns — campaign table', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    const table = page.locator('table, [data-testid="campaign-table"], [role="table"], main').first();
    await expect(table).toHaveScreenshot('assessment-campaigns-table.png', { animations: 'disabled' as const });
  });

  test('campaigns — status indicators', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    const status = page.locator('[data-testid="campaign-status"], .status-badge, section').first();
    await expect(status).toHaveScreenshot('assessment-campaigns-status.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PEER REVIEW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Peer Review @visual-assessment', () => {
  test.setTimeout(30_000);

  test('peer review — full page', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    await expect(page).toHaveScreenshot('assessment-peerreview-full.png', STABLE_OPTS);
  });

  test('peer review — header section', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('assessment-peerreview-header.png', { animations: 'disabled' as const });
  });

  test('peer review — review queue', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    const queue = page.locator('[data-testid="review-queue"], [role="list"], main').first();
    await expect(queue).toHaveScreenshot('assessment-peerreview-queue.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT RESULTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Assessment Results @visual-assessment', () => {
  test.setTimeout(30_000);

  test('results — full page', async ({ page }) => {
    await goTo(page, '/assessments/results');
    await expect(page).toHaveScreenshot('assessment-results-full.png', STABLE_OPTS);
  });

  test('results — header section', async ({ page }) => {
    await goTo(page, '/assessments/results');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('assessment-results-header.png', { animations: 'disabled' as const });
  });

  test('results — score distribution', async ({ page }) => {
    await goTo(page, '/assessments/results');
    const dist = page.locator('[data-testid="score-distribution"], canvas, svg, main').first();
    await expect(dist).toHaveScreenshot('assessment-results-distribution.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('results — results table', async ({ page }) => {
    await goTo(page, '/assessments/results');
    const table = page.locator('table, [data-testid="results-table"], [role="table"]').first();
    await expect(table).toHaveScreenshot('assessment-results-table.png', { animations: 'disabled' as const });
  });

  test('assessment list — sidebar navigation', async ({ page }) => {
    await goTo(page, '/assessments');
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
    await expect(sidebar).toHaveScreenshot('assessment-list-sidebar.png', { animations: 'disabled' as const });
  });

  test('360 assessment — competency breakdown', async ({ page }) => {
    await goTo(page, '/assessments/360');
    const competency = page.locator('[data-testid="competency-breakdown"], .breakdown, section').first();
    await expect(competency).toHaveScreenshot('assessment-360-competency.png', { animations: 'disabled' as const });
  });

  test('campaigns — create button area', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    const createArea = page.locator('[data-testid="create-campaign"], button, .actions').first();
    await expect(createArea).toHaveScreenshot('assessment-campaigns-create.png', { animations: 'disabled' as const });
  });

  test('peer review — rubric section', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    const rubric = page.locator('[data-testid="rubric"], .rubric, section').first();
    await expect(rubric).toHaveScreenshot('assessment-peerreview-rubric.png', { animations: 'disabled' as const });
  });
});
