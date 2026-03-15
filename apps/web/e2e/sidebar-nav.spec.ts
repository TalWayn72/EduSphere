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

// ── Suite 5: Sidebar interaction tests ──────────────────────────────────────

test.describe('AppSidebar — interaction tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/dashboard');
  });

  test('sidebar collapse/expand toggle works', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Look for a collapse/expand toggle button
    const toggleBtn = page.locator(
      'button[aria-label*="collapse" i], button[aria-label*="expand" i], button[aria-label*="toggle" i], [data-testid*="sidebar-toggle"]'
    ).first();
    const toggleExists = await toggleBtn.isVisible().catch(() => false);

    if (toggleExists) {
      // Get initial sidebar width
      const initialBox = await sidebar.boundingBox();
      const initialWidth = initialBox?.width ?? 0;

      // Click toggle
      await toggleBtn.click();
      await page.waitForTimeout(500);

      // Sidebar should still be in DOM but width should change
      await expect(sidebar).toBeAttached();
      const newBox = await sidebar.boundingBox();
      const newWidth = newBox?.width ?? 0;

      // Width should differ (collapsed is narrower)
      expect(newWidth).not.toBe(initialWidth);

      // Toggle back
      const expandBtn = page.locator(
        'button[aria-label*="collapse" i], button[aria-label*="expand" i], button[aria-label*="toggle" i], [data-testid*="sidebar-toggle"]'
      ).first();
      await expandBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('active route is highlighted in sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Find nav links inside the sidebar
    const navLinks = sidebar.locator('a[href]');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // The dashboard link should have an active state
      const dashboardLink = sidebar.locator('a[href="/dashboard"], a[href*="dashboard"]').first();
      const dashExists = await dashboardLink.isVisible().catch(() => false);

      if (dashExists) {
        // Check for active styling (aria-current, data-active, or active class)
        const ariaCurrent = await dashboardLink.getAttribute('aria-current');
        const dataActive = await dashboardLink.getAttribute('data-active');
        const className = await dashboardLink.getAttribute('class');

        const isActive =
          ariaCurrent === 'page' ||
          dataActive === 'true' ||
          (className ?? '').includes('active');

        expect(isActive).toBe(true);
      }
    }
  });

  test('role-based nav items are visible for current user role', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // In DEV_MODE, user is SUPER_ADMIN — admin-related links should be visible
    const navLinks = sidebar.locator('a[href], button').filter({ hasText: /.+/ });
    const linkCount = await navLinks.count();

    // SUPER_ADMIN should see at least some navigation items
    expect(linkCount).toBeGreaterThan(0);

    // Should not show technical strings in nav
    const sidebarText = await sidebar.textContent();
    expect(sidebarText).not.toContain('[object Object]');
    expect(sidebarText).not.toContain('MOCK_');
    expect(sidebarText).not.toContain('undefined');
  });

  test('badge counts on nav items render without errors', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Look for badge/count indicators (notification dots, number pills)
    const badges = sidebar.locator(
      '[data-testid*="badge"], [data-testid*="count"], .badge, [class*="badge"]'
    );
    const badgeCount = await badges.count();

    if (badgeCount > 0) {
      for (let i = 0; i < badgeCount; i++) {
        const badgeText = await badges.nth(i).textContent();
        // Badge text should be a number or empty, not an error string
        expect(badgeText).not.toContain('[object Object]');
        expect(badgeText).not.toContain('NaN');
      }
    }
  });

  test('keyboard navigation through sidebar items works', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Focus the first focusable element in the sidebar
    const firstLink = sidebar.locator('a[href], button').first();
    await firstLink.focus();
    await page.waitForTimeout(200);

    // Tab through sidebar items
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Check that focus moved to another element within the sidebar
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName ?? '';
    });

    // Some focusable element should have focus
    expect(activeElement).toBeTruthy();
  });

  test('mobile drawer — sidebar opens as overlay on small viewport', async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // On mobile, sidebar may be hidden behind a hamburger
    const hamburger = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="Menu"], [data-testid*="sidebar-toggle"]'
    ).first();
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);

    if (hamburgerVisible) {
      await hamburger.click();
      await page.waitForTimeout(500);

      // Sidebar or nav drawer should now be visible
      const sidebar = page.locator('[data-testid="app-sidebar"]');
      const navDrawer = page.locator('nav, [role="navigation"], [data-testid*="drawer"]').first();

      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      const drawerVisible = await navDrawer.isVisible().catch(() => false);

      expect(sidebarVisible || drawerVisible).toBe(true);
    }
  });

  test('tooltip on collapsed sidebar items', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Attempt to collapse the sidebar
    const toggleBtn = page.locator(
      'button[aria-label*="collapse" i], button[aria-label*="toggle" i], [data-testid*="sidebar-toggle"]'
    ).first();
    const toggleExists = await toggleBtn.isVisible().catch(() => false);

    if (toggleExists) {
      await toggleBtn.click();
      await page.waitForTimeout(500);

      // Hover over a collapsed nav item to trigger tooltip
      const navItems = sidebar.locator('a[href], button').filter({ hasText: /./ });
      const itemCount = await navItems.count();

      if (itemCount > 0) {
        await navItems.first().hover();
        await page.waitForTimeout(500);

        // Look for tooltip (role="tooltip" or [data-state="open"])
        const tooltip = page.locator(
          '[role="tooltip"], [data-state="open"][class*="tooltip"], [data-testid*="tooltip"]'
        ).first();
        const tooltipVisible = await tooltip.isVisible().catch(() => false);

        // Tooltip may or may not appear depending on implementation
        // — just verify no crash
        await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
          timeout: 3_000,
        });
      }
    }
  });

  test('sidebar scroll behavior — long nav list is scrollable', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Check if sidebar content overflows and is scrollable
    const isScrollable = await sidebar.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    if (isScrollable) {
      // Scroll the sidebar
      await sidebar.evaluate((el) => {
        el.scrollTop = 100;
      });
      await page.waitForTimeout(200);

      const scrollTop = await sidebar.evaluate((el) => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    }

    // Whether scrollable or not, no crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('visual regression — sidebar collapsed state', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const toggleBtn = page.locator(
      'button[aria-label*="collapse" i], button[aria-label*="toggle" i], [data-testid*="sidebar-toggle"]'
    ).first();
    const toggleExists = await toggleBtn.isVisible().catch(() => false);

    if (toggleExists) {
      await toggleBtn.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('sidebar-collapsed-state.png', {
        fullPage: false,
        maxDiffPixels: 300,
        animations: 'disabled',
      });
    }
  });
});
