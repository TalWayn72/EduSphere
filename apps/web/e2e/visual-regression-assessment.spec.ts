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
// ASSESSMENT LIST
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Assessment List @visual-assessment', () => {
  test.setTimeout(60_000);

  test('assessment list — full page', async ({ page }) => {
    await goTo(page, '/assessments');
    await expect(page).toHaveScreenshot(
      'assessment-list-full.png',
      STABLE_OPTS
    );
  });

  test('assessment list — header section', async ({ page }) => {
    await goTo(page, '/assessments');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'assessment-list-header.png'
    );
  });

  test('assessment list — main content', async ({ page }) => {
    await goTo(page, '/assessments');
    await elementOrPage(
      page,
      ['main', '[role="main"]', '[data-testid="main-content"]'],
      'assessment-list-main.png'
    );
  });

  test('assessment list — assessment cards', async ({ page }) => {
    await goTo(page, '/assessments');
    await elementOrPage(
      page,
      ['[data-testid="assessment-grid"]', '.grid', '[role="list"]'],
      'assessment-list-cards.png'
    );
  });

  test('assessment list — filter bar', async ({ page }) => {
    await goTo(page, '/assessments');
    await elementOrPage(
      page,
      ['[data-testid="filter-bar"]', '[role="search"]', '.filters'],
      'assessment-list-filters.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 360 ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — 360 Assessment @visual-assessment', () => {
  test.setTimeout(60_000);

  test('360 assessment — full page', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await expect(page).toHaveScreenshot('assessment-360-full.png', STABLE_OPTS);
  });

  test('360 assessment — header section', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'assessment-360-header.png'
    );
  });

  test('360 assessment — radar chart', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await elementOrPage(
      page,
      ['[data-testid="radar-chart"]', 'canvas', 'svg', '.recharts-wrapper'],
      'assessment-360-radar.png',
      { maxDiffPixelRatio: 0.05, animations: 'disabled' as const }
    );
  });

  test('360 assessment — feedback summary', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await elementOrPage(
      page,
      ['[data-testid="feedback-summary"]', '.summary', 'main'],
      'assessment-360-feedback.png'
    );
  });

  test('360 assessment — evaluator list', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await elementOrPage(
      page,
      ['[data-testid="evaluator-list"]', '[role="list"]', 'table'],
      'assessment-360-evaluators.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Assessment Campaigns @visual-assessment', () => {
  test.setTimeout(60_000);

  test('campaigns — full page', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    await expect(page).toHaveScreenshot(
      'assessment-campaigns-full.png',
      STABLE_OPTS
    );
  });

  test('campaigns — header section', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'assessment-campaigns-header.png'
    );
  });

  test('campaigns — campaign table', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    await elementOrPage(
      page,
      ['table', '[data-testid="campaign-table"]', '[role="table"]', 'main'],
      'assessment-campaigns-table.png'
    );
  });

  test('campaigns — status indicators', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    await elementOrPage(
      page,
      ['[data-testid="campaign-status"]', '.status-badge', 'section'],
      'assessment-campaigns-status.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PEER REVIEW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Peer Review @visual-assessment', () => {
  test.setTimeout(60_000);

  test('peer review — full page', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    await expect(page).toHaveScreenshot(
      'assessment-peerreview-full.png',
      STABLE_OPTS
    );
  });

  test('peer review — header section', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'assessment-peerreview-header.png'
    );
  });

  test('peer review — review queue', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    await elementOrPage(
      page,
      ['[data-testid="review-queue"]', '[role="list"]', 'main'],
      'assessment-peerreview-queue.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT RESULTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Assessment Results @visual-assessment', () => {
  test.setTimeout(60_000);

  test('results — full page', async ({ page }) => {
    await goTo(page, '/assessments/results');
    await expect(page).toHaveScreenshot(
      'assessment-results-full.png',
      STABLE_OPTS
    );
  });

  test('results — header section', async ({ page }) => {
    await goTo(page, '/assessments/results');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'assessment-results-header.png'
    );
  });

  test('results — score distribution', async ({ page }) => {
    await goTo(page, '/assessments/results');
    await elementOrPage(
      page,
      ['[data-testid="score-distribution"]', 'canvas', 'svg', 'main'],
      'assessment-results-distribution.png',
      { maxDiffPixelRatio: 0.05, animations: 'disabled' as const }
    );
  });

  test('results — results table', async ({ page }) => {
    await goTo(page, '/assessments/results');
    await elementOrPage(
      page,
      ['table', '[data-testid="results-table"]', '[role="table"]'],
      'assessment-results-table.png'
    );
  });

  test('assessment list — sidebar navigation', async ({ page }) => {
    await goTo(page, '/assessments');
    await elementOrPage(
      page,
      ['aside', '[data-testid="sidebar"]', 'nav'],
      'assessment-list-sidebar.png'
    );
  });

  test('360 assessment — competency breakdown', async ({ page }) => {
    await goTo(page, '/assessments/360');
    await elementOrPage(
      page,
      ['[data-testid="competency-breakdown"]', '.breakdown', 'section'],
      'assessment-360-competency.png'
    );
  });

  test('campaigns — create button area', async ({ page }) => {
    await goTo(page, '/assessments/campaigns');
    await elementOrPage(
      page,
      ['[data-testid="create-campaign"]', 'button', '.actions'],
      'assessment-campaigns-create.png'
    );
  });

  test('peer review — rubric section', async ({ page }) => {
    await goTo(page, '/assessments/peer-review');
    await elementOrPage(
      page,
      ['[data-testid="rubric"]', '.rubric', 'section'],
      'assessment-peerreview-rubric.png'
    );
  });
});
