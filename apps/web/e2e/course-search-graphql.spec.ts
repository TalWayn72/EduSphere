/**
 * Course Search — GraphQL `searchCourses` E2E Tests
 *
 * BUG-053: Search.tsx previously used only DEV_MODE mock data for course results.
 * Fixed by adding a real `searchCourses(query, limit)` resolver in the content
 * subgraph and a `SEARCH_COURSES_QUERY` client query. The course search now always
 * hits the real backend (not gated by DEV_MODE).
 *
 * These tests verify:
 *   1. Typing a query in /search triggers the `searchCourses` GraphQL call
 *   2. Real course results from the DB (mocked via page.route) are displayed
 *   3. Clicking a course result navigates to /courses/:id
 *   4. An empty result set shows the empty state (no raw errors)
 *   5. No raw "[Network]" or "[GraphQL]" strings appear regardless of scenario
 *   6. Visual screenshots assert clean result cards
 *
 * Uses page.route() to mock both `searchCourses` and `searchSemantic` responses.
 * No live backend required.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/course-search-graphql.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SEARCH_COURSES = [
  {
    id: 'course-uuid-1',
    title: 'Introduction to Talmud Study',
    description: 'Fundamentals of Talmudic reasoning and argumentation',
    slug: 'intro-talmud',
    isPublished: true,
    estimatedHours: 8,
    thumbnailUrl: '📚',
  },
  {
    id: 'course-uuid-2',
    title: 'Advanced Chavruta Techniques',
    description: 'Collaborative Talmud learning with AI assistance',
    slug: 'advanced-chavruta',
    isPublished: true,
    estimatedHours: 6,
    thumbnailUrl: '🤝',
  },
];

const MOCK_SEARCH_COURSES_RAMBAM = [
  {
    id: 'course-uuid-3',
    title: 'Jewish Philosophy: Rambam & Ramban',
    description: 'A comparative study of Maimonides and Nachmanides on faith and reason',
    slug: 'jewish-philosophy',
    isPublished: true,
    estimatedHours: 10,
    thumbnailUrl: '🔭',
  },
];

// ─── GraphQL mock helper ──────────────────────────────────────────────────────

interface MockCourse {
  id: string;
  title: string;
  description: string;
  slug: string;
  isPublished: boolean;
  estimatedHours: number;
  thumbnailUrl: string;
}

/**
 * Intercept all GraphQL requests on /search.
 * Routes `searchCourses` to the provided courses array.
 * Routes `searchSemantic` to an empty array (we test course results only).
 * All other operations get an empty success response.
 */
async function mockGraphQLSearch(page: Page, courses: MockCourse[]): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as { query?: string; operationName?: string };
    const q = body?.query ?? '';
    const op = body?.operationName ?? '';

    if (q.includes('searchCourses') || op === 'SearchCourses') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { searchCourses: courses } }),
      });
    }

    if (q.includes('searchSemantic') || op === 'SearchSemantic') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { searchSemantic: [] } }),
      });
    }

    if (q.includes('savedSearches') || op === 'SavedSearches') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { savedSearches: [] } }),
      });
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await login(page);
});

test.describe('Course Search via GraphQL searchCourses', () => {

  // ── Basic search rendering ─────────────────────────────────────────────────

  test('search page loads with empty state and suggestion chips', async ({ page }) => {
    await mockGraphQLSearch(page, []);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    // Suggestion chips are always rendered when the input is empty
    await expect(page.getByRole('button', { name: 'Talmud' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Rambam' })).toBeVisible();
  });

  test('typing a query triggers searchCourses and shows course results', async ({ page }) => {
    await mockGraphQLSearch(page, MOCK_SEARCH_COURSES);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    // Focus the search input and type a query long enough to trigger the call (>= 2 chars)
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.waitFor({ timeout: 8_000 });
    await searchInput.fill('Talmud');

    // Wait for debounce (300ms) + React render
    await page.waitForTimeout(700);

    // Course results from our mock should appear
    // The Search page renders course results in card-like elements containing the title
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Introduction to Talmud Study');
  });

  test('course results show title and description snippet', async ({ page }) => {
    await mockGraphQLSearch(page, MOCK_SEARCH_COURSES);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('Talmud');
    await page.waitForTimeout(700);

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Introduction to Talmud Study');
    // Description snippet should also be shown
    expect(bodyText).toContain('Talmudic');
  });

  test('Rambam query returns philosophy course from GraphQL mock', async ({ page }) => {
    await mockGraphQLSearch(page, MOCK_SEARCH_COURSES_RAMBAM);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('Rambam');
    await page.waitForTimeout(700);

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Jewish Philosophy: Rambam');
  });

  test('clicking a course result navigates to /courses/:id', async ({ page }) => {
    await mockGraphQLSearch(page, MOCK_SEARCH_COURSES);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('Talmud');
    await page.waitForTimeout(700);

    // Find the card / clickable element for the Talmud course
    // Search renders results as clickable cards with href="/courses/<id>"
    const talmudLink = page.getByRole('link', { name: /Introduction to Talmud Study/i }).first();
    const talmudCard = page
      .locator('[class*="rounded"][class*="cursor-pointer"]')
      .filter({ hasText: 'Introduction to Talmud Study' })
      .first();

    const linkCount = await talmudLink.count();
    if (linkCount > 0) {
      await talmudLink.click();
    } else {
      // Fallback: click the course card directly
      await talmudCard.click();
    }

    await page.waitForURL(/\/courses\/course-uuid-1/, { timeout: 10_000 });
    expect(page.url()).toContain('/courses/course-uuid-1');
  });

  // ── Empty result state ────────────────────────────────────────────────────

  test('empty searchCourses result shows suggestion chips (not raw error)', async ({ page }) => {
    await mockGraphQLSearch(page, []);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('xyzzy');
    await page.waitForTimeout(700);

    const bodyText = await page.textContent('body');
    // No results — should NOT show raw error strings
    expect(bodyText).not.toContain('[GraphQL]');
    expect(bodyText).not.toContain('[Network]');
    expect(bodyText).not.toContain('Unexpected error');
    expect(bodyText).not.toContain('[object Object]');
  });

  // ── BUG-039 / BUG-053 regression guards ──────────────────────────────────

  test('[BUG-053] course search does not show raw error when GraphQL errors', async ({ page }) => {
    // Simulate searchCourses failing with a GraphQL error
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { query?: string };
      const q = body?.query ?? '';

      if (q.includes('searchCourses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
            data: { searchCourses: null },
          }),
        });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('Talmud');
    await page.waitForTimeout(700);

    const bodyText = await page.textContent('body');
    // Even with a GraphQL error the page must not show raw error internals
    expect(bodyText).not.toContain('Internal server error');
    expect(bodyText).not.toContain('[GraphQL]');
    expect(bodyText).not.toContain('INTERNAL_SERVER_ERROR');
  });

  test('[BUG-053] single-character query does not trigger searchCourses', async ({ page }) => {
    let searchCoursesCalled = false;

    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { query?: string };
      if ((body?.query ?? '').includes('searchCourses')) {
        searchCoursesCalled = true;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { searchCourses: [], searchSemantic: [], savedSearches: [] } }),
      });
    });

    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('T');
    await page.waitForTimeout(700);

    // The query `pause: query.length < 2` means searchCourses is NOT called for 1-char input
    expect(searchCoursesCalled).toBe(false);
  });
});

// ─── Visual regression ────────────────────────────────────────────────────────

test.describe('Course Search — Visual regression', () => {
  test('search results screenshot — course cards render cleanly', async ({ page }) => {
    await login(page);
    await mockGraphQLSearch(page, MOCK_SEARCH_COURSES);
    await page.goto(`${BASE_URL}/search`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.waitFor({ timeout: 8_000 });
    await searchInput.fill('Talmud');
    await page.waitForTimeout(700);

    await expect(page).toHaveScreenshot('course-search-results.png', {
      maxDiffPixels: 400,
    });
  });
});
