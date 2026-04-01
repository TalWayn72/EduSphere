/**
 * visual-rtl-forms-part1.spec.ts --- RTL Layout Visual Regression for Form Pages — Part 1
 *
 * Covers: Course Create form, Settings page.
 *
 * Snapshots stored in: apps/web/e2e/visual-rtl-forms-part1.spec.ts-snapshots/
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-forms-part1.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import {
  STABLE_OPTS,
  LOOSE_OPTS,
  dynamicMasks,
} from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.use({ locale: 'he' });

test.describe('Visual RTL -- Form Pages Part 1 @visual @rtl', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
    await login(page);
  });

  // --- Course Create form ---

  test('course create -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(
      'rtl-forms-course-create-full.png',
      STABLE_OPTS
    );
  });

  test('course create -- form fields RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    const form = page.locator('form').first().or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot(
        'rtl-forms-course-create-fields.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot(
        'rtl-forms-course-create-fields.png',
        {
          animations: 'disabled',
        }
      );
    }
  });

  test('course create -- labels RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot(
        'rtl-forms-course-create-labels.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot(
        'rtl-forms-course-create-labels.png',
        {
          animations: 'disabled',
        }
      );
    }
  });

  test('course create -- submit buttons RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    const buttonArea = page
      .locator('form')
      .first()
      .or(page.locator('main'))
      .first();
    if (await buttonArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(buttonArea).toHaveScreenshot(
        'rtl-forms-course-create-buttons.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot(
        'rtl-forms-course-create-buttons.png',
        {
          animations: 'disabled',
        }
      );
    }
  });

  test('course create -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses/create`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(500);
    const sidebar = page
      .getByTestId('app-sidebar')
      .or(page.locator('aside'))
      .first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot(
        'rtl-forms-course-create-sidebar.png',
        {
          animations: 'disabled',
        }
      );
    } else {
      await expect(page).toHaveScreenshot(
        'rtl-forms-course-create-sidebar.png',
        {
          animations: 'disabled',
        }
      );
    }
  });

  // --- Settings page ---

  test('settings -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-forms-settings-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('settings -- form controls RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('rtl-forms-settings-controls.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-controls.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('settings -- toggle switches RTL placement', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const form = page
      .locator('form')
      .first()
      .or(page.locator('main section'))
      .first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('rtl-forms-settings-toggles.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-toggles.png', {
        animations: 'disabled',
      });
    }
  });

  test('settings -- save buttons RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('rtl-forms-settings-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-actions.png', {
        animations: 'disabled',
      });
    }
  });

  test('settings -- sidebar RTL position', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page
      .getByTestId('app-sidebar')
      .or(page.locator('aside'))
      .first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('rtl-forms-settings-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('settings -- topbar RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const topbar = page
      .getByTestId('topbar')
      .or(page.locator('header'))
      .first();
    if (await topbar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(topbar).toHaveScreenshot('rtl-forms-settings-topbar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-forms-settings-topbar.png', {
        animations: 'disabled',
      });
    }
  });
});
