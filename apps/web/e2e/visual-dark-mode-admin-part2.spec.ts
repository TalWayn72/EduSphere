/**
 * Visual Regression — Dark Mode Admin Pages (Part 2)
 *
 * SCIM Provisioning, Admin Settings in dark mode.
 * Split from visual-dark-mode-admin.spec.ts (Part 2 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-admin-part2.spec.ts-snapshots/
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
// SCIM PROVISIONING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Admin SCIM @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

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
  test.setTimeout(60_000);

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
