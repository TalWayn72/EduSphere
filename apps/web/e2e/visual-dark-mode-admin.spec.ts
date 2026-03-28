/**
 * Visual Regression — Dark Mode Admin Pages
 *
 * Screenshot-based visual regression for admin pages in dark mode.
 * Uses `page.emulateMedia({ colorScheme: 'dark' })` for system-level dark mode.
 * Auto-authenticated in DEV_MODE (VITE_DEV_MODE=true).
 *
 * Pages: /admin, /admin/compliance, /admin/lti, /admin/scim, /admin/settings
 * ~30 assertions across 5 pages × 6 sections each.
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-admin.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-admin --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-admin.spec.ts
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

// ─────────────────────────────────────────────────────────────────────────────
// SCIM PROVISIONING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Admin SCIM @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('SCIM — full page dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    await expect(page).toHaveScreenshot('dark-admin-scim-full.png', STABLE_OPTS);
  });

  test('SCIM — header dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const header = page.locator('header').or(page.locator('h1')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-admin-scim-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-scim-header.png', ELEMENT_OPTS);
    }
  });

  test('SCIM — main content dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-admin-scim-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-scim-main.png', ELEMENT_OPTS);
    }
  });

  test('SCIM — endpoint list dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const list = page.locator('table').or(page.locator('ul')).first();
    if (await list.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(list).toHaveScreenshot('dark-admin-scim-endpoints.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-scim-endpoints.png', ELEMENT_OPTS);
    }
  });

  test('SCIM — sync status dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const sync = page.locator('.status').or(page.locator('section')).first();
    if (await sync.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sync).toHaveScreenshot('dark-admin-scim-sync.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-scim-sync.png', ELEMENT_OPTS);
    }
  });

  test('SCIM — provisioning controls dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const controls = page.locator('form').or(page.locator('.controls')).first();
    if (await controls.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(controls).toHaveScreenshot('dark-admin-scim-controls.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-scim-controls.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Admin Settings @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('settings — full page dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    await expect(page).toHaveScreenshot('dark-admin-settings-full.png', STABLE_OPTS);
  });

  test('settings — header dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const header = page.locator('header').or(page.locator('h1')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-admin-settings-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-settings-header.png', ELEMENT_OPTS);
    }
  });

  test('settings — form controls dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-admin-settings-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-settings-form.png', ELEMENT_OPTS);
    }
  });

  test('settings — navigation tabs dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const tabs = page.locator('[role="tablist"]').or(page.locator('.tabs')).first();
    if (await tabs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tabs).toHaveScreenshot('dark-admin-settings-tabs.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-settings-tabs.png', ELEMENT_OPTS);
    }
  });

  test('settings — action buttons dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const actions = page.locator('footer').or(page.locator('.actions')).first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('dark-admin-settings-actions.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-settings-actions.png', ELEMENT_OPTS);
    }
  });

  test('settings — theme preview dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const preview = page.locator('.preview').or(page.locator('section')).first();
    if (await preview.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(preview).toHaveScreenshot('dark-admin-settings-preview.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-admin-settings-preview.png', ELEMENT_OPTS);
    }
  });
});
