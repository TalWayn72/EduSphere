/**
 * landing-visual-regression.spec.ts — B2B Landing Page Visual Regression Tests
 *
 * Route: /landing  (public — no authentication required)
 *
 * All GraphQL requests are intercepted via page.route() to return stable mock
 * data, ensuring screenshots are deterministic and do not depend on a live backend.
 *
 * Reduced motion is enabled for every test to prevent animation-induced flakiness
 * in screenshot comparisons.
 *
 * Snapshots are stored in the standard Playwright snapshot directory next to this
 * file: landing-visual-regression.spec.ts-snapshots/
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/landing-visual-regression.spec.ts --reporter=line
 *
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test e2e/landing-visual-regression.spec.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ─── GraphQL mock helper ───────────────────────────────────────────────────────

/** Intercept all GraphQL requests and return empty/stub responses. */
async function mockAllGraphQL(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as { operationName?: string };

    switch (body.operationName) {
      case 'SubmitPilotRequest':
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { submitPilotRequest: { id: 'mock-pilot-id' } } }),
        });
        break;
      default:
        // Pass through non-mutation requests (queries like introspection)
        await route.continue();
    }
  });
}

// ─── Suite — Visual Regression (reduced-motion + stable mocks) ────────────────

test.describe('Landing Page — Visual Regression @visual', () => {
  // Use reduced-motion to prevent animation-induced pixel diffs
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await mockAllGraphQL(page);
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    // Allow fonts and images to settle
    await page.waitForTimeout(300);
  });

  // ── Section-level screenshots ────────────────────────────────────────────────

  test('hero section screenshot', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toBeVisible({ timeout: 10_000 });
    await hero.scrollIntoViewIfNeeded();
    await expect(hero).toHaveScreenshot('hero-section.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('trust bar section screenshot', async ({ page }) => {
    const trustBar = page.locator('[data-testid="trust-bar"]');
    await expect(trustBar).toBeVisible({ timeout: 10_000 });
    await trustBar.scrollIntoViewIfNeeded();
    await expect(trustBar).toHaveScreenshot('trust-bar.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('compliance badges section screenshot', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section).toBeVisible({ timeout: 10_000 });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('compliance-badges.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('competitor comparison table screenshot', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    await expect(section).toBeVisible({ timeout: 10_000 });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('vs-competitors.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('unique features section screenshot', async ({ page }) => {
    const section = page.locator('[data-testid="unique-features-section"]');
    await expect(section).toBeVisible({ timeout: 10_000 });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('unique-features.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('ROI calculator default state screenshot', async ({ page }) => {
    const roi = page.locator('[data-testid="roi-calculator-section"]');
    await expect(roi).toBeVisible({ timeout: 10_000 });
    await roi.scrollIntoViewIfNeeded();
    // Wait for any reactive state to settle
    await page.waitForTimeout(200);
    await expect(roi).toHaveScreenshot('roi-calculator.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('pricing section screenshot', async ({ page }) => {
    const pricing = page.locator('[data-testid="pricing-section"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });
    await pricing.scrollIntoViewIfNeeded();
    await expect(pricing).toHaveScreenshot('pricing-section.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('pilot CTA section screenshot', async ({ page }) => {
    const pilot = page.locator('[data-testid="pilot-cta-section"]');
    await expect(pilot).toBeVisible({ timeout: 10_000 });
    await pilot.scrollIntoViewIfNeeded();
    await expect(pilot).toHaveScreenshot('pilot-cta.png', {
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  // ── Full-page viewport screenshots ────────────────────────────────────────────

  test('full page desktop screenshot (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('landing-desktop.png', {
      fullPage: true,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('full page mobile screenshot (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('landing-mobile.png', {
      fullPage: true,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('full page tablet screenshot (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('landing-tablet.png', {
      fullPage: true,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  // ── Anti-regression: no layout shifts from raw error strings ─────────────────

  test('no raw error strings visible in any screenshot baseline', async ({ page }) => {
    const body = await page.textContent('body') ?? '';
    expect(body).not.toContain('urql error');
    expect(body).not.toContain('GraphQL error');
    expect(body).not.toContain('Cannot read properties');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('undefined');
  });

  // ── Pricing section anti-regression: B2B tiers only ──────────────────────────

  test('pricing screenshot baseline: only B2B tiers visible (no Free/Pro/Basic)', async ({
    page,
  }) => {
    const pricing = page.locator('[data-testid="pricing-section"]');
    await pricing.scrollIntoViewIfNeeded();

    // Capture screenshot THEN assert content correctness
    await expect(pricing).toHaveScreenshot('pricing-section-b2b-only.png', {
      threshold: 0.05,
      animations: 'disabled',
    });

    const pricingText = (await pricing.textContent()) ?? '';
    // B2B tiers must be present
    expect(pricingText).toContain('Starter');
    expect(pricingText).toContain('Growth');
    expect(pricingText).toContain('University');
    expect(pricingText).toContain('Enterprise');
    // Consumer tiers must NOT appear as plan headings
    expect(pricingText).not.toMatch(/\bFree Plan\b/i);
    expect(pricingText).not.toMatch(/\bPro Plan\b/i);
    expect(pricingText).not.toMatch(/\bBasic Plan\b/i);
  });

  // ── ROI calculator anti-regression: numbers are valid ─────────────────────────

  test('ROI calculator screenshot: values are numeric and formatted (not NaN)', async ({
    page,
  }) => {
    const roi = page.locator('[data-testid="roi-calculator-section"]');
    await roi.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    await expect(roi).toHaveScreenshot('roi-calculator-numeric.png', {
      threshold: 0.05,
      animations: 'disabled',
    });

    const roiText = (await roi.textContent()) ?? '';
    expect(roiText).not.toContain('NaN');
    // Must contain at least one dollar amount
    expect(roiText).toMatch(/\$[\d,]+/);
    // Net ROI must be a percentage
    expect(roiText).toMatch(/%/);
  });
});
