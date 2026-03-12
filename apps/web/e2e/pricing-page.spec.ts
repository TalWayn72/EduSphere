/**
 * pricing-page.spec.ts — Pricing Page E2E Tests
 *
 * Route: /pricing  (public — no authentication required)
 *
 * Covers:
 *   PricingPage hero, PricingSection (4 tiers), ComplianceBadgesSection,
 *   VsCompetitorsSection, FAQ accordion, CTA navigation, visual regression
 *
 * No live GraphQL server required — page is fully static/server-rendered.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/pricing-page.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ─── Anti-regression helpers ──────────────────────────────────────────────────

/** Assert no raw technical error strings are visible to the user. */
async function assertNoRawErrors(page: import('@playwright/test').Page): Promise<void> {
  const body = await page.textContent('body') ?? '';
  expect(body).not.toContain('urql error');
  expect(body).not.toContain('GraphQL error');
  expect(body).not.toContain('Cannot read properties');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('undefined');
  expect(body).not.toContain('Error:');
}

// ─── Suite 1: Page Load & Nav ─────────────────────────────────────────────────

test.describe('Pricing Page — Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('pricing page root element is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="pricing-page"]')).toBeVisible({ timeout: 10_000 });
  });

  test('page title is "Pricing & Plans"', async ({ page }) => {
    await expect(page).toHaveTitle(/Pricing & Plans/i, { timeout: 10_000 });
  });

  test('hero heading "Pricing & Plans" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Pricing & Plans/i, level: 1 })).toBeVisible({ timeout: 10_000 });
  });

  test('hero subtitle mentions YAU-based pricing', async ({ page }) => {
    await expect(page.getByText(/Transparent YAU-based pricing/i)).toBeVisible({ timeout: 10_000 });
  });

  test('no raw error strings anywhere on page', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 2: Pricing Tiers ───────────────────────────────────────────────────

test.describe('Pricing Page — Pricing Tiers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('pricing section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="pricing-section"]')).toBeVisible({ timeout: 10_000 });
  });

  test('all 4 tier names are visible: Starter, Growth, University, Enterprise', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    for (const tier of ['Starter', 'Growth', 'University', 'Enterprise']) {
      await expect(section.getByText(tier).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('Starter plan shows $12,000 price', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section.getByText('$12,000')).toBeVisible({ timeout: 10_000 });
  });

  test('Growth plan shows $32,000 price', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section.getByText('$32,000')).toBeVisible({ timeout: 10_000 });
  });

  test('University plan shows $65,000 price', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section.getByText('$65,000')).toBeVisible({ timeout: 10_000 });
  });

  test('Enterprise plan shows "Custom" price', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section.getByText('Custom')).toBeVisible({ timeout: 10_000 });
  });

  test('each plan card has a CTA button or link', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    // Starter + Growth → "Start Pilot", University → "Request Demo", Enterprise → "Contact Sales"
    for (const ctaText of ['Start Pilot', 'Request Demo', 'Contact Sales']) {
      await expect(section.getByRole('link', { name: new RegExp(ctaText, 'i') }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('"Contact Sales" CTA is visible for Enterprise tier', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section.getByRole('link', { name: /Contact Sales/i })).toBeVisible({ timeout: 10_000 });
  });

  test('"White-label INCLUDED" badge appears on all tier cards', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    const badges = section.getByText('White-label INCLUDED');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('YAU capacity labels are visible (500 YAU, 2,000 YAU, 10,000 YAU, Unlimited)', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    for (const yau of ['500 YAU', '2,000 YAU', '10,000 YAU', 'Unlimited']) {
      await expect(section.getByText(yau)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('University tier has "Most Popular" badge', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section.getByText('Most Popular')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 3: Hero CTA Navigation ─────────────────────────────────────────────

test.describe('Pricing Page — Hero CTA Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('"Start Free Pilot →" CTA link is visible in hero', async ({ page }) => {
    // Hero area above the PricingSection
    const heroCta = page.getByRole('link', { name: /Start Free Pilot/i }).first();
    await expect(heroCta).toBeVisible({ timeout: 10_000 });
  });

  test('"Start Free Pilot →" CTA href points to /pilot', async ({ page }) => {
    const heroCta = page.getByRole('link', { name: /Start Free Pilot/i }).first();
    const href = await heroCta.getAttribute('href');
    expect(href).toContain('/pilot');
  });

  test('nav "Log In" link is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Log In/i })).toBeVisible({ timeout: 10_000 });
  });

  test('nav logo links back to /landing', async ({ page }) => {
    const logo = page.getByRole('link', { name: /EduSphere/i }).first();
    const href = await logo.getAttribute('href');
    expect(href).toContain('/landing');
  });
});

// ─── Suite 4: Compliance Badges ───────────────────────────────────────────────

test.describe('Pricing Page — Compliance Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('compliance section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="compliance-badges-section"]')).toBeVisible({ timeout: 10_000 });
  });

  test('FERPA compliance card is visible', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section.getByText('FERPA')).toBeVisible({ timeout: 10_000 });
  });

  test('WCAG 2.2 AA compliance card is visible', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section.getByText('WCAG 2.2 AA')).toBeVisible({ timeout: 10_000 });
  });

  test('SCORM 2004 compliance card is visible', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section.getByText('SCORM 2004')).toBeVisible({ timeout: 10_000 });
  });

  test('LTI 1.3 compliance card is visible', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section.getByText('LTI 1.3')).toBeVisible({ timeout: 10_000 });
  });

  test('all 8 compliance badges are rendered', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    const expectedBadges = [
      'FERPA',
      'WCAG 2.2 AA',
      'SCORM 2004',
      'LTI 1.3',
      'xAPI / Tin Can',
      'SAML 2.0 SSO',
      'GDPR',
      'Air-Gapped Ready',
    ];
    for (const badge of expectedBadges) {
      await expect(section.getByText(badge)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('SOC 2 Type II roadmap notice is visible', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section.getByText(/SOC 2 Type II/i)).toBeVisible({ timeout: 10_000 });
  });

  test('VPAT / HECVAT download link is present and has an href', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    const link = section.getByRole('link', { name: /Download VPAT/i });
    await expect(link).toBeVisible({ timeout: 10_000 });
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('no raw error strings in compliance section', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 5: Competitor Comparison Table ─────────────────────────────────────

test.describe('Pricing Page — Competitor Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('comparison section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="vs-competitors-section"]')).toBeVisible({ timeout: 10_000 });
  });

  test('EduSphere column header is visible', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    await expect(section.getByText('EduSphere').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Canvas competitor column is visible', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    await expect(section.getByText('Canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('D2L competitor column is visible', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    await expect(section.getByText('D2L')).toBeVisible({ timeout: 10_000 });
  });

  test('comparison table has at least 10 feature rows', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    const rows = section.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('Knowledge Graph AI row shows EduSphere winning (✅)', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    const table = section.locator('table');
    const kgRow = table.getByRole('row', { name: /Knowledge Graph AI/i });
    await expect(kgRow).toBeVisible({ timeout: 10_000 });
    const eduCell = kgRow.locator('td').nth(1);
    await expect(eduCell.getByText('✅')).toBeVisible({ timeout: 5_000 });
  });

  test('White-label Included row shows EduSphere winning (✅)', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    const table = section.locator('table');
    const wlRow = table.getByRole('row', { name: /White-label Included/i });
    await expect(wlRow).toBeVisible({ timeout: 10_000 });
    const eduCell = wlRow.locator('td').nth(1);
    await expect(eduCell.getByText('✅')).toBeVisible({ timeout: 5_000 });
  });

  test('no raw error strings in comparison section', async ({ page }) => {
    await assertNoRawErrors(page);
  });
});

// ─── Suite 6: FAQ Accordion ───────────────────────────────────────────────────

test.describe('Pricing Page — FAQ Accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('FAQ section is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="pricing-faq"]')).toBeVisible({ timeout: 10_000 });
  });

  test('"Frequently Asked Questions" heading is visible', async ({ page }) => {
    const faq = page.locator('[data-testid="pricing-faq"]');
    await expect(faq.getByRole('heading', { name: /Frequently Asked Questions/i })).toBeVisible({ timeout: 10_000 });
  });

  test('FAQ item expands on click and reveals answer', async ({ page }) => {
    const faq = page.locator('[data-testid="pricing-faq"]');
    const firstBtn = faq.getByRole('button').first();
    await expect(firstBtn).toBeVisible({ timeout: 10_000 });
    // Initially collapsed — aria-expanded should be false
    await expect(firstBtn).toHaveAttribute('aria-expanded', 'false');
    // Click to expand
    await firstBtn.click();
    await expect(firstBtn).toHaveAttribute('aria-expanded', 'true');
    // Answer text is now visible
    await expect(faq.getByText(/Yearly Active User/i)).toBeVisible({ timeout: 5_000 });
  });

  test('FAQ item collapses on second click', async ({ page }) => {
    const faq = page.locator('[data-testid="pricing-faq"]');
    const firstBtn = faq.getByRole('button').first();
    await firstBtn.click();
    await firstBtn.click();
    await expect(firstBtn).toHaveAttribute('aria-expanded', 'false');
  });
});

// ─── Suite 7: Footer Links ────────────────────────────────────────────────────

test.describe('Pricing Page — Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  });

  test('footer is visible', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible({ timeout: 10_000 });
  });

  test('footer "Start Pilot" link is present', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: /Start Pilot/i })).toBeVisible({ timeout: 10_000 });
  });

  test('footer "Home" link navigates to /landing', async ({ page }) => {
    const footer = page.locator('footer');
    const homeLink = footer.getByRole('link', { name: /Home/i });
    const href = await homeLink.getAttribute('href');
    expect(href).toContain('/landing');
  });

  test('footer copyright year is correct', async ({ page }) => {
    const footer = page.locator('footer');
    const year = new Date().getFullYear().toString();
    await expect(footer.getByText(new RegExp(year))).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 8: Visual Regression ───────────────────────────────────────────────

test.describe('Pricing Page — Visual Regression', () => {
  test('full pricing page matches visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    // Ensure all sections loaded before screenshot
    await expect(page.locator('[data-testid="pricing-section"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="compliance-badges-section"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="vs-competitors-section"]')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot('pricing-page-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('pricing tiers section matches visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 10_000 });
    await expect(section).toHaveScreenshot('pricing-tiers-section.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('compliance badges section matches visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 10_000 });
    await expect(section).toHaveScreenshot('pricing-compliance-section.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
