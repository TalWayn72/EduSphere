import { test, expect } from '@playwright/test';

/**
 * Smoke E2E tests — verify critical pages load without errors.
 * Requires: pnpm dev (port 5173) with VITE_DEV_MODE=true for mock data.
 */

test.describe('Smoke Tests — Page Load', () => {
  test('home redirect lands on content viewer', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/learn\//);
  });

  test('dashboard page loads with stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Active Courses')).toBeVisible();
    await expect(page.getByText('Learning Streak')).toBeVisible();
  });

  test('annotations page loads with tabs', async ({ page }) => {
    await page.goto('/annotations');
    await expect(page.getByRole('heading', { name: 'Annotations' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /All/ })).toBeVisible();
  });

  test('knowledge graph page loads', async ({ page }) => {
    await page.goto('/graph');
    await expect(page).toHaveURL('/graph');
  });

  test('courses page loads', async ({ page }) => {
    await page.goto('/courses');
    await expect(page).toHaveURL('/courses');
  });
});

test.describe('Navigation', () => {
  test('sidebar navigation links are present on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Annotations/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dashboard/i })).toBeVisible();
  });
});
