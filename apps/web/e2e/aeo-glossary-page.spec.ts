/**
 * Glossary Page — AEO E2E Tests
 *
 * Tests for the public /glossary page introduced in Phase 50 AEO implementation.
 * Validates:
 *   - Page title and meta tags
 *   - DefinedTermSet JSON-LD structured data
 *   - BreadcrumbList JSON-LD
 *   - Minimum 10 glossary term cards rendered
 *   - Search input filtering
 *   - Alphabet navigation (letter buttons)
 *   - Read more / Show less expand toggle per term card
 *   - XSS guard
 *   - Visual regression snapshot
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/aeo-glossary-page.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

test.describe('Glossary Page — AEO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/glossary`, { waitUntil: 'domcontentloaded' });
  });

  // ─── Meta / Title ──────────────────────────────────────────────────────────

  test('renders page with correct title containing EdTech Glossary and EduSphere', async ({ page }) => {
    await expect(page).toHaveTitle(/EdTech Glossary.*EduSphere/i);
  });

  test('has meta description with glossary-relevant terms', async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc).toMatch(/glossary|Knowledge Graph|SCORM|xAPI/i);
  });

  test('has canonical link tag pointing to /glossary', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('/glossary');
  });

  // ─── JSON-LD Structured Data ───────────────────────────────────────────────

  test('has DefinedTermSet JSON-LD with hasDefinedTerm array of 10+ terms', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    const schemas: unknown[] = [];
    for (const script of ldScripts) {
      const text = await script.textContent();
      if (text) schemas.push(JSON.parse(text));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const termSet = schemas.find((s: any) => s['@type'] === 'DefinedTermSet') as any;
    expect(termSet).toBeTruthy();
    expect(termSet.hasDefinedTerm).toBeInstanceOf(Array);
    expect(termSet.hasDefinedTerm.length).toBeGreaterThan(10);
    expect(termSet.hasDefinedTerm[0]['@type']).toBe('DefinedTerm');
    expect(termSet.hasDefinedTerm[0].name).toBeTruthy();
    expect(termSet.hasDefinedTerm[0].description).toBeTruthy();
  });

  test('has BreadcrumbList JSON-LD with EduSphere and Glossary items', async ({ page }) => {
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
    const names = breadcrumb.itemListElement.map((e: any) => e.item?.name ?? e.name);
    expect(names.join(' ')).toMatch(/EduSphere/i);
  });

  // ─── Page Content ─────────────────────────────────────────────────────────

  test('renders the main EdTech Glossary heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /EdTech Glossary/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows at least 10 term article cards on initial load', async ({ page }) => {
    // GlossaryTermCard renders <article itemType="https://schema.org/DefinedTerm">
    const termCards = page.locator('article[itemtype*="DefinedTerm"]');
    await expect(termCards).toHaveCount({ minimum: 10 });
  });

  test('Knowledge Graph term is visible in the list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Knowledge Graph' })).toBeVisible();
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  test('search input is present with correct aria-label', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search terms...');
    await expect(searchInput).toBeVisible();
    const ariaLabel = await searchInput.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('search filters to show SCORM term', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search terms...');
    await searchInput.fill('SCORM');
    await expect(page.getByRole('heading', { name: 'SCORM' })).toBeVisible();
    // Unrelated terms should not be visible
    await expect(page.getByRole('heading', { name: 'Apache AGE' })).not.toBeVisible();
  });

  test('search with no match shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search terms...');
    await searchInput.fill('xyznonexistentterm99999');
    await expect(page.getByText(/No terms found/i)).toBeVisible();
  });

  // ─── Alphabet Navigation ─────────────────────────────────────────────────

  test('"All" button is present and active by default', async ({ page }) => {
    const allButton = page.getByRole('button', { name: 'All' }).first();
    await expect(allButton).toBeVisible();
    // "All" is selected by default (activeLetter === null → aria-pressed="true")
    await expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('letter K button filters to show Knowledge Graph term', async ({ page }) => {
    const letterK = page.getByRole('button', { name: 'K' }).first();
    await letterK.click();
    await expect(letterK).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Knowledge Graph' })).toBeVisible();
  });

  test('letters without terms are disabled', async ({ page }) => {
    // 'X' has no terms in the dataset
    const letterX = page.getByRole('button', { name: 'X' }).first();
    await expect(letterX).toBeDisabled();
  });

  // ─── Read More / Show Less ────────────────────────────────────────────────

  test('Read more button expands the full definition', async ({ page }) => {
    const readMoreBtn = page.getByRole('button', { name: 'Read more' }).first();
    await readMoreBtn.click();
    await expect(page.getByRole('button', { name: 'Show less' }).first()).toBeVisible();
  });

  test('Show less collapses back to short definition', async ({ page }) => {
    const readMoreBtn = page.getByRole('button', { name: 'Read more' }).first();
    await readMoreBtn.click();
    const showLessBtn = page.getByRole('button', { name: 'Show less' }).first();
    await showLessBtn.click();
    await expect(page.getByRole('button', { name: 'Read more' }).first()).toBeVisible();
  });

  // ─── Security ─────────────────────────────────────────────────────────────

  test('JSON-LD scripts do not contain </script> XSS vector', async ({ page }) => {
    const ldScripts = await page.locator('script[type="application/ld+json"]').all();
    for (const script of ldScripts) {
      const text = await script.textContent();
      expect(text).not.toContain('</script>');
    }
  });

  // ─── Visual regression ────────────────────────────────────────────────────

  test('visual snapshot — Glossary page above the fold', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('glossary-page.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    });
  });
});
