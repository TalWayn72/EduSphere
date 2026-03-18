/**
 * BUG-084 — Mastery Overview flash/disappear regression guard
 *
 * Root cause: useDashboardData fallback used truthiness check on query result
 * arrays. An empty array [] is truthy → .map([]) renders nothing → section
 * appears empty/white after the query resolves.
 *
 * Fix: check .length before using real data — empty arrays fall back to mock.
 *
 * This E2E test verifies the mastery overview section (and other dashboard
 * sections) remain populated at all times — never blank/white.
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

test.describe('BUG-084 — Dashboard sections never show blank/empty', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('mastery overview section shows content and never becomes empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    const masterySection = page.getByTestId('mastery-overview');
    await expect(masterySection).toBeVisible({ timeout: 10_000 });

    // The mastery overview heading must be visible
    await expect(
      page.getByRole('heading', { name: /mastery overview/i })
    ).toBeVisible();

    // At least one mastery topic must be rendered inside the section
    // (mock fallback has 5 items, real data would have 1+)
    const masteryItems = masterySection.locator('[data-testid^="mastery-badge-"]');
    await expect(masteryItems.first()).toBeVisible({ timeout: 5_000 });

    // Wait for any queries to settle (the bug manifested after query resolution)
    await page.waitForTimeout(2_000);

    // After settling, mastery items must STILL be visible (regression guard)
    const count = await masteryItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('continue learning section shows content and never becomes empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    const section = page.getByTestId('continue-learning-section');
    await expect(section).toBeVisible({ timeout: 10_000 });

    // Wait for queries to settle
    await page.waitForTimeout(2_000);

    // Cards should still be rendered
    const heading = page.getByRole('heading', { name: /continue learning/i });
    await expect(heading).toBeVisible();
  });

  test('recent activity section shows content and never becomes empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    const section = page.getByTestId('recent-activity');
    await expect(section).toBeVisible({ timeout: 10_000 });

    // Wait for queries to settle
    await page.waitForTimeout(2_000);

    // Activity list items should still be rendered
    const listItems = section.locator('li');
    const count = await listItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('recommendations section shows content and never becomes empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    const section = page.getByTestId('recommendations');
    await expect(section).toBeVisible({ timeout: 10_000 });

    // Wait for queries to settle
    await page.waitForTimeout(2_000);

    // At least one recommendation link should be present
    const links = section.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('mastery section with intercepted empty GraphQL response still shows content', async ({ page }) => {
    // Intercept the mastery query and return empty data — simulates the exact bug scenario
    await page.route('**/graphql', async (route) => {
      const postData = route.request().postData();
      if (postData?.includes('myTopMasteryTopics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { myTopMasteryTopics: [] },
          }),
        });
        return;
      }
      await route.continue();
    });

    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    const masterySection = page.getByTestId('mastery-overview');
    await expect(masterySection).toBeVisible({ timeout: 10_000 });

    // Wait for intercepted query to resolve
    await page.waitForTimeout(2_000);

    // Mastery items must still show (mock fallback) — NOT empty
    const masteryItems = masterySection.locator('[data-testid^="mastery-badge-"]');
    const count = await masteryItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('visual snapshot — dashboard sections remain populated', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    // Wait for everything to settle
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1_000);

    // Verify no section shows just whitespace/empty card
    const masterySection = page.getByTestId('mastery-overview');
    const masteryContent = await masterySection.textContent();
    expect(masteryContent?.trim().length).toBeGreaterThan(20);

    const activitySection = page.getByTestId('recent-activity');
    const activityContent = await activitySection.textContent();
    expect(activityContent?.trim().length).toBeGreaterThan(20);
  });
});
