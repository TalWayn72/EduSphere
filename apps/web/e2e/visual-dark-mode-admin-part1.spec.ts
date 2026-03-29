/**
 * Visual Regression — Dark Mode Admin Pages (Part 1)
 *
 * Admin Dashboard, Compliance, LTI in dark mode.
 * Split from visual-dark-mode-admin.spec.ts (Part 1 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-admin-part1.spec.ts-snapshots/
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

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
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Admin Dashboard @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('admin dashboard — full page dark', async ({ page }) => {
    await goToDark(page, '/admin');
    await expect(page).toHaveScreenshot('dark-admin-dashboard-full.png', STABLE_OPTS);
  });

  test('admin dashboard — header dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const header = page.locator('header').or(page.locator('h1')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-admin-dashboard-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-dashboard-header.png', ELEMENT_OPTS);
    }
  });

  test('admin dashboard — sidebar dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const sidebar = page.locator('aside').or(page.locator('nav')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-admin-dashboard-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-dashboard-sidebar.png', ELEMENT_OPTS);
    }
  });

  test('admin dashboard — main content dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-admin-dashboard-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-dashboard-main.png', ELEMENT_OPTS);
    }
  });

  test('admin dashboard — stats cards dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const cards = page.locator('.card').or(page.locator('main')).first();
    if (await cards.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cards).toHaveScreenshot('dark-admin-dashboard-stats.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-dashboard-stats.png', ELEMENT_OPTS);
    }
  });

  test('admin dashboard — breadcrumbs dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const breadcrumbs = page.locator('nav[aria-label="breadcrumb"]').or(page.locator('.breadcrumb')).first();
    if (await breadcrumbs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(breadcrumbs).toHaveScreenshot('dark-admin-dashboard-breadcrumbs.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-dashboard-breadcrumbs.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Admin Compliance @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('compliance — full page dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    await expect(page).toHaveScreenshot('dark-admin-compliance-full.png', STABLE_OPTS);
  });

  test('compliance — header dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const header = page.locator('header').or(page.locator('h1')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-admin-compliance-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-compliance-header.png', ELEMENT_OPTS);
    }
  });

  test('compliance — main content dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-admin-compliance-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-compliance-main.png', ELEMENT_OPTS);
    }
  });

  test('compliance — report table dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const table = page.locator('table').or(page.locator('[role="table"]')).first();
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table).toHaveScreenshot('dark-admin-compliance-table.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-compliance-table.png', ELEMENT_OPTS);
    }
  });

  test('compliance — action buttons dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const actions = page.locator('button').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('dark-admin-compliance-actions.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-compliance-actions.png', ELEMENT_OPTS);
    }
  });

  test('compliance — status indicators dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const status = page.locator('.badge').or(page.locator('.status-badge')).first();
    if (await status.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(status).toHaveScreenshot('dark-admin-compliance-status.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-compliance-status.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LTI INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Admin LTI @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('LTI — full page dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    await expect(page).toHaveScreenshot('dark-admin-lti-full.png', STABLE_OPTS);
  });

  test('LTI — header dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const header = page.locator('header').or(page.locator('h1')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-admin-lti-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-lti-header.png', ELEMENT_OPTS);
    }
  });

  test('LTI — configuration form dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-admin-lti-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-lti-form.png', ELEMENT_OPTS);
    }
  });

  test('LTI — connection list dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const list = page.locator('table').or(page.locator('[role="list"]')).or(page.locator('main')).first();
    if (await list.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(list).toHaveScreenshot('dark-admin-lti-connections.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-lti-connections.png', ELEMENT_OPTS);
    }
  });

  test('LTI — main content dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-admin-lti-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-lti-main.png', ELEMENT_OPTS);
    }
  });

  test('LTI — action buttons dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const actions = page.locator('button').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('dark-admin-lti-actions.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-lti-actions.png', ELEMENT_OPTS);
    }
  });
});
