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
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

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
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('dark-admin-dashboard-header.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — sidebar dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const sidebar = page.locator('nav, [data-testid="sidebar"], aside').first();
    await expect(sidebar).toHaveScreenshot('dark-admin-dashboard-sidebar.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — main content dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-admin-dashboard-main.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — stats cards dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const cards = page.locator('[data-testid="stats-card"], .stats-card, .card').first();
    await expect(cards).toHaveScreenshot('dark-admin-dashboard-stats.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — breadcrumbs dark', async ({ page }) => {
    await goToDark(page, '/admin');
    const breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav[aria-label="breadcrumb"], .breadcrumb').first();
    await expect(breadcrumbs).toHaveScreenshot('dark-admin-dashboard-breadcrumbs.png', { animations: 'disabled' as const });
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
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('dark-admin-compliance-header.png', { animations: 'disabled' as const });
  });

  test('compliance — main content dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-admin-compliance-main.png', { animations: 'disabled' as const });
  });

  test('compliance — report table dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const table = page.locator('table, [data-testid="compliance-table"], [role="table"]').first();
    await expect(table).toHaveScreenshot('dark-admin-compliance-table.png', { animations: 'disabled' as const });
  });

  test('compliance — action buttons dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const actions = page.locator('[data-testid="compliance-actions"], button, .actions').first();
    await expect(actions).toHaveScreenshot('dark-admin-compliance-actions.png', { animations: 'disabled' as const });
  });

  test('compliance — status indicators dark', async ({ page }) => {
    await goToDark(page, '/admin/compliance');
    const status = page.locator('[data-testid="compliance-status"], .status-badge, .badge').first();
    await expect(status).toHaveScreenshot('dark-admin-compliance-status.png', { animations: 'disabled' as const });
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
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('dark-admin-lti-header.png', { animations: 'disabled' as const });
  });

  test('LTI — configuration form dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const form = page.locator('form, [data-testid="lti-config"], main').first();
    await expect(form).toHaveScreenshot('dark-admin-lti-form.png', { animations: 'disabled' as const });
  });

  test('LTI — connection list dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const list = page.locator('[data-testid="lti-connections"], table, [role="list"], main').first();
    await expect(list).toHaveScreenshot('dark-admin-lti-connections.png', { animations: 'disabled' as const });
  });

  test('LTI — main content dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-admin-lti-main.png', { animations: 'disabled' as const });
  });

  test('LTI — action buttons dark', async ({ page }) => {
    await goToDark(page, '/admin/lti');
    const actions = page.locator('[data-testid="lti-actions"], .actions, button').first();
    await expect(actions).toHaveScreenshot('dark-admin-lti-actions.png', { animations: 'disabled' as const });
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
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('dark-admin-scim-header.png', { animations: 'disabled' as const });
  });

  test('SCIM — main content dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-admin-scim-main.png', { animations: 'disabled' as const });
  });

  test('SCIM — endpoint list dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const list = page.locator('[data-testid="scim-endpoints"], table, ul').first();
    await expect(list).toHaveScreenshot('dark-admin-scim-endpoints.png', { animations: 'disabled' as const });
  });

  test('SCIM — sync status dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const sync = page.locator('[data-testid="sync-status"], .status, section').first();
    await expect(sync).toHaveScreenshot('dark-admin-scim-sync.png', { animations: 'disabled' as const });
  });

  test('SCIM — provisioning controls dark', async ({ page }) => {
    await goToDark(page, '/admin/scim');
    const controls = page.locator('[data-testid="scim-controls"], .controls, form').first();
    await expect(controls).toHaveScreenshot('dark-admin-scim-controls.png', { animations: 'disabled' as const });
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
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('dark-admin-settings-header.png', { animations: 'disabled' as const });
  });

  test('settings — form controls dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const form = page.locator('form, [data-testid="settings-form"], main').first();
    await expect(form).toHaveScreenshot('dark-admin-settings-form.png', { animations: 'disabled' as const });
  });

  test('settings — navigation tabs dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const tabs = page.locator('[role="tablist"], [data-testid="settings-tabs"], .tabs').first();
    await expect(tabs).toHaveScreenshot('dark-admin-settings-tabs.png', { animations: 'disabled' as const });
  });

  test('settings — action buttons dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const actions = page.locator('[data-testid="settings-actions"], .actions, footer').first();
    await expect(actions).toHaveScreenshot('dark-admin-settings-actions.png', { animations: 'disabled' as const });
  });

  test('settings — theme preview dark', async ({ page }) => {
    await goToDark(page, '/admin/settings');
    const preview = page.locator('[data-testid="theme-preview"], .preview, section').first();
    await expect(preview).toHaveScreenshot('dark-admin-settings-preview.png', { animations: 'disabled' as const });
  });
});
