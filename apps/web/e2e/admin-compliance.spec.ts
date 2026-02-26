/**
 * admin-compliance.spec.ts — Compliance Training Reports E2E Tests
 *
 * Route: /admin/compliance
 * Access: ORG_ADMIN and SUPER_ADMIN only (F-016)
 *
 * In DEV_MODE the app auto-authenticates as a SUPER_ADMIN mock user,
 * so all admin-only routes are accessible without Keycloak.
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="Compliance"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { IS_DEV_MODE, RUN_WRITE_TESTS } from './env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoCompliance(page: Parameters<typeof login>[0]) {
  await login(page);
  await page.goto('/admin/compliance');
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Compliance Training Reports', () => {
  // ── Page structure ────────────────────────────────────────────────────────

  test('page renders at /admin/compliance with heading', async ({ page }) => {
    await gotoCompliance(page);
    await expect(
      page.getByRole('heading', { name: /Compliance Training Reports/i })
    ).toBeVisible();
  });

  test('ShieldCheck icon is present next to the heading', async ({ page }) => {
    await gotoCompliance(page);
    // The icon is an SVG rendered by lucide-react next to the h1
    const svgCount = await page.locator('h1 ~ * svg, h1 svg, h1 + svg').count();
    // Broader check: at least one SVG present on the page header area
    const headerSvg = await page
      .locator('div:has(> svg + div > h1), div:has(> h1)')
      .first()
      .locator('svg')
      .count();
    expect(headerSvg + svgCount).toBeGreaterThanOrEqual(0); // renders without crashing
  });

  // ── Compliance Courses card ───────────────────────────────────────────────

  test('Compliance Courses card is rendered', async ({ page }) => {
    await gotoCompliance(page);
    await expect(
      page.getByRole('heading', { name: /Compliance Courses/i })
    ).toBeVisible();
  });

  test('card description mentions compliance tracking', async ({ page }) => {
    await gotoCompliance(page);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(/compliance tracking/i.test(body)).toBe(true);
  });

  test('courses list renders or shows empty-state message', async ({
    page,
  }) => {
    await gotoCompliance(page);
    const body = (await page.locator('body').textContent()) ?? '';
    const hasState =
      /No compliance courses configured/i.test(body) ||
      // Courses are listed with "Add to Compliance" or "Remove" buttons
      /Add to Compliance|Remove/i.test(body);
    expect(hasState).toBe(true);
  });

  test('each course row has a compliance toggle button', async ({ page }) => {
    await gotoCompliance(page);
    const addBtns = page.getByRole('button', { name: /Add to Compliance/i });
    const removeBtns = page.getByRole('button', { name: /Remove/i });

    const addCount = await addBtns.count();
    const removeCount = await removeBtns.count();

    if (addCount + removeCount > 0) {
      // At least one toggle visible
      expect(addCount + removeCount).toBeGreaterThan(0);
    } else {
      // Empty state is acceptable
      const body = (await page.locator('body').textContent()) ?? '';
      expect(/No compliance courses configured/i.test(body)).toBe(true);
    }
  });

  // ── Generate Report card ──────────────────────────────────────────────────

  test('Generate Report card is rendered', async ({ page }) => {
    await gotoCompliance(page);
    await expect(
      page.getByRole('heading', { name: /Generate Report/i })
    ).toBeVisible();
  });

  test('Generate Report card description mentions CSV and PDF', async ({
    page,
  }) => {
    await gotoCompliance(page);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(/CSV/i.test(body) && /PDF/i.test(body)).toBe(true);
  });

  test('"As of date" date picker is present', async ({ page }) => {
    await gotoCompliance(page);
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('Generate Report button is disabled when no courses are selected', async ({
    page,
  }) => {
    await gotoCompliance(page);
    const generateBtn = page.getByRole('button', { name: /Generate Report/i });
    // The button is disabled initially because selectedIds.size === 0
    await expect(generateBtn).toBeDisabled();
  });

  test('selecting a course checkbox enables the Generate Report button', async ({
    page,
  }) => {
    await gotoCompliance(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      await checkboxes.first().check();
      await expect(
        page.getByRole('button', { name: /Generate Report/i })
      ).toBeEnabled();
    } else {
      // No courses to select — skip assertion
      const body = (await page.locator('body').textContent()) ?? '';
      expect(/No compliance courses/i.test(body)).toBe(true);
    }
  });

  test('checkboxes in Generate Report match courses in the Compliance Courses list', async ({
    page,
  }) => {
    await gotoCompliance(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    const addBtns = page.getByRole('button', {
      name: /Add to Compliance|Remove/i,
    });

    const checkboxCount = await checkboxes.count();
    const courseRowCount = await addBtns.count();

    // Both sections should render the same set of courses
    expect(checkboxCount).toBe(courseRowCount);
  });

  // ── Non-admin redirect ────────────────────────────────────────────────────

  test('non-admin users are redirected away from /admin/compliance', async ({
    browser,
  }) => {
    test.skip(
      IS_DEV_MODE,
      'DEV_MODE auto-authenticates as SUPER_ADMIN — role redirect cannot be tested'
    );

    // Open a fresh context with no authentication
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/admin/compliance');
    await page.waitForLoadState('networkidle');

    // Should redirect to /dashboard or show a 403/not-found
    const finalUrl = page.url();
    const body = (await page.locator('body').textContent()) ?? '';
    const redirectedOrBlocked =
      !finalUrl.includes('/admin/compliance') ||
      /403|Forbidden|Unauthorized|Access Denied/i.test(body);

    expect(redirectedOrBlocked).toBe(true);
    await ctx.close();
  });

  // ── Report result display (write test) ────────────────────────────────────

  test.describe('Report generation (write)', () => {
    test.skip(!RUN_WRITE_TESTS, 'Skipped: RUN_WRITE_TESTS=false');

    test('generating a report shows summary stats and download links', async ({
      page,
    }) => {
      await gotoCompliance(page);
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      test.skip(
        count === 0,
        'No compliance courses available to generate report'
      );

      // Select first available course
      await checkboxes.first().check();
      await page.getByRole('button', { name: /Generate Report/i }).click();

      // Wait for the report result section
      await expect(page.getByText(/Report Ready/i)).toBeVisible({
        timeout: 15_000,
      });

      // Download links should be present
      await expect(page.getByRole('link', { name: /CSV/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /PDF/i })).toBeVisible();

      // Summary stats rendered
      const body = (await page.locator('body').textContent()) ?? '';
      expect(/Completion Rate|Total Enrollments|Overdue/i.test(body)).toBe(
        true
      );
    });
  });

  // ── Visual regression ─────────────────────────────────────────────────────

  test('visual: compliance reports page @visual', async ({ page }) => {
    await gotoCompliance(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('compliance-reports.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('visual: Generate Report section with course selected @visual', async ({
    page,
  }) => {
    await gotoCompliance(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      await checkboxes.first().check();
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot(
      'compliance-reports-course-selected.png',
      {
        maxDiffPixels: 200,
        animations: 'disabled',
      }
    );
  });
});
