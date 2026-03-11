/**
 * Features Page — AEO E2E Tests
 *
 * Tests for the public /features page introduced in Phase 50 AEO implementation.
 * Validates:
 *   - Page title and meta tags
 *   - HowTo JSON-LD structured data (one per feature with howItWorks steps)
 *   - SoftwareApplication JSON-LD
 *   - BreadcrumbList JSON-LD
 *   - All 6 feature headings visible
 *   - Get Started CTAs link to /login
 *   - XSS guard
 *   - Visual regression snapshot
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/aeo-features-page.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

test.describe('Features Page — AEO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/features`, { waitUntil: 'domcontentloaded' });
  });

  // ─── Meta / Title ──────────────────────────────────────────────────────────

  test('renders page with correct title containing Features and EduSphere', async ({ page }) => {
    await expect(page).toHaveTitle(/Features.*EduSphere/i);
  });

  test('has meta description mentioning AI tutoring and knowledge graph', async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc).toMatch(/AI tutoring|knowledge graph/i);
  });

  test('has canonical link tag pointing to /features', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('/features');
  });

  // ─── JSON-LD Structured Data ───────────────────────────────────────────────

  test('has HowTo JSON-LD for AI Tutoring with 4 HowToStep items', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const howToSchemas = schemas.filter((s: any) => s['@type'] === 'HowTo') as any[];
    // FeaturesPage generates one HowTo per feature with howItWorks (4 features: ai-tutor, knowledge-graph, gamification, enterprise)
    expect(howToSchemas.length).toBeGreaterThanOrEqual(1);
    const aiTutorHowTo = howToSchemas.find((s: any) =>
      s.name?.toLowerCase().includes('ai tutoring') || s.name?.toLowerCase().includes('chavruta')
    );
    expect(aiTutorHowTo).toBeTruthy();
    expect(aiTutorHowTo.step).toBeInstanceOf(Array);
    expect(aiTutorHowTo.step.length).toBeGreaterThanOrEqual(4);
    expect(aiTutorHowTo.step[0]['@type']).toBe('HowToStep');
  });

  test('has SoftwareApplication JSON-LD with EducationalApplication category', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = schemas.find((s: any) => s['@type'] === 'SoftwareApplication') as any;
    expect(app).toBeTruthy();
    expect(app.applicationCategory).toBe('EducationalApplication');
    expect(app.name).toContain('EduSphere');
  });

  test('SoftwareApplication JSON-LD has offers array for pricing plans', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = schemas.find((s: any) => s['@type'] === 'SoftwareApplication') as any;
    expect(app).toBeTruthy();
    expect(app.offers).toBeInstanceOf(Array);
    expect(app.offers.length).toBeGreaterThan(0);
  });

  test('has BreadcrumbList JSON-LD', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList') as any;
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement.length).toBeGreaterThanOrEqual(2);
  });

  // ─── Page Content ─────────────────────────────────────────────────────────

  test('renders main heading "Everything You Need to Learn Smarter"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Everything You Need to Learn Smarter/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows all 6 feature section headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI Tutoring (Chavruta)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Knowledge Graph' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gamification' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise Grade' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Multi-Language' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live Sessions' })).toBeVisible();
  });

  test('How it works steps are visible for AI Tutoring feature', async ({ page }) => {
    await expect(page.getByText('Assessment')).toBeVisible();
    await expect(page.getByText('Socratic dialogue deepens understanding')).toBeVisible();
  });

  // ─── CTA Links ────────────────────────────────────────────────────────────

  test('header Get Started Free link points to /login', async ({ page }) => {
    const getStartedLinks = await page.getByRole('link', { name: /Get Started Free/i }).all();
    expect(getStartedLinks.length).toBeGreaterThan(0);
    for (const link of getStartedLinks) {
      const href = await link.getAttribute('href');
      expect(href).toBe('/login');
    }
  });

  test('View FAQ link points to /faq', async ({ page }) => {
    const faqLink = page.getByRole('link', { name: /View FAQ/i });
    await expect(faqLink).toBeVisible();
    await expect(faqLink).toHaveAttribute('href', '/faq');
  });

  test('CTA banner Get Started Free link points to /login', async ({ page }) => {
    // The bottom CTA banner link
    const ctaBannerLink = page.getByRole('link', { name: /Get Started Free/i }).last();
    await expect(ctaBannerLink).toHaveAttribute('href', '/login');
  });

  // ─── Security ─────────────────────────────────────────────────────────────

  test('JSON-LD scripts do not contain </script> XSS vector', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      expect(text).not.toContain('</script>');
    }
  });

  test('page does not expose internal ports or localhost references', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/localhost:\d{4}/);
  });

  // ─── Visual regression ────────────────────────────────────────────────────

  test('visual snapshot — Features page above the fold', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('features-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});
