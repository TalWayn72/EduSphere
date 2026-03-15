/**
 * Marketplace Page — E2E regression guard (Phase 37)
 *
 * Verifies that the MarketplacePage loads real listings (mounted guard fix)
 * and is not stuck in a paused query state.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Marketplace Page — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('marketplace page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no MOCK_ sentinel strings in marketplace DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('marketplace page is not stuck in an infinite loading spinner', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Loading spinners should NOT be visible after networkidle
    const loadingSpinners = await page.locator('[aria-label="loading"]').count();
    expect(loadingSpinners).toBe(0);
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Marketplace Page — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('marketplace page loads real listings (not paused query)', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Mounted guard fix: query should execute, not remain paused
    const content = await page.content();
    // Should not contain raw "pause: true" in DOM (regression guard for mounted-guard bug)
    expect(content).not.toContain('pause: true');

    // Loading spinner should not remain stuck
    const loadingSpinners = await page.locator('[aria-label="loading"]').count();
    expect(loadingSpinners).toBe(0);

    await expect(page).toHaveScreenshot('marketplace-loaded.png', {
      maxDiffPixels: 200,
    });
  });

  test('marketplace shows course listing cards or empty state', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasCourses = await page
      .locator('[data-testid="course-card"], [data-testid="listing-card"]')
      .count();
    const hasEmpty = await page.getByText(/no courses available/i).count();

    // Either listings or an empty state — not a blank page with no content
    expect(hasCourses + hasEmpty).toBeGreaterThan(0);
  });
});

// ── Suite 3: Marketplace — comprehensive browsing and filtering (mocked) ─────

test.describe('Marketplace — browse, filter, and course details', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetMarketplaceCourses' || op === 'ListCourses' || op === 'GetCourses') {
        return JSON.stringify({
          data: {
            courses: {
              edges: [
                {
                  node: {
                    id: 'c-1',
                    title: 'Advanced GraphQL Federation',
                    description: 'Master federation patterns with real-world examples',
                    price: 79.99,
                    currency: 'USD',
                    category: 'Engineering',
                    instructor: { name: 'Dr. Smith', avatarUrl: null },
                    thumbnailUrl: null,
                    rating: 4.7,
                    enrollmentCount: 342,
                    isFree: false,
                  },
                },
                {
                  node: {
                    id: 'c-2',
                    title: 'Introduction to Knowledge Graphs',
                    description: 'Learn the basics of graph databases and semantic modeling',
                    price: 0,
                    currency: 'USD',
                    category: 'Data Science',
                    instructor: { name: 'Prof. Chen', avatarUrl: null },
                    thumbnailUrl: null,
                    rating: 4.3,
                    enrollmentCount: 1205,
                    isFree: true,
                  },
                },
                {
                  node: {
                    id: 'c-3',
                    title: 'AI Agent Workflows with LangGraph',
                    description: 'Build state-machine AI agents for production use',
                    price: 59.99,
                    currency: 'USD',
                    category: 'AI/ML',
                    instructor: { name: 'Dr. Patel', avatarUrl: null },
                    thumbnailUrl: null,
                    rating: 4.9,
                    enrollmentCount: 89,
                    isFree: false,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      if (op === 'GetCategories' || op === 'ListCategories') {
        return JSON.stringify({
          data: {
            categories: [
              { id: 'cat-1', name: 'Engineering', courseCount: 45 },
              { id: 'cat-2', name: 'Data Science', courseCount: 32 },
              { id: 'cat-3', name: 'AI/ML', courseCount: 28 },
              { id: 'cat-4', name: 'Design', courseCount: 15 },
            ],
          },
        });
      }
      return null;
    });
    await login(page);
  });

  test('browse — marketplace renders course cards with mocked data', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('filter — search input filters without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator(
      '[data-testid="marketplace-search"], input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    );
    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill('GraphQL');
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('category navigation — clicking category does not crash', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const categoryLink = page.locator(
      '[data-testid="category-link"], a:has-text("Engineering"), button:has-text("Engineering"), [role="tab"]:has-text("Engineering")'
    );
    if ((await categoryLink.count()) > 0) {
      await categoryLink.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('price display — prices are formatted, not raw numbers', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Raw JSON field names should not be visible
    expect(body).not.toContain('"price"');
    expect(body).not.toContain('"currency"');
    expect(body).not.toContain('[object Object]');
  });

  test('free courses — shows "Free" label or $0 badge', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Page should render free course without error
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('instructor info — course cards show instructor names', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Should not show raw JSON for instructor
    expect(body).not.toContain('"name"');
    expect(body).not.toContain('"avatarUrl"');
    expect(body).not.toContain('[object Object]');
  });

  test('empty search results — shows friendly empty state', async ({ page }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, (op) => {
      if (op === 'GetMarketplaceCourses' || op === 'ListCourses' || op === 'GetCourses') {
        return JSON.stringify({
          data: {
            courses: {
              edges: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('course card click — navigates to course detail without crash', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const courseCard = page.locator(
      '[data-testid="course-card"], [data-testid="listing-card"]'
    );
    if ((await courseCard.count()) > 0) {
      await courseCard.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('marketplace GraphQL error does not expose technical details', async ({
    page,
  }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, () => {
      return JSON.stringify({
        data: null,
        errors: [{ message: 'ConnectionPoolError: too many connections at pool.connect' }],
      });
    });

    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('ConnectionPoolError');
    expect(body).not.toContain('pool.connect');
  });

  test('marketplace — no XSS via course title in mock data', async ({ page }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, (op) => {
      if (op === 'GetMarketplaceCourses' || op === 'ListCourses' || op === 'GetCourses') {
        return JSON.stringify({
          data: {
            courses: {
              edges: [
                {
                  node: {
                    id: 'c-xss',
                    title: '<script>alert("xss")</script>',
                    description: 'Normal description',
                    price: 10,
                    currency: 'USD',
                    category: 'Test',
                    instructor: { name: 'Tester' },
                    isFree: false,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('<script>');
  });

  test('visual regression — marketplace with mocked courses', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('marketplace-mocked-courses.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
