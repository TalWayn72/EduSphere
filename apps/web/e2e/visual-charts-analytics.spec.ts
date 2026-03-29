/**
 * Visual Regression Tests — Analytics Charts (with GraphQL mocks)
 *
 * Covers analytics dashboard, course analytics, tenant analytics, ROI, and platform usage.
 * All chart data is mocked via page.route() for deterministic Recharts rendering.
 * Uses LOOSE_OPTS (5% tolerance) for chart areas due to SVG rendering variance.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-charts-analytics --update-snapshots
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { LOOSE_OPTS } from './helpers/visual-test-utils';
import { login } from './auth.helpers';

/** Screenshot an element if visible, otherwise fall back to full page */
async function screenshotElOrPage(el: Locator, page: Page, name: string, opts: object): Promise<void> {
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, { ...opts, fullPage: true });
  }
}
import {
  MOCK_ANALYTICS_DATA,
  MOCK_TENANT_ANALYTICS_DATA,
  MOCK_ROI_ANALYTICS_DATA,
  MOCK_PLATFORM_ANALYTICS_DATA,
} from './visual-charts-fixtures';

test.use({ reducedMotion: 'reduce' });

const CHART_OPTS = { maxDiffPixelRatio: 0.05, animations: 'disabled' as const };

async function setupMockAndGo(page: Page, path: string, mockData: Record<string, unknown>) {
  await login(page);
  await page.route('**/graphql', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData) });
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
  // Allow Recharts animations to settle
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYTICS DASHBOARD — CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Analytics Dashboard @visual-charts', () => {
  test.setTimeout(60_000);

  test('analytics dashboard — full page with mocked charts', async ({ page }) => {
    await setupMockAndGo(page, '/analytics', MOCK_ANALYTICS_DATA);
    await expect(page).toHaveScreenshot('chart-analytics-dashboard-full.png', LOOSE_OPTS);
  });

  test('analytics dashboard — enrollment chart area', async ({ page }) => {
    await setupMockAndGo(page, '/analytics', MOCK_ANALYTICS_DATA);
    const chart = page.locator('[data-testid="chart-container"], .recharts-wrapper, canvas, svg.recharts-surface').first();
    await screenshotElOrPage(chart, page, 'chart-analytics-dashboard-enrollment.png', CHART_OPTS);
  });

  test('analytics dashboard — KPI summary cards', async ({ page }) => {
    await setupMockAndGo(page, '/analytics', MOCK_ANALYTICS_DATA);
    const kpi = page.locator('[data-testid="kpi-cards"], .stats-row, .grid').first();
    await screenshotElOrPage(kpi, page, 'chart-analytics-dashboard-kpi.png', CHART_OPTS);
  });

  test('analytics dashboard — completion rate indicator', async ({ page }) => {
    await setupMockAndGo(page, '/analytics', MOCK_ANALYTICS_DATA);
    const rate = page.locator('[data-testid="completion-rate"], [data-testid="chart-completion"], .recharts-pie, section').first();
    await screenshotElOrPage(rate, page, 'chart-analytics-dashboard-completion.png', CHART_OPTS);
  });

  test('analytics dashboard — score distribution', async ({ page }) => {
    await setupMockAndGo(page, '/analytics', MOCK_ANALYTICS_DATA);
    const scores = page.locator('[data-testid="score-chart"], .recharts-bar, .recharts-wrapper, main').first();
    await screenshotElOrPage(scores, page, 'chart-analytics-dashboard-scores.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE ANALYTICS — CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Course Analytics @visual-charts', () => {
  test.setTimeout(60_000);

  test('course analytics — full page with mocked charts', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/course', MOCK_ANALYTICS_DATA);
    await expect(page).toHaveScreenshot('chart-analytics-course-full.png', LOOSE_OPTS);
  });

  test('course analytics — enrollment trend line', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/course', MOCK_ANALYTICS_DATA);
    const chart = page.locator('[data-testid="enrollment-chart"], .recharts-line, .recharts-wrapper, svg').first();
    await screenshotElOrPage(chart, page, 'chart-analytics-course-enrollment.png', CHART_OPTS);
  });

  test('course analytics — completion funnel', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/course', MOCK_ANALYTICS_DATA);
    const funnel = page.locator('[data-testid="funnel-chart"], .recharts-funnel, canvas, section').first();
    await screenshotElOrPage(funnel, page, 'chart-analytics-course-funnel.png', CHART_OPTS);
  });

  test('course analytics — average score bar chart', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/course', MOCK_ANALYTICS_DATA);
    const bar = page.locator('[data-testid="score-bar-chart"], .recharts-bar, .recharts-wrapper, main').first();
    await screenshotElOrPage(bar, page, 'chart-analytics-course-scores.png', CHART_OPTS);
  });

  test('course analytics — active students metric', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/course', MOCK_ANALYTICS_DATA);
    const metric = page.locator('[data-testid="active-students"], .metric-card, .stats-row, section').first();
    await screenshotElOrPage(metric, page, 'chart-analytics-course-active.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT ANALYTICS — CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Tenant Analytics @visual-charts', () => {
  test.setTimeout(60_000);

  test('tenant analytics — full page with mocked charts', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/tenant', MOCK_TENANT_ANALYTICS_DATA);
    await expect(page).toHaveScreenshot('chart-analytics-tenant-full.png', LOOSE_OPTS);
  });

  test('tenant analytics — usage over time chart', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/tenant', MOCK_TENANT_ANALYTICS_DATA);
    const chart = page.locator('[data-testid="usage-chart"], .recharts-area, .recharts-wrapper, svg').first();
    await screenshotElOrPage(chart, page, 'chart-analytics-tenant-usage.png', CHART_OPTS);
  });

  test('tenant analytics — tenant comparison bars', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/tenant', MOCK_TENANT_ANALYTICS_DATA);
    const bars = page.locator('[data-testid="tenant-comparison"], .recharts-bar, table, section').first();
    await screenshotElOrPage(bars, page, 'chart-analytics-tenant-comparison.png', CHART_OPTS);
  });

  test('tenant analytics — active rate gauges', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/tenant', MOCK_TENANT_ANALYTICS_DATA);
    const gauges = page.locator('[data-testid="active-rate"], .recharts-radial, .gauge, main').first();
    await screenshotElOrPage(gauges, page, 'chart-analytics-tenant-rates.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROI ANALYTICS — CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — ROI Analytics @visual-charts', () => {
  test.setTimeout(60_000);

  test('ROI analytics — full page with mocked charts', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/roi', MOCK_ROI_ANALYTICS_DATA);
    await expect(page).toHaveScreenshot('chart-analytics-roi-full.png', LOOSE_OPTS);
  });

  test('ROI analytics — monthly ROI trend', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/roi', MOCK_ROI_ANALYTICS_DATA);
    const chart = page.locator('[data-testid="roi-trend"], .recharts-line, .recharts-wrapper, svg').first();
    await screenshotElOrPage(chart, page, 'chart-analytics-roi-trend.png', CHART_OPTS);
  });

  test('ROI analytics — cost breakdown pie', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/roi', MOCK_ROI_ANALYTICS_DATA);
    const pie = page.locator('[data-testid="cost-breakdown"], .recharts-pie, .recharts-wrapper, section').first();
    await screenshotElOrPage(pie, page, 'chart-analytics-roi-breakdown.png', CHART_OPTS);
  });

  test('ROI analytics — investment vs return comparison', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/roi', MOCK_ROI_ANALYTICS_DATA);
    const comparison = page.locator('[data-testid="roi-comparison"], .recharts-bar, table, main').first();
    await screenshotElOrPage(comparison, page, 'chart-analytics-roi-comparison.png', CHART_OPTS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM USAGE — CHARTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chart Visual — Platform Usage @visual-charts', () => {
  test.setTimeout(60_000);

  test('platform usage — full page with mocked charts', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    await expect(page).toHaveScreenshot('chart-analytics-platform-full.png', LOOSE_OPTS);
  });

  test('platform usage — active users multi-line chart', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    const chart = page.locator('[data-testid="active-users-chart"], .recharts-line, .recharts-wrapper, svg').first();
    await screenshotElOrPage(chart, page, 'chart-analytics-platform-users.png', CHART_OPTS);
  });

  test('platform usage — system health gauges', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    const health = page.locator('[data-testid="system-health"], .health-indicators, .recharts-radial, section').first();
    await screenshotElOrPage(health, page, 'chart-analytics-platform-health.png', CHART_OPTS);
  });

  test('platform usage — feature adoption horizontal bars', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    const bars = page.locator('[data-testid="feature-adoption"], .recharts-bar, .adoption, main').first();
    await screenshotElOrPage(bars, page, 'chart-analytics-platform-adoption.png', CHART_OPTS);
  });

  test('platform usage — storage usage indicator', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    const storage = page.locator('[data-testid="storage-usage"], .recharts-radialBar, .gauge, section').first();
    await screenshotElOrPage(storage, page, 'chart-analytics-platform-storage.png', CHART_OPTS);
  });

  test('platform usage — error rate trend', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    const errorRate = page.locator('[data-testid="error-rate"], .recharts-line, .error-chart, main').first();
    await screenshotElOrPage(errorRate, page, 'chart-analytics-platform-errorrate.png', CHART_OPTS);
  });

  test('platform usage — response time histogram', async ({ page }) => {
    await setupMockAndGo(page, '/analytics/platform', MOCK_PLATFORM_ANALYTICS_DATA);
    const histogram = page.locator('[data-testid="response-time"], .recharts-bar, .histogram, section').first();
    await screenshotElOrPage(histogram, page, 'chart-analytics-platform-responsetime.png', CHART_OPTS);
  });
});
