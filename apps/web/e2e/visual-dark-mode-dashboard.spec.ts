/**
 * Visual Regression — Dark Mode Dashboard Pages
 *
 * Screenshot-based visual regression for authenticated dashboard pages in dark mode.
 * Uses `page.emulateMedia({ colorScheme: 'dark' })` for system-level dark mode.
 * Auto-authenticated in DEV_MODE (VITE_DEV_MODE=true).
 *
 * Pages: /dashboard, /courses, /search, /knowledge-graph, /notifications, /calendar
 * ~30 assertions across 6 pages × 5 sections each.
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-dashboard.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-dashboard --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-dashboard.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goToDark(page: Page, path: string) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Dashboard @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('dashboard — full page dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    await expect(page).toHaveScreenshot('dark-dashboard-dashboard-full.png', STABLE_OPTS);
  });

  test('dashboard — header dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-dashboard-dashboard-header.png', { animations: 'disabled' as const });
  });

  test('dashboard — sidebar dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const sidebar = page.locator('nav, [data-testid="sidebar"], aside').first();
    await expect(sidebar).toHaveScreenshot('dark-dashboard-dashboard-sidebar.png', { animations: 'disabled' as const });
  });

  test('dashboard — main content dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-dashboard-dashboard-main.png', { animations: 'disabled' as const });
  });

  test('dashboard — stats widgets dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const stats = page.locator('[data-testid="stats-card"], .stats-card, .card').first();
    await expect(stats).toHaveScreenshot('dark-dashboard-dashboard-stats.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Courses @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('courses — full page dark', async ({ page }) => {
    await goToDark(page, '/courses');
    await expect(page).toHaveScreenshot('dark-dashboard-courses-full.png', STABLE_OPTS);
  });

  test('courses — header dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-dashboard-courses-header.png', { animations: 'disabled' as const });
  });

  test('courses — course grid dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const grid = page.locator('[data-testid="course-grid"], .course-grid, main').first();
    await expect(grid).toHaveScreenshot('dark-dashboard-courses-grid.png', { animations: 'disabled' as const });
  });

  test('courses — filter controls dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const filters = page.locator('[data-testid="filters"], .filters, [role="search"]').first();
    await expect(filters).toHaveScreenshot('dark-dashboard-courses-filters.png', { animations: 'disabled' as const });
  });

  test('courses — pagination dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const pagination = page.locator('[data-testid="pagination"], nav[aria-label="pagination"], .pagination').first();
    await expect(pagination).toHaveScreenshot('dark-dashboard-courses-pagination.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Search @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('search — full page dark', async ({ page }) => {
    await goToDark(page, '/search');
    await expect(page).toHaveScreenshot('dark-dashboard-search-full.png', STABLE_OPTS);
  });

  test('search — header dark', async ({ page }) => {
    await goToDark(page, '/search');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-dashboard-search-header.png', { animations: 'disabled' as const });
  });

  test('search — search input dark', async ({ page }) => {
    await goToDark(page, '/search');
    const input = page.locator('[data-testid="search-input"], input[type="search"], input').first();
    await expect(input).toHaveScreenshot('dark-dashboard-search-input.png', { animations: 'disabled' as const });
  });

  test('search — results area dark', async ({ page }) => {
    await goToDark(page, '/search');
    const results = page.locator('[data-testid="search-results"], .search-results, main').first();
    await expect(results).toHaveScreenshot('dark-dashboard-search-results.png', { animations: 'disabled' as const });
  });

  test('search — sidebar filters dark', async ({ page }) => {
    await goToDark(page, '/search');
    const sidebar = page.locator('[data-testid="search-filters"], aside, .sidebar').first();
    await expect(sidebar).toHaveScreenshot('dark-dashboard-search-sidebar.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE GRAPH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Knowledge Graph @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('knowledge graph — full page dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    await expect(page).toHaveScreenshot('dark-dashboard-knowledge-full.png', LOOSE_OPTS);
  });

  test('knowledge graph — header dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-dashboard-knowledge-header.png', { animations: 'disabled' as const });
  });

  test('knowledge graph — graph canvas dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const canvas = page.locator('[data-testid="graph-canvas"], canvas, .graph-container, main').first();
    await expect(canvas).toHaveScreenshot('dark-dashboard-knowledge-canvas.png', LOOSE_OPTS);
  });

  test('knowledge graph — toolbar dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const toolbar = page.locator('[data-testid="graph-toolbar"], .toolbar, [role="toolbar"]').first();
    await expect(toolbar).toHaveScreenshot('dark-dashboard-knowledge-toolbar.png', { animations: 'disabled' as const });
  });

  test('knowledge graph — details panel dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const panel = page.locator('[data-testid="details-panel"], aside, .panel').first();
    await expect(panel).toHaveScreenshot('dark-dashboard-knowledge-panel.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Notifications @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('notifications — full page dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    await expect(page).toHaveScreenshot('dark-dashboard-notifications-full.png', STABLE_OPTS);
  });

  test('notifications — header dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-dashboard-notifications-header.png', { animations: 'disabled' as const });
  });

  test('notifications — notification list dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const list = page.locator('[data-testid="notification-list"], [role="list"], main').first();
    await expect(list).toHaveScreenshot('dark-dashboard-notifications-list.png', { animations: 'disabled' as const });
  });

  test('notifications — filter tabs dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const tabs = page.locator('[role="tablist"], [data-testid="notification-tabs"], .tabs').first();
    await expect(tabs).toHaveScreenshot('dark-dashboard-notifications-tabs.png', { animations: 'disabled' as const });
  });

  test('notifications — action buttons dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const actions = page.locator('[data-testid="notification-actions"], .actions, button').first();
    await expect(actions).toHaveScreenshot('dark-dashboard-notifications-actions.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Calendar @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('calendar — full page dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    await expect(page).toHaveScreenshot('dark-dashboard-calendar-full.png', LOOSE_OPTS);
  });

  test('calendar — header dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-dashboard-calendar-header.png', { animations: 'disabled' as const });
  });

  test('calendar — calendar grid dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const grid = page.locator('[data-testid="calendar-grid"], .calendar, table, main').first();
    await expect(grid).toHaveScreenshot('dark-dashboard-calendar-grid.png', LOOSE_OPTS);
  });

  test('calendar — navigation controls dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const nav = page.locator('[data-testid="calendar-nav"], .calendar-navigation, [role="toolbar"]').first();
    await expect(nav).toHaveScreenshot('dark-dashboard-calendar-nav.png', { animations: 'disabled' as const });
  });

  test('calendar — event sidebar dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const sidebar = page.locator('[data-testid="event-sidebar"], aside, .sidebar').first();
    await expect(sidebar).toHaveScreenshot('dark-dashboard-calendar-sidebar.png', { animations: 'disabled' as const });
  });
});
