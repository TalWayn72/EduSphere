/**
 * Visual Regression — Dark Mode Public Pages (Part 2)
 *
 * Pricing, Help, Features pages in dark mode.
 * Split from visual-dark-mode-public.spec.ts (Part 2 of 2).
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-public-part2.spec.ts-snapshots/
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
// PRICING PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Pricing @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('pricing — full page dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    await expect(page).toHaveScreenshot('dark-public-pricing-full.png', STABLE_OPTS);
  });

  test('pricing — header dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-public-pricing-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-pricing-header.png', ELEMENT_OPTS);
    }
  });

  test('pricing — plans grid dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const plans = page.locator('main').first();
    if (await plans.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(plans).toHaveScreenshot('dark-public-pricing-plans.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-pricing-plans.png', ELEMENT_OPTS);
    }
  });

  test('pricing — feature comparison dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const features = page.locator('table').or(page.locator('section')).first();
    if (await features.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(features).toHaveScreenshot('dark-public-pricing-features.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-pricing-features.png', ELEMENT_OPTS);
    }
  });

  test('pricing — CTA section dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const cta = page.locator('footer').first();
    if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cta).toHaveScreenshot('dark-public-pricing-cta.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-pricing-cta.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELP PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Help @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('help — full page dark', async ({ page }) => {
    await goToDark(page, '/help');
    await expect(page).toHaveScreenshot('dark-public-help-full.png', STABLE_OPTS);
  });

  test('help — header dark', async ({ page }) => {
    await goToDark(page, '/help');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-public-help-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-help-header.png', ELEMENT_OPTS);
    }
  });

  test('help — main content dark', async ({ page }) => {
    await goToDark(page, '/help');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-public-help-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-help-main.png', ELEMENT_OPTS);
    }
  });

  test('help — search bar dark', async ({ page }) => {
    await goToDark(page, '/help');
    const search = page.locator('input[type="search"]').or(page.locator('input')).first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(search).toHaveScreenshot('dark-public-help-search.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-help-search.png', ELEMENT_OPTS);
    }
  });

  test('help — FAQ section dark', async ({ page }) => {
    await goToDark(page, '/help');
    const faq = page.locator('section').first();
    if (await faq.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(faq).toHaveScreenshot('dark-public-help-faq.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-help-faq.png', ELEMENT_OPTS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Features @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(60_000);

  test('features — full page dark', async ({ page }) => {
    await goToDark(page, '/features');
    await expect(page).toHaveScreenshot('dark-public-features-full.png', STABLE_OPTS);
  });

  test('features — header dark', async ({ page }) => {
    await goToDark(page, '/features');
    const header = page.locator('header').or(page.locator('nav')).first();
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(header).toHaveScreenshot('dark-public-features-header.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-features-header.png', ELEMENT_OPTS);
    }
  });

  test('features — main content dark', async ({ page }) => {
    await goToDark(page, '/features');
    const main = page.locator('main').or(page.locator('[role="main"]')).first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(main).toHaveScreenshot('dark-public-features-main.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-features-main.png', ELEMENT_OPTS);
    }
  });

  test('features — feature cards dark', async ({ page }) => {
    await goToDark(page, '/features');
    const cards = page.locator('section').first();
    if (await cards.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cards).toHaveScreenshot('dark-public-features-cards.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-features-cards.png', ELEMENT_OPTS);
    }
  });

  test('features — footer dark', async ({ page }) => {
    await goToDark(page, '/features');
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(footer).toHaveScreenshot('dark-public-features-footer.png', ELEMENT_OPTS);
    } else {
      await expect(page).toHaveScreenshot('dark-public-features-footer.png', ELEMENT_OPTS);
    }
  });
});
