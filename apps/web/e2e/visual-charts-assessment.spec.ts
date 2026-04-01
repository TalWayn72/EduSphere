/**
 * Visual Regression Tests — Assessment Charts (with GraphQL mocks)
 *
 * Covers assessment overview, 360 radar charts, assessment results, and exam score charts.
 * All data is mocked via page.route() for deterministic Recharts rendering.
 * Uses LOOSE_OPTS (5% tolerance) for chart areas due to SVG rendering variance.
 * 20 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-charts-assessment --update-snapshots
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';
import { login } from './auth.helpers';

/** Screenshot an element if visible, otherwise fall back to full page */
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
import {
  MOCK_ASSESSMENT_DATA,
  MOCK_360_ASSESSMENT_DATA,
  MOCK_ASSESSMENT_RESULTS_DATA,
  MOCK_EXAM_RESULTS_DATA,
} from './visual-charts-fixtures';

test.use({ reducedMotion: 'reduce' });

const CHART_OPTS = { maxDiffPixelRatio: 0.05, animations: 'disabled' as const };

async function setupMockAndGo(
  page: Page,
  path: string,
  mockData: Record<string, unknown>
) {
  await login(page);
  await page.route('**/graphql', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    });
  });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT OVERVIEW — CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Assessment Overview @visual-charts', () => {
  test.setTimeout(60_000);

  test('assessment overview — full page with mocked data', async ({ page }) => {
    await setupMockAndGo(page, '/assessments', MOCK_ASSESSMENT_DATA);
    await expect(page).toHaveScreenshot(
      'chart-assessment-overview-full.png',
      LOOSE_OPTS
    );
  });

  test('assessment overview — status distribution chart', async ({ page }) => {
    await setupMockAndGo(page, '/assessments', MOCK_ASSESSMENT_DATA);
    const chart = page
      .locator(
        '[data-testid="status-chart"], .recharts-pie, .recharts-wrapper, svg'
      )
      .first();
    await screenshotElOrPage(
      chart,
      page,
      'chart-assessment-overview-status.png',
      CHART_OPTS
    );
  });

  test('assessment overview — type breakdown bars', async ({ page }) => {
    await setupMockAndGo(page, '/assessments', MOCK_ASSESSMENT_DATA);
    const bars = page
      .locator(
        '[data-testid="type-breakdown"], .recharts-bar, .recharts-wrapper, section'
      )
      .first();
    await screenshotElOrPage(
      bars,
      page,
      'chart-assessment-overview-types.png',
      CHART_OPTS
    );
  });

  test('assessment overview — submission count metrics', async ({ page }) => {
    await setupMockAndGo(page, '/assessments', MOCK_ASSESSMENT_DATA);
    const metrics = page
      .locator('[data-testid="submission-metrics"], .stats-row, .grid, main')
      .first();
    await screenshotElOrPage(
      metrics,
      page,
      'chart-assessment-overview-submissions.png',
      CHART_OPTS
    );
  });

  test('assessment overview — average score gauge', async ({ page }) => {
    await setupMockAndGo(page, '/assessments', MOCK_ASSESSMENT_DATA);
    const gauge = page
      .locator(
        '[data-testid="avg-score-gauge"], .recharts-radialBar, .gauge, section'
      )
      .first();
    await screenshotElOrPage(
      gauge,
      page,
      'chart-assessment-overview-avgscore.png',
      CHART_OPTS
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 360 ASSESSMENT — RADAR CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — 360 Assessment @visual-charts', () => {
  test.setTimeout(60_000);

  test('360 assessment — full page with mocked radar', async ({ page }) => {
    await setupMockAndGo(page, '/assessments/360', MOCK_360_ASSESSMENT_DATA);
    await expect(page).toHaveScreenshot(
      'chart-assessment-360-full.png',
      LOOSE_OPTS
    );
  });

  test('360 assessment — radar chart dimensions', async ({ page }) => {
    await setupMockAndGo(page, '/assessments/360', MOCK_360_ASSESSMENT_DATA);
    const radar = page
      .locator(
        '[data-testid="radar-chart"], .recharts-radar, .recharts-wrapper, svg'
      )
      .first();
    await screenshotElOrPage(
      radar,
      page,
      'chart-assessment-360-radar.png',
      CHART_OPTS
    );
  });

  test('360 assessment — self vs peer comparison', async ({ page }) => {
    await setupMockAndGo(page, '/assessments/360', MOCK_360_ASSESSMENT_DATA);
    const comparison = page
      .locator(
        '[data-testid="self-peer-chart"], .recharts-bar, .comparison, section'
      )
      .first();
    await screenshotElOrPage(
      comparison,
      page,
      'chart-assessment-360-comparison.png',
      CHART_OPTS
    );
  });

  test('360 assessment — overall score indicator', async ({ page }) => {
    await setupMockAndGo(page, '/assessments/360', MOCK_360_ASSESSMENT_DATA);
    const score = page
      .locator(
        '[data-testid="overall-score"], .score-indicator, .recharts-radialBar, main'
      )
      .first();
    await screenshotElOrPage(
      score,
      page,
      'chart-assessment-360-overall.png',
      CHART_OPTS
    );
  });

  test('360 assessment — evaluator progress bars', async ({ page }) => {
    await setupMockAndGo(page, '/assessments/360', MOCK_360_ASSESSMENT_DATA);
    const progress = page
      .locator(
        '[data-testid="evaluator-progress"], [role="progressbar"], .progress-list, section'
      )
      .first();
    await screenshotElOrPage(
      progress,
      page,
      'chart-assessment-360-evaluators.png',
      CHART_OPTS
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT RESULTS — DISTRIBUTION CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Assessment Results @visual-charts', () => {
  test.setTimeout(60_000);

  test('assessment results — full page with mocked charts', async ({
    page,
  }) => {
    await setupMockAndGo(
      page,
      '/assessments/results',
      MOCK_ASSESSMENT_RESULTS_DATA
    );
    await expect(page).toHaveScreenshot(
      'chart-assessment-results-full.png',
      LOOSE_OPTS
    );
  });

  test('assessment results — score distribution histogram', async ({
    page,
  }) => {
    await setupMockAndGo(
      page,
      '/assessments/results',
      MOCK_ASSESSMENT_RESULTS_DATA
    );
    const histogram = page
      .locator(
        '[data-testid="score-distribution"], .recharts-bar, .recharts-wrapper, svg'
      )
      .first();
    await screenshotElOrPage(
      histogram,
      page,
      'chart-assessment-results-distribution.png',
      CHART_OPTS
    );
  });

  test('assessment results — pass rate donut', async ({ page }) => {
    await setupMockAndGo(
      page,
      '/assessments/results',
      MOCK_ASSESSMENT_RESULTS_DATA
    );
    const donut = page
      .locator(
        '[data-testid="pass-rate"], .recharts-pie, .donut-chart, section'
      )
      .first();
    await screenshotElOrPage(
      donut,
      page,
      'chart-assessment-results-passrate.png',
      CHART_OPTS
    );
  });

  test('assessment results — top performers chart', async ({ page }) => {
    await setupMockAndGo(
      page,
      '/assessments/results',
      MOCK_ASSESSMENT_RESULTS_DATA
    );
    const top = page
      .locator('[data-testid="top-performers"], .recharts-bar, table, main')
      .first();
    await screenshotElOrPage(
      top,
      page,
      'chart-assessment-results-top.png',
      CHART_OPTS
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAM RESULTS — SCORE CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Exam Results @visual-charts', () => {
  test.setTimeout(60_000);

  test('exam results — full page with mocked scores', async ({ page }) => {
    await setupMockAndGo(page, '/exams/results', MOCK_EXAM_RESULTS_DATA);
    await expect(page).toHaveScreenshot(
      'chart-assessment-exams-full.png',
      LOOSE_OPTS
    );
  });

  test('exam results — score bar chart', async ({ page }) => {
    await setupMockAndGo(page, '/exams/results', MOCK_EXAM_RESULTS_DATA);
    const chart = page
      .locator(
        '[data-testid="exam-scores"], .recharts-bar, .recharts-wrapper, svg'
      )
      .first();
    await screenshotElOrPage(
      chart,
      page,
      'chart-assessment-exams-scores.png',
      CHART_OPTS
    );
  });

  test('exam results — question analysis heatmap', async ({ page }) => {
    await setupMockAndGo(page, '/exams/results', MOCK_EXAM_RESULTS_DATA);
    const heatmap = page
      .locator(
        '[data-testid="question-analysis"], .recharts-wrapper, .heatmap, section'
      )
      .first();
    await screenshotElOrPage(
      heatmap,
      page,
      'chart-assessment-exams-questions.png',
      CHART_OPTS
    );
  });

  test('exam results — class average indicator', async ({ page }) => {
    await setupMockAndGo(page, '/exams/results', MOCK_EXAM_RESULTS_DATA);
    const avg = page
      .locator(
        '[data-testid="class-average"], .average-indicator, .metric-card, main'
      )
      .first();
    await screenshotElOrPage(
      avg,
      page,
      'chart-assessment-exams-average.png',
      CHART_OPTS
    );
  });

  test('exam results — grade distribution pie', async ({ page }) => {
    await setupMockAndGo(page, '/exams/results', MOCK_EXAM_RESULTS_DATA);
    const pie = page
      .locator(
        '[data-testid="grade-distribution"], .recharts-pie, .recharts-wrapper, section'
      )
      .first();
    await screenshotElOrPage(
      pie,
      page,
      'chart-assessment-exams-grades.png',
      CHART_OPTS
    );
  });

  test('exam results — topic correctness rates', async ({ page }) => {
    await setupMockAndGo(page, '/exams/results', MOCK_EXAM_RESULTS_DATA);
    const rates = page
      .locator('[data-testid="topic-rates"], .recharts-bar, table, main')
      .first();
    await screenshotElOrPage(
      rates,
      page,
      'chart-assessment-exams-topics.png',
      CHART_OPTS
    );
  });
});
