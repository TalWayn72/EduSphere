import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CoursePage } from './pages/CoursePage';
import { SearchPage } from './pages/SearchPage';

/**
 * Smoke E2E tests — verify critical pages load without errors.
 *
 * Requires: pnpm dev (port 5173) with VITE_DEV_MODE=true for mock data.
 *
 * These tests are intentionally fast (<5s each) and cover the "happy path"
 * page loads. More detailed assertions live in auth.spec.ts, courses.spec.ts,
 * search.spec.ts, agents.spec.ts and full-flow.spec.ts.
 */

test.describe('Smoke Tests — Critical Page Loads', () => {
  test('root "/" redirects to content viewer', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/learn\//, { timeout: 10_000 });
    expect(page.url()).toContain('/learn/');
  });

  test('login page redirects authenticated users to dashboard in DEV_MODE', async ({
    page,
  }) => {
    // In DEV_MODE (VITE_DEV_MODE=true) the app auto-authenticates every visitor.
    // Login.tsx's useEffect detects isAuthenticated()=true and navigates to /dashboard.
    // This test verifies that redirect chain works end-to-end.
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('dashboard page loads with stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 10_000,
    });
    // Primary stats row — labels from dashboard i18n (stats.* keys)
    await expect(page.getByText('Courses Enrolled')).toBeVisible();
    await expect(page.getByText('Study Time')).toBeVisible();
    await expect(page.getByText('Concepts Mastered')).toBeVisible();
    // Secondary stats row
    await expect(page.getByText('Active Courses')).toBeVisible();
  });

  test('annotations page loads with layer tabs', async ({ page }) => {
    await page.goto('/annotations');
    await expect(
      page.getByRole('heading', { name: 'Annotations' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: /All/i })).toBeVisible();
  });

  test('knowledge graph page loads', async ({ page }) => {
    await page.goto('/graph');
    await expect(page).toHaveURL('/graph');
    // Layout header renders on every page
    await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });
  });

  test('course list page loads with courses heading', async ({ page }) => {
    const coursePage = new CoursePage(page);
    await coursePage.gotoCourseList();
    await coursePage.assertCourseListLoaded();
  });

  test('content viewer loads with video element', async ({ page }) => {
    const coursePage = new CoursePage(page);
    await coursePage.gotoContentViewer('content-1');
    await coursePage.assertContentViewerLoaded();
  });

  test('agents page loads with AI Learning Agents heading', async ({
    page,
  }) => {
    await page.goto('/agents');
    await expect(
      page.getByRole('heading', { name: 'AI Learning Agents' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('search page loads with empty state', async ({ page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.assertEmptyState();
  });
});

test.describe('Smoke Tests — Navigation', () => {
  test('sidebar nav links are present on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: /Annotations/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Courses/i })).toBeVisible();
  });

  test('EduSphere logo link is visible in header', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /EduSphere/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('search button in header navigates to /search', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The header search button (the styled outline button with "Search..." text)
    const headerSearchBtn = page.getByRole('button', { name: /Search\.\.\./i });
    await expect(headerSearchBtn).toBeVisible({ timeout: 5_000 });
    await headerSearchBtn.click();

    await page.waitForURL('**/search', { timeout: 5_000 });
    expect(page.url()).toContain('/search');
  });
});
