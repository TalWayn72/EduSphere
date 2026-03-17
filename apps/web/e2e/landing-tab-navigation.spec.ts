/**
 * Landing Page Tab Navigation — BUG-070 E2E regression tests
 *
 * Tests ALL 24 permutations of the 4 nav tab click orders to verify that:
 *   1. Clicking any tab scrolls to the correct section (hash anchor)
 *   2. The URL stays on /landing (no route navigation — especially Compliance -> /compliance)
 *   3. Each section is visible in the viewport after clicking its tab
 *   4. No page reload occurs between tab clicks
 *
 * Tabs: Features (#features), Pricing (#pricing), Compliance (#compliance), Pilot (#pilot-cta)
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/landing-tab-navigation.spec.ts --reporter=line
 */

import { test, expect, type Page } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Tab definitions ────────────────────────────────────────────────────────

interface Tab {
  /** Display name visible in the nav bar */
  name: string;
  /** Hash fragment expected in URL after click */
  hash: string;
  /** CSS selector for the target section element */
  sectionSelector: string;
}

const TABS: Tab[] = [
  { name: 'Features', hash: '#features', sectionSelector: '#features' },
  { name: 'Pricing', hash: '#pricing', sectionSelector: '#pricing' },
  { name: 'Compliance', hash: '#compliance', sectionSelector: '#compliance' },
  { name: 'Pilot', hash: '#pilot-cta', sectionSelector: '#pilot-cta' },
];

// ─── Permutation helper ─────────────────────────────────────────────────────

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

const ALL_PERMUTATIONS = permutations(TABS);

// ─── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Click a nav tab on the landing page and verify the result.
 * Returns the URL pathname after the click for further assertions.
 */
async function clickTabAndVerify(page: Page, tab: Tab): Promise<void> {
  // Find the nav link by its text — use the desktop nav (hidden md:flex)
  const navBar = page.locator('[data-testid="public-nav"]');
  const link = navBar.locator(`a:text-is("${tab.name}")`).first();
  await expect(link).toBeVisible({ timeout: 5_000 });

  await link.click();

  // Wait for scroll to complete (smooth scrolling may take time)
  await page.waitForLoadState('networkidle').catch(() => {});

  // Verify URL still contains /landing (did NOT navigate away)
  const url = new URL(page.url());
  expect(url.pathname).toBe('/landing');

  // Verify hash matches expected
  expect(url.hash).toBe(tab.hash);

  // Verify the target section is attached to DOM
  const section = page.locator(tab.sectionSelector);
  await expect(section).toBeAttached({ timeout: 3_000 });

  // Verify the section is at least partially visible in the viewport
  const isVisible = await section.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // Section is considered visible if any part is within the viewport
    return rect.top < viewportHeight && rect.bottom > 0;
  });
  expect(isVisible).toBe(true);
}

// ─── Suite 1: All 24 permutations ───────────────────────────────────────────

test.describe('Landing Page Tab Navigation - BUG-070', () => {
  test.describe('All 24 tab click order permutations', () => {
    for (let i = 0; i < ALL_PERMUTATIONS.length; i++) {
      const perm = ALL_PERMUTATIONS[i];
      const permLabel = perm.map((t) => t.name).join(' -> ');

      test(`Permutation ${i + 1}/24: ${permLabel}`, async ({ page }) => {
        await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

        // Mark initial navigation count to detect full-page reloads
        await page.evaluate(() => {
          (window as unknown as Record<string, number>).__navCount = performance.getEntriesByType('navigation').length;
        });

        for (const tab of perm) {
          await clickTabAndVerify(page, tab);
        }

        // Verify no full-page navigation occurred (SPA stayed on same document)
        const navCount = await page.evaluate(() => {
          return performance.getEntriesByType('navigation').length;
        });
        // Navigation entries should still be 1 (initial page load only)
        expect(navCount).toBe(1);
      });
    }
  });

  // ─── Suite 2: Compliance regression guard (BUG-070 core fix) ──────────────

  test.describe('Compliance tab regression guard - BUG-070', () => {
    test('clicking Compliance does NOT navigate to /compliance route', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

      const nav = page.locator('[data-testid="public-nav"]');
      const complianceLink = nav.locator('a:text-is("Compliance")').first();
      await complianceLink.click();
      await page.waitForLoadState('domcontentloaded');

      const url = new URL(page.url());
      // MUST stay on /landing — not /compliance
      expect(url.pathname).toBe('/landing');
      expect(url.hash).toBe('#compliance');
      // The compliance section should be visible
      await expect(page.locator('#compliance')).toBeAttached();
    });

    test('after clicking Compliance, Features tab still works', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

      // Click Compliance first
      await clickTabAndVerify(page, TABS[2]); // Compliance

      // Then click Features — must still work on /landing
      await clickTabAndVerify(page, TABS[0]); // Features
    });

    test('after clicking Compliance, Pricing tab still works', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

      await clickTabAndVerify(page, TABS[2]); // Compliance
      await clickTabAndVerify(page, TABS[1]); // Pricing
    });

    test('after clicking Compliance, Pilot tab still works', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

      await clickTabAndVerify(page, TABS[2]); // Compliance
      await clickTabAndVerify(page, TABS[3]); // Pilot
    });

    test('Compliance tab works after cycling through all other tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

      await clickTabAndVerify(page, TABS[0]); // Features
      await clickTabAndVerify(page, TABS[1]); // Pricing
      await clickTabAndVerify(page, TABS[3]); // Pilot
      await clickTabAndVerify(page, TABS[2]); // Compliance — must not route away
    });
  });

  // ─── Suite 3: Visual regression — screenshot per tab ──────────────────────

  test.describe('Visual regression — screenshot per tab click', () => {
    test.use({ reducedMotion: 'reduce' });

    test('screenshot after each tab click (Features -> Pricing -> Compliance -> Pilot)', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });
      // Allow initial animations to settle
      await page.waitForLoadState('domcontentloaded');

      for (const tab of TABS) {
        await clickTabAndVerify(page, tab);
        // Wait for scroll to fully settle before taking screenshot
        await page.waitForLoadState('domcontentloaded');

        await expect(page).toHaveScreenshot(
          `landing-tab-${tab.hash.replace('#', '')}.png`,
          {
            fullPage: false,
            maxDiffPixels: 250,
            animations: 'disabled',
          },
        );
      }
    });
  });

  // ─── Suite 4: URL integrity — no route navigation on any tab ──────────────

  test.describe('URL integrity', () => {
    for (const tab of TABS) {
      test(`clicking ${tab.name} keeps URL on /landing (no route change)`, async ({ page }) => {
        await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

        const nav = page.locator('[data-testid="public-nav"]');
        const link = nav.locator(`a:text-is("${tab.name}")`).first();
        await link.click();
        await page.waitForLoadState('domcontentloaded');

        const url = new URL(page.url());
        expect(url.pathname).toBe('/landing');
        expect(url.hash).toBe(tab.hash);

        // Verify we did NOT navigate to a different route
        expect(url.pathname).not.toBe(`/${tab.name.toLowerCase()}`);
        expect(url.pathname).not.toBe(`/${tab.hash.replace('#', '')}`);
      });
    }

    test('rapid tab switching does not cause navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="public-nav"]')).toBeVisible({ timeout: 10_000 });

      const nav = page.locator('[data-testid="public-nav"]');

      // Rapidly click all 4 tabs with minimal delay
      for (const tab of TABS) {
        const link = nav.locator(`a:text-is("${tab.name}")`).first();
        await link.click();
        // Minimal wait — just enough for the click to register
        await page.waitForLoadState('domcontentloaded');
      }

      // After rapid clicking, URL must still be on /landing
      const url = new URL(page.url());
      expect(url.pathname).toBe('/landing');
    });
  });
});
