/**
 * Visual Regression Tests — Analytics Pages
 *
 * Covers main analytics, course analytics, tenant analytics, ROI, and platform usage.
 * Uses LOOSE_OPTS for chart areas due to rendering variance.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-analytics --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

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
// MAIN ANALYTICS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Analytics Dashboard @visual-analytics', () => {
  test.setTimeout(30_000);

  test('analytics dashboard — full page', async ({ page }) => {
    await goTo(page, '/analytics');
    await expect(page).toHaveScreenshot('analytics-dashboard-full.png', LOOSE_OPTS);
  });

  test('analytics dashboard — header section', async ({ page }) => {
    await goTo(page, '/analytics');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('analytics-dashboard-header.png', { animations: 'disabled' as const });
  });

  test('analytics dashboard — KPI cards', async ({ page }) => {
    await goTo(page, '/analytics');
    const kpi = page.locator('[data-testid="kpi-cards"], .stats-row, .grid').first();
    await expect(kpi).toHaveScreenshot('analytics-dashboard-kpi.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('analytics dashboard — chart area', async ({ page }) => {
    await goTo(page, '/analytics');
    const chart = page.locator('[data-testid="chart-container"], canvas, .recharts-wrapper, svg').first();
    await expect(chart).toHaveScreenshot('analytics-dashboard-chart.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('analytics dashboard — date filters', async ({ page }) => {
    await goTo(page, '/analytics');
    const filters = page.locator('[data-testid="date-filters"], [role="tablist"], .filters').first();
    await expect(filters).toHaveScreenshot('analytics-dashboard-filters.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Course Analytics @visual-analytics', () => {
  test.setTimeout(30_000);

  test('course analytics — full page', async ({ page }) => {
    await goTo(page, '/analytics/course');
    await expect(page).toHaveScreenshot('analytics-course-full.png', LOOSE_OPTS);
  });

  test('course analytics — header section', async ({ page }) => {
    await goTo(page, '/analytics/course');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('analytics-course-header.png', { animations: 'disabled' as const });
  });

  test('course analytics — engagement chart', async ({ page }) => {
    await goTo(page, '/analytics/course');
    const chart = page.locator('[data-testid="engagement-chart"], canvas, .recharts-wrapper, main').first();
    await expect(chart).toHaveScreenshot('analytics-course-engagement.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('course analytics — completion table', async ({ page }) => {
    await goTo(page, '/analytics/course');
    const table = page.locator('table, [data-testid="completion-table"], [role="table"]').first();
    await expect(table).toHaveScreenshot('analytics-course-completion.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Tenant Analytics @visual-analytics', () => {
  test.setTimeout(30_000);

  test('tenant analytics — full page', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    await expect(page).toHaveScreenshot('analytics-tenant-full.png', LOOSE_OPTS);
  });

  test('tenant analytics — header section', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('analytics-tenant-header.png', { animations: 'disabled' as const });
  });

  test('tenant analytics — usage metrics', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    const metrics = page.locator('[data-testid="usage-metrics"], .metrics, main').first();
    await expect(metrics).toHaveScreenshot('analytics-tenant-metrics.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('tenant analytics — tenant comparison', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    const comparison = page.locator('[data-testid="tenant-comparison"], table, .chart').first();
    await expect(comparison).toHaveScreenshot('analytics-tenant-comparison.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROI ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — ROI Analytics @visual-analytics', () => {
  test.setTimeout(30_000);

  test('ROI analytics — full page', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    await expect(page).toHaveScreenshot('analytics-roi-full.png', LOOSE_OPTS);
  });

  test('ROI analytics — header section', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('analytics-roi-header.png', { animations: 'disabled' as const });
  });

  test('ROI analytics — ROI summary', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    const summary = page.locator('[data-testid="roi-summary"], .summary, main').first();
    await expect(summary).toHaveScreenshot('analytics-roi-summary.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM USAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Platform Usage @visual-analytics', () => {
  test.setTimeout(30_000);

  test('platform usage — full page', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    await expect(page).toHaveScreenshot('analytics-platform-full.png', LOOSE_OPTS);
  });

  test('platform usage — header section', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('analytics-platform-header.png', { animations: 'disabled' as const });
  });

  test('platform usage — active users chart', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    const chart = page.locator('[data-testid="active-users-chart"], canvas, .recharts-wrapper, main').first();
    await expect(chart).toHaveScreenshot('analytics-platform-users.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('platform usage — system health', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    const health = page.locator('[data-testid="system-health"], .health-indicators, section').first();
    await expect(health).toHaveScreenshot('analytics-platform-health.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('analytics dashboard — sidebar navigation', async ({ page }) => {
    await goTo(page, '/analytics');
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
    await expect(sidebar).toHaveScreenshot('analytics-dashboard-sidebar.png', { animations: 'disabled' as const });
  });

  test('course analytics — funnel chart', async ({ page }) => {
    await goTo(page, '/analytics/course');
    const funnel = page.locator('[data-testid="funnel-chart"], canvas, svg, section').first();
    await expect(funnel).toHaveScreenshot('analytics-course-funnel.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('ROI analytics — cost breakdown', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    const breakdown = page.locator('[data-testid="cost-breakdown"], table, .breakdown, main').first();
    await expect(breakdown).toHaveScreenshot('analytics-roi-breakdown.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('tenant analytics — sidebar', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    const sidebar = page.locator('aside, [data-testid="tenant-sidebar"], nav').first();
    await expect(sidebar).toHaveScreenshot('analytics-tenant-sidebar.png', { animations: 'disabled' as const });
  });

  test('platform usage — feature adoption', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    const adoption = page.locator('[data-testid="feature-adoption"], .adoption, section').first();
    await expect(adoption).toHaveScreenshot('analytics-platform-adoption.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });
});
