/**
 * Global AEO — Meta Tags & Structured Data E2E Tests
 *
 * Cross-page tests for the Phase 50 AEO implementation.
 * Validates:
 *   - Open Graph (og:*) meta tags on the landing page
 *   - Twitter card meta tags on the landing page
 *   - Organization JSON-LD on the landing page
 *   - WebSite JSON-LD with SearchAction on the landing page
 *   - HTTP 200 responses for all 3 new public pages
 *   - /robots.txt accessibility and AI-bot allowlist
 *   - /llms.txt accessibility and content
 *   - /llms-full.txt accessibility
 *   - XSS guard across all AEO pages
 *   - Visual regression snapshot for landing page with AEO schema
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/aeo-global-meta.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

test.describe('Global AEO — Meta Tags & Structured Data', () => {
  // ─── Landing Page OG Tags ─────────────────────────────────────────────────

  test('landing page has correct og:title containing EduSphere', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toContain('EduSphere');
  });

  test('landing page has og:description', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDesc).toBeTruthy();
    if (ogDesc) expect(ogDesc.length).toBeGreaterThan(20);
  });

  test('landing page has og:image pointing to a PNG asset', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    expect(ogImage).toMatch(/\.(png|jpg|jpeg|webp)/i);
  });

  test('landing page has og:type set to "website"', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('website');
  });

  // ─── Landing Page Twitter Card ────────────────────────────────────────────

  test('landing page has twitter:card meta tag', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBeTruthy();
  });

  test('landing page has twitter:title containing EduSphere', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    expect(twitterTitle).toContain('EduSphere');
  });

  // ─── Landing Page JSON-LD ─────────────────────────────────────────────────

  test('landing page has Organization or EducationalOrganization JSON-LD', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    const org = schemas.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s['@type'] === 'Organization' || s['@type'] === 'EducationalOrganization'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    expect(org).toBeTruthy();
    expect(org.name).toBe('EduSphere');
    expect(org.url).toContain('edusphere');
  });

  test('landing page has WebSite JSON-LD with SearchAction', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const website = schemas.find((s: any) => s['@type'] === 'WebSite') as any;
    expect(website).toBeTruthy();
    expect(website.potentialAction).toBeTruthy();
    expect(website.potentialAction['@type']).toBe('SearchAction');
  });

  // ─── Static AEO Files ─────────────────────────────────────────────────────

  test('robots.txt returns HTTP 200', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);
  });

  test('robots.txt allows GPTbot and ClaudeBot', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);
    const text = await response?.text() ?? '';
    expect(text).toContain('GPTbot');
    expect(text).toContain('ClaudeBot');
  });

  test('robots.txt contains Sitemap directive', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    const text = await response?.text() ?? '';
    expect(text).toContain('Sitemap:');
  });

  test('llms.txt returns HTTP 200 and contains EduSphere description', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/llms.txt`);
    expect(response?.status()).toBe(200);
    const text = await response?.text() ?? '';
    expect(text).toContain('EduSphere');
    expect(text).toMatch(/AI|learning|education/i);
  });

  test('llms-full.txt returns HTTP 200', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/llms-full.txt`);
    expect(response?.status()).toBe(200);
    const text = await response?.text() ?? '';
    expect(text.length).toBeGreaterThan(100);
  });

  // ─── HTTP 200 for All New Pages ───────────────────────────────────────────

  test('all 3 new AEO public pages return HTTP 200', async ({ page }) => {
    for (const path of ['/faq', '/features', '/glossary']) {
      const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Expected 200 for ${path}`).toBe(200);
    }
  });

  // ─── Cross-Page XSS Guard ─────────────────────────────────────────────────

  test('JSON-LD scripts contain no </script> XSS vectors across all AEO pages', async ({ page }) => {
    const paths = ['/landing', '/faq', '/features', '/glossary'];
    for (const path of paths) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      const ldScripts = await page.locator('script[type="application/ld+json"]').all();
      for (const script of ldScripts) {
        const text = await script.textContent();
        expect(text, `XSS vector found in JSON-LD on ${path}`).not.toContain('</script>');
      }
    }
  });

  // ─── Canonical URLs ───────────────────────────────────────────────────────

  test('each AEO page has a unique canonical URL', async ({ page }) => {
    const canonicals: string[] = [];
    const paths = ['/faq', '/features', '/glossary'];
    for (const path of paths) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      // Wait for React + react-helmet-async to inject the per-page canonical.
      // The static index.html no longer includes a canonical; PageMeta sets it dynamically.
      await page.waitForFunction(
        () => !!document.querySelector('link[rel="canonical"]'),
        { timeout: 10000 },
      );
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      if (canonical) canonicals.push(canonical);
    }
    // All canonicals must be unique
    const uniqueCanonicals = new Set(canonicals);
    expect(uniqueCanonicals.size).toBe(paths.length);
  });

  // ─── Visual regression ────────────────────────────────────────────────────

  test('visual snapshot — Landing page with AEO schemas', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('landing-with-aeo.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});
