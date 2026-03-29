/**
 * visual-rtl-public-part1.spec.ts --- RTL Layout Visual Regression for Public Pages — Part 1
 *
 * Covers: Landing page, Login page, About page.
 *
 * Snapshots stored in: apps/web/e2e/visual-rtl-public-part1.spec.ts-snapshots/
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-public-part1.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { STABLE_OPTS } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.use({ locale: 'he' });

test.describe('Visual RTL -- Public Pages Part 1 @visual @rtl', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
  });

  // --- Landing page ---

  test('landing -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-public-landing-full.png', STABLE_OPTS);
  });

  test('landing -- header RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('rtl-public-landing-header.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-landing-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('landing -- hero content RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const hero = page.locator('main section').first();
    if (await hero.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(hero).toHaveScreenshot('rtl-public-landing-hero.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-landing-hero.png', {
        animations: 'disabled',
      });
    }
  });

  test('landing -- footer RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(footer).toHaveScreenshot('rtl-public-landing-footer.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-landing-footer.png', {
        animations: 'disabled',
      });
    }
  });

  test('landing -- navigation links RTL order', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const nav = page.locator('nav').first();
    if (await nav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(nav).toHaveScreenshot('rtl-public-landing-nav.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-landing-nav.png', {
        animations: 'disabled',
      });
    }
  });

  test('landing -- CTA section RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const cta = page.locator('main section').nth(1);
    if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cta).toHaveScreenshot('rtl-public-landing-cta.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-landing-cta.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Login page ---

  test('login -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-public-login-full.png', STABLE_OPTS);
  });

  test('login -- form RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const form = page.locator('form').first().or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('rtl-public-login-form.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-login-form.png', {
        animations: 'disabled',
      });
    }
  });

  test('login -- header RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('rtl-public-login-header.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-login-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('login -- footer RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(footer).toHaveScreenshot('rtl-public-login-footer.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-login-footer.png', {
        animations: 'disabled',
      });
    }
  });

  // --- About page ---

  test('about -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-public-about-full.png', STABLE_OPTS);
  });

  test('about -- header RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('rtl-public-about-header.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-about-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('about -- content section RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const content = page.locator('main').first();
    if (await content.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(content).toHaveScreenshot('rtl-public-about-content.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-about-content.png', {
        animations: 'disabled',
      });
    }
  });

  test('about -- team section RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const section = page.locator('main section').nth(1);
    if (await section.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(section).toHaveScreenshot('rtl-public-about-team.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-about-team.png', {
        animations: 'disabled',
      });
    }
  });

});
