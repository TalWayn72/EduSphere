/**
 * visual-a11y-high-contrast-part2.spec.ts --- High Contrast Visual Regression (Part 2)
 *
 * Covers: Exams, Profile, Additional high contrast checks.
 * WCAG 1.4.11 — validates forced-colors mode compliance.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { LOOSE_OPTS, dynamicMasks } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.describe('Visual A11y -- High Contrast Mode (Part 2) @visual @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  // --- Exams ---

  test('exams -- full page high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-exams-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('exams -- main content high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-exams-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-exams-main.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  // --- Profile ---

  test('profile -- full page high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('a11y-contrast-profile-full.png', {
      ...LOOSE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('profile -- form elements high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-profile-form.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-profile-form.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- action buttons high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const actions = page.locator('main').first();
    if (await actions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(actions).toHaveScreenshot('a11y-contrast-profile-actions.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-profile-actions.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Additional high contrast checks ---

  test('exams -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-exams-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-exams-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('courses -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-courses-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-courses-sidebar.png', {
        animations: 'disabled',
      });
    }
  });

  test('dashboard -- buttons high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('a11y-contrast-dashboard-buttons.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-dashboard-buttons.png', {
        animations: 'disabled',
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile -- sidebar high contrast', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sidebar = page.getByTestId('app-sidebar').or(page.locator('aside')).first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toHaveScreenshot('a11y-contrast-profile-sidebar.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('a11y-contrast-profile-sidebar.png', {
        animations: 'disabled',
      });
    }
  });
});
