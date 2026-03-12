/**
 * AEO Phase 2 — Public Course Catalog + Instructor Directory E2E Tests
 *
 * Tests for the public /catalog and /instructors pages introduced in AEO Phase 2.
 * Validates:
 *   - HTTP 200 responses
 *   - Course (schema.org/Course) JSON-LD structured data
 *   - Person (schema.org/Person) JSON-LD structured data
 *   - BreadcrumbList JSON-LD
 *   - Canonical URL meta tag
 *   - OG title meta tag
 *   - Minimum required content (6 courses, 4 instructors)
 *   - Sitemap includes /catalog and /instructors routes
 *   - JSON-LD available without JS execution delay (domcontentloaded)
 *   - XSS guards: no </script> vectors in JSON-LD
 *   - Visual regression snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/aeo-phase2.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract all JSON-LD schemas from the page */
async function getAllSchemas(page: import('@playwright/test').Page): Promise<unknown[]> {
  const ldScripts = await page.locator('script[type="application/ld+json"]').all();
  const schemas: unknown[] = [];
  for (const script of ldScripts) {
    const text = await script.textContent();
    if (text) {
      try {
        schemas.push(JSON.parse(text));
      } catch {
        // Skip unparseable scripts
      }
    }
  }
  return schemas;
}

// ── Course Catalog (/catalog) ─────────────────────────────────────────────────

test.describe('AEO Phase 2 — Course Catalog (/catalog)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'domcontentloaded' });
    // Wait until react-helmet-async injects a Course-specific JSON-LD (not just static index.html ones)
    await page.waitForFunction(
      () => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
          try {
            const d = JSON.parse(s.textContent ?? '');
            const type = d['@type'];
            if (type === 'Course' || (Array.isArray(type) && (type as string[]).includes('Course'))) return true;
            if (type === 'BreadcrumbList') return true;
          } catch { /* */ }
        }
        return false;
      },
      { timeout: 15_000 },
    );
  });

  test('catalog page returns HTTP 200', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/catalog`);
    expect(response.status()).toBe(200);
  });

  test('catalog page has CourseSchema JSON-LD with @type Course', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseSchemas = schemas.filter((s: any) => {
      const type = s['@type'];
      return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
    });
    expect(courseSchemas.length).toBeGreaterThan(0);
  });

  test('catalog page has at least 6 courses listed', async ({ page }) => {
    // Courses render as <article> elements with role implicit from "article" tag
    const courseArticles = await page.locator('article[aria-label^="Course:"]').all();
    expect(courseArticles.length).toBeGreaterThanOrEqual(6);
  });

  test('catalog page has unique canonical URL pointing to /catalog', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('/catalog');
    // Must not point to a different page
    expect(canonical).not.toContain('/instructors');
    expect(canonical).not.toContain('/faq');
  });

  test('catalog page has correct OG title', async ({ page }) => {
    // Multiple og:title tags may exist (base HTML + react-helmet-async override).
    // Check that at least one of them mentions courses/catalog or EduSphere.
    const ogTitleElements = await page.locator('meta[property="og:title"]').all();
    expect(ogTitleElements.length).toBeGreaterThan(0);
    const ogTitles = await Promise.all(ogTitleElements.map((el) => el.getAttribute('content')));
    const hasCorrectTitle = ogTitles.some((t) => t && /course|catalog|EduSphere/i.test(t));
    expect(hasCorrectTitle).toBe(true);
  });

  test('catalog page has main heading "Featured Learning Programs"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Featured Learning Programs/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('catalog page lists at least one known course title', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Introduction to Machine Learning/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('CourseSchema JSON-LD has required schema.org fields', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseSchema = schemas.find((s: any) => {
      const type = s['@type'];
      return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
    }) as Record<string, unknown> | undefined;
    expect(courseSchema).toBeTruthy();
    if (courseSchema) {
      expect(courseSchema['@context']).toBe('https://schema.org');
      expect(typeof courseSchema['name']).toBe('string');
      expect(typeof courseSchema['description']).toBe('string');
      expect(typeof courseSchema['url']).toBe('string');
      // Must have a provider org
      expect(courseSchema['provider']).toBeTruthy();
    }
  });

  test('CourseSchema JSON-LD does not expose forbidden fields', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseSchemas = schemas.filter((s: any) => {
      const type = s['@type'];
      return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
    }) as Record<string, unknown>[];
    courseSchemas.forEach((schema) => {
      expect(Object.keys(schema)).not.toContain('tenantId');
      expect(Object.keys(schema)).not.toContain('enrollmentCount');
      expect(Object.keys(schema)).not.toContain('instructorEmail');
      expect(Object.keys(schema)).not.toContain('internalId');
      expect(Object.keys(schema)).not.toContain('pricingTier');
    });
  });

  test('catalog page has BreadcrumbList JSON-LD', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList') as any;
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement).toBeInstanceOf(Array);
    expect(breadcrumb.itemListElement.length).toBeGreaterThanOrEqual(2);
  });

  // ─── Security ────────────────────────────────────────────────────────────────

  test('no </script> XSS vectors in catalog JSON-LD', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      // </script> inside JSON-LD would break out of the script block — must be escaped
      expect(text).not.toContain('</script>');
    }
  });

  test('catalog page does not expose DB connection strings or API keys in body', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const bodyHtml = await page.locator('html').innerHTML();
    expect(bodyHtml).not.toMatch(/DATABASE_URL|postgres:\/\/|postgresql:\/\//i);
    expect(bodyHtml).not.toMatch(/api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i);
    expect(bodyHtml).not.toMatch(/bearer\s+[a-zA-Z0-9._-]{20,}/i);
  });

  test('catalog page does not expose localhost or internal ports in body text', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/localhost:\d{4}/);
    expect(bodyText).not.toMatch(/127\.0\.0\.1/);
    expect(bodyText).not.toMatch(/:400[1-6]/);
  });

  // ─── Pre-render verification ─────────────────────────────────────────────────

  test('catalog page has JSON-LD visible without JS execution delay', async ({ page }) => {
    // Navigate with domcontentloaded to test if schemas are present in early DOM
    await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'domcontentloaded' });
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    // React-helmet-async injects schemas synchronously on hydration
    expect(scripts.length).toBeGreaterThan(0);
  });

  // ─── Visual regression ───────────────────────────────────────────────────────

  test('visual snapshot — catalog page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('catalog-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ── Instructor Directory (/instructors) ───────────────────────────────────────

test.describe('AEO Phase 2 — Instructor Directory (/instructors)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/instructors`, { waitUntil: 'domcontentloaded' });
    // Wait until react-helmet-async injects a Person-specific JSON-LD
    await page.waitForFunction(
      () => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
          try {
            const d = JSON.parse(s.textContent ?? '');
            const type = d['@type'];
            if (type === 'Person' || type === 'BreadcrumbList') return true;
          } catch { /* */ }
        }
        return false;
      },
      { timeout: 15_000 },
    );
  });

  test('instructors page returns HTTP 200', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/instructors`);
    expect(response.status()).toBe(200);
  });

  test('instructors page has PersonSchema JSON-LD with @type Person', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const personSchemas = schemas.filter((s: any) => s['@type'] === 'Person');
    expect(personSchemas.length).toBeGreaterThan(0);
  });

  test('instructors page has at least 4 instructors listed', async ({ page }) => {
    const instructorArticles = await page.locator('article[aria-label^="Instructor:"]').all();
    expect(instructorArticles.length).toBeGreaterThanOrEqual(4);
  });

  test('instructors page has unique canonical URL pointing to /instructors', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('/instructors');
    expect(canonical).not.toContain('/catalog');
  });

  test('instructors page has correct OG title', async ({ page }) => {
    // Multiple og:title tags may exist (base HTML + react-helmet-async override).
    const ogTitleElements = await page.locator('meta[property="og:title"]').all();
    expect(ogTitleElements.length).toBeGreaterThan(0);
    const ogTitles = await Promise.all(ogTitleElements.map((el) => el.getAttribute('content')));
    const hasCorrectTitle = ogTitles.some((t) => t && /instructor|educator|EduSphere/i.test(t));
    expect(hasCorrectTitle).toBe(true);
  });

  test('instructors page has main heading "Meet Our Instructors"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Meet Our Instructors/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('instructors page shows Dr. Sarah Chen', async ({ page }) => {
    await expect(page.getByText('Dr. Sarah Chen')).toBeVisible({ timeout: 10_000 });
  });

  test('PersonSchema JSON-LD has required schema.org fields', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const personSchema = schemas.find((s: any) => s['@type'] === 'Person') as Record<string, unknown> | undefined;
    expect(personSchema).toBeTruthy();
    if (personSchema) {
      expect(personSchema['@context']).toBe('https://schema.org');
      expect(typeof personSchema['name']).toBe('string');
      // Must not contain PII fields
      expect(Object.keys(personSchema)).not.toContain('email');
      expect(Object.keys(personSchema)).not.toContain('telephone');
      expect(Object.keys(personSchema)).not.toContain('taxID');
    }
  });

  test('PersonSchema JSON-LD does not expose forbidden PII fields', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const personSchemas = schemas.filter((s: any) => s['@type'] === 'Person') as Record<string, unknown>[];
    expect(personSchemas.length).toBeGreaterThan(0);
    personSchemas.forEach((schema) => {
      expect(Object.keys(schema)).not.toContain('email');
      expect(Object.keys(schema)).not.toContain('telephone');
      expect(Object.keys(schema)).not.toContain('taxID');
      expect(Object.keys(schema)).not.toContain('tenantId');
      expect(Object.keys(schema)).not.toContain('userId');
    });
  });

  test('instructors page has BreadcrumbList JSON-LD', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList') as any;
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement.length).toBeGreaterThanOrEqual(2);
  });

  // ─── Security ────────────────────────────────────────────────────────────────

  test('no </script> XSS vectors in instructors JSON-LD', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      expect(text).not.toContain('</script>');
    }
  });

  test('instructors page does not expose auth tokens or internal user IDs', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const bodyHtml = await page.locator('html').innerHTML();
    expect(bodyHtml).not.toMatch(/bearer\s+[a-zA-Z0-9._-]{20,}/i);
    expect(bodyHtml).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });

  test('instructors page does not expose localhost or internal ports in body text', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/localhost:\d{4}/);
    expect(bodyText).not.toMatch(/127\.0\.0\.1/);
  });

  // ─── Pre-render verification ─────────────────────────────────────────────────

  test('instructors page has JSON-LD visible without JS execution delay', async ({ page }) => {
    await page.goto(`${BASE_URL}/instructors`, { waitUntil: 'domcontentloaded' });
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    expect(scripts.length).toBeGreaterThan(0);
  });

  // ─── Visual regression ───────────────────────────────────────────────────────

  test('visual snapshot — instructors page', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('instructors-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ── Sitemap ───────────────────────────────────────────────────────────────────
//
// NOTE: In local E2E mode the Vite dev server proxies /sitemap.xml to the
// NestJS content subgraph (port 4002). When the subgraph is not running,
// requests return 404 from the proxy. These tests use the Playwright request
// API to check the static sitemap.xml served by Vite from apps/web/public/.
// Static-file correctness is also verified in tests/security/aeo-security.spec.ts.

test.describe('AEO Phase 2 — Sitemap verification', () => {
  // Helper: fetch sitemap and return body. Works for both static and proxied versions.
  async function fetchSitemapContent(page: import('@playwright/test').Page): Promise<string | null> {
    // Try direct HTTP request via playwright request context
    const response = await page.request.get(`${BASE_URL}/sitemap.xml`);
    if (response.ok()) {
      return await response.text();
    }
    // Proxy to subgraph not running (local E2E without backend) — return null to skip
    return null;
  }

  test('sitemap.xml includes /catalog route', async ({ page }) => {
    const content = await fetchSitemapContent(page);
    if (!content) {
      // Skip gracefully when sitemap backend is not running
      test.skip(true, 'Sitemap backend (subgraph-content port 4002) not running — static file verified in aeo-security.spec.ts');
      return;
    }
    expect(content).toContain('/catalog');
  });

  test('sitemap.xml includes /instructors route', async ({ page }) => {
    const content = await fetchSitemapContent(page);
    if (!content) {
      test.skip(true, 'Sitemap backend not running — static file verified in aeo-security.spec.ts');
      return;
    }
    expect(content).toContain('/instructors');
  });

  test('sitemap.xml includes /faq route', async ({ page }) => {
    const content = await fetchSitemapContent(page);
    if (!content) {
      test.skip(true, 'Sitemap backend not running — static file verified in aeo-security.spec.ts');
      return;
    }
    expect(content).toContain('/faq');
  });

  test('sitemap.xml includes /features route', async ({ page }) => {
    const content = await fetchSitemapContent(page);
    if (!content) {
      test.skip(true, 'Sitemap backend not running — static file verified in aeo-security.spec.ts');
      return;
    }
    expect(content).toContain('/features');
  });

  test('sitemap.xml includes /glossary route', async ({ page }) => {
    const content = await fetchSitemapContent(page);
    if (!content) {
      test.skip(true, 'Sitemap backend not running — static file verified in aeo-security.spec.ts');
      return;
    }
    expect(content).toContain('/glossary');
  });

  test('sitemap.xml does not include authenticated routes', async ({ page }) => {
    const content = await fetchSitemapContent(page);
    if (!content) {
      test.skip(true, 'Sitemap backend not running — static file verified in aeo-security.spec.ts');
      return;
    }
    expect(content).not.toContain('/dashboard');
    expect(content).not.toContain('/admin');
    expect(content).not.toContain('/courses/');
    expect(content).not.toContain('/settings');
  });
});
