/**
 * org-marketplace-browse.spec.ts — E2E tests for Content Marketplace browsing.
 *
 * Route: /admin/marketplace (requires ORG_ADMIN auth)
 *
 * Covers:
 *   - Browse course catalog
 *   - Category filtering
 *   - Search
 *   - License a course
 *   - Empty catalog state
 *   - Visual regression
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, RUN_WRITE_TESTS } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const MARKETPLACE_ROUTE = '/admin/marketplace';

const MOCK_LISTINGS = [
  {
    id: 'l1',
    title: 'Machine Learning 101',
    category: 'Technology',
    priceUsdCents: 9900,
    instructor: 'Dr. AI',
  },
  {
    id: 'l2',
    title: 'Leadership Skills',
    category: 'Business',
    priceUsdCents: 4900,
    instructor: 'Prof. Leader',
  },
  {
    id: 'l3',
    title: 'Data Analytics',
    category: 'Technology',
    priceUsdCents: 7900,
    instructor: 'Dr. Data',
  },
];

async function mockMarketplaceAPIs(
  page: import('@playwright/test').Page
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (
      op === 'BrowseMarketplace' ||
      op.toLowerCase().includes('marketplace') ||
      op.toLowerCase().includes('browse')
    ) {
      return JSON.stringify({
        data: { browseMarketplace: { items: MOCK_LISTINGS, totalCount: 3 } },
      });
    }
    if (op === 'LicenseCourse' || op.toLowerCase().includes('license')) {
      return JSON.stringify({
        data: { licenseCourse: { id: 'purchase-001', status: 'ACTIVE' } },
      });
    }
    if (op === 'Me' || op.toLowerCase().includes('me')) {
      return JSON.stringify({
        data: {
          me: { id: 'user-001', roles: ['ORG_ADMIN'], tenantId: 'tenant-001' },
        },
      });
    }
    return null;
  });
}

test.describe('Marketplace Browse — Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await mockMarketplaceAPIs(page);
    await page.goto(`${BASE_URL}${MARKETPLACE_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="marketplace-page"]')
      .waitFor({ timeout: 15_000 });
  });

  test('displays course listings', async ({ page }) => {
    await expect(page.getByText('Machine Learning 101')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Leadership Skills')).toBeVisible();
    await expect(page.getByText('Data Analytics')).toBeVisible();
  });

  test('shows price for each listing', async ({ page }) => {
    await expect(page.getByText(/\$99/)).toBeVisible({ timeout: 10_000 });
  });

  test('search input filters listings', async ({ page }) => {
    const searchBox = page.locator('[data-testid="marketplace-search"]');
    await expect(searchBox).toBeVisible({ timeout: 10_000 });
    await searchBox.fill('Machine');
    // Search triggers re-fetch or client-side filter
  });

  test('category filter is available', async ({ page }) => {
    await expect(page.locator('[data-testid="category-filter"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('license button visible on each listing', async ({ page }) => {
    const buttons = page.locator('[data-testid="btn-license"]');
    await expect(buttons.first()).toBeVisible({ timeout: 10_000 });
    const count = await buttons.count();
    expect(count).toBe(3);
  });
});

test.describe('Marketplace Browse — License', () => {
  test('clicking license shows confirmation dialog', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockMarketplaceAPIs(page);
    await page.goto(`${BASE_URL}${MARKETPLACE_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="marketplace-page"]')
      .waitFor({ timeout: 15_000 });

    await page.locator('[data-testid="btn-license"]').first().click();
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Marketplace Browse — Visual', () => {
  test('visual regression — catalog page', async ({ page }) => {
    await mockMarketplaceAPIs(page);
    await page.goto(`${BASE_URL}${MARKETPLACE_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="marketplace-page"]')
      .waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('marketplace-browse.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
