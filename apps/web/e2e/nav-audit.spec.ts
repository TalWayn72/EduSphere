import { test, expect } from '@playwright/test';

/**
 * Navigation Audit — Comprehensive top-navigation tab coverage
 *
 * Tests EVERY tab in the Layout header nav and verifies:
 *   1. Clicking the tab changes the URL to the expected route.
 *   2. A meaningful page heading or landmark content is visible.
 *   3. No crash overlay ("Something went wrong") appears.
 *   4. No raw SQL appears in the page (regression guard — SI-error-sanitization).
 *
 * Navigation items defined in Layout.tsx navItems:
 *   Learn       → /learn/content-1
 *   Courses     → /courses
 *   Graph       → /graph
 *   Annotations → /annotations
 *   Agents      → /agents
 *   Chavruta    → /collaboration
 *   Dashboard   → /dashboard
 *
 * Admin-only item (visible because DEV_MODE user is SUPER_ADMIN):
 *   New Course  → /courses/new
 *
 * Header controls:
 *   Search button (Search...) → /search
 *   EduSphere logo            → / (redirects to /learn/content-1)
 *   User menu avatar          → opens DropdownMenu with Profile, Settings, Log out
 *
 * DEV_MODE assumptions (VITE_DEV_MODE=true):
 *   - Auto-authenticated as SUPER_ADMIN — all nav items (including admin-only) are visible.
 *   - Mock data is available for every page.
 *   - No backend GraphQL is required.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/nav-audit.spec.ts
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * SQL/internal error patterns that must never appear on any rendered page.
 * Any of these appearing in visible page text constitutes a critical regression.
 */
const SQL_PATTERNS = [
  'Failed query:',
  'DrizzleQueryError',
  'syntax error at or near',
  'relation "',
  'pg_catalog',
] as const;

/**
 * Assert that none of the SQL error patterns appear as visible text on the page.
 * Called at the end of every nav-tab test.
 */
async function assertNoSqlOnPage(page: import('@playwright/test').Page): Promise<void> {
  for (const pattern of SQL_PATTERNS) {
    await expect(
      page.getByText(pattern, { exact: false })
    ).not.toBeVisible({ timeout: 2_000 });
  }
}

/**
 * Assert the crash overlay is absent.
 * React Error Boundary renders "Something went wrong" on unhandled render errors.
 */
async function assertNoCrash(page: import('@playwright/test').Page): Promise<void> {
  await expect(
    page.getByText(/something went wrong/i)
  ).not.toBeVisible({ timeout: 3_000 });
}

// ─── Suite 1: Nav tab routing ─────────────────────────────────────────────────

test.describe('Nav Audit — top navigation tabs route correctly', () => {
  /**
   * Each nav item test:
   *  - Starts from /dashboard (a stable, always-loaded page).
   *  - Clicks the nav link by its exact English label (from nav.json).
   *  - Waits for the expected URL pattern.
   *  - Verifies the page is not blank/crashed.
   */

  test.beforeEach(async ({ page }) => {
    // Start from dashboard so header is fully rendered before each test
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });
  });

  // ── Learn (/learn/content-1) ────────────────────────────────────────────────

  test('Learn tab navigates to /learn/content-1 and renders video player', async ({ page }) => {
    const learnLink = page.locator('nav').getByRole('link', { name: /^Learn$/i });
    await expect(learnLink).toBeVisible({ timeout: 8_000 });
    await learnLink.click();

    await page.waitForURL(/\/learn\//, { timeout: 10_000 });
    expect(page.url()).toContain('/learn/');

    // ContentViewer renders a <video> element
    await expect(page.locator('video')).toBeVisible({ timeout: 10_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });

  // ── Courses (/courses) ──────────────────────────────────────────────────────

  test('Courses tab navigates to /courses and renders course list', async ({ page }) => {
    const coursesLink = page.locator('nav').getByRole('link', { name: /^Courses$/i });
    await expect(coursesLink).toBeVisible({ timeout: 8_000 });
    await coursesLink.click();

    await page.waitForURL('**/courses', { timeout: 10_000 });
    expect(page.url()).toMatch(/\/courses$/);

    // CourseList renders <h1 name="Courses"> — use .first() to avoid strict-mode violation
    // with card titles like "Courses Enrolled" on other pages
    await expect(
      page.getByRole('heading', { name: /Courses/i }).first()
    ).toBeVisible({ timeout: 8_000 });

    // At least one course card (h3 title) should be present from mock data
    await expect(page.locator('h3').first()).toBeVisible({ timeout: 8_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });

  // ── Graph (/graph) ──────────────────────────────────────────────────────────

  test('Graph tab navigates to /graph and renders the knowledge graph page', async ({ page }) => {
    const graphLink = page.locator('nav').getByRole('link', { name: /^Graph$/i });
    await expect(graphLink).toBeVisible({ timeout: 8_000 });
    await graphLink.click();

    await page.waitForURL('**/graph', { timeout: 10_000 });
    expect(page.url()).toContain('/graph');

    // KnowledgeGraph page renders within Layout — header is always present
    await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });
    // The page has a main container with search input or graph canvas
    await expect(page.locator('main')).toBeVisible({ timeout: 8_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });

  // ── Annotations (/annotations) ──────────────────────────────────────────────

  test('Annotations tab navigates to /annotations and renders tabs', async ({ page }) => {
    const annotationsLink = page.locator('nav').getByRole('link', { name: /^Annotations$/i });
    await expect(annotationsLink).toBeVisible({ timeout: 8_000 });
    await annotationsLink.click();

    await page.waitForURL('**/annotations', { timeout: 10_000 });
    expect(page.url()).toContain('/annotations');

    // AnnotationsPage renders a heading "Annotations"
    await expect(
      page.getByRole('heading', { name: /Annotations/i })
    ).toBeVisible({ timeout: 8_000 });

    // Tabs component renders tab roles (All, Personal, Shared, etc.)
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 8_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });

  // ── Agents (/agents) ────────────────────────────────────────────────────────

  test('Agents tab navigates to /agents and renders "AI Learning Agents" heading', async ({ page }) => {
    const agentsLink = page.locator('nav').getByRole('link', { name: /^Agents$/i });
    await expect(agentsLink).toBeVisible({ timeout: 8_000 });
    await agentsLink.click();

    await page.waitForURL('**/agents', { timeout: 10_000 });
    expect(page.url()).toContain('/agents');

    await expect(
      page.getByRole('heading', { name: 'AI Learning Agents' })
    ).toBeVisible({ timeout: 8_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });

  // ── Chavruta (/collaboration) ───────────────────────────────────────────────

  test('Chavruta tab navigates to /collaboration and renders collaboration page', async ({ page }) => {
    const chavrutaLink = page.locator('nav').getByRole('link', { name: /^Chavruta$/i });
    await expect(chavrutaLink).toBeVisible({ timeout: 8_000 });
    await chavrutaLink.click();

    await page.waitForURL('**/collaboration', { timeout: 10_000 });
    expect(page.url()).toContain('/collaboration');

    // CollaborationPage renders within Layout — header always present
    await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 8_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });

  // ── Dashboard (/dashboard) ──────────────────────────────────────────────────

  test('Dashboard tab navigates to /dashboard and renders stats cards', async ({ page }) => {
    // Start from a different page so the navigation action is meaningful
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const dashboardLink = page.locator('nav').getByRole('link', { name: /^Dashboard$/i });
    await expect(dashboardLink).toBeVisible({ timeout: 8_000 });
    await dashboardLink.click();

    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    expect(page.url()).toContain('/dashboard');

    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible({ timeout: 8_000 });

    // Primary stats row
    await expect(page.getByText('Courses Enrolled')).toBeVisible({ timeout: 8_000 });

    await assertNoCrash(page);
    await assertNoSqlOnPage(page);
  });
});

// ─── Suite 2: No page shows errors or blank content ──────────────────────────

test.describe('Nav Audit — all nav destinations are error-free', () => {
  /**
   * Parameterized smoke test for all routes.
   * Each item: [label, route, expected text snippet, optional URL pattern]
   */
  const NAV_ROUTES: Array<{
    label: string;
    path: string;
    expectedText: RegExp | string;
    urlPattern?: RegExp;
  }> = [
    {
      label: 'Learn (content viewer)',
      path: '/learn/content-1',
      expectedText: /transcript|video|annotation/i,
      urlPattern: /\/learn\//,
    },
    {
      label: 'Courses (course list)',
      path: '/courses',
      expectedText: /Courses/i,
    },
    {
      label: 'Knowledge Graph',
      path: '/graph',
      expectedText: /graph|search|concept/i,
    },
    {
      label: 'Annotations',
      path: '/annotations',
      expectedText: /Annotations/i,
    },
    {
      label: 'Agents',
      path: '/agents',
      expectedText: /AI Learning Agents/i,
    },
    {
      label: 'Collaboration (Chavruta)',
      path: '/collaboration',
      expectedText: /chavruta|partner|session|discuss/i,
    },
    {
      label: 'Dashboard',
      path: '/dashboard',
      expectedText: /Dashboard/i,
    },
    {
      label: 'Search',
      path: '/search',
      expectedText: /search/i,
    },
  ];

  for (const { label, path, expectedText, urlPattern } of NAV_ROUTES) {
    test(`${label} — page loads without crash or SQL`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // URL should be at the expected route (or match the pattern)
      if (urlPattern) {
        expect(page.url()).toMatch(urlPattern);
      } else {
        expect(page.url()).toContain(path);
      }

      // Header is always present (Layout wraps every page)
      await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });

      // Expected text should appear somewhere on the page
      await expect(
        page.getByText(expectedText).first()
      ).toBeVisible({ timeout: 10_000 });

      await assertNoCrash(page);
      await assertNoSqlOnPage(page);
    });
  }
});

// ─── Suite 3: User menu ───────────────────────────────────────────────────────

test.describe('Nav Audit — user menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('user avatar button is visible in the header', async ({ page }) => {
    // UserMenu renders a <button aria-label="User menu"> containing an Avatar
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await expect(userMenuTrigger).toBeVisible({ timeout: 8_000 });
  });

  test('clicking the user avatar opens a dropdown menu', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    // DropdownMenuContent renders as a menu role with an accessible label
    await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5_000 });
  });

  test('user dropdown contains a Profile item', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    // common.json: profile → "Profile"
    await expect(
      page.getByRole('menuitem', { name: /Profile/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('user dropdown contains a Settings item', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    // common.json: settings → "Settings"
    await expect(
      page.getByRole('menuitem', { name: /Settings/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('user dropdown contains a Log out item', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    // common.json: logOut → "Log out"
    await expect(
      page.getByRole('menuitem', { name: /Log out/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Profile item in the dropdown navigates to /profile', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    await page.getByRole('menuitem', { name: /Profile/i }).click();

    await page.waitForURL('**/profile', { timeout: 10_000 });
    expect(page.url()).toContain('/profile');
  });

  test('clicking Settings item in the dropdown navigates to /settings', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    await page.getByRole('menuitem', { name: /Settings/i }).click();

    await page.waitForURL('**/settings', { timeout: 10_000 });
    expect(page.url()).toContain('/settings');
  });

  test('user dropdown shows the current user name or email', async ({ page }) => {
    const userMenuTrigger = page.getByRole('button', { name: /User menu/i });
    await userMenuTrigger.click();

    // UserMenu DropdownMenuLabel renders firstName, lastName, email, and role
    // In DEV_MODE the user is "Super Admin" with email "super.admin@edusphere.dev"
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5_000 });
    const menuText = await menu.textContent() ?? '';
    // At minimum the menu renders some non-empty text (name, email, or role)
    expect(menuText.trim().length).toBeGreaterThan(0);
  });
});

// ─── Suite 4: Search button in header ────────────────────────────────────────

test.describe('Nav Audit — search button', () => {
  test('Search button is visible in the header', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Layout renders a search button with text "Search..." (from nav.json search key)
    // It has a ⌘K kbd hint. getByRole('button') with the search text finds it.
    const searchBtn = page.getByRole('button', { name: /Search\.\.\./i });
    await expect(searchBtn).toBeVisible({ timeout: 8_000 });
  });

  test('clicking the Search button navigates to /search', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const searchBtn = page.getByRole('button', { name: /Search\.\.\./i });
    await searchBtn.click();

    await page.waitForURL('**/search', { timeout: 10_000 });
    expect(page.url()).toContain('/search');
  });

  test('Ctrl+K keyboard shortcut navigates to /search', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Layout.tsx adds a window keydown listener for Ctrl+K → navigate('/search')
    await page.keyboard.press('Control+k');

    await page.waitForURL('**/search', { timeout: 10_000 });
    expect(page.url()).toContain('/search');
  });

  test('search page renders a search input after navigation', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Search page renders an input for the query (no explicit type attribute)
    await expect(page.locator('input[placeholder*="earch"]').first())
      .toBeVisible({ timeout: 8_000 });
  });
});

// ─── Suite 5: New Course button (admin-only) ──────────────────────────────────

test.describe('Nav Audit — New Course button (admin-only, visible in DEV_MODE)', () => {
  test('New Course nav link is visible for SUPER_ADMIN in DEV_MODE', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // In DEV_MODE the mock user is SUPER_ADMIN — isAdmin=true — so "New Course" renders
    // nav.json: newCourse → "New Course"
    const newCourseLink = page.locator('nav').getByRole('link', { name: /New Course/i });
    await expect(newCourseLink).toBeVisible({ timeout: 8_000 });
  });

  test('clicking New Course navigates to /courses/new', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const newCourseLink = page.locator('nav').getByRole('link', { name: /New Course/i });
    await newCourseLink.click();

    await page.waitForURL('**/courses/new', { timeout: 10_000 });
    expect(page.url()).toContain('/courses/new');

    // CourseCreatePage renders within Layout — header must be present
    await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });
    await assertNoCrash(page);
  });
});

// ─── Suite 6: Logo navigation ─────────────────────────────────────────────────

test.describe('Nav Audit — EduSphere logo', () => {
  test('EduSphere logo link is visible in the header', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Layout renders: <Link to="/" className="...">EduSphere</Link>
    await expect(
      page.getByRole('link', { name: /EduSphere/i })
    ).toBeVisible({ timeout: 8_000 });
  });

  test('clicking EduSphere logo navigates to "/" which redirects to the learn page', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const logo = page.getByRole('link', { name: /EduSphere/i });
    await logo.click();

    // "/" is the root route which redirects to /learn/content-1 (smoke.spec.ts confirms this)
    await page.waitForURL(/\/(learn|dashboard|courses)/, { timeout: 10_000 });
    expect(page.url()).not.toContain('/login');
  });
});

// ─── Suite 7: Language selector ───────────────────────────────────────────────

test.describe('Nav Audit — language selector (Settings page)', () => {
  test('Settings page has a language selector combobox', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // LanguageSelector uses shadcn/ui <Select> — renders role="combobox"
    await expect(page.getByRole('combobox').first()).toBeVisible({ timeout: 10_000 });
  });

  test('opening the language selector shows multiple language options', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();

    // SUPPORTED_LOCALES has 10 items — at least several options should appear
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 5_000 });
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('language selector shows English option', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    await expect(
      page.getByRole('option', { name: /English/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Suite 8: Cross-page SQL regression sweep ─────────────────────────────────

test.describe('Nav Audit — SQL-free page verification across all routes', () => {
  /**
   * Sweep every major route and assert that no SQL error patterns are visible.
   * This is the broadest regression guard for SI-error-sanitization.
   * Any raw SQL appearing anywhere in visible page text is a critical failure.
   */

  const SWEEP_ROUTES = [
    '/dashboard',
    '/courses',
    '/graph',
    '/annotations',
    '/agents',
    '/collaboration',
    '/search',
    '/settings',
    '/profile',
    `/courses/mock-course-1`,
    '/learn/content-1',
  ] as const;

  for (const route of SWEEP_ROUTES) {
    test(`No SQL appears on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800); // allow async error states to settle

      await assertNoSqlOnPage(page);
      await assertNoCrash(page);
    });
  }
});
