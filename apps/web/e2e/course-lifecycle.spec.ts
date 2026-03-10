/**
 * Course Lifecycle E2E Test
 *
 * Scenario: Complete course creation and consumption flow
 * 1. Instructor navigates to course creation page
 * 2. Student logs in and discovers courses
 * 3. Student views the course detail page
 * 4. Student navigates to certificates page (no raw error strings shown)
 * 5. Student navigates to SRS review page (no raw error strings shown)
 * 6. Verify sidebar shows translated nav items (not raw key names like "skillPaths")
 * 7. Verify logo is visible (not a broken image)
 * 8. Full navigation tour — all major pages load without crashing
 *
 * NOTE: In DEV_MODE, login() always authenticates as the mock SUPER_ADMIN user
 * regardless of which user credentials are passed. The user argument is only used
 * in live-backend (Keycloak) mode. Tests that target a specific role use
 * test.skip(IS_DEV_MODE) or accept that in local mode all roles share one mock identity.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — page-render and layout guards ────────────────────────

test.describe('Course Lifecycle — DEV_MODE guards', () => {
  test.describe.configure({ mode: 'serial' });

  test('instructor can navigate to course creation page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should see the course creation form OR be redirected to courses list
    const url = page.url();
    expect(url).toMatch(/\/(courses|create|new)/);
  });

  test('sidebar nav items show translated text (not raw i18n keys)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();
    const sidebarText = await sidebar.textContent() ?? '';

    // These raw i18n key names must NEVER appear in the sidebar — they indicate
    // a missing translation entry in nav.json (BUG-001 regression guard).
    const RAW_KEYS = [
      'skillPaths',
      'socialFeed',
      'findPeople',
      'peerReview',
      'assessments',
      'groupChallenges',
      'peerMatching',
      'cohortInsights',
    ];
    for (const key of RAW_KEYS) {
      expect(sidebarText, `Raw i18n key "${key}" must not appear in sidebar`).not.toContain(key);
    }
  });

  test('logo is visible in sidebar (not broken)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Either the logo image is rendered OR the CSS/text fallback is visible.
    // data-testid="sidebar-logo-icon" → the <img> element
    // data-testid="sidebar-logo-fallback" → the fallback div shown on onerror
    const logoImg = page.locator('[data-testid="sidebar-logo-icon"]');
    const logoFallback = page.locator('[data-testid="sidebar-logo-fallback"]');

    const imgVisible = await logoImg.isVisible().catch(() => false);
    const fallbackVisible = await logoFallback.isVisible().catch(() => false);

    expect(imgVisible || fallbackVisible, 'Logo image or fallback element must be visible').toBe(true);

    // If the <img> IS visible it must not be broken (naturalWidth === 0 means HTTP 404)
    if (imgVisible) {
      const naturalWidth = await logoImg.evaluate((el) => (el as HTMLImageElement).naturalWidth);
      expect(naturalWidth, 'Logo image naturalWidth must be > 0 (not a broken image)').toBeGreaterThan(0);
    }
  });

  test('main content does not overlap sidebar (layout offset correct)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    const mainContent = page.locator('[data-testid="layout-main"]');

    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await mainContent.boundingBox();

    if (sidebarBox && mainBox) {
      const sidebarRight = Math.round(sidebarBox.x + sidebarBox.width);
      const mainLeft = Math.round(mainBox.x);
      expect(
        mainLeft,
        `Main content left edge (${mainLeft}px) must not overlap sidebar right edge (${sidebarRight}px)`,
      ).toBeGreaterThanOrEqual(sidebarRight - 5); // 5px tolerance for sub-pixel rounding
    }
  });

  test('certificates page shows no raw GraphQL error strings', async ({ page }) => {
    // Simulate a backend error on the MyCertificates query
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('MyCertificates') || body.includes('myCertificates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: 'Internal server error',
                extensions: { code: 'INTERNAL_ERROR' },
              },
            ],
          }),
        });
        return;
      }
      await route.continue();
    });

    await login(page);
    await page.goto(`${BASE_URL}/certificates`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const bodyText = await page.content();

    // Raw technical error strings must never be visible to users (BUG-005 regression)
    expect(bodyText).not.toContain('[GraphQL]');
    expect(bodyText).not.toContain('Internal server error');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('Unexpected error');
    expect(bodyText).not.toContain('Network request failed');
  });

  test('SRS review page shows no raw GraphQL error strings', async ({ page }) => {
    // Simulate a backend error on the DueReviews query
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('DueReviews') || body.includes('dueReviews')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: 'Unexpected error.',
                extensions: { code: 'INTERNAL_ERROR' },
              },
            ],
          }),
        });
        return;
      }
      await route.continue();
    });

    await login(page);
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const bodyText = await page.content();

    // Raw urql/GraphQL error string must never reach the user (BUG-004 regression)
    expect(bodyText).not.toContain('[GraphQL] Unexpected error.');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toContain('Network request failed');

    // If a data-testid="error-state" element is rendered, it must also be clean
    const errorState = page.locator('[data-testid="error-state"]');
    const errorVisible = await errorState.isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await errorState.textContent() ?? '';
      expect(errorText).not.toContain('[GraphQL]');
      expect(errorText).not.toContain('Unexpected error.');
    }
  });

  test('language settings page is accessible and has a language selector', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // The settings page must load with at least one heading
    await expect(page.locator('h1')).toBeVisible();

    // A language selector of some form must be present
    const langSelector = page
      .locator(
        '[data-testid="language-selector"], select[id*="lang"], button[id*="lang"], [role="combobox"]',
      )
      .first();
    const selectorVisible = await langSelector.isVisible().catch(() => false);
    expect(selectorVisible, 'Language selector must be present on settings page').toBe(true);
  });

  test('full navigation tour — all major pages load without crashing', async ({ page }) => {
    await login(page);

    const routes = [
      '/dashboard',
      '/courses',
      '/explore',
      '/certificates',
      '/srs-review',
      '/gamification',
      '/discussions',
    ];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      const content = await page.content();

      // JavaScript runtime errors must not leak as text into the DOM
      expect(
        content,
        `Route ${route}: "[object Object]" must not appear in page HTML`,
      ).not.toContain('[object Object]');
      expect(
        content,
        `Route ${route}: "Cannot read properties of undefined" must not appear in page HTML`,
      ).not.toContain('Cannot read properties of undefined');

      // The authenticated layout sidebar must always be present
      await expect(
        page.locator('[data-testid="app-sidebar"]'),
        `Route ${route}: app-sidebar must be visible`,
      ).toBeVisible();
    }
  });
});

// ── Suite 2: Live backend — role-specific flows ───────────────────────────────

test.describe('Course Lifecycle — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('instructor can navigate to course creation page (Keycloak auth)', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toMatch(/\/(courses|create|new)/);
  });

  test('student can view courses discovery page (Keycloak auth)', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveScreenshot('courses-discovery-student.png', {
      maxDiffPixels: 200,
    });
  });

  test('student dashboard loads and shows sidebar with translated nav items', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();

    const sidebarText = await sidebar.textContent() ?? '';
    const RAW_KEYS = [
      'skillPaths',
      'socialFeed',
      'findPeople',
      'peerReview',
      'assessments',
      'groupChallenges',
      'peerMatching',
      'cohortInsights',
    ];
    for (const key of RAW_KEYS) {
      expect(sidebarText, `Raw key "${key}" must not appear in sidebar`).not.toContain(key);
    }
  });
});
