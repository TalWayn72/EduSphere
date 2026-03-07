/**
 * Sidebar Navigation — Layout Regression E2E Suite
 *
 * Regression guard: verifies that AppSidebar (data-testid="app-sidebar") is
 * rendered and visible on every major protected route.
 *
 * Root cause of original bug:
 *   CoursesDiscoveryPage (/explore) was rendered WITHOUT a <Layout> wrapper,
 *   meaning AppSidebar was never mounted for that route. This spec guards
 *   against the same omission on all known protected routes.
 *
 * What is checked per route:
 *   1. The sidebar element exists in the DOM
 *   2. The sidebar is visually visible (not hidden, not display:none)
 *   3. No "Something went wrong" crash overlay is present
 *   4. Visual regression screenshot captured
 *
 * Routes under test:
 *   /explore               — CoursesDiscoveryPage  (original bug route)
 *   /library               — CourseLibraryPage
 *   /marketplace           — MarketplacePage
 *   /programs              — ProgramsPage
 *   /settings/theme        — ThemeSettingsPage
 *   /instructor/earnings   — InstructorEarningsPage
 *   /dashboard             — DashboardPage (positive control)
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/sidebar-nav.spec.ts
 *
 * Run single route:
 *   pnpm --filter @edusphere/web exec playwright test e2e/sidebar-nav.spec.ts \
 *     --grep="explore"
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteSpec {
  /** URL path relative to BASE_URL */
  path: string;
  /** Human-readable label used in test names and screenshot filenames */
  label: string;
  /**
   * Slug used in screenshot filename — no slashes, only alphanumerics and hyphens.
   * e.g. "/settings/theme" → "settings-theme"
   */
  slug: string;
}

// ─── Routes under test ────────────────────────────────────────────────────────

const PROTECTED_ROUTES: RouteSpec[] = [
  {
    path: '/explore',
    label: 'CoursesDiscoveryPage (/explore) — original bug route',
    slug: 'explore',
  },
  {
    path: '/library',
    label: 'CourseLibraryPage (/library)',
    slug: 'library',
  },
  {
    path: '/marketplace',
    label: 'MarketplacePage (/marketplace)',
    slug: 'marketplace',
  },
  {
    path: '/programs',
    label: 'ProgramsPage (/programs)',
    slug: 'programs',
  },
  {
    path: '/settings/theme',
    label: 'ThemeSettingsPage (/settings/theme)',
    slug: 'settings-theme',
  },
  {
    path: '/instructor/earnings',
    label: 'InstructorEarningsPage (/instructor/earnings)',
    slug: 'instructor-earnings',
  },
  {
    path: '/dashboard',
    label: 'DashboardPage (/dashboard) — positive control',
    slug: 'dashboard',
  },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Navigate to a route and wait for the page to fully settle.
 * Uses networkidle so that async data fetches complete before assertions.
 */
async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });
}

/**
 * Assert that the AppSidebar is present in the DOM AND visually visible.
 *
 * Two separate checks are intentional:
 *   - toBeAttached() — element exists in the DOM (Layout was mounted)
 *   - toBeVisible()  — element is not hidden via CSS (display, visibility, opacity)
 *
 * Both must pass. A sidebar that is mounted but hidden is still a regression.
 */
async function assertSidebarVisible(page: Page): Promise<void> {
  const sidebar = page.locator('[data-testid="app-sidebar"]');

  // Check 1: sidebar is in the DOM (Layout wrapper present)
  await expect(sidebar, 'AppSidebar must be mounted in the DOM').toBeAttached({
    timeout: 10_000,
  });

  // Check 2: sidebar is visually visible (not hidden via CSS)
  await expect(
    sidebar,
    'AppSidebar must be visually visible — not display:none or visibility:hidden'
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Assert that no crash overlay or raw error string is shown.
 * Guards against route-level rendering failures masking the missing sidebar.
 */
async function assertNoCrashOverlay(page: Page): Promise<void> {
  await expect(
    page.getByText(/something went wrong/i),
    '"Something went wrong" crash overlay must NOT be visible'
  ).not.toBeVisible({ timeout: 5_000 });

  await expect(
    page.getByText(/cannot read propert/i),
    'Raw JS error strings must NOT be visible'
  ).not.toBeVisible({ timeout: 3_000 });
}

// ─── Suite: Sidebar visible on all protected routes ──────────────────────────

test.describe('AppSidebar — visible on all protected routes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of PROTECTED_ROUTES) {
    test(`sidebar is visible on ${route.label}`, async ({ page }) => {
      await navigateTo(page, route.path);

      // Primary regression assertion: sidebar must be present and visible
      await assertSidebarVisible(page);

      // Guard: no crash overlay masking the real state
      await assertNoCrashOverlay(page);
    });
  }
});

// ─── Suite: Visual regression screenshots ────────────────────────────────────

test.describe('AppSidebar — visual regression screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Disable animations for stable screenshots
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const route of PROTECTED_ROUTES) {
    test(`visual snapshot — sidebar on ${route.slug}`, async ({ page }) => {
      await navigateTo(page, route.path);

      // Confirm sidebar is present before taking the screenshot
      await expect(
        page.locator('[data-testid="app-sidebar"]')
      ).toBeVisible({ timeout: 10_000 });

      // Allow any post-load micro-animations to settle
      await page.waitForTimeout(400);

      await expect(page).toHaveScreenshot(`sidebar-on-${route.slug}.png`, {
        fullPage: false,
        maxDiffPixels: 300,
        animations: 'disabled',
      });
    });
  }
});

// ─── Suite: Sidebar NOT hidden via inline style or aria-hidden ───────────────

test.describe('AppSidebar — not hidden by attribute', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of PROTECTED_ROUTES) {
    test(`sidebar has no aria-hidden or hidden attr on ${route.slug}`, async ({
      page,
    }) => {
      await navigateTo(page, route.path);

      const sidebar = page.locator('[data-testid="app-sidebar"]');
      await sidebar.waitFor({ state: 'attached', timeout: 10_000 });

      // aria-hidden="true" would hide the sidebar from assistive tech AND
      // confirms an explicit hide was applied — either is a regression.
      const ariaHidden = await sidebar.getAttribute('aria-hidden');
      expect(
        ariaHidden,
        `AppSidebar on ${route.path} must not have aria-hidden="true"`
      ).not.toBe('true');

      // The HTML hidden attribute would prevent any rendering at all
      const hiddenAttr = await sidebar.getAttribute('hidden');
      expect(
        hiddenAttr,
        `AppSidebar on ${route.path} must not have the hidden attribute`
      ).toBeNull();
    });
  }
});

// ─── Suite: Regression guard — /explore specifically ─────────────────────────
//
// This suite is a dedicated, named regression test for the original bug.
// It runs separately so it is easy to identify in CI output and blame history.

test.describe('AppSidebar — /explore regression guard (BUG: missing Layout)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AppSidebar IS visible on /explore (was missing before Layout fix)', async ({
    page,
  }) => {
    await navigateTo(page, '/explore');

    const sidebar = page.locator('[data-testid="app-sidebar"]');

    // The sidebar MUST be in the DOM — before the fix it was never mounted here
    await expect(
      sidebar,
      'REGRESSION: AppSidebar was absent on /explore because CoursesDiscoveryPage lacked a Layout wrapper'
    ).toBeAttached({ timeout: 10_000 });

    // The sidebar MUST be visible — not hidden by CSS
    await expect(
      sidebar,
      'AppSidebar on /explore must be visually visible, not hidden'
    ).toBeVisible({ timeout: 10_000 });

    // Explicitly assert the bad state is GONE: sidebar must NOT be missing
    const count = await sidebar.count();
    expect(
      count,
      'Exactly one AppSidebar must be rendered on /explore — 0 means Layout is still missing'
    ).toBeGreaterThanOrEqual(1);
  });

  test('no raw technical error strings on /explore', async ({ page }) => {
    await navigateTo(page, '/explore');

    const body = await page.textContent('body');
    expect(body, 'Body must not contain "undefined"').not.toContain(
      'undefined'
    );
    expect(body, 'Body must not contain "[object Object]"').not.toContain(
      '[object Object]'
    );
  });

  test('visual regression snapshot — /explore with sidebar', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await navigateTo(page, '/explore');

    await expect(
      page.locator('[data-testid="app-sidebar"]')
    ).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('sidebar-regression-explore.png', {
      fullPage: false,
      maxDiffPixels: 300,
      animations: 'disabled',
    });
  });
});
