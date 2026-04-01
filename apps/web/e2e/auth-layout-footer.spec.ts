/**
 * auth-layout-footer.spec.ts — Authenticated Layout Footer E2E Tests
 *
 * Verifies that authenticated pages render the AuthFooter component
 * (data-testid="auth-footer") with correct content: copyright year,
 * Privacy, Terms, and Accessibility links.
 *
 * Layout contract (Layout.tsx):
 *   - Layout wraps all authenticated routes
 *   - AuthFooter renders at the bottom of every authenticated page
 *   - Footer shows current year, Privacy/Terms/Accessibility links
 *
 * Requires: VITE_DEV_MODE=true (default) — uses DEV_MODE auto-auth.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/auth-layout-footer.spec.ts
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

// ─── Authenticated routes that should have AuthFooter ────────────────────────

const AUTH_ROUTES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/courses', label: 'Courses' },
  { path: '/agents', label: 'Agents' },
  { path: '/annotations', label: 'Annotations' },
  { path: '/search', label: 'Search' },
  { path: '/settings', label: 'Settings' },
  { path: '/profile', label: 'Profile' },
] as const;

// ─── Auth setup ──────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await login(page);
});

// ─── Suite 1: AuthFooter presence on all authenticated pages ────────────────

test.describe('Authenticated Layout Footer — presence on auth pages', () => {
  for (const route of AUTH_ROUTES) {
    test(`${route.path} (${route.label}) has AuthFooter`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      const footer = page.getByTestId('auth-footer');
      await expect(footer).toBeVisible({ timeout: 10_000 });
    });
  }
});

// ─── Suite 2: AuthFooter content ────────────────────────────────────────────

test.describe('Authenticated Layout Footer — content verification', () => {
  test('Dashboard AuthFooter shows current year copyright', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.getByTestId('auth-footer');
    await expect(footer).toBeVisible({ timeout: 10_000 });

    // Copyright with current year
    const currentYear = new Date().getFullYear().toString();
    await expect(footer.getByText(currentYear)).toBeVisible({ timeout: 5_000 });
    await expect(footer.getByText('EduSphere')).toBeVisible({ timeout: 5_000 });
  });

  test('AuthFooter has Privacy link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.getByTestId('auth-footer');
    const privacyLink = footer.getByRole('link', { name: /Privacy/i });
    await expect(privacyLink).toBeVisible({ timeout: 5_000 });

    // Verify it links to /privacy
    const href = await privacyLink.getAttribute('href');
    expect(href).toBe('/privacy');
  });

  test('AuthFooter has Terms link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.getByTestId('auth-footer');
    const termsLink = footer.getByRole('link', { name: /Terms/i });
    await expect(termsLink).toBeVisible({ timeout: 5_000 });

    // Verify it links to /terms
    const href = await termsLink.getAttribute('href');
    expect(href).toBe('/terms');
  });

  test('AuthFooter has Accessibility link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.getByTestId('auth-footer');
    const a11yLink = footer.getByRole('link', { name: /Accessibility/i });
    await expect(a11yLink).toBeVisible({ timeout: 5_000 });

    // Verify it links to /accessibility
    const href = await a11yLink.getAttribute('href');
    expect(href).toBe('/accessibility');
  });

  test('AuthFooter nav has aria-label "Footer links"', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.getByTestId('auth-footer');
    const footerNav = footer.locator('nav[aria-label="Footer links"]');
    await expect(footerNav).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Suite 3: AuthFooter NOT on public pages ────────────────────────────────

test.describe('Authenticated Layout Footer — absent on public pages', () => {
  test('Landing page does not have AuthFooter', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('domcontentloaded');

    // Landing page uses LandingFooter, not AuthFooter
    await expect(page.getByTestId('auth-footer')).not.toBeVisible({
      timeout: 3_000,
    });
    // But it should have the landing footer
    await expect(page.getByTestId('landing-footer')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Login page does not have AuthFooter', async ({ page }) => {
    // Navigate directly without login to see the raw login page
    // (In DEV_MODE after login, /login redirects to dashboard — go to a fresh context)
    const freshPage = await page.context().newPage();
    await freshPage.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(freshPage.getByTestId('auth-footer')).not.toBeVisible({
      timeout: 3_000,
    });
    await freshPage.close();
  });
});
