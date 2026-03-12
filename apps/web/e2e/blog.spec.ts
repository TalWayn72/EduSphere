/**
 * Blog — AEO Phase 3 E2E regression guard
 *
 * Tests: /blog list page + /blog/:slug detail page + JSON-LD + OG image
 *
 * Validates:
 *   - HTTP 200 responses for /blog and /blog/:slug
 *   - At least 4 blog post cards visible on list page
 *   - Navigation from list card to detail page
 *   - <title> contains post title on detail page
 *   - og:type = "article" on detail page
 *   - og:image references /aeo/og on detail page
 *   - Canonical URL on list page
 *   - BlogPosting JSON-LD on detail page
 *   - Unknown slug redirects back to /blog (SPA redirect)
 *   - No raw error strings in h1/h2 headings on list page
 *   - Visual regression snapshots for list + first post
 *   - No </script> XSS vectors in JSON-LD
 *   - No internal connection strings exposed in body HTML
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/blog.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extract all JSON-LD schemas from the current page */
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

/**
 * First blog post slug and title — must match blog-data.ts to stay in sync.
 * If blog-data.ts changes, update these constants.
 */
const FIRST_POST_SLUG = 'knowledge-graphs-in-education';
const FIRST_POST_TITLE_FRAGMENT = 'Knowledge Graphs';

// ── Blog List Page (/blog) ─────────────────────────────────────────────────────

test.describe('Blog — List Page (/blog)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'domcontentloaded' });
    // Wait for React to render the blog cards (links to /blog/:slug appear after hydration)
    await page.waitForFunction(
      () => document.querySelectorAll('a[href^="/blog/"]').length >= 4,
      { timeout: 15_000 },
    );
  });

  test('/blog returns HTTP 200', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/blog`);
    expect(response.status()).toBe(200);
  });

  test('/blog shows at least 4 blog post cards', async ({ page }) => {
    // Each card has a "Read More" link pointing to /blog/:slug
    const blogLinks = await page.locator('a[href^="/blog/"]').all();
    expect(blogLinks.length).toBeGreaterThanOrEqual(4);
  });

  test('/blog list page has correct page title containing "Blog"', async ({ page }) => {
    // Wait for react-helmet-async to override the default index.html title
    await page.waitForFunction(
      () => /blog/i.test(document.title),
      { timeout: 10_000 },
    );
    const title = await page.title();
    expect(title).toMatch(/blog/i);
  });

  test('/blog list page has canonical URL containing /blog', async ({ page }) => {
    // Wait for react-helmet-async to inject the canonical link
    await page.waitForFunction(
      () => {
        const el = document.querySelector('link[rel="canonical"]');
        return el ? (el.getAttribute('href') ?? '').includes('/blog') : false;
      },
      { timeout: 15_000 },
    );
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('/blog');
  });

  test('/blog list page has h1 heading "EduSphere Blog"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /EduSphere Blog/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('/blog list page h1/h2 headings contain no raw error strings', async ({ page }) => {
    const headings = await page.locator('h1, h2').allTextContents();
    for (const heading of headings) {
      expect(heading).not.toMatch(/GraphQL error/i);
      expect(heading).not.toMatch(/\bundefined\b/);
      expect(heading).not.toMatch(/\bnull\b/);
      expect(heading).not.toMatch(/\[object Object\]/i);
      expect(heading).not.toMatch(/TypeError|ReferenceError|SyntaxError/i);
    }
  });

  test('/blog list page does not expose DB connection strings in HTML', async ({ page }) => {
    const bodyHtml = await page.locator('html').innerHTML();
    expect(bodyHtml).not.toMatch(/DATABASE_URL|postgres:\/\/|postgresql:\/\//i);
    expect(bodyHtml).not.toMatch(/api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i);
    expect(bodyHtml).not.toMatch(/bearer\s+[a-zA-Z0-9._-]{20,}/i);
  });

  test('no </script> XSS vectors in /blog JSON-LD', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      expect(text).not.toContain('</script>');
    }
  });

  // ─── Visual regression ──────────────────────────────────────────────────────

  test('visual snapshot — blog list page', async ({ page }) => {
    await expect(page).toHaveScreenshot('blog-list.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ── Blog Detail Page (/blog/:slug) ─────────────────────────────────────────────

test.describe('Blog — Detail Page (/blog/:slug)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${FIRST_POST_SLUG}`, { waitUntil: 'domcontentloaded' });
    // Wait for react-helmet-async to inject the BlogPosting JSON-LD schema
    await page.waitForFunction(
      () => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
          try {
            const d = JSON.parse(s.textContent ?? '');
            if (d['@type'] === 'BlogPosting') return true;
          } catch { /* */ }
        }
        return false;
      },
      { timeout: 15_000 },
    );
  });

  test('clicking first blog card navigates to /blog/:slug', async ({ page }) => {
    // Navigate from list page → click first card link → land on detail page
    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'domcontentloaded' });
    const firstLink = page.locator(`a[href="/blog/${FIRST_POST_SLUG}"]`).first();
    await firstLink.click();
    await page.waitForURL(`**/blog/${FIRST_POST_SLUG}`, { timeout: 10_000 });
    expect(page.url()).toContain(`/blog/${FIRST_POST_SLUG}`);
  });

  test('blog detail page <title> contains post title fragment', async ({ page }) => {
    const title = await page.title();
    expect(title).toMatch(new RegExp(FIRST_POST_TITLE_FRAGMENT, 'i'));
  });

  test('blog detail page has og:type = "article"', async ({ page }) => {
    // react-helmet-async may render multiple og:type tags — the last one wins for crawlers
    const ogTypeElements = await page.locator('meta[property="og:type"]').all();
    expect(ogTypeElements.length).toBeGreaterThan(0);
    const ogTypes = await Promise.all(ogTypeElements.map((el) => el.getAttribute('content')));
    expect(ogTypes).toContain('article');
  });

  test('blog detail page has og:image containing /aeo/og', async ({ page }) => {
    const ogImageElements = await page.locator('meta[property="og:image"]').all();
    expect(ogImageElements.length).toBeGreaterThan(0);
    const ogImages = await Promise.all(ogImageElements.map((el) => el.getAttribute('content')));
    const hasAeoOgImage = ogImages.some((src) => src && src.includes('/aeo/og'));
    expect(hasAeoOgImage).toBe(true);
  });

  test('blog detail page has BlogPosting JSON-LD', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blogPosting = schemas.find((s: any) => s['@type'] === 'BlogPosting') as
      | Record<string, unknown>
      | undefined;
    expect(blogPosting).toBeTruthy();
    if (blogPosting) {
      expect(blogPosting['@context']).toBe('https://schema.org');
      expect(typeof blogPosting['headline']).toBe('string');
      expect(typeof blogPosting['description']).toBe('string');
      expect(typeof blogPosting['datePublished']).toBe('string');
    }
  });

  test('blog detail BlogPosting JSON-LD has author field', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blogPosting = schemas.find((s: any) => s['@type'] === 'BlogPosting') as any;
    expect(blogPosting).toBeTruthy();
    expect(blogPosting.author).toBeTruthy();
  });

  test('blog detail page has BreadcrumbList JSON-LD', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList') as any;
    expect(breadcrumb).toBeTruthy();
    expect(breadcrumb.itemListElement).toBeInstanceOf(Array);
    // /blog detail breadcrumb: Home → Blog → Post Title (≥ 3 items)
    expect(breadcrumb.itemListElement.length).toBeGreaterThanOrEqual(3);
  });

  test('blog detail page does not expose internal data in JSON-LD', async ({ page }) => {
    const schemas = await getAllSchemas(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blogPosting = schemas.find((s: any) => s['@type'] === 'BlogPosting') as
      | Record<string, unknown>
      | undefined;
    if (blogPosting) {
      expect(Object.keys(blogPosting)).not.toContain('tenantId');
      expect(Object.keys(blogPosting)).not.toContain('internalId');
      expect(Object.keys(blogPosting)).not.toContain('userId');
    }
  });

  test('no </script> XSS vectors in blog detail JSON-LD', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      expect(text).not.toContain('</script>');
    }
  });

  // ─── Visual regression ──────────────────────────────────────────────────────

  test('visual snapshot — blog detail page (first post)', async ({ page }) => {
    await expect(page).toHaveScreenshot('blog-post-kg.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ── SPA Redirect for Unknown Slug ─────────────────────────────────────────────

test.describe('Blog — Unknown Slug Redirect', () => {
  test('/blog/nonexistent-slug-12345 redirects back to /blog', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/nonexistent-slug-12345`, {
      waitUntil: 'domcontentloaded',
    });
    // BlogPostPage calls navigate('/blog', { replace: true }) when post is not found.
    // Wait until the URL no longer contains the nonexistent slug.
    await page.waitForFunction(
      () => !window.location.pathname.includes('nonexistent-slug-12345'),
      { timeout: 10_000 },
    );
    expect(page.url()).toMatch(/\/blog\/?$/);
  });
});
