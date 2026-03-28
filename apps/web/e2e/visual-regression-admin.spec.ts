/**
 * Visual Regression Tests — Admin Pages
 *
 * Covers admin dashboard, compliance, LTI, SCIM, and settings pages.
 * 25 visual assertions total.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-admin --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

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
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Dashboard @visual-admin', () => {
  test.setTimeout(30_000);

  test('admin dashboard — full page', async ({ page }) => {
    await goTo(page, '/admin');
    await expect(page).toHaveScreenshot('admin-dashboard-full.png', STABLE_OPTS);
  });

  test('admin dashboard — header section', async ({ page }) => {
    await goTo(page, '/admin');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('admin-dashboard-header.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — sidebar navigation', async ({ page }) => {
    await goTo(page, '/admin');
    const sidebar = page.locator('nav, [data-testid="sidebar"], aside').first();
    await expect(sidebar).toHaveScreenshot('admin-dashboard-sidebar.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — main content area', async ({ page }) => {
    await goTo(page, '/admin');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('admin-dashboard-main.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — stats cards', async ({ page }) => {
    await goTo(page, '/admin');
    const cards = page.locator('[data-testid="stats-card"], .stats-card, .card').first();
    await expect(cards).toHaveScreenshot('admin-dashboard-stats.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Compliance @visual-admin', () => {
  test.setTimeout(30_000);

  test('compliance — full page', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await expect(page).toHaveScreenshot('admin-compliance-full.png', STABLE_OPTS);
  });

  test('compliance — header section', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('admin-compliance-header.png', { animations: 'disabled' as const });
  });

  test('compliance — main content', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('admin-compliance-main.png', { animations: 'disabled' as const });
  });

  test('compliance — report table', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    const table = page.locator('table, [data-testid="compliance-table"], [role="table"]').first();
    await expect(table).toHaveScreenshot('admin-compliance-table.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LTI INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin LTI @visual-admin', () => {
  test.setTimeout(30_000);

  test('LTI settings — full page', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await expect(page).toHaveScreenshot('admin-lti-full.png', STABLE_OPTS);
  });

  test('LTI settings — header section', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('admin-lti-header.png', { animations: 'disabled' as const });
  });

  test('LTI settings — configuration form', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const form = page.locator('form, [data-testid="lti-config"], main').first();
    await expect(form).toHaveScreenshot('admin-lti-form.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCIM PROVISIONING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin SCIM @visual-admin', () => {
  test.setTimeout(30_000);

  test('SCIM provisioning — full page', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await expect(page).toHaveScreenshot('admin-scim-full.png', STABLE_OPTS);
  });

  test('SCIM provisioning — header section', async ({ page }) => {
    await goTo(page, '/admin/scim');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('admin-scim-header.png', { animations: 'disabled' as const });
  });

  test('SCIM provisioning — main content', async ({ page }) => {
    await goTo(page, '/admin/scim');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('admin-scim-main.png', { animations: 'disabled' as const });
  });

  test('SCIM provisioning — endpoint list', async ({ page }) => {
    await goTo(page, '/admin/scim');
    const list = page.locator('[data-testid="scim-endpoints"], table, ul').first();
    await expect(list).toHaveScreenshot('admin-scim-endpoints.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Settings @visual-admin', () => {
  test.setTimeout(30_000);

  test('settings — full page', async ({ page }) => {
    await goTo(page, '/admin/settings');
    await expect(page).toHaveScreenshot('admin-settings-full.png', STABLE_OPTS);
  });

  test('settings — header section', async ({ page }) => {
    await goTo(page, '/admin/settings');
    const header = page.locator('header, [data-testid="page-header"], h1').first();
    await expect(header).toHaveScreenshot('admin-settings-header.png', { animations: 'disabled' as const });
  });

  test('settings — form controls', async ({ page }) => {
    await goTo(page, '/admin/settings');
    const form = page.locator('form, [data-testid="settings-form"], main').first();
    await expect(form).toHaveScreenshot('admin-settings-form.png', { animations: 'disabled' as const });
  });

  test('settings — action buttons', async ({ page }) => {
    await goTo(page, '/admin/settings');
    const actions = page.locator('[data-testid="settings-actions"], .actions, footer').first();
    await expect(actions).toHaveScreenshot('admin-settings-actions.png', { animations: 'disabled' as const });
  });

  test('settings — navigation tabs', async ({ page }) => {
    await goTo(page, '/admin/settings');
    const tabs = page.locator('[role="tablist"], [data-testid="settings-tabs"], .tabs').first();
    await expect(tabs).toHaveScreenshot('admin-settings-tabs.png', { animations: 'disabled' as const });
  });

  test('admin dashboard — breadcrumbs', async ({ page }) => {
    await goTo(page, '/admin');
    const breadcrumbs = page.locator('[data-testid="breadcrumbs"], nav[aria-label="breadcrumb"], .breadcrumb').first();
    await expect(breadcrumbs).toHaveScreenshot('admin-dashboard-breadcrumbs.png', { animations: 'disabled' as const });
  });

  test('compliance — action buttons', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    const actions = page.locator('[data-testid="compliance-actions"], button, .actions').first();
    await expect(actions).toHaveScreenshot('admin-compliance-actions.png', { animations: 'disabled' as const });
  });

  test('LTI settings — connection list', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const list = page.locator('[data-testid="lti-connections"], table, [role="list"], main').first();
    await expect(list).toHaveScreenshot('admin-lti-connections.png', { animations: 'disabled' as const });
  });

  test('SCIM provisioning — sync status', async ({ page }) => {
    await goTo(page, '/admin/scim');
    const sync = page.locator('[data-testid="sync-status"], .status, section').first();
    await expect(sync).toHaveScreenshot('admin-scim-sync.png', { animations: 'disabled' as const });
  });
});
