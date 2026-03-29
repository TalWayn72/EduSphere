/**
 * Visual Regression — Dark Mode Dashboard Pages (Part 2)
 *
 * Knowledge Graph, Notifications, Calendar in dark mode.
 * Split from visual-dark-mode-dashboard.spec.ts (Part 2 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-dashboard-part2.spec.ts-snapshots/
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
// KNOWLEDGE GRAPH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Knowledge Graph @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

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
  test.setTimeout(60_000);

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
  test.setTimeout(60_000);

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
