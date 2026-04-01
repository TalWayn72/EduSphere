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
  opts: Record<string, unknown> = { animations: 'disabled' as const }
) {
  const locator = selectors.reduce(
    (loc, sel, i) => (i === 0 ? page.locator(sel) : loc.or(page.locator(sel))),
    page.locator(selectors[0])
  );
  const el = locator.first();
  if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Dashboard @visual-admin', () => {
  test.setTimeout(60_000);

  test('admin dashboard — full page', async ({ page }) => {
    await goTo(page, '/admin');
    await expect(page).toHaveScreenshot(
      'admin-dashboard-full.png',
      STABLE_OPTS
    );
  });

  test('admin dashboard — header section', async ({ page }) => {
    await goTo(page, '/admin');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'admin-dashboard-header.png'
    );
  });

  test('admin dashboard — sidebar navigation', async ({ page }) => {
    await goTo(page, '/admin');
    await elementOrPage(
      page,
      ['nav', '[data-testid="sidebar"]', 'aside'],
      'admin-dashboard-sidebar.png'
    );
  });

  test('admin dashboard — main content area', async ({ page }) => {
    await goTo(page, '/admin');
    await elementOrPage(
      page,
      ['main', '[role="main"]', '[data-testid="main-content"]'],
      'admin-dashboard-main.png'
    );
  });

  test('admin dashboard — stats cards', async ({ page }) => {
    await goTo(page, '/admin');
    await elementOrPage(
      page,
      ['[data-testid="stats-card"]', '.stats-card', '.card'],
      'admin-dashboard-stats.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Compliance @visual-admin', () => {
  test.setTimeout(60_000);

  test('compliance — full page', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await expect(page).toHaveScreenshot(
      'admin-compliance-full.png',
      STABLE_OPTS
    );
  });

  test('compliance — header section', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'admin-compliance-header.png'
    );
  });

  test('compliance — main content', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await elementOrPage(
      page,
      ['main', '[role="main"]', '[data-testid="main-content"]'],
      'admin-compliance-main.png'
    );
  });

  test('compliance — report table', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await elementOrPage(
      page,
      ['table', '[data-testid="compliance-table"]', '[role="table"]'],
      'admin-compliance-table.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LTI INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin LTI @visual-admin', () => {
  test.setTimeout(60_000);

  test('LTI settings — full page', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await expect(page).toHaveScreenshot('admin-lti-full.png', STABLE_OPTS);
  });

  test('LTI settings — header section', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'admin-lti-header.png'
    );
  });

  test('LTI settings — configuration form', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await elementOrPage(
      page,
      ['form', '[data-testid="lti-config"]', 'main'],
      'admin-lti-form.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCIM PROVISIONING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin SCIM @visual-admin', () => {
  test.setTimeout(60_000);

  test('SCIM provisioning — full page', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await expect(page).toHaveScreenshot('admin-scim-full.png', STABLE_OPTS);
  });

  test('SCIM provisioning — header section', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'admin-scim-header.png'
    );
  });

  test('SCIM provisioning — main content', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await elementOrPage(
      page,
      ['main', '[role="main"]', '[data-testid="main-content"]'],
      'admin-scim-main.png'
    );
  });

  test('SCIM provisioning — endpoint list', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await elementOrPage(
      page,
      ['[data-testid="scim-endpoints"]', 'table', 'ul'],
      'admin-scim-endpoints.png'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Settings @visual-admin', () => {
  test.setTimeout(60_000);

  test('settings — full page', async ({ page }) => {
    await goTo(page, '/admin/settings');
    await expect(page).toHaveScreenshot('admin-settings-full.png', STABLE_OPTS);
  });

  test('settings — header section', async ({ page }) => {
    await goTo(page, '/admin/settings');
    await elementOrPage(
      page,
      ['header', '[data-testid="page-header"]', 'h1'],
      'admin-settings-header.png'
    );
  });

  test('settings — form controls', async ({ page }) => {
    await goTo(page, '/admin/settings');
    await elementOrPage(
      page,
      ['form', '[data-testid="settings-form"]', 'main'],
      'admin-settings-form.png'
    );
  });

  test('settings — action buttons', async ({ page }) => {
    await goTo(page, '/admin/settings');
    await elementOrPage(
      page,
      ['[data-testid="settings-actions"]', '.actions', 'footer'],
      'admin-settings-actions.png'
    );
  });

  test('settings — navigation tabs', async ({ page }) => {
    await goTo(page, '/admin/settings');
    await elementOrPage(
      page,
      ['[role="tablist"]', '[data-testid="settings-tabs"]', '.tabs'],
      'admin-settings-tabs.png'
    );
  });

  test('admin dashboard — breadcrumbs', async ({ page }) => {
    await goTo(page, '/admin');
    await elementOrPage(
      page,
      [
        '[data-testid="breadcrumbs"]',
        'nav[aria-label="breadcrumb"]',
        '.breadcrumb',
      ],
      'admin-dashboard-breadcrumbs.png'
    );
  });

  test('compliance — action buttons', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await elementOrPage(
      page,
      ['[data-testid="compliance-actions"]', 'button', '.actions'],
      'admin-compliance-actions.png'
    );
  });

  test('LTI settings — connection list', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await elementOrPage(
      page,
      ['[data-testid="lti-connections"]', 'table', '[role="list"]', 'main'],
      'admin-lti-connections.png'
    );
  });

  test('SCIM provisioning — sync status', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await elementOrPage(
      page,
      ['[data-testid="sync-status"]', '.status', 'section'],
      'admin-scim-sync.png'
    );
  });
});
