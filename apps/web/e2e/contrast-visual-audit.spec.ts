import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';

/**
 * WCAG AA Color Contrast Audit — automated via axe-core.
 *
 * Verifies that every page meets WCAG 2.1 AA color-contrast requirements
 * (SC 1.4.3 — minimum contrast ratio 4.5:1 for normal text, 3:1 for large text).
 *
 * Organized by page category:
 *   Group 1: Landing page sections
 *   Group 2: Form pages (pilot signup, partner signup)
 *   Group 3: Public pages (pricing, features, compliance, login, about, FAQ)
 *   Group 4: Authenticated pages (dashboard, courses, explore, agents, settings, admin)
 *
 * Requires VITE_DEV_MODE=true (auto-auth, no Keycloak needed).
 * Run: pnpm --filter @edusphere/web test:e2e -- --grep="Contrast"
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Toggle dark mode by adding/removing the 'dark' class on <html>. */
async function setDarkMode(
  page: import('@playwright/test').Page,
  enabled: boolean
): Promise<void> {
  await page.evaluate((dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, enabled);
  // Allow Tailwind to repaint
  await page.waitForTimeout(300);
}

/** Run axe-core color-contrast audit on the current page. */
async function auditContrast(
  page: import('@playwright/test').Page,
  url: string
): Promise<Result[]> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .withRules(['color-contrast'])
    .analyze();
  return results.violations;
}

/** Run axe-core color-contrast audit in dark mode. */
async function auditContrastDarkMode(
  page: import('@playwright/test').Page,
  url: string
): Promise<Result[]> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await setDarkMode(page, true);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .withRules(['color-contrast'])
    .analyze();
  return results.violations;
}

/** Human-readable summary of axe violations for test failure output. */
function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return 'No violations';
  return violations
    .map(
      (v) =>
        `\n[${v.impact ?? 'unknown'}] ${v.id}: ${v.description}` +
        v.nodes
          .map(
            (n) =>
              `\n  Target: ${n.target.join(', ')}` +
              `\n  HTML:   ${n.html.slice(0, 120)}` +
              `\n  Info:   ${n.failureSummary ?? 'n/a'}`
          )
          .join('')
    )
    .join('\n');
}

/** Assert zero color-contrast violations on a given URL. */
async function expectNoContrastViolations(
  page: import('@playwright/test').Page,
  url: string
): Promise<void> {
  const violations = await auditContrast(page, url);
  expect(
    violations,
    `Color-contrast violations on ${url}:\n${formatViolations(violations)}`
  ).toHaveLength(0);
}

// ---------------------------------------------------------------------------
// Group 1: Landing Page Sections
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Landing Page @a11y', () => {
  test.setTimeout(30_000);

  test('landing page hero section passes color-contrast', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');

    // Verify the primary CTA button is visible before auditing
    const ctaLink = page.getByRole('link', { name: /Start 90-Day Pilot/i });
    await expect(ctaLink).toBeVisible();

    // Exclude Remotion player — third-party inline styles not under our control
    const violations = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .exclude('.__remotion-player')
      .analyze();

    expect(
      violations.violations,
      `Landing hero contrast violations:\n${formatViolations(violations.violations)}`
    ).toHaveLength(0);
  });

  test('landing page — full scroll audit passes color-contrast', async ({
    page,
  }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');

    // Scroll through the page to trigger lazy-loaded sections
    await page.evaluate(async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const scrollHeight = document.body.scrollHeight;
      const step = Math.ceil(scrollHeight / 5);
      for (let y = 0; y <= scrollHeight; y += step) {
        window.scrollTo(0, y);
        await delay(300);
      }
      // Return to top for the full-page audit
      window.scrollTo(0, 0);
    });

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .exclude('.__remotion-player')
      .analyze();

    expect(
      results.violations,
      `Landing full-scroll contrast violations:\n${formatViolations(results.violations)}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Group 1B: Landing Page — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Landing Page (Dark Mode) @a11y', () => {
  test.setTimeout(30_000);

  test('landing page hero passes color-contrast in dark mode', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');
    await setDarkMode(page, true);

    const ctaLink = page.getByRole('link', { name: /Start 90-Day Pilot/i });
    await expect(ctaLink).toBeVisible();

    const violations = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .exclude('.__remotion-player')
      .analyze();

    expect(
      violations.violations,
      `Landing hero (dark) contrast violations:\n${formatViolations(violations.violations)}`
    ).toHaveLength(0);
  });

  test('landing page — full scroll audit passes color-contrast in dark mode', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');
    await setDarkMode(page, true);

    await page.evaluate(async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const scrollHeight = document.body.scrollHeight;
      const step = Math.ceil(scrollHeight / 5);
      for (let y = 0; y <= scrollHeight; y += step) {
        window.scrollTo(0, y);
        await delay(300);
      }
      window.scrollTo(0, 0);
    });

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .exclude('.__remotion-player')
      .analyze();

    expect(
      results.violations,
      `Landing full-scroll (dark) contrast violations:\n${formatViolations(results.violations)}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Group 2: Form Pages
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Form Pages @a11y', () => {
  test.setTimeout(30_000);

  const FORM_PAGES = [
    { name: 'PilotSignupPage', path: '/pilot' },
    { name: 'PartnerSignupPage', path: '/partners' },
  ] as const;

  for (const { name, path } of FORM_PAGES) {
    test(`${name} (${path}) passes color-contrast`, async ({ page }) => {
      await expectNoContrastViolations(page, path);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 2B: Form Pages — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Form Pages (Dark Mode) @a11y', () => {
  test.setTimeout(30_000);

  const FORM_PAGES = [
    { name: 'PilotSignupPage', path: '/pilot' },
    { name: 'PartnerSignupPage', path: '/partners' },
  ] as const;

  for (const { name, path } of FORM_PAGES) {
    test(`${name} (${path}) passes color-contrast in dark mode`, async ({ page }) => {
      const violations = await auditContrastDarkMode(page, path);
      expect(
        violations,
        `Color-contrast violations (dark) on ${path}:\n${formatViolations(violations)}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 3: Public Pages
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Public Pages @a11y', () => {
  test.setTimeout(30_000);

  const PUBLIC_PAGES = [
    { name: 'Pricing', path: '/pricing' },
    { name: 'Features', path: '/features' },
    { name: 'Compliance', path: '/compliance' },
    { name: 'Login', path: '/login' },
    { name: 'About', path: '/about' },
    { name: 'FAQ', path: '/faq' },
  ] as const;

  for (const { name, path } of PUBLIC_PAGES) {
    test(`${name} page (${path}) passes color-contrast`, async ({ page }) => {
      await expectNoContrastViolations(page, path);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 3B: Public Pages — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Public Pages (Dark Mode) @a11y', () => {
  test.setTimeout(30_000);

  const PUBLIC_PAGES = [
    { name: 'Pricing', path: '/pricing' },
    { name: 'Features', path: '/features' },
    { name: 'Compliance', path: '/compliance' },
    { name: 'Login', path: '/login' },
    { name: 'About', path: '/about' },
    { name: 'FAQ', path: '/faq' },
  ] as const;

  for (const { name, path } of PUBLIC_PAGES) {
    test(`${name} page (${path}) passes color-contrast in dark mode`, async ({ page }) => {
      const violations = await auditContrastDarkMode(page, path);
      expect(
        violations,
        `Color-contrast violations (dark) on ${path}:\n${formatViolations(violations)}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 4: Authenticated Pages
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Authenticated Pages @a11y', () => {
  test.setTimeout(30_000);

  // Authentication: In VITE_DEV_MODE=true the app auto-authenticates,
  // so no explicit login flow is needed. When running against staging/prod,
  // add a beforeEach hook with Keycloak login via auth.helpers.ts.

  const AUTH_PAGES = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Courses', path: '/courses' },
    { name: 'Explore', path: '/explore' },
    { name: 'Agents', path: '/agents' },
    { name: 'Settings', path: '/settings' },
    { name: 'Admin', path: '/admin' },
  ] as const;

  for (const { name, path } of AUTH_PAGES) {
    test(`${name} page (${path}) passes color-contrast`, async ({ page }) => {
      await expectNoContrastViolations(page, path);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 4B: Authenticated Pages — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contrast Audit — Authenticated Pages (Dark Mode) @a11y', () => {
  test.setTimeout(30_000);

  const AUTH_PAGES = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Courses', path: '/courses' },
    { name: 'Explore', path: '/explore' },
    { name: 'Agents', path: '/agents' },
    { name: 'Settings', path: '/settings' },
    { name: 'Admin', path: '/admin' },
  ] as const;

  for (const { name, path } of AUTH_PAGES) {
    test(`${name} page (${path}) passes color-contrast in dark mode`, async ({ page }) => {
      const violations = await auditContrastDarkMode(page, path);
      expect(
        violations,
        `Color-contrast violations (dark) on ${path}:\n${formatViolations(violations)}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 5: Visual Regression — Contrast-Sensitive Components
// ---------------------------------------------------------------------------

test.describe('Contrast Visual Regression @a11y', () => {
  test.setTimeout(30_000);

  test('landing page screenshot matches baseline', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('contrast-landing.png', {
      maxDiffPixels: 200,
      fullPage: true,
    });
  });

  test('login page screenshot matches baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('contrast-login.png', {
      maxDiffPixels: 200,
      fullPage: true,
    });
  });

  test('dashboard screenshot matches baseline', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('contrast-dashboard.png', {
      maxDiffPixels: 200,
      fullPage: true,
    });
  });

  test('landing page screenshot matches baseline (dark mode)', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');
    await setDarkMode(page, true);

    await expect(page).toHaveScreenshot('contrast-landing-dark.png', {
      maxDiffPixels: 200,
      fullPage: true,
    });
  });

  test('login page screenshot matches baseline (dark mode)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await setDarkMode(page, true);

    await expect(page).toHaveScreenshot('contrast-login-dark.png', {
      maxDiffPixels: 200,
      fullPage: true,
    });
  });

  test('dashboard screenshot matches baseline (dark mode)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await setDarkMode(page, true);

    await expect(page).toHaveScreenshot('contrast-dashboard-dark.png', {
      maxDiffPixels: 200,
      fullPage: true,
    });
  });
});
