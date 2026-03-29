/**
 * visual-rtl-public-part2.spec.ts --- RTL Layout Visual Regression for Public Pages — Part 2
 *
 * Covers: Pricing page, Help/FAQ page, cross-page RTL consistency checks.
 *
 * Snapshots stored in: apps/web/e2e/visual-rtl-public-part2.spec.ts-snapshots/
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-rtl-public-part2.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { STABLE_OPTS } from './helpers/visual-test-utils';
test.use({ reducedMotion: 'reduce' });

test.use({ locale: 'he' });

test.describe('Visual RTL -- Public Pages Part 2 @visual @rtl', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.dir = 'rtl';
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
  });

  // --- Pricing page ---

  test('pricing -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-public-pricing-full.png', STABLE_OPTS);
  });

  test('pricing -- header RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('rtl-public-pricing-header.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-pricing-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('pricing -- pricing cards RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const content = page.locator('main').first();
    if (await content.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(content).toHaveScreenshot('rtl-public-pricing-cards.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-pricing-cards.png', {
        animations: 'disabled',
      });
    }
  });

  test('pricing -- CTA buttons RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const buttons = page.locator('main').first();
    if (await buttons.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(buttons).toHaveScreenshot('rtl-public-pricing-cta.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-pricing-cta.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test('pricing -- footer RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(footer).toHaveScreenshot('rtl-public-pricing-footer.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-pricing-footer.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Help / FAQ page ---

  test('help -- full page RTL layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('rtl-public-help-full.png', STABLE_OPTS);
  });

  test('help -- header RTL alignment', async ({ page }) => {
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('rtl-public-help-header.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-help-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('help -- content RTL direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const content = page.locator('main').first();
    if (await content.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(content).toHaveScreenshot('rtl-public-help-content.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-help-content.png', {
        animations: 'disabled',
      });
    }
  });

  test('help -- FAQ items RTL text direction', async ({ page }) => {
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const faq = page.locator('main section').nth(1);
    if (await faq.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(faq).toHaveScreenshot('rtl-public-help-faq.png', {
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('rtl-public-help-faq.png', {
        animations: 'disabled',
      });
    }
  });

  // --- Cross-page RTL consistency checks ---

  test('all public pages -- consistent RTL header layout', async ({ page }) => {
    const pages = ['/', '/login', '/about', '/pricing', '/help'];
    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const header = page.locator('header').first();
      const slug = path === '/' ? 'landing' : path.replace('/', '');
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(header).toHaveScreenshot(`rtl-public-consistency-header-${slug}.png`, {
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot(`rtl-public-consistency-header-${slug}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

  test('all public pages -- consistent RTL footer layout', async ({ page }) => {
    const pages = ['/', '/about', '/pricing', '/help'];
    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const footer = page.locator('footer').first();
      const slug = path === '/' ? 'landing' : path.replace('/', '');
      if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(footer).toHaveScreenshot(`rtl-public-consistency-footer-${slug}.png`, {
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot(`rtl-public-consistency-footer-${slug}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

});
