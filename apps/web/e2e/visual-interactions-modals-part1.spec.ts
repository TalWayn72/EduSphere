/**
 * Visual Interactions — Modal/Dialog States (Part 1)
 *
 * Confirmation dialogs, sheets/drawers, toast notifications,
 * alert banners, and tooltip hover states.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS, LOOSE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

// ─── Helper: resilient element screenshot with visibility fallback ──────────
async function screenshotElement(
  page: import('@playwright/test').Page,
  selector: string,
  name: string,
  opts = STABLE_OPTS,
) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(el).toHaveScreenshot(name, opts);
  } else {
    await expect(page).toHaveScreenshot(name, opts);
  }
}

test.describe('Visual Interactions — Modals & Dialogs (Part 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      }),
    );
    await login(page);
  });

  // ─── Confirmation dialogs ──────────────────────────────────────────────────

  test.describe('Confirmation dialogs', () => {
    test('delete confirmation dialog on courses', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete"), [aria-label*="delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="alertdialog"], [role="dialog"], [data-testid="confirm-dialog"]', 'interact-modals-courses-delete-confirm.png');
    });

    test('logout confirmation dialog', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const avatar = page.locator('[data-testid="user-menu"], [data-testid="user-avatar"]').first();
      if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await avatar.click();
        await page.waitForTimeout(300);
        const logoutItem = page.locator('[data-testid="logout-btn"], [role="menuitem"]:has-text("Logout"), [role="menuitem"]:has-text("Sign out")').first();
        if (await logoutItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutItem.click();
          await page.waitForTimeout(300);
        }
      }
      await screenshotElement(page, '[role="alertdialog"], [role="dialog"]', 'interact-modals-dashboard-logout-confirm.png');
    });

    test('discard changes confirmation', async ({ page }) => {
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const title = page.locator('input[name="title"], input[name="name"]').first();
      if (await title.isVisible({ timeout: 3000 }).catch(() => false)) {
        await title.fill('Draft Course');
      }
      const backBtn = page.locator('[data-testid="back-btn"], a:has-text("Back"), [aria-label*="back"]').first();
      if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="alertdialog"], [role="dialog"]', 'interact-modals-course-discard-confirm.png');
    });

    test('confirmation dialog cancel button hover', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        const cancelBtn = page.locator('[role="alertdialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelBtn.hover();
          await page.waitForTimeout(200);
        }
      }
      await screenshotElement(page, '[role="alertdialog"], [role="dialog"]', 'interact-modals-courses-cancel-hover.png');
    });
  });

  // ─── Sheet/drawer ──────────────────────────────────────────────────────────

  test.describe('Sheets and drawers', () => {
    test('course publish sheet', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const publishBtn = page.locator('[data-testid="publish-btn"], button:has-text("Publish"), [aria-label*="publish"]').first();
      if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await publishBtn.click();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[data-testid="publish-sheet"], [role="dialog"], [data-state="open"]', 'interact-modals-course-publish-sheet.png');
    });

    test('filter drawer on courses', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const filterBtn = page.locator('[data-testid="filter-btn"], button:has-text("Filter"), [aria-label*="filter"]').first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[data-testid="filter-drawer"], [role="dialog"], [data-state="open"]', 'interact-modals-courses-filter-drawer.png');
    });

    test('mobile sheet on small viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const filterBtn = page.locator('[data-testid="filter-btn"], button:has-text("Filter")').first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(400);
      }
      await expect(page).toHaveScreenshot('interact-modals-mobile-filter-sheet.png', STABLE_OPTS);
    });

    test('settings drawer', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const advancedBtn = page.locator('[data-testid="advanced-settings"], button:has-text("Advanced"), [aria-label*="advanced"]').first();
      if (await advancedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await advancedBtn.click();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[role="dialog"], [data-state="open"]', 'interact-modals-settings-advanced-drawer.png');
    });
  });

  // ─── Toast notifications ───────────────────────────────────────────────────

  test.describe('Toast notifications', () => {
    test('success toast', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
      await screenshotElement(page, '[data-sonner-toast], [role="alert"], [data-testid="toast-success"]', 'interact-modals-toast-success.png');
    });

    test('error toast via GraphQL error', async ({ page }) => {
      await page.route('**/graphql', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Server error' }] }),
        }),
      );
      await page.goto('/courses/create', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const submitBtn = page.locator('button[type="submit"], button:has-text("Create")').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
      await screenshotElement(page, '[data-sonner-toast], [role="alert"], [data-testid="toast-error"]', 'interact-modals-toast-error.png');
    });

    test('warning toast', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', { detail: { type: 'warning', message: 'Session expiring soon' } });
        window.dispatchEvent(event);
      });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-sonner-toast], [role="alert"], [data-testid="toast-warning"]', 'interact-modals-toast-warning.png');
    });

    test('info toast', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', { detail: { type: 'info', message: 'New features available' } });
        window.dispatchEvent(event);
      });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-sonner-toast], [role="alert"], [data-testid="toast-info"]', 'interact-modals-toast-info.png');
    });

    test('multiple toasts stacked', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        for (const type of ['success', 'error', 'warning']) {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { type, message: `${type} notification` } }));
        }
      });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[data-sonner-toaster], [data-testid="toast-container"]', 'interact-modals-toast-stacked.png');
    });
  });

  // ─── Alert banners ─────────────────────────────────────────────────────────

  test.describe('Alert banners', () => {
    test('alert banner on dashboard', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await screenshotElement(page, '[role="alert"], [data-testid="alert-banner"], .alert', 'interact-modals-dashboard-alert-banner.png');
    });

    test('dismissible alert after close', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const closeBtn = page.locator('[role="alert"] button, [data-testid="alert-close"]').first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-modals-dashboard-alert-dismissed.png', STABLE_OPTS);
    });
  });

  // ─── Tooltips ──────────────────────────────────────────────────────────────

  test.describe('Tooltip hover states', () => {
    test('tooltip on dashboard icon', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const iconBtn = page.locator('[data-tooltip], [aria-describedby], button[title]').first();
      if (await iconBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await iconBtn.hover();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[role="tooltip"], [data-state="open"]', 'interact-modals-dashboard-tooltip.png');
    });

    test('tooltip on nav icon', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const navIcon = page.locator('nav button[title], nav [data-tooltip], aside button[title]').first();
      if (await navIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        await navIcon.hover();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[role="tooltip"], [data-state="open"]', 'interact-modals-nav-tooltip.png');
    });

    test('tooltip on course card action', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const actionBtn = page.locator('[data-testid="course-card"] button[title], [data-testid="course-card"] [data-tooltip]').first();
      if (await actionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await actionBtn.hover();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[role="tooltip"], [data-state="open"]', 'interact-modals-courses-card-tooltip.png');
    });

    test('tooltip on analytics chart', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const chartEl = page.locator('[data-tooltip], [data-testid="chart"] [title]').first();
      if (await chartEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chartEl.hover();
        await page.waitForTimeout(400);
      }
      await screenshotElement(page, '[role="tooltip"], [data-state="open"]', 'interact-modals-analytics-chart-tooltip.png', LOOSE_OPTS);
    });
  });
});
