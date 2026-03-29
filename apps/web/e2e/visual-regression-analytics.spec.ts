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
import { LOOSE_OPTS } from './helpers/visual-test-utils';

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
  opts: Record<string, unknown> = { animations: 'disabled' as const },
) {
  const locator = selectors.reduce(
    (loc, sel, i) => (i === 0 ? page.locator(sel) : loc.or(page.locator(sel))),
    page.locator(selectors[0]),
  );
  const el = locator.first();
  if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYTICS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Analytics Dashboard @visual-analytics', () => {
  test.setTimeout(60_000);

  test('analytics dashboard — full page', async ({ page }) => {
    await goTo(page, '/analytics');
    await expect(page).toHaveScreenshot('analytics-dashboard-full.png', LOOSE_OPTS);
  });

  test('analytics dashboard — header section', async ({ page }) => {
    await goTo(page, '/analytics');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'analytics-dashboard-header.png');
  });

  test('analytics dashboard — KPI cards', async ({ page }) => {
    await goTo(page, '/analytics');
    await elementOrPage(page, ['[data-testid="kpi-cards"]', '.stats-row', '.grid'], 'analytics-dashboard-kpi.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('analytics dashboard — chart area', async ({ page }) => {
    await goTo(page, '/analytics');
    await elementOrPage(page, ['[data-testid="chart-container"]', 'canvas', '.recharts-wrapper', 'svg'], 'analytics-dashboard-chart.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('analytics dashboard — date filters', async ({ page }) => {
    await goTo(page, '/analytics');
    await elementOrPage(page, ['[data-testid="date-filters"]', '[role="tablist"]', '.filters'], 'analytics-dashboard-filters.png');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Course Analytics @visual-analytics', () => {
  test.setTimeout(60_000);

  test('course analytics — full page', async ({ page }) => {
    await goTo(page, '/analytics/course');
    await expect(page).toHaveScreenshot('analytics-course-full.png', LOOSE_OPTS);
  });

  test('course analytics — header section', async ({ page }) => {
    await goTo(page, '/analytics/course');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'analytics-course-header.png');
  });

  test('course analytics — engagement chart', async ({ page }) => {
    await goTo(page, '/analytics/course');
    await elementOrPage(page, ['[data-testid="engagement-chart"]', 'canvas', '.recharts-wrapper', 'main'], 'analytics-course-engagement.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('course analytics — completion table', async ({ page }) => {
    await goTo(page, '/analytics/course');
    await elementOrPage(page, ['table', '[data-testid="completion-table"]', '[role="table"]'], 'analytics-course-completion.png');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Tenant Analytics @visual-analytics', () => {
  test.setTimeout(60_000);

  test('tenant analytics — full page', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    await expect(page).toHaveScreenshot('analytics-tenant-full.png', LOOSE_OPTS);
  });

  test('tenant analytics — header section', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'analytics-tenant-header.png');
  });

  test('tenant analytics — usage metrics', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    await elementOrPage(page, ['[data-testid="usage-metrics"]', '.metrics', 'main'], 'analytics-tenant-metrics.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('tenant analytics — tenant comparison', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    await elementOrPage(page, ['[data-testid="tenant-comparison"]', 'table', '.chart'], 'analytics-tenant-comparison.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROI ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — ROI Analytics @visual-analytics', () => {
  test.setTimeout(60_000);

  test('ROI analytics — full page', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    await expect(page).toHaveScreenshot('analytics-roi-full.png', LOOSE_OPTS);
  });

  test('ROI analytics — header section', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'analytics-roi-header.png');
  });

  test('ROI analytics — ROI summary', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    await elementOrPage(page, ['[data-testid="roi-summary"]', '.summary', 'main'], 'analytics-roi-summary.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM USAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Platform Usage @visual-analytics', () => {
  test.setTimeout(60_000);

  test('platform usage — full page', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    await expect(page).toHaveScreenshot('analytics-platform-full.png', LOOSE_OPTS);
  });

  test('platform usage — header section', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    await elementOrPage(page, ['header', '[data-testid="page-header"]', 'h1'], 'analytics-platform-header.png');
  });

  test('platform usage — active users chart', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    await elementOrPage(page, ['[data-testid="active-users-chart"]', 'canvas', '.recharts-wrapper', 'main'], 'analytics-platform-users.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('platform usage — system health', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    await elementOrPage(page, ['[data-testid="system-health"]', '.health-indicators', 'section'], 'analytics-platform-health.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('analytics dashboard — sidebar navigation', async ({ page }) => {
    await goTo(page, '/analytics');
    await elementOrPage(page, ['aside', '[data-testid="sidebar"]', 'nav'], 'analytics-dashboard-sidebar.png');
  });

  test('course analytics — funnel chart', async ({ page }) => {
    await goTo(page, '/analytics/course');
    await elementOrPage(page, ['[data-testid="funnel-chart"]', 'canvas', 'svg', 'section'], 'analytics-course-funnel.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('ROI analytics — cost breakdown', async ({ page }) => {
    await goTo(page, '/analytics/roi');
    await elementOrPage(page, ['[data-testid="cost-breakdown"]', 'table', '.breakdown', 'main'], 'analytics-roi-breakdown.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });

  test('tenant analytics — sidebar', async ({ page }) => {
    await goTo(page, '/analytics/tenant');
    await elementOrPage(page, ['aside', '[data-testid="tenant-sidebar"]', 'nav'], 'analytics-tenant-sidebar.png');
  });

  test('platform usage — feature adoption', async ({ page }) => {
    await goTo(page, '/analytics/platform');
    await elementOrPage(page, ['[data-testid="feature-adoption"]', '.adoption', 'section'], 'analytics-platform-adoption.png', { maxDiffPixelRatio: 0.05, animations: 'disabled' as const });
  });
});
