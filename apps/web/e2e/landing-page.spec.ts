/**
 * Landing Page — Phase 39 E2E tests
 *
 * Tests for LandingPage at /landing (public route, no auth required).
 *
 * LandingPage is implemented in src/pages/LandingPage.tsx and is
 * registered at /landing in router.tsx as a public (non-protected) route.
 *
 * Phase 39 additions:
 *   - Hero background video (preload="none" — must not block LCP)
 *   - VideoSection component (data-testid="video-section", aria-label="Product demo")
 *   - MotionCard feature cards (framer-motion, reduced-motion aware)
 *   - AnimatedCounter stats (IntersectionObserver, reduced-motion aware)
 *   - TestimonialsCarousel (aria-live="polite", pauses on hover)
 *   - CTABanner shimmer (.cta-shimmer, motion-safe CSS only)
 *
 * Sections tested (data-testid attributes from LandingPage.tsx):
 *   - data-testid="landing-nav"          — sticky navigation bar
 *   - data-testid="hero-section"         — hero with GSAP animation + bg video
 *   - data-testid="stats-bar"            — 4 stats with AnimatedCounter
 *   - data-testid="features-section"     — 6 MotionCard feature cards
 *   - data-testid="video-section"        — VideoSection (lazy-loaded demo video)
 *   - data-testid="how-it-works-section" — 3-step workflow
 *   - data-testid="testimonials-section" — 3 static testimonial cards
 *   - data-testid="cta-banner"           — CTA banner with shimmer
 *   - (pricing section via id="#pricing" anchor)
 *   - TestimonialsCarousel (aria-live="polite")
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

// ─── Suite 5: Phase 39 — Hero video & VideoSection ────────────────────────────

test.describe('Landing Page — Phase 39 (hero video & VideoSection)', () => {
  test('hero background video has preload="none" (does not block LCP)', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    // HeroSection renders: <video aria-hidden="true" preload="none" autoPlay muted loop playsInline>
    const heroVideo = page.locator('[data-testid="hero-section"] video[aria-hidden="true"]').first();
    await expect(heroVideo).toHaveAttribute('preload', 'none', { timeout: 10_000 });
    await expect(heroVideo).toHaveAttribute('autoplay', '');
    await expect(heroVideo).toHaveAttribute('muted', '');
  });

  test('hero background video has poster attribute for instant paint', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const heroVideo = page.locator('[data-testid="hero-section"] video[aria-hidden="true"]').first();
    // poster="/hero-bg-poster.webp" — ensures browser can paint a frame before video loads
    const poster = await heroVideo.getAttribute('poster');
    expect(poster).toBeTruthy();
  });

  test('VideoSection exists with data-testid and aria-label="Product demo"', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const videoSection = page.locator('[data-testid="video-section"]');
    await expect(videoSection).toBeVisible({ timeout: 10_000 });
    await expect(videoSection).toHaveAttribute('aria-label', 'Product demo');
  });

  test('VideoSection demo video has preload="none" (lazy-loaded)', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const demoVideo = page.locator('[data-testid="video-section"] video');
    await expect(demoVideo).toHaveAttribute('preload', 'none', { timeout: 10_000 });
    // Must be muted (required for browser autoplay policy compliance)
    await expect(demoVideo).toHaveAttribute('muted', '');
  });

  test('VideoSection heading "See EduSphere in Action" is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: /See EduSphere in Action/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 6: Phase 39 — Reduced-motion support ───────────────────────────────

test.describe('Landing Page — Phase 39 (reduced-motion)', () => {
  // All tests in this suite use prefers-reduced-motion: reduce
  test.use({ reducedMotion: 'reduce' });

  test('h1 heading is immediately visible — no GSAP opacity:0 initial state', async ({ page }) => {
    // With reduced-motion, GSAP useGSAP callback exits early (prefersReducedMotion=true)
    // so hero-animate elements are never set to opacity:0 — h1 must be visible right away.
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible({ timeout: 3_000 });
  });

  test('.hero-animate elements are visible (GSAP skipped for reduced-motion)', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const heroAnimateEls = page.locator('[data-testid="hero-section"] .hero-animate');
    const count = await heroAnimateEls.count();
    // HeroSection has 3 .hero-animate elements: h1, p, and the button div
    expect(count).toBeGreaterThan(0);
    // All must be visible — GSAP must NOT have applied opacity:0 initial state
    for (let i = 0; i < count; i++) {
      await expect(heroAnimateEls.nth(i)).toBeVisible();
    }
  });

  test('MotionCard feature cards render as plain divs (framer-motion bypassed)', async ({ page }) => {
    // MotionCard: if prefersReducedMotion → returns <div> (no motion.div)
    // This means feature cards should be visible immediately without animation delay
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const featuresSection = page.locator('[data-testid="features-section"]');
    await expect(featuresSection).toBeVisible({ timeout: 10_000 });
    // All 6 feature card titles must be visible — no framer-motion initial opacity:0
    const featureTitles = ['AI Tutoring', 'Knowledge Graph', 'Gamification', 'Enterprise Grade', 'Multi-language', 'Live Sessions'];
    for (const title of featureTitles) {
      await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('AnimatedCounter shows final value immediately (no rAF animation)', async ({ page }) => {
    // AnimatedCounter: if prefersReducedMotion → setValue(target) immediately
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const statsBar = page.locator('[data-testid="stats-bar"]');
    await expect(statsBar).toBeVisible({ timeout: 10_000 });
    // With reduced-motion, counters show final values immediately (no count-up animation)
    await expect(statsBar.getByText('10,000+')).toBeVisible({ timeout: 3_000 });
    await expect(statsBar.getByText('500,000+')).toBeVisible({ timeout: 3_000 });
  });

  test('TestimonialsCarousel does not auto-advance (reduced-motion pauses it)', async ({ page }) => {
    // TestimonialsCarousel: if prefersReducedMotion → setInterval is never started
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const carousel = page.locator('[aria-label="Customer testimonials carousel"]');
    await expect(carousel).toBeVisible({ timeout: 10_000 });

    // Get initial quote text
    const initialQuote = await carousel.locator('blockquote').first().textContent();

    // Wait 5 seconds — with reduced-motion the carousel must NOT auto-advance
    await page.waitForTimeout(5_000);
    const quoteAfterWait = await carousel.locator('blockquote').first().textContent();

    // The carousel must not have auto-advanced (same quote still showing)
    expect(quoteAfterWait).toBe(initialQuote);
  });

  test('cta-shimmer animation is disabled for reduced-motion', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    // CTABanner has <div class="cta-shimmer"> with CSS animation
    // Tailwind's motion-safe: prefix ensures animations only run without reduced-motion
    const shimmerEl = page.locator('.cta-shimmer');
    if (await shimmerEl.count() > 0) {
      const animationName = await shimmerEl.evaluate((el) =>
        window.getComputedStyle(el).animationName
      );
      // Under prefers-reduced-motion: reduce, animation-name must be 'none'
      expect(animationName).toBe('none');
    }
  });

  test('reduced-motion screenshot baseline — above-fold (argos)', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await argosScreenshot(page, 'landing-page-reduced-motion', { fullPage: false });
  });
});

// ─── Suite 7: Phase 39 — TestimonialsCarousel ARIA & interaction ───────────────

test.describe('Landing Page — Phase 39 (TestimonialsCarousel)', () => {
  test('carousel section has aria-live="polite" (WCAG 2.2.2)', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const carousel = page.locator('[aria-label="Customer testimonials carousel"]');
    await expect(carousel).toBeVisible({ timeout: 10_000 });
    await expect(carousel).toHaveAttribute('aria-live', 'polite');
  });

  test('carousel has dot navigation with role="tablist"', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const tablist = page.locator('[role="tablist"][aria-label="Testimonial navigation"]');
    await expect(tablist).toBeVisible({ timeout: 10_000 });

    // Should have exactly 3 tabs (one per CAROUSEL_TESTIMONIALS entry)
    const tabs = tablist.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3, { timeout: 5_000 });
  });

  test('carousel tab click changes active testimonial', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const tablist = page.locator('[role="tablist"][aria-label="Testimonial navigation"]');
    await expect(tablist).toBeVisible({ timeout: 10_000 });
    const tabs = tablist.locator('[role="tab"]');

    // First tab is selected by default
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    // Click second tab
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
  });

  test('carousel pauses on mouse hover (WCAG 2.2.2 Pause, Stop, Hide)', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const carousel = page.locator('[aria-label="Customer testimonials carousel"]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toBeVisible({ timeout: 10_000 });

    // Get current quote
    const initialQuote = await carousel.locator('blockquote').first().textContent();

    // Hover over carousel — this sets paused=true via onMouseEnter
    await carousel.hover();

    // Wait 6 seconds (carousel advances every 4s — should NOT advance while hovered)
    await page.waitForTimeout(6_000);
    const quoteDuringHover = await carousel.locator('blockquote').first().textContent();

    // Quote must not have changed while hovered
    expect(quoteDuringHover).toBe(initialQuote);
  });
});

// ─── Suite 8: Phase 39 — LCP / performance invariants ─────────────────────────

test.describe('Landing Page — Phase 39 (LCP / performance)', () => {
  test('no render-blocking video elements in hero (preload=none guard)', async ({ page }) => {
    // Collect all video elements in hero; ALL must have preload="none"
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const heroVideos = page.locator('[data-testid="hero-section"] video');
    const count = await heroVideos.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(heroVideos.nth(i)).toHaveAttribute('preload', 'none');
    }
  });

  test('h1 is present in DOM within 2s of domcontentloaded (LCP candidate)', async ({ page }) => {
    // The h1 is the primary LCP candidate — it must be in DOM quickly
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - startTime;

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeAttached({ timeout: 2_000 });

    // Log for observability (does not fail the test)
    // eslint-disable-next-line no-console
    console.info(`[LCP] domcontentloaded in ${elapsed}ms, h1 attached`);
  });

  test('stats bar shows formatted values (no raw unformatted numbers)', async ({ page }) => {
    // AnimatedCounter uses Intl.NumberFormat — 500000 → "500,000", not "500000"
    // With reducedMotion, the final value renders immediately
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const statsBar = page.locator('[data-testid="stats-bar"]');
    await expect(statsBar).toBeVisible({ timeout: 10_000 });
    const statsText = await statsBar.textContent();

    // Should NOT contain raw unformatted large numbers
    expect(statsText).not.toContain('500000');
    expect(statsText).not.toContain('10000');
  });
});

// ─── Suite 9: Phase 39 — CTABanner & footer ───────────────────────────────────

test.describe('Landing Page — Phase 39 (CTABanner & footer)', () => {
  test('CTA banner is visible with "Ready to Transform Your Learning?" heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const ctaBanner = page.locator('[data-testid="cta-banner"]');
    await expect(ctaBanner).toBeVisible({ timeout: 10_000 });
    await expect(
      ctaBanner.getByRole('heading', { name: /Ready to Transform Your Learning/i })
    ).toBeVisible();
  });

  test('CTA banner "Start Free Today" button links to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const ctaLink = page.locator('[data-testid="cta-banner"]').getByRole('link', { name: /Start Free Today/i });
    await expect(ctaLink).toBeVisible({ timeout: 10_000 });
    const href = await ctaLink.getAttribute('href');
    expect(href).toBe('/login');
  });

  test('footer is present with EduSphere brand and social links', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const footer = page.locator('[data-testid="landing-footer"]');
    await expect(footer).toBeVisible({ timeout: 10_000 });
    // Social icons have aria-labels
    await expect(footer.getByRole('link', { name: 'GitHub' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Twitter' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  });
});

// ─── Suite 10: Visual regression (Phase 39 updated) ───────────────────────────

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

  test('visual regression — landing page with reduced-motion (Phase 39 baseline)', async ({ page }) => {
    // Explicit reduced-motion baseline — captures stable layout without any animation
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('landing-page-reduced-motion-desktop.png', {
      fullPage: false,
      maxDiffPixels: 150,
      animations: 'disabled',
    });
    await argosScreenshot(page, 'landing-page-reduced-motion');
  });
});
