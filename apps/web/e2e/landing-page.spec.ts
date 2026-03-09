/**
 * Landing Page — Phase 1 E2E tests
 *
 * Tests for LandingPage at /landing (public route, no auth required).
 *
 * LandingPage is already implemented in src/pages/LandingPage.tsx and is
 * registered at /landing in router.tsx as a public (non-protected) route.
 *
 * Sections tested (all use data-testid attributes from LandingPage.tsx):
 *   - data-testid="landing-nav"          — sticky navigation bar
 *   - data-testid="hero-section"         — hero with CTA buttons
 *   - data-testid="stats-bar"            — 4 stats (courses, learners, etc.)
 *   - data-testid="features-section"     — 6 feature cards
 *   - data-testid="how-it-works-section" — 3-step workflow
 *   - data-testid="testimonials-section" — 3 testimonial cards
 *   - (pricing section via id="#pricing" anchor)
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/landing-page.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';
import { BASE_URL } from './env';

// ─── Suite 1: Core sections ───────────────────────────────────────────────────

test.describe('Landing Page — Phase 1 (core sections)', () => {
  test.beforeEach(async ({ page }) => {
    // LandingPage is public — no authentication required
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('hero section is visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="hero-section"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('hero heading contains "AI-Powered Learning"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /AI-Powered Learning/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('primary CTA button "Get Started Free" is present and links to /login', async ({
    page,
  }) => {
    const ctaLink = page.getByRole('link', { name: /Get Started Free/i }).first();
    await expect(ctaLink).toBeVisible({ timeout: 10_000 });
    const href = await ctaLink.getAttribute('href');
    expect(href).toBe('/login');
  });

  test('"Watch Demo" button is present in hero', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Watch Demo/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('navigation bar is present with brand name "EduSphere"', async ({
    page,
  }) => {
    const nav = page.locator('[data-testid="landing-nav"]');
    await expect(nav).toBeVisible({ timeout: 10_000 });
    await expect(nav.getByText('EduSphere')).toBeVisible();
  });

  test('nav contains "Features", "Pricing" anchor links', async ({ page }) => {
    const nav = page.locator('[data-testid="landing-nav"]');
    await expect(nav.getByRole('link', { name: /Features/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(nav.getByRole('link', { name: /Pricing/i }).first()).toBeVisible();
  });

  test('stats bar is visible with key metrics', async ({ page }) => {
    const statsBar = page.locator('[data-testid="stats-bar"]');
    await expect(statsBar).toBeVisible({ timeout: 10_000 });

    // STATS array: '10,000+' Courses, '500K+' Learners, '98%' Completion Rate
    await expect(statsBar.getByText('10,000+')).toBeVisible();
    await expect(statsBar.getByText('500K+')).toBeVisible();
  });
});

// ─── Suite 2: Features & pricing ─────────────────────────────────────────────

test.describe('Landing Page — Phase 1 (features & pricing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('features section is visible with "Why EduSphere?" heading', async ({
    page,
  }) => {
    const section = page.locator('[data-testid="features-section"]');
    await expect(section).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole('heading', { name: /Why EduSphere/i })).toBeVisible();
  });

  test('all 6 feature card titles are visible', async ({ page }) => {
    const features = [
      'AI Tutoring',
      'Knowledge Graph',
      'Gamification',
      'Enterprise Grade',
      'Multi-language',
      'Live Sessions',
    ];
    for (const title of features) {
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('pricing section is reachable via anchor and shows plan names', async ({
    page,
  }) => {
    // Scroll to pricing via anchor click in nav
    const pricingLink = page.getByRole('link', { name: /Pricing/i }).first();
    await pricingLink.waitFor({ timeout: 10_000 });
    await pricingLink.click();

    // PLANS array: Free, Pro, Enterprise
    await expect(page.getByText('Free').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Pro').first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Suite 3: Responsive & navigation ────────────────────────────────────────

test.describe('Landing Page — Phase 1 (responsive & navigation)', () => {
  test('mobile viewport renders hamburger menu button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    // The mobile menu toggle has aria-label "Open menu" / "Close menu"
    await expect(
      page.getByRole('button', { name: /Open menu/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('mobile hamburger opens mobile menu with nav links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /Open menu/i }).click();

    // Mobile menu opens with Features / Pricing links visible
    await expect(page.getByText('Features').first()).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.getByText('Pricing').first()).toBeVisible();
  });

  test('"Log In" button in nav navigates to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const loginLink = page.getByRole('link', { name: /Log In/i }).first();
    await loginLink.waitFor({ timeout: 10_000 });
    await loginLink.click();

    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('no raw technical error strings visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const body = await page.textContent('body');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Error:');
  });
});

// ─── Suite 4: SmartRoot — route "/" behaviour ─────────────────────────────────

test.describe('SmartRoot — "/" route behaviour', () => {
  /**
   * In DEV_MODE the app auto-authenticates — visiting "/" triggers SmartRoot
   * which calls isAuthenticated() → true → Navigate to /dashboard.
   * In non-DEV_MODE (VITE_DEV_MODE=false) visiting "/" shows the LandingPage.
   *
   * These tests cover the behaviour observable from the browser in each mode.
   */

  test('unauthenticated visit to "/" shows landing page (non-DEV_MODE)', async ({
    page,
  }) => {
    test.skip(
      process.env.VITE_DEV_MODE !== 'false',
      'SmartRoot shows LandingPage at "/" only in non-DEV_MODE'
    );
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    // SmartRoot → isAuthenticated()=false → renders LandingPage
    await expect(
      page.locator('[data-testid="hero-section"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Log In" button on landing page at "/" navigates to /login', async ({
    page,
  }) => {
    test.skip(
      process.env.VITE_DEV_MODE !== 'false',
      'SmartRoot shows LandingPage at "/" only in non-DEV_MODE'
    );
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const loginLink = page.getByRole('link', { name: /Log In/i }).first();
    await loginLink.waitFor({ timeout: 10_000 });
    await loginLink.click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('authenticated user visiting "/" goes to /dashboard in DEV_MODE', async ({
    page,
  }) => {
    // In DEV_MODE auto-auth is active — SmartRoot detects isAuthenticated()=true
    // and renders <Navigate to="/dashboard" replace /> without showing LandingPage.
    test.skip(
      process.env.VITE_DEV_MODE === 'false',
      'DEV_MODE auto-auth required for this test'
    );
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    // SmartRoot redirects to /dashboard (or /learn/content-1 via a nested route)
    await page.waitForURL(/\/(dashboard|learn)/, { timeout: 10_000 });
    expect(page.url()).not.toContain('/landing');
    // Landing page hero section should NOT be visible
    await expect(
      page.locator('[data-testid="hero-section"]')
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('LandingPage at /landing is accessible without auth in all modes', async ({
    page,
  }) => {
    // /landing is a direct public route (not mediated by SmartRoot)
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('[data-testid="hero-section"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no raw technical strings at "/" in any auth mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    // Allow redirect to complete before asserting
    await page.waitForLoadState('domcontentloaded');
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('Cannot query field');
  });
});

// ─── Suite 5: Visual regression ───────────────────────────────────────────────

test.describe('Landing Page — @visual', () => {
  test.use({ reducedMotion: 'reduce' });

  test('visual regression — landing page desktop', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('landing-page-desktop.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
    await argosScreenshot(page, 'landing-page-desktop');
  });

  test('visual regression — landing page mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('landing-page-mobile.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
    await argosScreenshot(page, 'landing-page-mobile');
  });
});
