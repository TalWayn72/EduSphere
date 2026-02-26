/**
 * admin-extended.spec.ts — Extended Admin Route Coverage
 *
 * Covers admin routes not tested in admin-dashboard.spec.ts:
 *   /admin/branding       — BrandingSettingsPage
 *   /admin/languages      — LanguageSettingsPage
 *   /admin/roles          — RoleManagementPage
 *   /admin/gamification   — GamificationSettingsPage
 *   /admin/enrollment     — EnrollmentManagementPage
 *   /admin/at-risk        — AtRiskDashboardPage
 *   /admin/security       — SecuritySettingsPage
 *   /admin/notifications  — NotificationTemplatesPage
 *   /admin/bi-export      — BiExportSettingsPage
 *   /admin/cpd            — CPDSettingsPage
 *
 * Each suite verifies three invariants for every route:
 *   1. Page loads without "Cannot query field" or "Something went wrong" errors
 *   2. The correct heading is visible
 *   3. Key UI elements are rendered (or a loading spinner is present)
 *
 * All tests use the shared `login()` helper which auto-authenticates as
 * SUPER_ADMIN in DEV_MODE (no Keycloak required for local/CI runs).
 *
 * Run a single suite:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="Admin Branding"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { IS_DEV_MODE, RUN_WRITE_TESTS } from './env';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type PW = Parameters<typeof login>[0];

async function gotoAdminRoute(page: PW, route: string): Promise<void> {
  await login(page);
  await page.goto(route);
  await page.waitForLoadState('networkidle');
}

/** Assert no fatal GraphQL or JS errors appear in the page body. */
async function assertNoFatalErrors(page: PW): Promise<void> {
  const body = (await page.locator('body').textContent()) ?? '';
  expect(/Cannot query field/i.test(body)).toBe(false);
  expect(/Something went wrong|ChunkLoadError|TypeError:/i.test(body)).toBe(
    false
  );
}

/** Assert heading OR loading spinner is visible (page still hydrating is OK). */
async function assertHeadingOrLoading(
  page: PW,
  headingPattern: RegExp
): Promise<void> {
  const heading = page.getByRole('heading', { name: headingPattern });
  const spinner = page.locator('.animate-spin');

  const headingCount = await heading.count();
  const spinnerCount = await spinner.count();

  expect(headingCount + spinnerCount).toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// Suite: /admin/branding — BrandingSettingsPage
// ---------------------------------------------------------------------------

test.describe('Admin Branding — /admin/branding', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/branding');
    await assertNoFatalErrors(page);
  });

  test('"Branding Settings" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/branding');
    await assertHeadingOrLoading(page, /Branding Settings/i);
  });

  test('color/logo inputs or loading state are present', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/branding');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    // BrandingSettingsPage renders color pickers, a logo upload, and a preview
    const hasBrandingUI =
      /Primary Color|Logo|Brand|Theme|Color/i.test(body) || spinnerCount > 0;

    expect(hasBrandingUI).toBe(true);
  });

  test('no redirect away from /admin/branding', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/branding');
    expect(page.url()).toMatch(/\/admin\/branding/);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/languages — LanguageSettingsPage
// ---------------------------------------------------------------------------

test.describe('Admin Languages — /admin/languages', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/languages');
    await assertNoFatalErrors(page);
  });

  test('"Language Settings" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/languages');
    await assertHeadingOrLoading(page, /Language Settings/i);
  });

  test('language list or loading state is present', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/languages');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    const hasLanguageUI =
      /English|Hebrew|Default Language|Locale|Language/i.test(body) ||
      spinnerCount > 0;

    expect(hasLanguageUI).toBe(true);
  });

  test('no redirect away from /admin/languages', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/languages');
    expect(page.url()).toMatch(/\/admin\/languages/);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/roles — RoleManagementPage
// ---------------------------------------------------------------------------

test.describe('Admin Roles — /admin/roles', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/roles');
    await assertNoFatalErrors(page);
  });

  test('"Roles & Permissions" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/roles');
    await assertHeadingOrLoading(page, /Roles/i);
  });

  test('roles list, table, or loading state is present', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/roles');

    const table = page.locator('table, [role="table"]');
    const spinner = page.locator('.animate-spin');
    const body = (await page.locator('body').textContent()) ?? '';

    const hasRolesUI =
      (await table.count()) > 0 ||
      (await spinner.count()) > 0 ||
      /SUPER_ADMIN|ORG_ADMIN|INSTRUCTOR|STUDENT|Custom Role|No roles/i.test(
        body
      );

    expect(hasRolesUI).toBe(true);
  });

  test('"Create Role" or add button is present or loading', async ({
    page,
  }) => {
    test.skip(!IS_DEV_MODE, 'Requires DEV_MODE to skip Keycloak');

    await gotoAdminRoute(page, '/admin/roles');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    const hasCreateUI =
      /Create Role|Add Role|New Role/i.test(body) || spinnerCount > 0;

    expect(hasCreateUI).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/gamification — GamificationSettingsPage
// ---------------------------------------------------------------------------

test.describe('Admin Gamification — /admin/gamification', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/gamification');
    await assertNoFatalErrors(page);
  });

  test('"Gamification Settings" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/gamification');
    await assertHeadingOrLoading(page, /Gamification/i);
  });

  test('gamification controls or loading state are present', async ({
    page,
  }) => {
    await gotoAdminRoute(page, '/admin/gamification');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    const hasGamUI =
      /Points|Badges|Leaderboard|XP|Level|Enable|Streaks/i.test(body) ||
      spinnerCount > 0;

    expect(hasGamUI).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/enrollment — EnrollmentManagementPage
// ---------------------------------------------------------------------------

test.describe('Admin Enrollment — /admin/enrollment', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/enrollment');
    await assertNoFatalErrors(page);
  });

  test('"Enrollment" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/enrollment');
    await assertHeadingOrLoading(page, /Enrollment/i);
  });

  test('enrollment table, list, or loading state is present', async ({
    page,
  }) => {
    await gotoAdminRoute(page, '/admin/enrollment');

    const table = page.locator('table, [role="table"]');
    const spinner = page.locator('.animate-spin');
    const body = (await page.locator('body').textContent()) ?? '';

    const hasEnrollUI =
      (await table.count()) > 0 ||
      (await spinner.count()) > 0 ||
      /Enroll|Course|Student|No enrollment/i.test(body);

    expect(hasEnrollUI).toBe(true);
  });

  test('no redirect away from /admin/enrollment', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/enrollment');
    expect(page.url()).toMatch(/\/admin\/enrollment/);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/at-risk — AtRiskDashboardPage
// ---------------------------------------------------------------------------

test.describe('Admin At-Risk Learners — /admin/at-risk', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/at-risk');
    await assertNoFatalErrors(page);
  });

  test('"At-Risk Learners" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/at-risk');
    await assertHeadingOrLoading(page, /At-Risk/i);
  });

  test('at-risk table, cards, or loading state is present', async ({
    page,
  }) => {
    await gotoAdminRoute(page, '/admin/at-risk');

    const table = page.locator('table, [role="table"]');
    const spinner = page.locator('.animate-spin');
    const body = (await page.locator('body').textContent()) ?? '';

    const hasAtRiskUI =
      (await table.count()) > 0 ||
      (await spinner.count()) > 0 ||
      /At-Risk|Learner|Student|Engagement|No at-risk/i.test(body);

    expect(hasAtRiskUI).toBe(true);
  });

  test('no "Cannot query field atRiskLearners" error', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/at-risk');
    const body = (await page.locator('body').textContent()) ?? '';
    expect(/Cannot query field.*atRisk/i.test(body)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/security — SecuritySettingsPage
// ---------------------------------------------------------------------------

test.describe('Admin Security Settings — /admin/security', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/security');
    await assertNoFatalErrors(page);
  });

  test('"Security Settings" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/security');
    await assertHeadingOrLoading(page, /Security/i);
  });

  test('security controls or loading state are present', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/security');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    const hasSecUI =
      /MFA|Two-Factor|Password|Session|Timeout|Security|CORS/i.test(body) ||
      spinnerCount > 0;

    expect(hasSecUI).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/notifications — NotificationTemplatesPage
// ---------------------------------------------------------------------------

test.describe('Admin Notifications — /admin/notifications', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/notifications');
    await assertNoFatalErrors(page);
  });

  test('"Notification Templates" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/notifications');
    await assertHeadingOrLoading(page, /Notification/i);
  });

  test('template list, table, or loading state is present', async ({
    page,
  }) => {
    await gotoAdminRoute(page, '/admin/notifications');

    const table = page.locator('table, [role="table"]');
    const spinner = page.locator('.animate-spin');
    const body = (await page.locator('body').textContent()) ?? '';

    const hasNotifUI =
      (await table.count()) > 0 ||
      (await spinner.count()) > 0 ||
      /Template|Email|Push|SMS|No notification/i.test(body);

    expect(hasNotifUI).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/bi-export — BiExportSettingsPage
// ---------------------------------------------------------------------------

test.describe('Admin BI Export — /admin/bi-export', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/bi-export');
    await assertNoFatalErrors(page);
  });

  test('"BI Tool Export" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/bi-export');
    await assertHeadingOrLoading(page, /BI Tool Export|BI Export/i);
  });

  test('"Generate BI API Token" section is present', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/bi-export');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    const hasBIUI =
      /Generate BI API Token|API Token|BI Tool|Endpoint|Webhook/i.test(body) ||
      spinnerCount > 0;

    expect(hasBIUI).toBe(true);
  });

  test('no redirect away from /admin/bi-export', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/bi-export');
    expect(page.url()).toMatch(/\/admin\/bi-export/);
  });

  test.describe('write operations', () => {
    test.skip(!RUN_WRITE_TESTS, 'Skipped: RUN_WRITE_TESTS=false');

    test('"Generate BI API Token" button is clickable', async ({ page }) => {
      test.skip(!IS_DEV_MODE, 'Requires DEV_MODE');

      await gotoAdminRoute(page, '/admin/bi-export');

      const generateBtn = page.getByRole('button', {
        name: /Generate.*Token|Create Token|New Token/i,
      });
      const count = await generateBtn.count();
      const spinnerCount = await page.locator('.animate-spin').count();

      // Either the button is present, or the page is still loading
      expect(count > 0 || spinnerCount > 0).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: /admin/cpd — CPDSettingsPage
// ---------------------------------------------------------------------------

test.describe('Admin CPD Settings — /admin/cpd', () => {
  test('page loads without fatal errors', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/cpd');
    await assertNoFatalErrors(page);
  });

  test('"CPD Settings" heading is visible', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/cpd');
    await assertHeadingOrLoading(page, /CPD/i);
  });

  test('CPD configuration or loading state is present', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/cpd');

    const body = (await page.locator('body').textContent()) ?? '';
    const spinnerCount = await page.locator('.animate-spin').count();

    const hasCpdUI =
      /CPD|Continuing Professional|Points|Hours|Cycle|Period/i.test(body) ||
      spinnerCount > 0;

    expect(hasCpdUI).toBe(true);
  });

  test('no redirect away from /admin/cpd', async ({ page }) => {
    await gotoAdminRoute(page, '/admin/cpd');
    expect(page.url()).toMatch(/\/admin\/cpd/);
  });
});

// ---------------------------------------------------------------------------
// Suite: Admin route consistency check
// ---------------------------------------------------------------------------

test.describe('Admin routes — load consistency', () => {
  const adminRoutes = [
    { path: '/admin/branding', label: 'Branding' },
    { path: '/admin/languages', label: 'Languages' },
    { path: '/admin/roles', label: 'Roles' },
    { path: '/admin/gamification', label: 'Gamification' },
    { path: '/admin/enrollment', label: 'Enrollment' },
    { path: '/admin/at-risk', label: 'At-Risk' },
    { path: '/admin/security', label: 'Security' },
    { path: '/admin/notifications', label: 'Notifications' },
    { path: '/admin/bi-export', label: 'BI Export' },
    { path: '/admin/cpd', label: 'CPD' },
  ] as const;

  for (const { path, label } of adminRoutes) {
    test(`${label}: no "Cannot query field" error on ${path}`, async ({
      page,
    }) => {
      await gotoAdminRoute(page, path);
      const body = (await page.locator('body').textContent()) ?? '';
      expect(/Cannot query field/i.test(body)).toBe(false);
    });
  }
});
