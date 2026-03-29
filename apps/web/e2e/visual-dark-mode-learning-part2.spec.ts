/**
 * Visual Regression — Dark Mode Learning Pages (Part 2)
 *
 * Social, Profile, Settings in dark mode.
 * Split from visual-dark-mode-learning.spec.ts (Part 2 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-learning-part2.spec.ts-snapshots/
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
// SOCIAL
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Social @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('social — full page dark', async ({ page }) => {
    await goToDark(page, '/social');
    await expect(page).toHaveScreenshot('dark-learning-social-full.png', STABLE_OPTS);
  });

  test('social — header dark', async ({ page }) => {
    await goToDark(page, '/social');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-social-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-header.png', ELEMENT_OPTS);
    }
  });

  test('social — feed area dark', async ({ page }) => {
    await goToDark(page, '/social');
    const feed = page.locator('.feed').or(page.locator('main')).first();
    if (await feed.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(feed).toHaveScreenshot('dark-learning-social-feed.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-feed.png', ELEMENT_OPTS);
    }
  });

  test('social — post composer dark', async ({ page }) => {
    await goToDark(page, '/social');
    const composer = page.locator('textarea').or(page.locator('.composer')).first();
    if (await composer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(composer).toHaveScreenshot('dark-learning-social-composer.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-composer.png', ELEMENT_OPTS);
    }
  });

  test('social — sidebar dark', async ({ page }) => {
    await goToDark(page, '/social');
    const sidebar = page.locator('aside').or(page.locator('.sidebar')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('dark-learning-social-sidebar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-social-sidebar.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Profile @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('profile — full page dark', async ({ page }) => {
    await goToDark(page, '/profile');
    await expect(page).toHaveScreenshot('dark-learning-profile-full.png', STABLE_OPTS);
  });

  test('profile — header dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-profile-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-header.png', ELEMENT_OPTS);
    }
  });

  test('profile — avatar section dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const avatar = page.locator('.avatar').or(page.locator('img')).first();
    if (await avatar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(avatar).toHaveScreenshot('dark-learning-profile-avatar.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-avatar.png', ELEMENT_OPTS);
    }
  });

  test('profile — details form dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-learning-profile-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-form.png', ELEMENT_OPTS);
    }
  });

  test('profile — activity section dark', async ({ page }) => {
    await goToDark(page, '/profile');
    const activity = page.locator('.activity').or(page.locator('section')).first();
    if (await activity.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activity).toHaveScreenshot('dark-learning-profile-activity.png', LOOSE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-profile-activity.png', LOOSE_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Settings @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('settings — full page dark', async ({ page }) => {
    await goToDark(page, '/settings');
    await expect(page).toHaveScreenshot('dark-learning-settings-full.png', STABLE_OPTS);
  });

  test('settings — header dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-learning-settings-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-header.png', ELEMENT_OPTS);
    }
  });

  test('settings — form controls dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-learning-settings-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-form.png', ELEMENT_OPTS);
    }
  });

  test('settings — theme toggle dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const toggle = page.locator('[role="switch"]').or(page.locator('.theme-toggle')).first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toggle).toHaveScreenshot('dark-learning-settings-theme.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-theme.png', ELEMENT_OPTS);
    }
  });

  test('settings — notification preferences dark', async ({ page }) => {
    await goToDark(page, '/settings');
    const notifs = page.locator('.notification-settings').or(page.locator('section')).first();
    if (await notifs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(notifs).toHaveScreenshot('dark-learning-settings-notifications.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-learning-settings-notifications.png', ELEMENT_OPTS);
    }
  });
});
