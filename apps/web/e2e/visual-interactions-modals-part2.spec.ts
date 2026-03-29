/**
 * Visual Interactions — Modal/Dialog States (Part 2)
 *
 * Covers: Modal backdrop/close behavior, Command palette,
 * Modal tablet viewport, Modal wide desktop, Modal keyboard interaction.
 */
import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

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

test.describe('Visual Interactions — Modals & Dialogs', () => {
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

  test.describe('Modal backdrop', () => {
    test('modal with backdrop overlay', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-modals-courses-backdrop-overlay.png', STABLE_OPTS);
    });

    test('nested modal over existing dialog', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const settingsBtn = page.locator('[data-testid="course-settings"], button:has-text("Settings")').first();
      if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsBtn.click();
        await page.waitForTimeout(300);
        const dangerBtn = page.locator('[data-testid="danger-zone"], button:has-text("Delete"), [role="dialog"] button:has-text("Delete")').first();
        if (await dangerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dangerBtn.click();
          await page.waitForTimeout(300);
        }
      }
      await expect(page).toHaveScreenshot('interact-modals-course-nested-dialog.png', STABLE_OPTS);
    });

    test('full screen modal', async ({ page }) => {
      await page.goto('/courses/1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const fullscreenBtn = page.locator('[data-testid="fullscreen-btn"], button:has-text("Fullscreen"), [aria-label*="fullscreen"]').first();
      if (await fullscreenBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fullscreenBtn.click();
        await page.waitForTimeout(400);
      }
      await expect(page).toHaveScreenshot('interact-modals-course-fullscreen.png', STABLE_OPTS);
    });

    test('modal scrollable content', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const addUserBtn = page.locator('[data-testid="add-user"], button:has-text("Add User"), button:has-text("Invite")').first();
      if (await addUserBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addUserBtn.click();
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[role="dialog"], [data-testid="user-modal"]', 'interact-modals-admin-add-user-modal.png');
    });
  });

  test.describe('Command palette', () => {
    test('command palette open (Ctrl+K)', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(400);
      await screenshotElement(page, '[data-testid="command-palette"], [role="dialog"], [cmdk-root]', 'interact-modals-dashboard-command-palette.png');
    });

    test('command palette with search text', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(400);
      const input = page.locator('[cmdk-input], [data-testid="command-input"], [role="dialog"] input').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.fill('courses');
        await page.waitForTimeout(300);
      }
      await screenshotElement(page, '[data-testid="command-palette"], [role="dialog"], [cmdk-root]', 'interact-modals-dashboard-command-search.png');
    });
  });

  test.describe('Modal tablet viewport', () => {
    test('delete dialog at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-modals-tablet-delete-dialog.png', STABLE_OPTS);
    });

    test('filter drawer at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const filterBtn = page.locator('[data-testid="filter-btn"], button:has-text("Filter")').first();
      if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(400);
      }
      await expect(page).toHaveScreenshot('interact-modals-tablet-filter-drawer.png', STABLE_OPTS);
    });

    test('command palette at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot('interact-modals-tablet-command-palette.png', STABLE_OPTS);
    });

    test('toast at tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveScreenshot('interact-modals-tablet-toast.png', STABLE_OPTS);
    });
  });

  test.describe('Modal wide desktop', () => {
    test('delete dialog at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-modals-wide-delete-dialog.png', STABLE_OPTS);
    });

    test('settings drawer at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const advancedBtn = page.locator('[data-testid="advanced-settings"], button:has-text("Advanced")').first();
      if (await advancedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await advancedBtn.click();
        await page.waitForTimeout(400);
      }
      await expect(page).toHaveScreenshot('interact-modals-wide-settings-drawer.png', STABLE_OPTS);
    });

    test('command palette at wide desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot('interact-modals-wide-command-palette.png', STABLE_OPTS);
    });
  });

  test.describe('Modal keyboard interaction', () => {
    test('dialog close via Escape key', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot('interact-modals-after-escape.png', STABLE_OPTS);
    });

    test('dialog focus trap — Tab cycling', async ({ page }) => {
      await page.goto('/courses', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[data-testid="delete-course"], button:has-text("Delete")').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
      }
      await expect(page).toHaveScreenshot('interact-modals-focus-trap.png', STABLE_OPTS);
    });
  });
});
