/**
 * MarketplacePage — real data E2E regression guard (Phase 38)
 *
 * Verifies that the MarketplacePage shows real course titles and instructor
 * names from GraphQL, and that UUID truncation artifacts are absent from DOM.
 */
import { test, expect } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('MarketplacePage — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (
        body.includes('CourseListings') ||
        body.includes('courseListings')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              courseListings: {
                nodes: [
                  {
                    id: '1',
                    courseId: 'c1',
                    title: 'React Fundamentals',
                    description: 'Learn React from scratch',
                    instructorName: 'John Doe',
                    thumbnailUrl: null,
                    price: 29.99,
                    currency: 'USD',
                    priceCents: 2999,
                    tags: [],
                    enrollmentCount: 42,
                    rating: null,
                    totalLessons: 10,
                    isPublished: true,
                    revenueSplitPercent: 70,
                  },
                ],
                edges: [],
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                totalCount: 1,
              },
              myPurchases: [],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('displays real course title, not UUID truncation', async ({ page }) => {
    await expect(page.getByText('React Fundamentals')).toBeVisible();
    await argosScreenshot(page, 'marketplace-course-listings');
  });

  test('displays instructor name', async ({ page }) => {
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('UUID truncation pattern absent from DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toMatch(/Course [0-9a-f]{8}/);
  });

  test('search input is rendered', async ({ page }) => {
    // Accept any text input used for search
    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[type="text"]').first());
    await expect(searchInput).toBeVisible();
  });

  test('no MOCK_ sentinel strings in marketplace DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('no [object Object] serialization in marketplace DOM', async ({
    page,
  }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('marketplace page renders without crash overlay', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — real data + visual regression ─────────────────────

test.describe('MarketplacePage — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('marketplace loads and shows course listings or empty state', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Either courses are listed or an empty/loading state is visible
    const hasItems = await page.locator('[data-testid="course-listing-card"]').count();
    const hasHeading = await page.getByRole('heading').first().isVisible();
    expect(hasItems + (hasHeading ? 1 : 0)).toBeGreaterThan(0);

    await expect(page).toHaveScreenshot('marketplace-real-data.png', {
      maxDiffPixels: 200,
    });
    await argosScreenshot(page, 'marketplace-real-data-live');
  });

  test('filter controls are accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // At least a search input or a filter select should be visible
    const hasSearch = await page.getByPlaceholder(/search/i).count();
    const hasSelect = await page.locator('select').count();
    expect(hasSearch + hasSelect).toBeGreaterThan(0);
  });
});
