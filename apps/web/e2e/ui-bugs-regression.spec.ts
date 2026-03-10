/**
 * UI Bugs Regression Test Suite
 *
 * Guards against recurrence of bugs reported in session:
 *
 * BUG-001: Missing nav translation keys show as raw key names in sidebar
 *          Root cause: missing entries in apps/web/public/locales/en/nav.json
 *          Fix: added skillPaths, socialFeed, findPeople, peerReview, assessments,
 *               groupChallenges, peerMatching, cohortInsights to nav.json
 *
 * BUG-002: Logo not visible when /defaults/logo.svg returns 404
 *          Root cause: <img> rendered with broken src, no onerror handler
 *          Fix: AppSidebar adds onError → hides img, shows fallback div
 *
 * BUG-003: Layout main content overlaps expanded sidebar
 *          Root cause: layout-main lacked left offset / margin matching sidebar width
 *          Fix: layout-main uses `ml-[var(--sidebar-width)]` or equivalent
 *
 * BUG-004: SRS review page exposes raw "[GraphQL] Unexpected error." to users
 *          Root cause: SRSReviewPage rendered error.message directly from urql
 *          Fix: wrapped in friendly i18n error message component
 *
 * BUG-005: Certificates page shows hardcoded English error without i18n
 *          Root cause: CertificatesPage used error.message directly
 *          Fix: uses t('errors.loadFailed') from i18n
 *
 * BUG-006: Language preference reverts to default after page reload when DB is down
 *          Root cause: GlobalLocaleSync overwrote localStorage with DB value on every mount
 *          Fix: localStorage value takes priority; DB call is write-through only
 *
 * NOTE: In DEV_MODE, login() always authenticates as the mock SUPER_ADMIN regardless
 * of credentials passed. The user argument is only meaningful in live-backend mode.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── BUG-001: Missing nav translation keys ─────────────────────────────────────

test.describe('BUG-001: sidebar nav shows translated labels, not raw i18n keys', () => {
  test('raw key names must never appear in the sidebar text', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();
    const sidebarText = await sidebar.textContent() ?? '';

    // Every key in this list was once missing from nav.json and appeared verbatim
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
      expect(
        sidebarText,
        `Raw i18n key "${key}" must not appear in sidebar — add it to nav.json`,
      ).not.toContain(key);
    }
  });

  test('human-readable English labels appear in the sidebar', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();
    const sidebarText = await sidebar.textContent() ?? '';

    // These are the expected English translations for the formerly-missing keys
    const EXPECTED_LABELS = [
      'Skill Paths',
      'Peer Review',
      'Assessments',
      'Group Challenges',
    ];
    for (const label of EXPECTED_LABELS) {
      expect(
        sidebarText,
        `Expected translated label "${label}" must appear in sidebar`,
      ).toContain(label);
    }
  });

  test('sidebar nav items are visually rendered as links (not plain text)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // At least one nav <a> or nav button must be present inside the sidebar
    const navLinks = page.locator('[data-testid="app-sidebar"] a, [data-testid="app-sidebar"] nav button');
    const count = await navLinks.count();
    expect(count, 'Sidebar must contain at least one nav link or button').toBeGreaterThan(0);
  });
});

// ── BUG-002: Logo not visible when logo.svg is missing ────────────────────────

test.describe('BUG-002: sidebar logo renders correctly', () => {
  test('logo image OR fallback element is visible', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const logoImg = page.locator('[data-testid="sidebar-logo-icon"]');
    const logoFallback = page.locator('[data-testid="sidebar-logo-fallback"]');

    const imgExists = (await logoImg.count()) > 0;
    const imgVisible = imgExists && (await logoImg.isVisible().catch(() => false));
    const fallbackVisible = await logoFallback.isVisible().catch(() => false);

    expect(
      imgVisible || fallbackVisible,
      'Either the logo <img> or the fallback div must be visible in the sidebar',
    ).toBe(true);
  });

  test('if logo img is visible it must not be a broken image (naturalWidth > 0)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const logoImg = page.locator('[data-testid="sidebar-logo-icon"]');
    const imgVisible = await logoImg.isVisible().catch(() => false);

    if (imgVisible) {
      const naturalWidth = await logoImg.evaluate(
        (el) => (el as HTMLImageElement).naturalWidth,
      );
      expect(naturalWidth, 'Logo image must load successfully (naturalWidth > 0)').toBeGreaterThan(0);
    }
  });

  test('logo fallback is shown and img hidden when logo.svg returns 404', async ({ page }) => {
    // Intercept the logo request and return 404 to simulate missing asset
    await page.route('**/logo.svg', async (route) => {
      await route.fulfill({ status: 404, body: 'Not Found' });
    });
    await page.route('**/defaults/logo.svg', async (route) => {
      await route.fulfill({ status: 404, body: 'Not Found' });
    });

    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // After onerror fires the fallback should be visible
    const logoFallback = page.locator('[data-testid="sidebar-logo-fallback"]');
    const fallbackVisible = await logoFallback.isVisible().catch(() => false);

    // The img should either be hidden or the fallback should be visible
    const logoImg = page.locator('[data-testid="sidebar-logo-icon"]');
    const imgVisible = await logoImg.isVisible().catch(() => false);

    // At least one of these must be true: img hidden (good onerror handling) OR fallback shown
    expect(
      fallbackVisible || !imgVisible,
      'When logo.svg is 404, fallback must be visible OR broken img must be hidden',
    ).toBe(true);
  });
});

// ── BUG-003: Main content overlaps sidebar ────────────────────────────────────

test.describe('BUG-003: main content layout does not overlap sidebar', () => {
  test('main content left edge is at or after sidebar right edge', async ({ page }) => {
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
        `Main content left (${mainLeft}px) must be ≥ sidebar right (${sidebarRight}px)`,
      ).toBeGreaterThanOrEqual(sidebarRight - 5); // 5px tolerance for sub-pixel rounding
    }
  });

  test('main content does not overlap sidebar on courses page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
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
        `Main content left (${mainLeft}px) must be ≥ sidebar right (${sidebarRight}px) on /courses`,
      ).toBeGreaterThanOrEqual(sidebarRight - 5);
    }
  });
});

// ── BUG-004: SRS review page exposes raw [GraphQL] error string ───────────────

test.describe('BUG-004: SRS review page hides raw GraphQL errors from users', () => {
  test('exact urql error string "[GraphQL] Unexpected error." is not visible', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('DueReviews') || body.includes('dueReviews')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: '[GraphQL] Unexpected error.',
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
    // Give React time to process the error response
    await page.waitForTimeout(500);

    const bodyText = await page.content();
    expect(bodyText, 'Raw urql error string "[GraphQL] Unexpected error." must not appear in DOM').not.toContain(
      '[GraphQL] Unexpected error.',
    );
  });

  test('error state on SRS page uses friendly message, not raw error.message', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('DueReviews') || body.includes('dueReviews')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Unexpected error.', extensions: { code: 'INTERNAL_ERROR' } }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await login(page);
    await page.goto(`${BASE_URL}/srs-review`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // If an error state is rendered, it must use friendly i18n text
    const errorState = page.locator('[data-testid="error-state"]');
    const errorMsg = page.locator('[data-testid="error-message"]');

    for (const el of [errorState, errorMsg]) {
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const text = await el.textContent() ?? '';
        expect(text, 'Error state must not expose raw GraphQL error string').not.toContain('[GraphQL]');
        expect(text, 'Error state must not expose raw "Unexpected error." string').not.toContain(
          'Unexpected error.',
        );
        expect(text.length, 'Error state must contain a non-empty friendly message').toBeGreaterThan(5);
      }
    }
  });

  test('SRS page shows no [object Object] serialization in error scenario', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('DueReviews') || body.includes('dueReviews')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Unexpected error.', extensions: { code: 'INTERNAL_ERROR' } }],
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
    expect(bodyText).not.toContain('[object Object]');
  });
});

// ── BUG-005: Certificates page shows hardcoded English error ──────────────────

test.describe('BUG-005: certificates page error state uses i18n, not raw error.message', () => {
  test('raw "Internal server error" string is not shown to user', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('MyCertificates') || body.includes('myCertificates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              { message: 'Internal server error', extensions: { code: 'INTERNAL_ERROR' } },
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
    expect(bodyText, 'Raw "Internal server error" must not appear in DOM').not.toContain(
      'Internal server error',
    );
    expect(bodyText, 'Raw "[GraphQL]" must not appear in DOM').not.toContain('[GraphQL]');
  });

  test('data-testid="error-message" on certificates page contains a non-empty friendly string', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('MyCertificates') || body.includes('myCertificates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Internal error', extensions: { code: 'INTERNAL_ERROR' } }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await login(page);
    await page.goto(`${BASE_URL}/certificates`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const errorMsg = page.locator('[data-testid="error-message"]');
    const visible = await errorMsg.isVisible().catch(() => false);

    if (visible) {
      const text = await errorMsg.textContent() ?? '';
      expect(text, 'Error message must not expose raw server error string').not.toContain(
        'Internal error',
      );
      expect(text, 'Error message must not expose "[GraphQL]" prefix').not.toContain('[GraphQL]');
      expect(text.trim().length, 'Error message must not be empty').toBeGreaterThan(5);
    }
  });

  test('certificates page does not show [object Object] in any error path', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('MyCertificates') || body.includes('myCertificates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Internal error', extensions: { code: 'INTERNAL_ERROR' } }],
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
    expect(bodyText).not.toContain('[object Object]');
  });
});

// ── BUG-006: Language preference reverts on page reload ──────────────────────

test.describe('BUG-006: language preference persists across page reloads', () => {
  test('locale stored in localStorage survives a page reload', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Directly set the locale in localStorage (simulates what setLocale() does)
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
    });

    // Reload and verify localStorage still has the value (not wiped by GlobalLocaleSync)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const storedLocale = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(storedLocale, 'edusphere_locale in localStorage must survive a page reload').toBe('he');
  });

  test('locale stored in localStorage is not overwritten by a DB failure response', async ({
    page,
  }) => {
    // Simulate the user preference DB call failing (GlobalLocaleSync fallback test)
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('UserPreferences') || body.includes('userPreferences')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Service unavailable', extensions: { code: 'SERVICE_UNAVAILABLE' } }],
          }),
        });
        return;
      }
      await route.continue();
    });

    // Pre-set Hebrew locale BEFORE app runs (addInitScript fires before page scripts)
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'he');
    });

    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Despite the DB call failing, localStorage must still hold 'he'
    const storedLocale = await page.evaluate(() => localStorage.getItem('edusphere_locale'));
    expect(
      storedLocale,
      'edusphere_locale must not be overwritten when DB preferences call fails',
    ).toBe('he');
  });

  test('after setting Hebrew locale, sidebar shows Hebrew text on next load', async ({ page }) => {
    // Set Hebrew locale before app initialises
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'he');
    });

    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible();
    const sidebarText = await sidebar.textContent() ?? '';

    // At least one common Hebrew nav label should appear when locale is 'he'
    const hasHebrew =
      sidebarText.includes('בית') ||
      sidebarText.includes('הגדרות') ||
      sidebarText.includes('תעודות') ||
      sidebarText.includes('קורסים') ||
      sidebarText.includes('לוח');
    expect(hasHebrew, 'Sidebar should show Hebrew nav labels after locale set to "he"').toBe(true);
  });
});

// ── Combined smoke: all pages load without raw error strings ─────────────────

test.describe('Cross-bug smoke: all routes are clean of raw error strings', () => {
  const PAGES_TO_CHECK = [
    '/dashboard',
    '/courses',
    '/certificates',
    '/srs-review',
    '/gamification',
    '/explore',
  ];

  for (const route of PAGES_TO_CHECK) {
    test(`${route} — no raw error strings in DOM`, async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      const content = await page.content();

      expect(content, `${route}: must not contain "[GraphQL]"`).not.toContain('[GraphQL]');
      expect(content, `${route}: must not contain "[object Object]"`).not.toContain('[object Object]');
      expect(content, `${route}: must not contain "Unexpected error."`).not.toContain(
        'Unexpected error.',
      );
      expect(
        content,
        `${route}: must not contain "Cannot read properties of undefined"`,
      ).not.toContain('Cannot read properties of undefined');
      expect(content, `${route}: must not contain "Network request failed"`).not.toContain(
        'Network request failed',
      );
    });
  }
});

// ── Live backend suite ────────────────────────────────────────────────────────

test.describe('UI Bugs Regression — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend regression tests');

  test('BUG-001 live: student sidebar shows translated nav labels', async ({ page }) => {
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
      expect(sidebarText, `Live: raw key "${key}" must not appear`).not.toContain(key);
    }
  });

  test('BUG-003 live: main content does not overlap sidebar (student)', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="app-sidebar"]');
    const mainContent = page.locator('[data-testid="layout-main"]');

    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await mainContent.boundingBox();

    if (sidebarBox && mainBox) {
      const sidebarRight = Math.round(sidebarBox.x + sidebarBox.width);
      const mainLeft = Math.round(mainBox.x);
      expect(mainLeft).toBeGreaterThanOrEqual(sidebarRight - 5);
    }
  });
});
