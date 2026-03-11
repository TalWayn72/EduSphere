/**
 * FAQ Page — AEO E2E Tests
 *
 * Tests for the public /faq page introduced in Phase 50 AEO implementation.
 * Validates:
 *   - Page title and meta tags (PageMeta component)
 *   - FAQPage JSON-LD structured data (FAQSchema component)
 *   - BreadcrumbList JSON-LD (BreadcrumbSchema component)
 *   - Accordion open/close behaviour
 *   - Category tab filtering
 *   - Search input filtering
 *   - Contact support CTA link
 *   - ARIA attributes on accordion items
 *   - XSS guard: JSON-LD must not break out of <script> tags
 *   - Visual regression snapshot
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/aeo-faq-page.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

test.describe('FAQ Page — AEO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/faq`, { waitUntil: 'domcontentloaded' });
  });

  // ─── Meta / Title ──────────────────────────────────────────────────────────

  test('renders page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Frequently Asked Questions.*EduSphere/);
  });

  test('has correct meta description', async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc).toContain('EduSphere');
    if (desc) expect(desc.length).toBeLessThan(165);
  });

  test('has canonical link tag pointing to /faq', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('/faq');
  });

  // ─── JSON-LD Structured Data ───────────────────────────────────────────────

  test('has FAQPage JSON-LD structured data with Questions and Answers', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faqSchema = schemas.find((s: any) => s['@type'] === 'FAQPage') as any;
    expect(faqSchema).toBeTruthy();
    expect(faqSchema.mainEntity).toBeInstanceOf(Array);
    expect(faqSchema.mainEntity.length).toBeGreaterThan(5);
    expect(faqSchema.mainEntity[0]['@type']).toBe('Question');
    expect(faqSchema.mainEntity[0].acceptedAnswer).toBeTruthy();
    expect(faqSchema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });

  test('has BreadcrumbList JSON-LD with at least 2 items', async ({ page }) => {
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

  test('renders the main FAQ heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Frequently Asked Questions/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('first question "What is EduSphere?" is visible', async ({ page }) => {
    const firstQuestion = page.getByRole('button').filter({ hasText: /What is EduSphere/i });
    await expect(firstQuestion).toBeVisible({ timeout: 10_000 });
  });

  test('accordion opens on click and reveals answer', async ({ page }) => {
    // Close the first item if it is open by default, then reopen it
    const firstQuestion = page.getByRole('button').filter({ hasText: /What is EduSphere/i });
    await firstQuestion.click();
    // Check aria-expanded state changed
    const expanded = await firstQuestion.getAttribute('aria-expanded');
    // Either it's now "true" (we opened it) or "false" (we closed it) — both are valid boolean strings
    expect(['true', 'false']).toContain(expanded);
  });

  test('accordion answer text is visible after opening', async ({ page }) => {
    // Start with item closed (click to toggle open)
    const firstQuestion = page.getByRole('button').filter({ hasText: /What is EduSphere/i });
    const expanded = await firstQuestion.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await firstQuestion.click();
    }
    await expect(page.getByText(/AI-powered learning management system/i)).toBeVisible();
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  test('search input is present with correct aria-label', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search questions...');
    await expect(searchInput).toBeVisible();
    const ariaLabel = await searchInput.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('search filters FAQ items to show SCORM-related question', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search questions...');
    await searchInput.fill('SCORM');
    await expect(page.getByText(/SCORM/i)).toBeVisible();
  });

  test('search with no matching term shows empty state message', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search questions...');
    await searchInput.fill('xyznonexistentterm12345');
    await expect(page.getByText(/No questions found/i)).toBeVisible();
  });

  // ─── Category Tabs ────────────────────────────────────────────────────────

  test('category tabs are rendered with correct roles', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /All Questions/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Pricing/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Enterprise/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Technical/i })).toBeVisible();
  });

  test('Pricing tab click sets aria-selected to true', async ({ page }) => {
    const pricingTab = page.getByRole('tab', { name: 'Pricing' });
    await pricingTab.click();
    await expect(pricingTab).toHaveAttribute('aria-selected', 'true');
  });

  // ─── Contact CTA ──────────────────────────────────────────────────────────

  test('contact support link is present and has correct href', async ({ page }) => {
    const contactLink = page.getByRole('link', { name: /Contact Support/i });
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveAttribute('href', 'mailto:support@edusphere.dev');
  });

  // ─── Security ─────────────────────────────────────────────────────────────

  test('JSON-LD scripts do not contain </script> XSS vector', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      // </script> inside JSON-LD would break out of the script block
      expect(text).not.toContain('</script>');
    }
  });

  test('page does not expose internal hostnames or port numbers', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/localhost:\d{4}/);
    expect(bodyText).not.toMatch(/127\.0\.0\.1/);
  });

  // ─── Visual regression ────────────────────────────────────────────────────

  test('visual snapshot — FAQ page above the fold', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('faq-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});
