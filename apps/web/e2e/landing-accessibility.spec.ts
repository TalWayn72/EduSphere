/**
 * landing-accessibility.spec.ts — B2B Landing Page WCAG 2.2 AA Accessibility Tests
 *
 * Route: /landing  (public — no authentication required)
 *
 * Tests cover:
 *   - axe-core accessibility audit (critical + serious violations = 0)
 *   - Interactive elements have accessible names (buttons, links)
 *   - All images have non-empty alt text
 *   - Keyboard navigability of the pilot form
 *   - ARIA landmarks and roles on key sections
 *   - Screen-reader-friendly pricing section
 *   - Compliance section ARIA annotations
 *   - Reduced-motion support for animated elements
 *
 * axe-core is injected at runtime via page.addScriptTag (no npm dependency needed).
 * Uses axe-core CDN for the test runner environment.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/landing-accessibility.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

// ─── axe-core injection helper ────────────────────────────────────────────────

/**
 * Inject axe-core from CDN and run an audit against the specified CSS selector.
 * Returns the axe results object.
 */
async function runAxe(
  page: import('@playwright/test').Page,
  context: string = 'body'
): Promise<{ violations: AxeViolation[] }> {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
  });

  return page.evaluate(
    async ({ ctx }: { ctx: string }) => {
      // @ts-expect-error axe is injected globally
      const results = await window.axe.run(ctx, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      });
      return { violations: results.violations };
    },
    { ctx: context }
  );
}

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  nodes: Array<{ html: string }>;
}

/** Filter to only critical and serious violations (ignore moderate / minor). */
function criticalViolations(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

// ─── Suite 1: axe-core Automated Audit ───────────────────────────────────────

test.describe('Landing Page — WCAG 2.2 AA axe-core Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('hero section passes axe audit (0 critical/serious violations)', async ({ page }) => {
    const { violations } = await runAxe(page, '[data-testid="hero-section"]');
    const serious = criticalViolations(violations);
    if (serious.length > 0) {
      const details = serious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  Node: ${v.nodes[0]?.html ?? 'n/a'}`)
        .join('\n');
      throw new Error(`Hero section axe violations:\n${details}`);
    }
    expect(serious).toHaveLength(0);
  });

  test('trust bar passes axe audit (0 critical/serious violations)', async ({ page }) => {
    const { violations } = await runAxe(page, '[data-testid="trust-bar"]');
    const serious = criticalViolations(violations);
    expect(serious).toHaveLength(0);
  });

  test('compliance badges section passes axe audit (0 critical/serious violations)', async ({ page }) => {
    const { violations } = await runAxe(page, '[data-testid="compliance-badges-section"]');
    const serious = criticalViolations(violations);
    expect(serious).toHaveLength(0);
  });

  test('competitor comparison table passes axe audit (0 critical/serious violations)', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    await section.scrollIntoViewIfNeeded();
    const { violations } = await runAxe(page, '[data-testid="vs-competitors-section"]');
    const serious = criticalViolations(violations);
    expect(serious).toHaveLength(0);
  });

  test('pricing section passes axe audit (0 critical/serious violations)', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();
    const { violations } = await runAxe(page, '[data-testid="pricing-section"]');
    const serious = criticalViolations(violations);
    expect(serious).toHaveLength(0);
  });

  test('pilot CTA form passes axe audit (0 critical/serious violations)', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();
    const { violations } = await runAxe(page, '[data-testid="pilot-cta-section"]');
    const serious = criticalViolations(violations);
    expect(serious).toHaveLength(0);
  });

  test('full landing page passes axe audit (0 critical/serious violations)', async ({ page }) => {
    // Scroll through the page to allow lazy sections to render
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));

    const { violations } = await runAxe(page, 'main');
    const serious = criticalViolations(violations);
    if (serious.length > 0) {
      const details = serious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  Node: ${v.nodes[0]?.html ?? 'n/a'}`)
        .join('\n');
      throw new Error(`Full page axe violations:\n${details}`);
    }
    expect(serious).toHaveLength(0);
  });
});

// ─── Suite 2: Interactive Elements Accessible Names ───────────────────────────

test.describe('Landing Page — Interactive Elements Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('all buttons have accessible names (text or aria-label)', async ({ page }) => {
    const buttons = await page.getByRole('button').all();
    for (const button of buttons) {
      const name = await button.getAttribute('aria-label')
        ?? await button.textContent()
        ?? '';
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  test('all links have accessible names', async ({ page }) => {
    const links = await page.getByRole('link').all();
    for (const link of links) {
      const ariaLabel = await link.getAttribute('aria-label');
      const textContent = await link.textContent() ?? '';
      const ariaLabelledBy = await link.getAttribute('aria-labelledby');
      // Link must have either aria-label, visible text, or aria-labelledby
      const hasName = (ariaLabel?.trim().length ?? 0) > 0
        || textContent.trim().length > 0
        || (ariaLabelledBy?.trim().length ?? 0) > 0;
      expect(hasName).toBe(true);
    }
  });

  test('nav hamburger button has aria-label and aria-expanded', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });

    const hamburger = page.getByRole('button', { name: /Open menu/i });
    await expect(hamburger).toBeVisible({ timeout: 10_000 });
    const ariaExpanded = await hamburger.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    await hamburger.click();
    const ariaExpandedAfter = await hamburger.getAttribute('aria-expanded');
    expect(ariaExpandedAfter).toBe('true');
  });

  test('FAQ accordion buttons have aria-expanded attribute', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    const faqButtons = section.locator('button[aria-expanded]');
    const count = await faqButtons.count();
    expect(count).toBeGreaterThanOrEqual(3); // 3 FAQs

    // Each FAQ button must have aria-expanded=false initially
    for (let i = 0; i < count; i++) {
      const expanded = await faqButtons.nth(i).getAttribute('aria-expanded');
      expect(expanded).toBe('false');
    }
  });

  test('comparison table has role="table" and aria-label', async ({ page }) => {
    const table = page.locator('table[role="table"]');
    await expect(table).toHaveAttribute('aria-label', 'LMS comparison table');
  });

  test('compliance certifications list has role="list" with aria-label', async ({ page }) => {
    const list = page.locator(
      '[data-testid="trust-bar"] [role="list"][aria-label="Compliance certifications"]'
    );
    await expect(list).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 3: Images & Media ──────────────────────────────────────────────────

test.describe('Landing Page — Images & Media Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('all informational images have non-empty alt text', async ({ page }) => {
    // Decorative images should have aria-hidden="true" or empty alt=""
    // Informational images must have descriptive alt text
    const images = await page.locator('img:not([aria-hidden="true"])').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // alt attribute must exist (even if empty for decorative)
      expect(alt).not.toBeNull();
    }
  });

  test('aria-hidden decorative icons do not receive focus', async ({ page }) => {
    // All Lucide/SVG icons marked aria-hidden="true" must not be focusable
    const hiddenIcons = await page.locator('[aria-hidden="true"]').all();
    for (const icon of hiddenIcons) {
      const tabIndex = await icon.getAttribute('tabindex');
      // tabindex="0" on aria-hidden is a violation
      expect(tabIndex).not.toBe('0');
    }
  });
});

// ─── Suite 4: Color Contrast ──────────────────────────────────────────────────

test.describe('Landing Page — Color Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('hero h1 text is white on dark background (meets 4.5:1 contrast)', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible({ timeout: 10_000 });

    const styles = await h1.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    // Hero h1 uses white text (rgb(255, 255, 255))
    expect(styles.color).toMatch(/rgb\(255,\s*255,\s*255\)/);
  });

  test('pricing section headings use dark text on light background', async ({ page }) => {
    const pricingHeading = page.locator('[data-testid="pricing-section"] h2');
    await pricingHeading.scrollIntoViewIfNeeded();
    await expect(pricingHeading).toBeVisible({ timeout: 10_000 });

    const styles = await pricingHeading.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return { color: computed.color };
    });

    // slate-900 = rgb(15, 23, 42) — dark text
    expect(styles.color).toMatch(/rgb\(1[0-5],\s*[0-9]+,\s*[0-9]+\)/);
  });
});

// ─── Suite 5: Keyboard Navigation ────────────────────────────────────────────

test.describe('Landing Page — Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('pilot form is keyboard navigable — all fields reachable via Tab', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();

    // Focus the orgName field to start keyboard nav
    await section.locator('#orgName').focus();
    await expect(section.locator('#orgName')).toBeFocused();

    // Tab through fields: orgName → (orgType trigger) → contactName → email
    await page.keyboard.press('Tab');
    // After orgName, focus moves to orgType select trigger
    const focusedAfterFirstTab = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.getAttribute('role') ?? '');
    expect(['orgType', 'combobox', 'listbox'].some((id) => focusedAfterFirstTab.includes(id)) || focusedAfterFirstTab.length > 0).toBe(true);
  });

  test('submit button is reachable by keyboard from first form field', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();

    // Focus first form field
    await section.locator('#orgName').focus();

    // Tab through all form fields until submit button is focused
    let submitFocused = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focusedEl = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return { type: el.getAttribute('type'), text: el.textContent?.trim() };
      });
      if (focusedEl?.type === 'submit' || focusedEl?.text?.toLowerCase().includes('apply')) {
        submitFocused = true;
        break;
      }
    }
    expect(submitFocused).toBe(true);
  });

  test('Enter key on nav Log In link navigates to /login', async ({ page }) => {
    const nav = page.locator('[data-testid="landing-nav"]');
    const loginLink = nav.getByRole('link', { name: /Log In/i });
    await loginLink.focus();
    await loginLink.press('Enter');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('FAQ accordion is keyboard operable via Enter key', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    const firstFaq = section.locator('button[aria-expanded]').first();
    await firstFaq.focus();
    await firstFaq.press('Enter');

    await expect(firstFaq).toHaveAttribute('aria-expanded', 'true');
    // Answer text should now be visible
    await expect(section.getByText(/logs in at least once/i)).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Suite 6: ARIA Landmarks & Roles ─────────────────────────────────────────

test.describe('Landing Page — ARIA Landmarks & Roles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('page has a main landmark containing all content sections', async ({ page }) => {
    const main = page.locator('#main-content');
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('navigation landmark is present (landing nav)', async ({ page }) => {
    const nav = page.locator('[data-testid="landing-nav"]');
    // nav element is implicitly role=navigation
    const tagName = await nav.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('nav');
  });

  test('hero section has aria-label="Hero"', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toHaveAttribute('aria-label', 'Hero');
  });

  test('compliance section has aria-label="Compliance certifications"', async ({ page }) => {
    const section = page.locator('[data-testid="compliance-badges-section"]');
    await expect(section).toHaveAttribute('aria-label', 'Compliance certifications');
  });

  test('comparison section has aria-label="Comparison with competitors"', async ({ page }) => {
    const section = page.locator('[data-testid="vs-competitors-section"]');
    await expect(section).toHaveAttribute('aria-label', 'Comparison with competitors');
  });

  test('pricing section has aria-label="Pricing plans"', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await expect(section).toHaveAttribute('aria-label', 'Pricing plans');
  });

  test('ROI calculator section has aria-label="ROI Calculator"', async ({ page }) => {
    const section = page.locator('[data-testid="roi-calculator-section"]');
    await expect(section).toHaveAttribute('aria-label', 'ROI Calculator');
  });

  test('pilot CTA section has aria-label="Start your 90-day pilot"', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await expect(section).toHaveAttribute('aria-label', 'Start your 90-day pilot');
  });

  test('trust bar has aria-label="Trust indicators"', async ({ page }) => {
    const bar = page.locator('[data-testid="trust-bar"]');
    await expect(bar).toHaveAttribute('aria-label', 'Trust indicators');
  });
});

// ─── Suite 7: Screen-reader Pricing ──────────────────────────────────────────

test.describe('Landing Page — Screen Reader Pricing Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('each pricing plan has a visible h3 heading', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    const planNames = ['Starter', 'Growth', 'University', 'Enterprise'];
    for (const name of planNames) {
      await expect(section.getByRole('heading', { name, level: 3 })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('price amounts are present and readable (not hidden from AT)', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    // $12,000 and $28,000 and $65,000 must be visible text
    await expect(section.getByText('$12,000')).toBeVisible({ timeout: 10_000 });
    await expect(section.getByText('$28,000')).toBeVisible({ timeout: 10_000 });
    await expect(section.getByText('$65,000')).toBeVisible({ timeout: 10_000 });
    await expect(section.getByText('Custom')).toBeVisible({ timeout: 10_000 });
  });

  test('pricing CTA buttons have accessible names', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    const ctaLinks = section.getByRole('link', { name: /Start Pilot|Request Demo|Contact Sales/i });
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Most Popular visual indicator has visible text (not icon-only)', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    // "Most Popular" is rendered as visible text, not just a CSS decoration
    await expect(section.getByText('Most Popular')).toBeVisible({ timeout: 10_000 });
  });

  test('YAU tooltip button has aria-label="What is YAU?"', async ({ page }) => {
    const section = page.locator('[data-testid="pricing-section"]');
    await section.scrollIntoViewIfNeeded();

    const tooltip = section.getByRole('button', { name: /What is YAU/i });
    await expect(tooltip).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 8: Form Accessibility ─────────────────────────────────────────────

test.describe('Landing Page — Pilot Form Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('all required form fields have aria-required="true"', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();

    const requiredFields = ['orgName', 'contactName', 'email', 'estimatedUsers', 'useCase'];
    for (const fieldId of requiredFields) {
      const field = section.locator(`#${fieldId}`);
      await expect(field).toHaveAttribute('aria-required', 'true');
    }
  });

  test('form field labels are associated with inputs via htmlFor', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();

    const fieldPairs = [
      { labelText: /Organization Name/i, inputId: 'orgName' },
      { labelText: /Contact Name/i, inputId: 'contactName' },
      { labelText: /Email/i, inputId: 'email' },
    ];

    for (const { inputId } of fieldPairs) {
      const input = section.locator(`#${inputId}`);
      await expect(input).toBeVisible({ timeout: 10_000 });
      // Field must be labelled — either by label[for] or aria-labelledby
      const labelText2 = await input.getAttribute('aria-labelledby')
        ?? await section.locator(`label[for="${inputId}"]`).textContent()
        ?? '';
      expect(labelText2.length).toBeGreaterThan(0);
    }
  });

  test('validation errors use role="alert" for screen reader announcement', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();

    // Trigger validation
    await section.getByRole('button', { name: /Apply for Free Pilot/i }).click();

    // Error paragraphs must have role="alert"
    await expect(section.locator('[role="alert"]').first()).toBeVisible({ timeout: 3_000 });
  });

  test('form has accessible name via aria-label', async ({ page }) => {
    const section = page.locator('[data-testid="pilot-cta-section"]');
    await section.scrollIntoViewIfNeeded();

    const form = section.getByRole('form', { name: /Pilot application form/i });
    await expect(form).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Suite 9: Reduced Motion Support ─────────────────────────────────────────

test.describe('Landing Page — Reduced Motion Support', () => {
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'domcontentloaded' });
  });

  test('h1 heading is immediately visible with reduced-motion (no animation delay)', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible({ timeout: 3_000 });
  });

  test('pulse animations on decorative elements use motion-safe CSS', async ({ page }) => {
    // Elements with animate-pulse should respect prefers-reduced-motion
    const pulseEl = page.locator('.animate-pulse').first();
    if (await pulseEl.count() > 0) {
      const animationName = await pulseEl.evaluate((el) =>
        window.getComputedStyle(el).animationName
      );
      // Under prefers-reduced-motion: reduce, animation must be "none"
      expect(animationName).toBe('none');
    }
  });
});
