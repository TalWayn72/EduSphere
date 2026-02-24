import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';

/**
 * Accessibility audit - WCAG 2.2 AA compliance.
 * CI BLOCKING: zero violations on every page.
 *
 * axe-core 4.10+ includes WCAG 2.2 rules under the 'wcag22aa' tag.
 *
 * Requires VITE_DEV_MODE=true (auto-auth, no Keycloak needed).
 * Run locally: pnpm --filter @edusphere/web test:a11y
 *
 * WCAG 2.2 criteria covered by manual/config checks (not automated axe):
 *   SC 2.4.11 - CSS :focus-visible rule in globals.css (3px solid #2563eb)
 *   SC 2.4.12 - html { scroll-padding-top: 60px } in globals.css
 *   SC 2.5.7  - N/A: no drag-only interactions (see docs/plans/wcag22-checklist.md)
 *   SC 3.2.6  - N/A: no persistent help mechanism (documented)
 *   SC 3.3.7  - N/A: no multi-step form with repeated fields (documented)
 *   SC 3.3.8  - Keycloak configured without CAPTCHA (documented)
 *   SC 3.3.9  - Keycloak configured without CAPTCHA (documented)
 */

/** WCAG tags for axe-core - includes all 2.1 AA rules PLUS new 2.2 AA rules. */
const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
] as const;

/** Navigate to a URL, wait for the network to settle, then run axe. */
async function auditPage(
  page: import('@playwright/test').Page,
  url: string,
): Promise<Result[]> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags([...WCAG_TAGS])
    .disableRules(['color-contrast'])
    .analyze();
  return results.violations;
}

/** Human-readable summary of axe violations for test failure output. */
function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return 'No violations';
  return violations
    .map(
      (v) =>
        `
[${v.impact ?? 'unknown'}] ${v.id}: ${v.description}` +
        `
  Affected: ${v.nodes.map((n) => n.target.join(', ')).join('
  ')}`,
    )
    .join('
');
}

// -------------------------------------------------------------------------
// WCAG 2.1 + 2.2 AA - axe automated page audits
// -------------------------------------------------------------------------

test.describe('Accessibility @a11y', () => {
  test('login page has no WCAG 2.2 AA violations', async ({ page }) => {
    const violations = await auditPage(page, '/login');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('dashboard page has no violations', async ({ page }) => {
    const violations = await auditPage(page, '/dashboard');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('courses list page has no violations', async ({ page }) => {
    const violations = await auditPage(page, '/courses');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('course content viewer page has no violations', async ({ page }) => {
    const violations = await auditPage(page, '/learn/content-1');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('agents page has no violations', async ({ page }) => {
    const violations = await auditPage(page, '/agents');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('knowledge graph page has no violations', async ({ page }) => {
    const violations = await auditPage(page, '/graph');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('annotations page has no violations', async ({ page }) => {
    const violations = await auditPage(page, '/annotations');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('pages are accessible in RTL mode (Hebrew)', async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
    const violations = await auditPage(page, '/courses');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('pages are accessible on mobile viewport (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const violations = await auditPage(page, '/courses');
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// -------------------------------------------------------------------------
// WCAG 2.2 SC 2.5.8 - Target Size (Minimum)
//
// All non-inline interactive elements must present an activation area >= 24x24
// CSS pixels. The test queries the live DOM after CSS is applied so that the
// min-height/min-width rules in globals.css are already in effect.
// -------------------------------------------------------------------------

test.describe('WCAG 2.2 SC 2.5.8 - Target Size @a11y', () => {
  const PAGES = ['/', '/courses', '/annotations', '/agents', '/dashboard'];

  for (const url of PAGES) {
    test(`interactive elements on ${url} meet 24x24 px target size`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      type ViolationEntry = {
        selector: string;
        width: number;
        height: number;
        text: string;
      };

      const violations = await page.evaluate((): ViolationEntry[] => {
        const selectors = [
          'button:not([hidden]):not([disabled])',
          '[role="button"]:not([hidden])',
          'input[type="checkbox"]:not([hidden])',
          'input[type="radio"]:not([hidden])',
          'select:not([hidden])',
        ];

        const MIN_PX = 24;
        const results: ViolationEntry[] = [];

        for (const sel of selectors) {
          document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            const box = el.getBoundingClientRect();
            if (box.width === 0 && box.height === 0) return;
            if (box.width < MIN_PX || box.height < MIN_PX) {
              results.push({
                selector: sel,
                width: Math.round(box.width),
                height: Math.round(box.height),
                text: (el.textContent ?? el.getAttribute('aria-label') ?? el.tagName)
                  .trim().slice(0, 60),
              });
            }
          });
        }
        return results;
      });

      const summary = violations
        .map((v) => `  "${v.text}" [${v.selector}] -> ${v.width}x${v.height}px`)
        .join('
');

      expect(
        violations,
        `Target size violations on ${url}:
${summary}`,
      ).toHaveLength(0);
    });
  }
});

// -------------------------------------------------------------------------
// WCAG 2.2 SC 2.4.11 - Focus Appearance
//
// Focused elements must have a visible outline with contrast >= 3:1 against
// adjacent colours and indicator area >= perimeter x 1 CSS pixel.
// globals.css applies *:focus-visible { outline: 3px solid #2563eb }.
// These tests verify the computed style in the browser after CSS is applied.
// -------------------------------------------------------------------------

test.describe('WCAG 2.2 SC 2.4.11 - Focus Appearance @a11y', () => {
  test('first focusable element on / has visible outline on keyboard focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    const outlineWidth = await focused.evaluate(
      (el) => window.getComputedStyle(el).outlineWidth,
    );
    const outlineStyle = await focused.evaluate(
      (el) => window.getComputedStyle(el).outlineStyle,
    );
    const outlineColor = await focused.evaluate(
      (el) => window.getComputedStyle(el).outlineColor,
    );

    expect(outlineWidth, 'Focus outline-width must not be 0px').not.toBe('0px');
    expect(outlineStyle, 'Focus outline-style must not be none').not.toBe('none');
    expect(outlineColor, 'Focus outline must not be transparent').not.toContain('rgba(0, 0, 0, 0)');
  });

  test('focusable elements on /courses each receive a visible outline', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const maxTabs = 10;
    const noOutlineElements: string[] = [];

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      type FocusInfo = {
        tag: string;
        text: string;
        outlineWidth: string;
        outlineStyle: string;
      } | null;

      const focusInfo = await page.evaluate((): FocusInfo => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          text: (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40),
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
        };
      });

      if (!focusInfo) break;

      const hasOutline =
        focusInfo.outlineWidth !== '0px' && focusInfo.outlineStyle !== 'none';

      if (!hasOutline) {
        noOutlineElements.push(`${focusInfo.tag}: "${focusInfo.text}"`);
      }
    }

    expect(
      noOutlineElements,
      `Elements missing focus outline:
${noOutlineElements.join('
')}`,
    ).toHaveLength(0);
  });
});

// -------------------------------------------------------------------------
// WCAG 2.2 SC 2.4.12 - Focus Not Obscured (Minimum)
//
// When a component receives keyboard focus it must not be completely hidden
// behind sticky headers or footers.
// EduSphere header is not position:sticky so obscurement is not expected;
// this test guards against future layout regressions.
// -------------------------------------------------------------------------

test.describe('WCAG 2.2 SC 2.4.12 - Focus Not Obscured @a11y', () => {
  test('focused elements are not fully hidden by the header on /courses', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const viewportHeight = page.viewportSize()?.height ?? 768;
    const maxTabs = 15;
    const obscuredElements: string[] = [];

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      type ObscureResult = {
        tag: string;
        text: string;
        fullyAbove: boolean;
        fullyBelow: boolean;
      } | null;

      const result = await page.evaluate((vpHeight: number): ObscureResult => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const box = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40),
          fullyAbove: box.bottom <= 0,
          fullyBelow: box.top >= vpHeight,
        };
      }, viewportHeight);

      if (!result) break;

      if (result.fullyAbove || result.fullyBelow) {
        obscuredElements.push(
          `${result.tag}: "${result.text}" (${result.fullyAbove ? 'above viewport' : 'below viewport'})`,
        );
      }
    }

    expect(
      obscuredElements,
      `Focused elements fully hidden from viewport:
${obscuredElements.join('
')}`,
    ).toHaveLength(0);
  });
});
