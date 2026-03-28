/**
 * Visual Regression — Dark Mode Public Pages
 *
 * Screenshot-based visual regression for all public-facing pages in dark mode.
 * Uses `page.emulateMedia({ colorScheme: 'dark' })` for system-level dark mode.
 *
 * Pages: /, /login, /about, /pricing, /help, /features
 * ~30 assertions across 6 pages × 5 sections each.
 *
 * Snapshots stored in: apps/web/e2e/visual-dark-mode-public.spec.ts-snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-public --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-dark-mode-public.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function goToDark(page: Page, path: string) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page
    .locator('main, [role="main"], #root > div, .min-h-screen')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

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
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-public-landing-header.png', { animations: 'disabled' as const });
  });

  test('landing — main content dark', async ({ page }) => {
    await goToDark(page, '/');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-public-landing-main.png', { animations: 'disabled' as const });
  });

  test('landing — hero section dark', async ({ page }) => {
    await goToDark(page, '/');
    const hero = page.locator('[data-testid="hero"], .hero, section').first();
    await expect(hero).toHaveScreenshot('dark-public-landing-hero.png', { animations: 'disabled' as const });
  });

  test('landing — footer dark', async ({ page }) => {
    await goToDark(page, '/');
    const footer = page.locator('footer, [data-testid="footer"]').first();
    await expect(footer).toHaveScreenshot('dark-public-landing-footer.png', { animations: 'disabled' as const });
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
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-public-login-header.png', { animations: 'disabled' as const });
  });

  test('login — form area dark', async ({ page }) => {
    await goToDark(page, '/login');
    const form = page.locator('form, [data-testid="login-form"], main').first();
    await expect(form).toHaveScreenshot('dark-public-login-form.png', { animations: 'disabled' as const });
  });

  test('login — submit button dark', async ({ page }) => {
    await goToDark(page, '/login');
    const btn = page.locator('button[type="submit"], [data-testid="login-button"], button').first();
    await expect(btn).toHaveScreenshot('dark-public-login-button.png', { animations: 'disabled' as const });
  });

  test('login — branding dark', async ({ page }) => {
    await goToDark(page, '/login');
    const branding = page.locator('[data-testid="branding"], .logo, img[alt*="logo"]').first();
    await expect(branding).toHaveScreenshot('dark-public-login-branding.png', { animations: 'disabled' as const });
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
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-public-about-header.png', { animations: 'disabled' as const });
  });

  test('about — main content dark', async ({ page }) => {
    await goToDark(page, '/about');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-public-about-main.png', { animations: 'disabled' as const });
  });

  test('about — team section dark', async ({ page }) => {
    await goToDark(page, '/about');
    const team = page.locator('[data-testid="team"], .team, section:nth-of-type(2)').first();
    await expect(team).toHaveScreenshot('dark-public-about-team.png', { animations: 'disabled' as const });
  });

  test('about — footer dark', async ({ page }) => {
    await goToDark(page, '/about');
    const footer = page.locator('footer, [data-testid="footer"]').first();
    await expect(footer).toHaveScreenshot('dark-public-about-footer.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICING PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Pricing @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('pricing — full page dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    await expect(page).toHaveScreenshot('dark-public-pricing-full.png', STABLE_OPTS);
  });

  test('pricing — header dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-public-pricing-header.png', { animations: 'disabled' as const });
  });

  test('pricing — plans grid dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const plans = page.locator('[data-testid="pricing-plans"], .pricing-grid, main').first();
    await expect(plans).toHaveScreenshot('dark-public-pricing-plans.png', { animations: 'disabled' as const });
  });

  test('pricing — feature comparison dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const features = page.locator('[data-testid="feature-comparison"], table, section').first();
    await expect(features).toHaveScreenshot('dark-public-pricing-features.png', { animations: 'disabled' as const });
  });

  test('pricing — CTA section dark', async ({ page }) => {
    await goToDark(page, '/pricing');
    const cta = page.locator('[data-testid="cta"], .cta, footer').first();
    await expect(cta).toHaveScreenshot('dark-public-pricing-cta.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELP PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Help @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('help — full page dark', async ({ page }) => {
    await goToDark(page, '/help');
    await expect(page).toHaveScreenshot('dark-public-help-full.png', STABLE_OPTS);
  });

  test('help — header dark', async ({ page }) => {
    await goToDark(page, '/help');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-public-help-header.png', { animations: 'disabled' as const });
  });

  test('help — main content dark', async ({ page }) => {
    await goToDark(page, '/help');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-public-help-main.png', { animations: 'disabled' as const });
  });

  test('help — search bar dark', async ({ page }) => {
    await goToDark(page, '/help');
    const search = page.locator('[data-testid="help-search"], input[type="search"], input').first();
    await expect(search).toHaveScreenshot('dark-public-help-search.png', { animations: 'disabled' as const });
  });

  test('help — FAQ section dark', async ({ page }) => {
    await goToDark(page, '/help');
    const faq = page.locator('[data-testid="faq"], .faq, section').first();
    await expect(faq).toHaveScreenshot('dark-public-help-faq.png', { animations: 'disabled' as const });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dark Mode Features @visual-dark', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });
  test.setTimeout(30_000);

  test('features — full page dark', async ({ page }) => {
    await goToDark(page, '/features');
    await expect(page).toHaveScreenshot('dark-public-features-full.png', STABLE_OPTS);
  });

  test('features — header dark', async ({ page }) => {
    await goToDark(page, '/features');
    const header = page.locator('header, [data-testid="page-header"], nav').first();
    await expect(header).toHaveScreenshot('dark-public-features-header.png', { animations: 'disabled' as const });
  });

  test('features — main content dark', async ({ page }) => {
    await goToDark(page, '/features');
    const main = page.locator('main, [role="main"], [data-testid="main-content"]').first();
    await expect(main).toHaveScreenshot('dark-public-features-main.png', { animations: 'disabled' as const });
  });

  test('features — feature cards dark', async ({ page }) => {
    await goToDark(page, '/features');
    const cards = page.locator('[data-testid="feature-cards"], .features-grid, section').first();
    await expect(cards).toHaveScreenshot('dark-public-features-cards.png', { animations: 'disabled' as const });
  });

  test('features — footer dark', async ({ page }) => {
    await goToDark(page, '/features');
    const footer = page.locator('footer, [data-testid="footer"]').first();
    await expect(footer).toHaveScreenshot('dark-public-features-footer.png', { animations: 'disabled' as const });
  });
});
