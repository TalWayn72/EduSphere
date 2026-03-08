import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
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
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('root "/" redirects to content viewer', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/learn\//, { timeout: 10_000 });
    expect(page.url()).toContain('/learn/');
  });

  test('login page redirects authenticated users to dashboard in DEV_MODE', async ({
    page,
  }) => {
    // beforeEach has already authenticated (sessionStorage flag set + devAuthenticated=true).
    // Login.tsx's useEffect detects isAuthenticated()=true and navigates to /dashboard.
    // DashboardPage renders welcome-heading (not "Dashboard" h1).
    await page.goto('/login');
    await expect(page.getByTestId('welcome-heading')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('dashboard page loads with stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    // DashboardPage renders welcome-heading (not "Dashboard" h1)
    await expect(page.getByTestId('welcome-heading')).toBeVisible({
      timeout: 10_000,
    });
    // DashboardPage section headings from i18n
    await expect(page.getByText('Continue Learning')).toBeVisible();
    await expect(page.getByText('Mastery Overview')).toBeVisible();
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
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar nav links are present on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // AppSidebar nav items: Home, My Courses, Knowledge Graph, AI Tutor, Live Sessions
    const nav = page.locator('nav#main-nav');
    await expect(nav.getByRole('link', { name: /Home/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /My Courses/i })).toBeVisible();
  });

  test('EduSphere brand is visible in sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    // Sidebar brand is a span element (not a link)
    await expect(page.getByTestId('sidebar-brand-name')).toBeVisible({
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
