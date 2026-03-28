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
  await page.waitForTimeout(500);
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

const ELEMENT_OPTS = { animations: 'disabled' as const };

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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-dashboard-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-header.png', ELEMENT_OPTS);
    }
  });

  test('dashboard — sidebar dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const sidebar = page.locator('aside').or(page.locator('nav')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-dashboard-dashboard-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-sidebar.png', ELEMENT_OPTS);
    }
  });

  test('dashboard — main content dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-dashboard-dashboard-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-main.png', ELEMENT_OPTS);
    }
  });

  test('dashboard — stats widgets dark', async ({ page }) => {
    await goToDark(page, '/dashboard');
    const stats = page.locator('.card').or(page.locator('main')).first();
    if (await stats.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(stats).toHaveScreenshot('dark-dashboard-dashboard-stats.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-dashboard-stats.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-courses-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-header.png', ELEMENT_OPTS);
    }
  });

  test('courses — course grid dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const grid = page.locator('main').first();
    if (await grid.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(grid).toHaveScreenshot('dark-dashboard-courses-grid.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-grid.png', ELEMENT_OPTS);
    }
  });

  test('courses — filter controls dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const filters = page.locator('[role="search"]').or(page.locator('main')).first();
    if (await filters.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(filters).toHaveScreenshot('dark-dashboard-courses-filters.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-filters.png', ELEMENT_OPTS);
    }
  });

  test('courses — pagination dark', async ({ page }) => {
    await goToDark(page, '/courses');
    const pagination = page.locator('nav[aria-label="pagination"]').or(page.locator('.pagination')).first();
    if (await pagination.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(pagination).toHaveScreenshot('dark-dashboard-courses-pagination.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-courses-pagination.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-search-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-header.png', ELEMENT_OPTS);
    }
  });

  test('search — search input dark', async ({ page }) => {
    await goToDark(page, '/search');
    const input = page.locator('input[type="search"]').or(page.locator('input')).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(input).toHaveScreenshot('dark-dashboard-search-input.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-input.png', ELEMENT_OPTS);
    }
  });

  test('search — results area dark', async ({ page }) => {
    await goToDark(page, '/search');
    const results = page.locator('main').first();
    if (await results.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(results).toHaveScreenshot('dark-dashboard-search-results.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-results.png', ELEMENT_OPTS);
    }
  });

  test('search — sidebar filters dark', async ({ page }) => {
    await goToDark(page, '/search');
    const sidebar = page.locator('aside').or(page.locator('.sidebar')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-dashboard-search-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-search-sidebar.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-knowledge-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-knowledge-header.png', ELEMENT_OPTS);
    }
  });

  test('knowledge graph — graph canvas dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const canvas = page.locator('canvas').or(page.locator('main')).first();
    if (await canvas.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(canvas).toHaveScreenshot('dark-dashboard-knowledge-canvas.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-knowledge-canvas.png', LOOSE_OPTS);
    }
  });

  test('knowledge graph — toolbar dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const toolbar = page.locator('[role="toolbar"]').or(page.locator('.toolbar')).first();
    if (await toolbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toolbar).toHaveScreenshot('dark-dashboard-knowledge-toolbar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-knowledge-toolbar.png', ELEMENT_OPTS);
    }
  });

  test('knowledge graph — details panel dark', async ({ page }) => {
    await goToDark(page, '/knowledge-graph');
    const panel = page.locator('aside').or(page.locator('.panel')).first();
    if (await panel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(panel).toHaveScreenshot('dark-dashboard-knowledge-panel.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-knowledge-panel.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-notifications-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-notifications-header.png', ELEMENT_OPTS);
    }
  });

  test('notifications — notification list dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const list = page.locator('[role="list"]').or(page.locator('main')).first();
    if (await list.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(list).toHaveScreenshot('dark-dashboard-notifications-list.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-notifications-list.png', ELEMENT_OPTS);
    }
  });

  test('notifications — filter tabs dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const tabs = page.locator('[role="tablist"]').or(page.locator('.tabs')).first();
    if (await tabs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tabs).toHaveScreenshot('dark-dashboard-notifications-tabs.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-notifications-tabs.png', ELEMENT_OPTS);
    }
  });

  test('notifications — action buttons dark', async ({ page }) => {
    await goToDark(page, '/notifications');
    const actions = page.locator('button').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('dark-dashboard-notifications-actions.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-notifications-actions.png', ELEMENT_OPTS);
    }
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
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-dashboard-calendar-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-calendar-header.png', ELEMENT_OPTS);
    }
  });

  test('calendar — calendar grid dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const grid = page.locator('table').or(page.locator('main')).first();
    if (await grid.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(grid).toHaveScreenshot('dark-dashboard-calendar-grid.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-calendar-grid.png', LOOSE_OPTS);
    }
  });

  test('calendar — navigation controls dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const nav = page.locator('[role="toolbar"]').or(page.locator('.calendar-navigation')).first();
    if (await nav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(nav).toHaveScreenshot('dark-dashboard-calendar-nav.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-calendar-nav.png', ELEMENT_OPTS);
    }
  });

  test('calendar — event sidebar dark', async ({ page }) => {
    await goToDark(page, '/calendar');
    const sidebar = page.locator('aside').or(page.locator('.sidebar')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-dashboard-calendar-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-dashboard-calendar-sidebar.png', ELEMENT_OPTS);
    }
  });
});
