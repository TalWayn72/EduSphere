/**
 * Visual QA — Landing Page Tab Navigation (BUG-070 fix verification)
 *
 * Takes screenshots at each step and saves to docs/screenshots/.
 * Run against the E2E dev server (uses BASE_URL from env.ts):
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-qa-landing-tabs.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { BASE_URL } from './env';
test.use({ reducedMotion: 'reduce' });

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = dirname(__filename2);

const TARGET_URL = BASE_URL;
const SCREENSHOT_DIR = resolve(__dirname2, '..', '..', '..', 'docs', 'screenshots');

// Ensure screenshot dir exists
mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe('Visual QA — Landing Tab Navigation (BUG-070)', () => {
  test('full tab navigation flow with screenshots', async ({ page }) => {
    // 1. Navigate to landing page
    await page.goto(`${TARGET_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);

    // Screenshot: initial state
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-01-initial.png'),
      fullPage: false,
    });

    const nav = page.locator('[data-testid="public-nav"]');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // 2. Click Features tab
    const featuresLink = nav.locator('a:text-is("Features")').first();
    await featuresLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    let url = new URL(page.url());
    expect(url.pathname).toBe('/landing');
    expect(url.hash).toBe('#features');
    console.log(`[Features] URL: ${page.url()} — PASS`);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-02-features.png'),
      fullPage: false,
    });

    // 3. Click Pricing tab
    const pricingLink = nav.locator('a:text-is("Pricing")').first();
    await pricingLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    url = new URL(page.url());
    expect(url.pathname).toBe('/landing');
    expect(url.hash).toBe('#pricing');
    console.log(`[Pricing] URL: ${page.url()} — PASS`);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-03-pricing.png'),
      fullPage: false,
    });

    // 4. Click Compliance tab — THIS IS THE BUG FIX
    const complianceLink = nav.locator('a:text-is("Compliance")').first();
    await complianceLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    url = new URL(page.url());
    // BUG-070: Must stay on /landing, NOT go to /compliance
    expect(url.pathname).toBe('/landing');
    expect(url.pathname).not.toBe('/compliance');
    expect(url.hash).toBe('#compliance');
    console.log(`[Compliance] URL: ${page.url()} — PASS (stayed on /landing, not /compliance)`);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-04-compliance.png'),
      fullPage: false,
    });

    // 5. Click Pilot tab
    const pilotLink = nav.locator('a:text-is("Pilot")').first();
    await pilotLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    url = new URL(page.url());
    expect(url.pathname).toBe('/landing');
    expect(url.hash).toBe('#pilot-cta');
    console.log(`[Pilot] URL: ${page.url()} — PASS`);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-05-pilot.png'),
      fullPage: false,
    });

    // 6. Reverse test: Click Compliance first, then Features
    await complianceLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    url = new URL(page.url());
    expect(url.pathname).toBe('/landing');
    expect(url.hash).toBe('#compliance');
    console.log(`[Reverse: Compliance] URL: ${page.url()} — PASS`);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-06-reverse-compliance.png'),
      fullPage: false,
    });

    // Now click Features — must still work after Compliance
    await featuresLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    url = new URL(page.url());
    expect(url.pathname).toBe('/landing');
    expect(url.hash).toBe('#features');
    console.log(`[Reverse: Features after Compliance] URL: ${page.url()} — PASS`);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'landing-tab-qa-07-features-after-compliance.png'),
      fullPage: false,
    });

    console.log('\n=== ALL TAB NAVIGATION CHECKS PASSED ===');
  });
});
