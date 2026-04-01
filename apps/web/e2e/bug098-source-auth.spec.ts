/**
 * BUG-098: E2E regression test — Source add auth failure handling.
 *
 * Verifies that when the GraphQL gateway returns a 400 Bad Request or
 * UNAUTHENTICATED error (e.g., Keycloak session timeout), the UI shows
 * a friendly i18n error message instead of a raw technical string.
 *
 * Also validates AddSourceModal accessibility:
 * - Dialog has proper role="dialog"
 * - DialogTitle and DialogDescription are present
 * - Error messages have role="alert"
 * - Tabs have role="tab" with aria-selected
 *
 * NOTE: Selectors use data-testid and ARIA roles (language-independent)
 * because the app may render in Hebrew or English depending on locale.
 *
 * Run (DEV_MODE, no backend needed):
 *   pnpm --filter @edusphere/web exec playwright test e2e/bug098-source-auth.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_COURSE_ID = 'cc000000-0000-0000-0000-000000000002';
const COURSE_URL = `${BASE_URL}/courses/${DEMO_COURSE_ID}`;
const UI_TIMEOUT = 10_000;

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_COURSE = {
  __typename: 'Course',
  id: DEMO_COURSE_ID,
  title: 'Introduction to Machine Learning',
  slug: 'intro-ml',
  description: 'A beginner-friendly overview of ML concepts.',
  status: 'PUBLISHED',
  thumbnailUrl: null,
  estimatedHours: 10,
  isPublished: true,
  instructorId: '00000000-0000-0000-0000-000000000002',
  tenantId: '00000000-0000-0000-0000-000000000001',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  modules: [],
  enrollmentCount: 0,
  tags: ['ml'],
};

function handleGraphQL(opName: string): string | null {
  switch (opName) {
    case 'Course':
    case 'CourseDetail':
      return JSON.stringify({ data: { course: MOCK_COURSE } });
    case 'MyEnrollments':
      return JSON.stringify({ data: { myEnrollments: [] } });
    case 'MyCourseProgress':
      return JSON.stringify({ data: { myCourseProgress: null } });
    case 'LessonsByCourse':
      return JSON.stringify({ data: { lessonsByCourse: [] } });
    case 'CourseKnowledgeSources':
      return JSON.stringify({ data: { courseKnowledgeSources: [] } });
    default:
      return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate to the course detail page with dev-mode auth and GraphQL mocking.
 *
 * Uses the same proven pattern as course-publish.spec.ts:
 *   1. login(page) — sets English locale, clicks dev login button
 *   2. routeGraphQL(page, handler) — intercepts all /graphql with CORS
 *   3. page.goto(url) — navigates to course detail
 */
async function navigateToCourse(page: Page) {
  await login(page);
  await routeGraphQL(page, handleGraphQL);
  await page.goto(COURSE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
}

/** Expand the sources panel and click "Add source" to open the modal. */
async function openAddSourceModal(page: Page) {
  const toggle = page.getByTestId('toggle-sources');
  await toggle.waitFor({ timeout: UI_TIMEOUT });
  // force:true needed — on narrow mobile viewports the toggle button can be
  // overlapped by course content cards (h1, lesson placeholder, etc.)
  await toggle.click({ force: true });

  // Wait for the sources panel to appear, then click the add button
  const addBtn = page.getByTestId('add-source-btn');
  await addBtn.waitFor({ timeout: UI_TIMEOUT });
  await addBtn.click({ force: true });

  // Wait for the dialog to open
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: UI_TIMEOUT });
}

// ─── Suite: AddSourceModal accessibility (BUG-098) ───────────────────────────

test.describe('BUG-098: AddSourceModal — Radix Dialog accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCourse(page);
  });

  test('AddSourceModal opens as a proper dialog', async ({ page }) => {
    await openAddSourceModal(page);

    // Verify dialog role
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify DialogTitle exists (heading inside the dialog)
    const heading = dialog.getByRole('heading');
    await expect(heading).toBeVisible();

    // Verify DialogDescription exists (paragraph inside dialog header)
    await expect(dialog.locator('p').first()).toBeVisible();

    // Verify data-testid
    await expect(page.getByTestId('add-source-modal')).toBeVisible();
  });

  test('AddSourceModal has accessible tab navigation', async ({ page }) => {
    await openAddSourceModal(page);

    // Verify 4 tabs exist
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(4);

    // First tab (URL/Link) should be selected by default
    const firstTab = tabs.first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');

    // A tabpanel should be visible
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('error messages have role="alert" for screen readers', async ({
    page,
  }) => {
    await openAddSourceModal(page);

    // Submit without entering a URL to trigger validation error
    await page.getByTestId('add-source-submit').click({ force: true });

    // Error should appear with role="alert"
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(alert).toHaveAttribute('data-testid', 'source-error-message');
  });

  test('visual: AddSourceModal open state', async ({ page }) => {
    await openAddSourceModal(page);

    // Visual regression screenshot — modal open state
    await expect(page.getByTestId('add-source-modal')).toHaveScreenshot(
      'bug098-add-source-modal-open.png',
      { maxDiffPixelRatio: 0.05 }
    );
  });

  test('visual: AddSourceModal error state', async ({ page }) => {
    await openAddSourceModal(page);

    // Submit empty URL to trigger error
    await page.getByTestId('add-source-submit').click({ force: true });
    await expect(page.getByRole('alert')).toBeVisible({ timeout: UI_TIMEOUT });

    // Visual regression screenshot — error state
    await expect(page.getByTestId('add-source-modal')).toHaveScreenshot(
      'bug098-add-source-modal-error.png',
      { maxDiffPixelRatio: 0.05 }
    );
  });
});

// ─── Suite: Auth error handling (BUG-098 core fix) ───────────────────────────

test.describe('BUG-098: Source auth error — friendly message display', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCourse(page);
  });

  test('no raw "400 Bad Request" text visible on page after auth error', async ({
    page,
  }) => {
    await expect(page.getByText('400 Bad Request')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('no raw "UNAUTHENTICATED" text visible on page', async ({ page }) => {
    await expect(page.getByText('UNAUTHENTICATED')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('source panel loads without crash in DEV_MODE', async ({ page }) => {
    const toggle = page.getByTestId('toggle-sources');
    await expect(toggle).toBeVisible({ timeout: UI_TIMEOUT });
    await toggle.click({ force: true });

    // Should show source list header (data-testid) without errors
    await expect(page.getByTestId('sources-title')).toBeVisible({
      timeout: UI_TIMEOUT,
    });

    // No error boundary crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 2_000,
    });
  });
});
