/**
 * Landing Page Navigation — E2E tests
 *
 * Verifies that ALL landing page links navigate correctly and
 * that NO public route redirects unauthenticated users to /login.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/landing-navigation.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Suite 1: Hero section navigation ────────────────────────────────────────

test.describe('Landing Navigation — Hero buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('"Request Demo" button links to /pilot, not /demo', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    const demoBtn = hero.getByRole('link', { name: /Request Demo/i });
    await expect(demoBtn).toBeVisible({ timeout: 10_000 });
    const href = await demoBtn.getAttribute('href');
    expect(href).toBe('/pilot');
  });

  test('"Start 90-Day Pilot" button links to /pilot', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    const pilotBtn = hero.getByRole('link', { name: /Start 90-Day Pilot/i });
    await expect(pilotBtn).toBeVisible({ timeout: 10_000 });
    const href = await pilotBtn.getAttribute('href');
    expect(href).toBe('/pilot');
  });

  test('"Request Demo" click navigates to /pilot page', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    const demoBtn = hero.getByRole('link', { name: /Request Demo/i });
    await demoBtn.click();
    await page.waitForURL(/\/pilot/, { timeout: 10_000 });
    expect(page.url()).toContain('/pilot');
    expect(page.url()).not.toContain('/login');
  });
});

// ─── Suite 2: Pricing section navigation ─────────────────────────────────────

test.describe('Landing Navigation — Pricing buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('University plan "Request Demo" links to /pilot', async ({ page }) => {
    const pricing = page.locator('[data-testid="pricing-section"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });
    // Find the "Request Demo" link inside the pricing section
    const cta = pricing.getByRole('link', { name: /Request Demo/i });
    await expect(cta).toBeVisible({ timeout: 5_000 });
    const href = await cta.getAttribute('href');
    expect(href).toBe('/pilot');
  });

  test('Enterprise plan "Contact Sales" links to /pilot', async ({ page }) => {
    const pricing = page.locator('[data-testid="pricing-section"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });
    const cta = pricing.getByRole('link', { name: /Contact Sales/i });
    await expect(cta).toBeVisible({ timeout: 5_000 });
    const href = await cta.getAttribute('href');
    expect(href).toBe('/pilot');
  });

  test('no pricing button links to /demo or /contact', async ({ page }) => {
    const pricing = page.locator('[data-testid="pricing-section"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });
    const allLinks = pricing.locator('a[href]');
    const count = await allLinks.count();
    for (let i = 0; i < count; i++) {
      const href = await allLinks.nth(i).getAttribute('href');
      expect(href).not.toBe('/demo');
      expect(href).not.toBe('/contact');
    }
  });
});

// ─── Suite 3: Public route redirects (no auth required) ──────────────────────

test.describe('Landing Navigation — Public routes accessible without auth', () => {
  const publicRoutes = [
    { path: '/landing', expectedContent: 'hero-section' },
    { path: '/pilot', expectedNotUrl: '/login' },
    { path: '/features', expectedNotUrl: '/login' },
    { path: '/pricing', expectedNotUrl: '/login' },
    { path: '/faq', expectedNotUrl: '/login' },
    { path: '/glossary', expectedNotUrl: '/login' },
    { path: '/blog', expectedNotUrl: '/login' },
    { path: '/accessibility', expectedNotUrl: '/login' },
    { path: '/catalog', expectedNotUrl: '/login' },
    { path: '/instructors', expectedNotUrl: '/login' },
    { path: '/partners', expectedNotUrl: '/login' },
    { path: '/portal', expectedNotUrl: '/login' },
  ];

  for (const route of publicRoutes) {
    test(`${route.path} does NOT redirect to /login`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
      // Wait for any redirects to settle
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
    });
  }
});

// ─── Suite 4: Public placeholder routes (show landing/content, not login) ────

test.describe('Landing Navigation — Placeholder public routes', () => {
  const placeholderRoutes = [
    '/privacy',
    '/terms',
    '/about',
    '/careers',
    '/compliance',
  ];

  for (const route of placeholderRoutes) {
    test(`${route} is accessible without auth (no /login redirect)`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
    });
  }
});

// ─── Suite 5: Redirect routes ────────────────────────────────────────────────

test.describe('Landing Navigation — Redirect routes', () => {
  test('/demo redirects to /pilot (not /login)', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/pilot/, { timeout: 10_000 });
    expect(page.url()).toContain('/pilot');
    expect(page.url()).not.toContain('/login');
  });

  test('/contact redirects to /pilot (not /login)', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/pilot/, { timeout: 10_000 });
    expect(page.url()).toContain('/pilot');
    expect(page.url()).not.toContain('/login');
  });

  test('/features/ai-course-builder redirects to /features', async ({ page }) => {
    await page.goto(`${BASE_URL}/features/ai-course-builder`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/features$/, { timeout: 10_000 });
    expect(page.url()).toContain('/features');
    expect(page.url()).not.toContain('/login');
  });
});

// ─── Suite 6: Catch-all route behaviour ──────────────────────────────────────

test.describe('Landing Navigation — Catch-all route', () => {
  test('unknown route /xyz-nonexistent does NOT redirect to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/xyz-nonexistent`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    // SmartRoot: unauthenticated → landing page; authenticated → dashboard
    // Either way, should NOT be /login
    expect(page.url()).not.toContain('/login');
  });

  test('unknown route shows landing page content for unauthenticated user', async ({ page }) => {
    test.skip(
      process.env.VITE_DEV_MODE !== 'false',
      'SmartRoot shows LandingPage only in non-DEV_MODE'
    );
    await page.goto(`${BASE_URL}/xyz-nonexistent`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('[data-testid="hero-section"]')
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 7: Footer link navigation ────────────────────────────────────────

test.describe('Landing Navigation — Footer links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('footer "About" link does not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const aboutLink = footer.locator('a[href="/about"]').first();
    await expect(aboutLink).toBeVisible({ timeout: 10_000 });
    await aboutLink.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer "Privacy Policy" link does not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const link = footer.locator('a[href="/privacy"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer "Terms" link does not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const link = footer.locator('a[href="/terms"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer "Blog" link does not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const link = footer.locator('a[href="/blog"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer "Careers" link does not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const link = footer.locator('a[href="/careers"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer "Contact" link redirects to /pilot, not /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const link = footer.locator('a[href="/contact"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await page.waitForURL(/\/pilot/, { timeout: 10_000 });
    expect(page.url()).toContain('/pilot');
    expect(page.url()).not.toContain('/login');
  });

  test('footer "Accessibility Statement" link does not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const link = footer.locator('a[href="/accessibility"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer feature sub-page links redirect to /features, not /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const featureLink = footer.locator('a[href="/features/ai-course-builder"]').first();
    await expect(featureLink).toBeVisible({ timeout: 10_000 });
    await featureLink.click();
    await page.waitForURL(/\/features/, { timeout: 10_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('footer solution links do not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const solutionLink = footer.locator('a[href="/solutions/universities"]').first();
    await expect(solutionLink).toBeVisible({ timeout: 10_000 });
    await solutionLink.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });

  test('footer compliance links do not lead to /login', async ({ page }) => {
    const footer = page.locator('[data-testid="landing-footer"]');
    const complianceLink = footer.locator('a[href="/compliance#ferpa"]').first();
    await expect(complianceLink).toBeVisible({ timeout: 10_000 });
    await complianceLink.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/login');
  });
});

// ─── Suite 8: No technical errors visible on any public route ────────────────

test.describe('Landing Navigation — No technical errors on public pages', () => {
  const publicPages = ['/landing', '/pilot', '/features', '/pricing', '/faq', '/blog', '/privacy', '/terms'];

  for (const route of publicPages) {
    test(`${route} has no raw technical error strings`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      const body = await page.textContent('body');
      expect(body).not.toContain('[object Object]');
      expect(body).not.toContain('Cannot read properties');
      expect(body).not.toContain('undefined is not');
    });
  }
});
