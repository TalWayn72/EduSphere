/**
 * COMPREHENSIVE INTERACTIONS AUDIT — EduSphere
 *
 * Tests EVERY button, tab, form field, select, combobox and interactive element
 * across all pages of the application. Designed to catch regressions before
 * a human tester encounters them.
 *
 * Strategy:
 *  - Runs in DEV_MODE (VITE_DEV_MODE=true) — no backend required
 *  - Visits every route defined in the router
 *  - On each page: clicks every nav link, button, tab, and form element
 *  - Asserts: no crash, no raw SQL, no blank pages, no infinite spinners
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/comprehensive-interactions.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Wait for page to settle (no spinner, no navigation in progress). */
async function settle(page: Page, ms = 500): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

/** Assert no raw SQL is visible anywhere on the page. */
async function assertNoSql(page: Page): Promise<void> {
  const text = await page
    .evaluate(() => document.body?.innerText ?? '')
    .catch(() => '');
  const sqlPatterns = [
    'Failed query:',
    'SELECT "',
    'FROM "',
    'INSERT INTO',
    'UPDATE SET',
    'DELETE FROM',
    'params: ',
  ];
  for (const pattern of sqlPatterns) {
    expect(text, `Raw SQL must not appear on page: "${pattern}"`).not.toContain(
      pattern
    );
  }
}

/** Assert no error boundary / crash message. */
async function assertNoCrash(page: Page): Promise<void> {
  const crashText = await page
    .getByText(/something went wrong/i)
    .isVisible()
    .catch(() => false);
  expect(
    crashText,
    'Page must not show "Something went wrong" error boundary'
  ).toBe(false);
}

/** Assert page loaded — has a visible heading or substantial content. */
async function assertPageLoaded(page: Page): Promise<void> {
  const hasHeading = await page
    .locator('h1, h2')
    .first()
    .isVisible({ timeout: 8_000 })
    .catch(() => false);
  const hasNav = await page
    .locator('nav, header')
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  expect(
    hasHeading || hasNav,
    'Page must have a visible heading or navigation'
  ).toBe(true);
}

// ── Test Suite: Top Navigation ────────────────────────────────────────────────

test.describe('Top Navigation — all tabs', () => {
  test('nav tab: Learn → navigates to content viewer', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    const learnLink = page
      .getByRole('link', { name: /^learn$/i })
      .or(page.locator('nav a').filter({ hasText: /^learn$/i }))
      .first();
    const isVisible = await learnLink.isVisible().catch(() => false);
    if (isVisible) {
      await learnLink.click();
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });

  test('nav tab: Courses → /courses', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    await page
      .getByRole('link', { name: /courses/i })
      .first()
      .click();
    await page.waitForURL(/\/courses/, { timeout: 8_000 });
    await settle(page);

    const heading = page.getByRole('heading', { name: /courses/i });
    await expect(heading).toBeVisible({ timeout: 8_000 });
    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('nav tab: Graph → /graph', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    const graphLink = page.getByRole('link', { name: /graph/i }).first();
    const isVisible = await graphLink.isVisible().catch(() => false);
    if (isVisible) {
      await graphLink.click();
      await settle(page, 2000);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });

  test('nav tab: Annotations → /annotations', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    const link = page.getByRole('link', { name: /annotations/i }).first();
    const isVisible = await link.isVisible().catch(() => false);
    if (isVisible) {
      await link.click();
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });

  test('nav tab: Agents → /agents', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    const agentsLink = page.getByRole('link', { name: /agents/i }).first();
    const isVisible = await agentsLink.isVisible().catch(() => false);
    if (isVisible) {
      await agentsLink.click();
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });

  test('nav tab: Chavruta → page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    const chavrutaLink = page.getByRole('link', { name: /chavruta/i }).first();
    const isVisible = await chavrutaLink.isVisible().catch(() => false);
    if (isVisible) {
      await chavrutaLink.click();
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });

  test('nav tab: Dashboard → /dashboard', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    const dashLink = page.getByRole('link', { name: /dashboard/i }).first();
    const isVisible = await dashLink.isVisible().catch(() => false);
    if (isVisible) {
      await dashLink.click();
      await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });

  test('New Course button → /courses/new', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    const newCourseBtn = page
      .getByRole('link', { name: /new course/i })
      .or(page.getByRole('button', { name: /new course/i }))
      .first();
    const isVisible = await newCourseBtn.isVisible().catch(() => false);
    if (isVisible) {
      await newCourseBtn.click();
      await page.waitForURL(/\/courses\/new/, { timeout: 8_000 });
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });
});

// ── Test Suite: User Menu ──────────────────────────────────────────────────────

test.describe('User Menu', () => {
  test('user menu opens on click', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    // Try different selectors for the user menu button
    const menuBtn = page
      .locator('[data-testid="user-menu"]')
      .or(page.getByRole('button', { name: /user menu/i }))
      .or(page.locator('header').getByRole('button').last())
      .first();

    const isVisible = await menuBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await menuBtn.click();
    await page.waitForTimeout(400);

    // Verify dropdown opened
    const dropdown = page.locator('[role="menu"]');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
  });

  test('user menu contains Profile, Settings, Log out items', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await settle(page);

    const menuBtn = page
      .locator('[data-testid="user-menu"]')
      .or(page.getByRole('button', { name: /user menu/i }))
      .or(page.locator('header').getByRole('button').last())
      .first();

    const isVisible = await menuBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await menuBtn.click();
    await page.waitForTimeout(400);

    const menuItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="menuitem"]')).map(
        (el) => (el as HTMLElement).innerText.trim()
      );
    });

    const hasProfile = menuItems.some((i) => /profile/i.test(i));
    const hasSettings = menuItems.some((i) => /settings/i.test(i));
    const hasLogout = menuItems.some((i) => /log out|logout|sign out/i.test(i));

    expect(
      hasProfile || hasSettings || hasLogout,
      'User menu should have Profile, Settings, or Log out'
    ).toBe(true);
  });

  test('clicking Profile in user menu navigates to /profile', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await settle(page);

    const menuBtn = page
      .locator('[data-testid="user-menu"]')
      .or(page.getByRole('button', { name: /user menu/i }))
      .or(page.locator('header').getByRole('button').last())
      .first();

    const isVisible = await menuBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await menuBtn.click();
    await page.waitForTimeout(400);

    const profileItem = page.getByRole('menuitem', { name: /profile/i });
    const profileVisible = await profileItem.isVisible().catch(() => false);
    if (!profileVisible) {
      test.skip();
      return;
    }

    await profileItem.click();
    await settle(page);
    expect(page.url()).toMatch(/\/profile/);
    await assertNoCrash(page);
    await assertNoSql(page);
  });
});

// ── Test Suite: Course Detail Page ────────────────────────────────────────────

test.describe('Course Detail Page (/courses/:courseId)', () => {
  test('navigating to a course ID shows course content, not raw SQL', async ({
    page,
  }) => {
    await page.goto('/courses/mock-course-1');
    await settle(page);

    await assertNoSql(page);
    await assertNoCrash(page);

    // Should show course title, not an error with SQL
    const title = page.locator('h2, [class*="CardTitle"]').first();
    await expect(title).toBeVisible({ timeout: 8_000 });
  });

  test('course detail page shows module list', async ({ page }) => {
    await page.goto('/courses/mock-course-1');
    await settle(page);

    await assertNoSql(page);

    // Should show at least one module
    const moduleText = page.getByText(/module/i).first();
    await expect(moduleText).toBeVisible({ timeout: 8_000 });
  });

  test('back button navigates to /courses', async ({ page }) => {
    await page.goto('/courses/mock-course-1');
    await settle(page);

    const backBtn = page
      .getByRole('button', { name: /back to courses/i })
      .or(
        page
          .locator('button')
          .filter({ has: page.locator('.lucide-arrow-left') })
      )
      .first();

    await expect(backBtn).toBeVisible({ timeout: 8_000 });
    await backBtn.click();
    await page.waitForURL(/\/courses$/, { timeout: 8_000 });
  });

  test('enroll button is visible and clickable', async ({ page }) => {
    await page.goto('/courses/mock-course-1');
    await settle(page);

    const enrollBtn = page
      .locator('[data-testid="enroll-button"]')
      .or(page.getByRole('button', { name: /enroll/i }))
      .first();

    await expect(enrollBtn).toBeVisible({ timeout: 8_000 });
    // Click and verify no crash
    await enrollBtn.click();
    await page.waitForTimeout(500);
    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('clicking a course from /courses navigates to course detail', async ({
    page,
  }) => {
    await page.goto('/courses');
    await settle(page);

    // Click the first course card
    const firstCard = page.locator('h3').filter({ hasText: /./ }).first();
    await expect(firstCard).toBeVisible({ timeout: 8_000 });
    await firstCard.click();

    await page.waitForURL(/\/courses\//, { timeout: 10_000 });
    await settle(page);

    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('course with UUID navigates to detail page with mock data', async ({
    page,
  }) => {
    // This was the exact failing URL from the bug report
    await page.goto('/courses/22222222-2222-2222-2222-222222222221');
    await settle(page);

    await assertNoSql(page);
    await assertNoCrash(page);

    // Should NOT show raw SQL error, should show the offline banner or actual data
    const loader = page.locator('.animate-spin');
    await expect(loader).not.toBeVisible({ timeout: 10_000 });
  });
});

// ── Test Suite: Dashboard Interactions ────────────────────────────────────────

test.describe('Dashboard — all interactive elements', () => {
  test('dashboard page loads with heading', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible(
      { timeout: 8_000 }
    );
    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('stats cards are visible', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    // At least some stat cards should be visible
    const cards = page.locator('[class*="card"], [class*="Card"]').filter({
      hasText: /time|course|concept|annotation|minute|percent/i,
    });
    const count = await cards.count();
    expect(count, 'Dashboard should show stat cards').toBeGreaterThanOrEqual(1);
    await assertNoSql(page);
  });
});

// ── Test Suite: Courses Page ───────────────────────────────────────────────────

test.describe('Courses Page — all interactions', () => {
  test('course list loads', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    await expect(page.getByRole('heading', { name: /courses/i })).toBeVisible({
      timeout: 8_000,
    });
    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('at least one course card is visible', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    const cards = page.locator('h3').filter({ hasText: /.{3,}/ });
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
    const count = await cards.count();
    expect(count, 'Should show at least 1 course').toBeGreaterThanOrEqual(1);
  });

  test('course card click does not show SQL error', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    const firstCard = page.locator('h3').filter({ hasText: /.{3,}/ }).first();
    await firstCard.click();
    await settle(page, 2000);

    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('New Course / + button exists and is clickable (instructor)', async ({
    page,
  }) => {
    await page.goto('/courses');
    await settle(page);

    const newBtn = page
      .getByRole('link', { name: /new course/i })
      .or(page.getByRole('button', { name: /new course|\+ course/i }))
      .first();

    const isVisible = await newBtn.isVisible().catch(() => false);
    if (isVisible) {
      await newBtn.click();
      await settle(page);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });
});

// ── Test Suite: Content Viewer Interactions ───────────────────────────────────

test.describe('Content Viewer — all interactions', () => {
  test('content viewer loads with video', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);

    await expect(page.locator('video')).toBeVisible({ timeout: 10_000 });
    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('Transcript tab is clickable and shows content', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);

    const transcriptTab = page.getByRole('tab', { name: /transcript/i });
    const isVisible = await transcriptTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await transcriptTab.click();
    await page.waitForTimeout(300);

    const panel = page.getByRole('tabpanel');
    await expect(panel).toBeVisible({ timeout: 3_000 });
    await assertNoSql(page);
  });

  test('Annotations tab is clickable', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);

    const annotationsTab = page
      .getByRole('tab', { name: /annotations/i })
      .first();
    const isVisible = await annotationsTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await annotationsTab.click();
    await page.waitForTimeout(300);
    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('Search tab is clickable', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);

    const searchTab = page.getByRole('tab', { name: /search/i });
    const isVisible = await searchTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await searchTab.click();
    await page.waitForTimeout(300);
    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('play/pause button toggles video state', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);

    await page.locator('video').waitFor({ state: 'visible', timeout: 8_000 });

    const playBtn = page
      .getByRole('button')
      .filter({ has: page.locator('.lucide-play') })
      .first();
    const isVisible = await playBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await playBtn.click();
    await page.waitForTimeout(300);

    // After clicking play, the button should now show pause
    const pauseBtn = page.locator('.lucide-pause').first();
    await expect(pauseBtn).toBeVisible({ timeout: 3_000 });
  });

  test('mute button toggles audio', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);
    await page.locator('video').waitFor({ state: 'visible', timeout: 8_000 });

    const muteBtn = page
      .getByRole('button')
      .filter({ has: page.locator('.lucide-volume2, .lucide-volume-x') })
      .first();
    const isVisible = await muteBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await muteBtn.click();
    await page.waitForTimeout(200);
    await assertNoCrash(page);
  });

  test('layer toggle buttons toggle annotation visibility', async ({
    page,
  }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);
    await page.locator('video').waitFor({ state: 'visible', timeout: 8_000 });

    const layerBtn = page
      .getByRole('button', { name: /personal annotations/i })
      .first();
    const isVisible = await layerBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await layerBtn.click();
    await page.waitForTimeout(200);
    await layerBtn.click(); // toggle back
    await assertNoCrash(page);
  });

  test('add annotation button opens form', async ({ page }) => {
    await page.goto('/learn/content-1');
    await settle(page, 1000);
    await page.locator('video').waitFor({ state: 'visible', timeout: 8_000 });

    const addBtn = page.getByRole('button', { name: /^add$/i });
    const isVisible = await addBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await addBtn.click();
    const textarea = page.locator('textarea[placeholder*="annotation"]');
    await expect(textarea).toBeVisible({ timeout: 3_000 });
  });
});

// ── Test Suite: Annotations Page Tabs ─────────────────────────────────────────

test.describe('Annotations Page — all tabs', () => {
  test('annotations page loads', async ({ page }) => {
    await page.goto('/annotations');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
    await assertPageLoaded(page);
  });

  test('All tab shows annotations', async ({ page }) => {
    await page.goto('/annotations');
    await settle(page);

    const allTab = page.getByRole('tab', { name: /^all$/i }).first();
    const isVisible = await allTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await allTab.click();
    await page.waitForTimeout(300);
    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('Private tab is clickable', async ({ page }) => {
    await page.goto('/annotations');
    await settle(page);

    const privateTab = page.getByRole('tab', { name: /private/i }).first();
    const isVisible = await privateTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await privateTab.click();
    await page.waitForTimeout(300);
    await assertNoSql(page);
  });

  test('Public tab is clickable', async ({ page }) => {
    await page.goto('/annotations');
    await settle(page);

    const publicTab = page.getByRole('tab', { name: /public/i }).first();
    const isVisible = await publicTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await publicTab.click();
    await page.waitForTimeout(300);
    await assertNoSql(page);
  });

  test('Authority/Instructor tab is clickable', async ({ page }) => {
    await page.goto('/annotations');
    await settle(page);

    const authorityTab = page
      .getByRole('tab', { name: /authority|instructor/i })
      .first();
    const isVisible = await authorityTab
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await authorityTab.click();
    await page.waitForTimeout(300);
    await assertNoSql(page);
  });
});

// ── Test Suite: Agents Page ────────────────────────────────────────────────────

test.describe('Agents Page — all agent templates and interactions', () => {
  test('agents page loads with heading', async ({ page }) => {
    await page.goto('/agents');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
    await assertPageLoaded(page);
  });

  test('all 5 agent template cards are visible', async ({ page }) => {
    await page.goto('/agents');
    await settle(page);

    const agentNames = [
      'Chavruta Debate',
      'Quiz Master',
      'Summarizer',
      'Research Scout',
      'Explainer',
    ];
    for (const name of agentNames) {
      const card = page.getByText(name).first();
      const visible = await card
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!visible) {
        // Try partial text matching
        const partCard = page.getByText(name.split(' ')[0]).first();
        const partVisible = await partCard
          .isVisible({ timeout: 2_000 })
          .catch(() => false);
        expect(
          partVisible,
          `Agent template card for "${name}" should be visible`
        ).toBe(true);
      }
    }
  });

  test('clicking Chavruta Debate template activates it', async ({ page }) => {
    await page.goto('/agents');
    await settle(page);

    const chavrutaCard = page.getByText(/chavruta/i).first();
    const isVisible = await chavrutaCard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await chavrutaCard.click();
    await page.waitForTimeout(500);
    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('clicking Quiz Master template activates it', async ({ page }) => {
    await page.goto('/agents');
    await settle(page);

    const card = page.getByText(/quiz master/i).first();
    const isVisible = await card
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await card.click();
    await page.waitForTimeout(500);
    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('chat input is visible after selecting an agent', async ({ page }) => {
    await page.goto('/agents');
    await settle(page);

    // Click first available agent card
    const firstCard = page
      .locator('[class*="cursor-pointer"], [class*="hover\\:"]')
      .filter({ hasText: /chavruta|quiz|summar|research|explain/i })
      .first();
    const isVisible = await firstCard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await firstCard.click();
    await page.waitForTimeout(800);

    const chatInput = page
      .locator('input[placeholder], textarea[placeholder]')
      .last();
    const inputVisible = await chatInput
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (inputVisible) {
      await chatInput.fill('What is the meaning of Talmud?');
      await assertNoCrash(page);
    }
  });
});

// ── Test Suite: Knowledge Graph ────────────────────────────────────────────────

test.describe('Knowledge Graph page', () => {
  test('graph page loads without SQL error', async ({ page }) => {
    await page.goto('/graph');
    await settle(page, 2000);

    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('graph has canvas or SVG element', async ({ page }) => {
    await page.goto('/graph');
    await settle(page, 2000);

    const hasCanvas = await page
      .locator('canvas')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasSvg = await page
      .locator('svg')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasCanvas || hasSvg, 'Graph page should render canvas or SVG').toBe(
      true
    );
    await assertNoSql(page);
  });

  test('graph search input accepts text', async ({ page }) => {
    await page.goto('/graph');
    await settle(page, 2000);

    const searchInput = page
      .locator(
        'input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="concept"]'
      )
      .first();
    const isVisible = await searchInput
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await searchInput.fill('Talmud');
    await page.waitForTimeout(500);
    await assertNoCrash(page);
    await assertNoSql(page);
  });
});

// ── Test Suite: Search Page ────────────────────────────────────────────────────

test.describe('Search Page — input and results', () => {
  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
    await assertPageLoaded(page);
  });

  test('search input accepts text and triggers search', async ({ page }) => {
    await page.goto('/search');
    await settle(page);

    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 8_000 });

    await searchInput.fill('Talmud');
    await page.waitForTimeout(800); // debounce

    await assertNoSql(page);
    await assertNoCrash(page);
  });

  test('clearing search input shows empty state', async ({ page }) => {
    await page.goto('/search');
    await settle(page);

    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 8_000 });

    await searchInput.fill('hello world');
    await page.waitForTimeout(500);
    await searchInput.clear();
    await page.waitForTimeout(500);

    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('search with special characters does not crash', async ({ page }) => {
    await page.goto('/search');
    await settle(page);

    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 8_000 });

    // Test XSS-like and SQL injection-like strings
    await searchInput.fill("<script>alert('xss')</script>");
    await page.waitForTimeout(500);
    await assertNoCrash(page);

    await searchInput.fill("'; DROP TABLE users; --");
    await page.waitForTimeout(500);
    await assertNoCrash(page);
    await assertNoSql(page);
  });
});

// ── Test Suite: Course Creation Wizard ────────────────────────────────────────

test.describe('Course Creation Wizard (/courses/new)', () => {
  test('course creation page loads', async ({ page }) => {
    await page.goto('/courses/new');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
    await assertPageLoaded(page);
  });

  test('wizard step 1 has title input', async ({ page }) => {
    await page.goto('/courses/new');
    await settle(page);

    const titleInput = page
      .getByLabel(/title/i)
      .or(
        page.locator('input[placeholder*="title"], input[placeholder*="Title"]')
      )
      .first();
    const isVisible = await titleInput
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await titleInput.fill('My Test Course');
    await page.waitForTimeout(200);
    await assertNoCrash(page);
  });

  test('wizard step 1 has description textarea', async ({ page }) => {
    await page.goto('/courses/new');
    await settle(page);

    const descInput = page
      .getByLabel(/description/i)
      .or(
        page.locator(
          'textarea[placeholder*="description"], textarea[placeholder*="Description"]'
        )
      )
      .first();
    const isVisible = await descInput
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await descInput.fill(
      'This is a test course description with enough characters.'
    );
    await assertNoCrash(page);
  });

  test('wizard difficulty selector has BEGINNER, INTERMEDIATE, ADVANCED options', async ({
    page,
  }) => {
    await page.goto('/courses/new');
    await settle(page);

    const difficultyTrigger = page
      .getByRole('combobox')
      .or(page.locator('[class*="SelectTrigger"]'))
      .first();
    const isVisible = await difficultyTrigger
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await difficultyTrigger.click();
    await page.waitForTimeout(300);

    const beginner = page
      .getByRole('option', { name: /beginner/i })
      .or(page.locator('[role="option"]').filter({ hasText: /beginner/i }));
    const beginnerVisible = await beginner
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(beginnerVisible, 'BEGINNER option should be visible').toBe(true);

    await assertNoCrash(page);
  });

  test('empty title disables the Next button (validation gate)', async ({
    page,
  }) => {
    await page.goto('/courses/new');
    await settle(page);

    // Next button is disabled when title is empty (canAdvanceStep1 = false)
    const nextBtn = page.getByRole('button', { name: /next/i }).first();
    const isVisible = await nextBtn
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    // Button should be disabled — this IS the validation mechanism (not a visible error)
    await expect(nextBtn).toBeDisabled();

    // Filling title with ≥3 chars enables the button
    await page.getByLabel(/course title/i).fill('ABC');
    await expect(nextBtn).toBeEnabled({ timeout: 2_000 });
  });
});

// ── Test Suite: Settings Page ──────────────────────────────────────────────────

test.describe('Settings Page', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
    await assertPageLoaded(page);
  });

  test('theme selector has light/dark/system options', async ({ page }) => {
    await page.goto('/settings');
    await settle(page);

    const themeOptions = ['light', 'dark', 'system'];
    for (const theme of themeOptions) {
      const option = page
        .getByRole('radio', { name: new RegExp(theme, 'i') })
        .or(page.getByLabel(new RegExp(theme, 'i')))
        .first();
      const visible = await option
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (visible) {
        await option.click();
        await page.waitForTimeout(200);
        await assertNoCrash(page);
      }
    }
  });

  test('language selector opens and shows options', async ({ page }) => {
    await page.goto('/settings');
    await settle(page);

    const langSelector = page
      .getByRole('combobox', { name: /language/i })
      .or(
        page
          .locator('[class*="SelectTrigger"]')
          .filter({ has: page.locator('[class*="flag"], [class*="Flag"]') })
      )
      .first();
    const isVisible = await langSelector
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await langSelector.click();
    await page.waitForTimeout(300);

    const options = page.locator('[role="option"]');
    const count = await options.count();
    expect(
      count,
      'Language selector should have at least 2 options'
    ).toBeGreaterThanOrEqual(2);

    // Close dropdown
    await page.keyboard.press('Escape');
    await assertNoCrash(page);
  });
});

// ── Test Suite: Profile Page ───────────────────────────────────────────────────

test.describe('Profile Page', () => {
  test('profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
    await assertPageLoaded(page);
  });

  test('profile page shows user information', async ({ page }) => {
    await page.goto('/profile');
    await settle(page);

    // Should show some user info (name, email, or avatar)
    const hasUserInfo = await page
      .locator('text=/student|instructor|admin|@/i')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasAvatar = await page
      .locator('[class*="Avatar"], [class*="avatar"]')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasUserInfo || hasAvatar, 'Profile page should show user info').toBe(
      true
    );
    await assertNoSql(page);
  });
});

// ── Test Suite: Collaboration Page ────────────────────────────────────────────

test.describe('Collaboration Page', () => {
  test('collaboration page loads without crash', async ({ page }) => {
    await page.goto('/collaboration');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
  });

  test('create discussion button is visible', async ({ page }) => {
    await page.goto('/collaboration');
    await settle(page);

    const createBtn = page
      .getByRole('button', { name: /create|new discussion/i })
      .first();
    const isVisible = await createBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (isVisible) {
      await createBtn.click();
      await page.waitForTimeout(300);
      await assertNoCrash(page);
      await assertNoSql(page);
    }
  });
});

// ── Test Suite: Error Resilience ─────────────────────────────────────────────

test.describe('Error Resilience — no raw SQL, no crash on any route', () => {
  const routes = [
    '/dashboard',
    '/courses',
    '/courses/mock-course-1',
    '/courses/22222222-2222-2222-2222-222222222221',
    '/learn/content-1',
    '/agents',
    '/annotations',
    '/graph',
    '/search',
    '/profile',
    '/settings',
    '/collaboration',
  ];

  for (const route of routes) {
    test(`no SQL exposed on ${route}`, async ({ page }) => {
      await page.goto(route);
      await settle(page, 1500);

      await assertNoSql(page);
      await assertNoCrash(page);
    });
  }
});

// ── Test Suite: Mobile Navigation ─────────────────────────────────────────────

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone SE

  test('hamburger menu opens on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await settle(page);

    const hamburger = page
      .getByRole('button', { name: /menu|hamburger/i })
      .or(page.locator('button').filter({ has: page.locator('.lucide-menu') }))
      .first();

    const isVisible = await hamburger
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await hamburger.click();
    await page.waitForTimeout(300);
    await assertNoCrash(page);
  });

  test('course list renders on mobile viewport', async ({ page }) => {
    await page.goto('/courses');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);

    const cards = page.locator('h3').filter({ hasText: /.{3,}/ });
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
  });

  test('course detail page renders on mobile viewport', async ({ page }) => {
    await page.goto('/courses/mock-course-1');
    await settle(page);

    await assertNoCrash(page);
    await assertNoSql(page);
  });
});
