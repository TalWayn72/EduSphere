/**
 * Visual Regression — Dark Mode Public Pages (Part 1)
 *
 * Landing, Login, About pages in dark mode.
 * Split from visual-dark-mode-public.spec.ts (Part 1 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-public-part1.spec.ts-snapshots/
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
// LANDING PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Landing @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('landing — full page dark', async ({ page }) => {
    await goToDark(page, '/');
    await expect(page).toHaveScreenshot('dark-public-landing-full.png', STABLE_OPTS);
  });

  test('landing — header dark', async ({ page }) => {
    await goToDark(page, '/');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-public-landing-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-landing-header.png', ELEMENT_OPTS);
    }
  });

  test('landing — main content dark', async ({ page }) => {
    await goToDark(page, '/');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-public-landing-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-landing-main.png', ELEMENT_OPTS);
    }
  });

  test('landing — hero section dark', async ({ page }) => {
    await goToDark(page, '/');
    const hero = page.locator('section').first();
    if (await hero.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(hero).toHaveScreenshot('dark-public-landing-hero.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-landing-hero.png', ELEMENT_OPTS);
    }
  });

  test('landing — footer dark', async ({ page }) => {
    await goToDark(page, '/');
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(footer).toHaveScreenshot('dark-public-landing-footer.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-landing-footer.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Login @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('login — full page dark', async ({ page }) => {
    await goToDark(page, '/login');
    await expect(page).toHaveScreenshot('dark-public-login-full.png', STABLE_OPTS);
  });

  test('login — header dark', async ({ page }) => {
    await goToDark(page, '/login');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-public-login-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-login-header.png', ELEMENT_OPTS);
    }
  });

  test('login — form area dark', async ({ page }) => {
    await goToDark(page, '/login');
    const form = page.locator('form').or(page.locator('main')).first();
    if (await form.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(form).toHaveScreenshot('dark-public-login-form.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-login-form.png', ELEMENT_OPTS);
    }
  });

  test('login — submit button dark', async ({ page }) => {
    await goToDark(page, '/login');
    const btn = page.locator('button[type="submit"]').or(page.locator('button')).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toHaveScreenshot('dark-public-login-button.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-login-button.png', ELEMENT_OPTS);
    }
  });

  test('login — branding dark', async ({ page }) => {
    await goToDark(page, '/login');
    const branding = page.locator('.logo').or(page.locator('img[alt*="logo"]')).first();
    if (await branding.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(branding).toHaveScreenshot('dark-public-login-branding.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-login-branding.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode About @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('about — full page dark', async ({ page }) => {
    await goToDark(page, '/about');
    await expect(page).toHaveScreenshot('dark-public-about-full.png', STABLE_OPTS);
  });

  test('about — header dark', async ({ page }) => {
    await goToDark(page, '/about');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-public-about-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-about-header.png', ELEMENT_OPTS);
    }
  });

  test('about — main content dark', async ({ page }) => {
    await goToDark(page, '/about');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-public-about-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-about-main.png', ELEMENT_OPTS);
    }
  });

  test('about — team section dark', async ({ page }) => {
    await goToDark(page, '/about');
    const team = page.locator('section:nth-of-type(2)').or(page.locator('section')).first();
    if (await team.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(team).toHaveScreenshot('dark-public-about-team.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-about-team.png', ELEMENT_OPTS);
    }
  });

  test('about — footer dark', async ({ page }) => {
    await goToDark(page, '/about');
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(footer).toHaveScreenshot('dark-public-about-footer.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-about-footer.png', ELEMENT_OPTS);
    }
  });
});
