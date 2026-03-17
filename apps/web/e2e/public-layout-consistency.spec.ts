/**
 * public-layout-consistency.spec.ts — Public Layout Consistency E2E Tests
 *
 * Verifies that ALL public pages render consistent PublicNav + LandingFooter
 * via the shared PublicLayout component.
 *
 * Layout contract (PublicLayout.tsx):
 *   - PublicNav (data-testid="public-nav") with Logo + "Log In" link
 *   - LandingFooter (data-testid="landing-footer") with EduSphere branding
 *   - "Skip to main content" accessibility link
 *   - navVariant="full" renders Features/Pricing/Compliance section links
 *   - navVariant="minimal" renders only Logo + Log In
 *   - Login page: showFooter={false} — nav present, footer absent
 *
 * No authentication required — all routes are public.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/public-layout-consistency.spec.ts
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Public routes with expected nav variant ─────────────────────────────────

const PUBLIC_ROUTES = [
  { path: '/landing', nav: 'full' },
  { path: '/about', nav: 'minimal' },
  { path: '/careers', nav: 'minimal' },
  { path: '/contact', nav: 'minimal' },
  { path: '/privacy', nav: 'minimal' },
  { path: '/terms', nav: 'minimal' },
  { path: '/solutions', nav: 'minimal' },
  { path: '/compliance', nav: 'full' },
  { path: '/features', nav: 'full' },
  { path: '/pricing', nav: 'full' },
  { path: '/faq', nav: 'minimal' },
  { path: '/glossary', nav: 'minimal' },
  { path: '/catalog', nav: 'full' },
  { path: '/instructors', nav: 'full' },
  { path: '/blog', nav: 'minimal' },
  { path: '/accessibility', nav: 'minimal' },
  { path: '/pilot', nav: 'minimal' },
  { path: '/partners', nav: 'minimal' },
] as const;

// ─── Suite 1: Nav + Footer presence on every public page ─────────────────────

test.describe('Public Layout Consistency — Nav + Footer on all public pages', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} has PublicNav and LandingFooter`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });

      // PublicNav should be visible
      const nav = page.getByTestId('public-nav');
      await expect(nav).toBeVisible({ timeout: 10_000 });

      // Logo should be present inside the nav
      const logo = page.getByTestId('logo');
      await expect(logo).toBeVisible({ timeout: 5_000 });

      // "Log In" link should exist in nav (both full and minimal variants)
      await expect(nav.getByText('Log In')).toBeVisible({ timeout: 5_000 });

      // If full variant, section anchor links must be visible (desktop)
      if (route.nav === 'full') {
        await expect(nav.getByText('Features').first()).toBeVisible({ timeout: 5_000 });
        await expect(nav.getByText('Pricing').first()).toBeVisible({ timeout: 5_000 });
        await expect(nav.getByText('Compliance').first()).toBeVisible({ timeout: 5_000 });
      }

      // LandingFooter should be visible
      const footer = page.getByTestId('landing-footer');
      await expect(footer).toBeVisible({ timeout: 10_000 });

      // Footer should have EduSphere branding
      await expect(footer.getByText('EduSphere')).toBeVisible({ timeout: 5_000 });
    });
  }
});

// ─── Suite 2: Login page — nav present, footer absent ────────────────────────

test.describe('Public Layout Consistency — Login page special case', () => {
  test('Login page has PublicNav but no LandingFooter', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    // Nav should be visible (minimal variant)
    const nav = page.getByTestId('public-nav');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // Logo should be in nav
    await expect(page.getByTestId('logo')).toBeVisible({ timeout: 5_000 });

    // "Log In" link should exist
    await expect(nav.getByText('Log In')).toBeVisible({ timeout: 5_000 });

    // Footer should NOT be visible (showFooter={false} on Login page)
    await expect(page.getByTestId('landing-footer')).not.toBeVisible({ timeout: 3_000 });
  });
});

// ─── Suite 3: Sticky nav on scroll ──────────────────────────────────────────

test.describe('Public Layout Consistency — Sticky navigation', () => {
  test('PublicNav remains visible after scrolling down', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    // Scroll down significantly
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForLoadState('domcontentloaded');

    const nav = page.getByTestId('public-nav');
    await expect(nav).toBeVisible({ timeout: 5_000 });
    await expect(nav).toBeInViewport();
  });
});

// ─── Suite 4: Mobile hamburger menu ─────────────────────────────────────────

test.describe('Public Layout Consistency — Mobile hamburger menu', () => {
  test('hamburger menu toggles nav links on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const nav = page.getByTestId('public-nav');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // Desktop-only section links should be hidden on mobile
    // (they live inside a div with class "hidden md:flex")
    await expect(nav.locator('.hidden.md\\:flex').first()).not.toBeVisible();

    // Hamburger button should be visible
    const hamburger = nav.getByRole('button', { name: /Open menu/i });
    await expect(hamburger).toBeVisible({ timeout: 5_000 });

    // Click hamburger to open mobile menu
    await hamburger.click();

    // Section links should now be visible in the mobile drawer
    await expect(nav.getByText('Features').first()).toBeVisible({ timeout: 3_000 });
    await expect(nav.getByText('Pricing').first()).toBeVisible({ timeout: 3_000 });

    // Close menu button should now show "Close menu"
    const closeBtn = nav.getByRole('button', { name: /Close menu/i });
    await expect(closeBtn).toBeVisible({ timeout: 3_000 });

    // Click close
    await closeBtn.click();

    // Section links should be hidden again
    await expect(nav.locator('.md\\:hidden').first()).not.toBeVisible({ timeout: 3_000 });
  });

  test('mobile Log In button is accessible via hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const nav = page.getByTestId('public-nav');
    const hamburger = nav.getByRole('button', { name: /Open menu/i });
    await hamburger.click();

    // Log In should be visible in mobile menu
    await expect(nav.getByText('Log In').first()).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Suite 5: Skip to content accessibility link ────────────────────────────

test.describe('Public Layout Consistency — Skip link accessibility', () => {
  test('skip to main content link becomes visible on Tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    // Tab to focus the skip link (first focusable element in PublicLayout)
    await page.keyboard.press('Tab');

    const skipLink = page.getByText('Skip to main content');
    await expect(skipLink).toBeFocused({ timeout: 5_000 });
  });

  test('skip link target #main-content exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    // Verify the target element exists
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 6: Footer content consistency ─────────────────────────────────────

test.describe('Public Layout Consistency — Footer content', () => {
  test('LandingFooter has all 4 column headings', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const footer = page.getByTestId('landing-footer');
    await expect(footer.getByText('Product')).toBeVisible({ timeout: 10_000 });
    await expect(footer.getByText('Solutions')).toBeVisible({ timeout: 5_000 });
    await expect(footer.getByText('Compliance')).toBeVisible({ timeout: 5_000 });
    await expect(footer.getByText('Company')).toBeVisible({ timeout: 5_000 });
  });

  test('LandingFooter has copyright notice', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const footer = page.getByTestId('landing-footer');
    await expect(footer.getByText('2026 EduSphere')).toBeVisible({ timeout: 10_000 });
  });

  test('LandingFooter has Privacy, Terms, and Accessibility links', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const footer = page.getByTestId('landing-footer');
    // Bottom bar legal links
    const bottomBar = footer.locator('.border-t');
    await expect(bottomBar.getByText('Privacy')).toBeVisible({ timeout: 5_000 });
    await expect(bottomBar.getByText('Terms')).toBeVisible({ timeout: 5_000 });
    await expect(bottomBar.getByText('Accessibility')).toBeVisible({ timeout: 5_000 });
  });
});
