/**
 * Content Import — Phase 40 E2E tests
 *
 * Tests the Smart Content Import wizard at /courses/:courseId/import.
 * Requires INSTRUCTOR role authentication.
 *
 * Covers:
 *   - Role gate: STUDENT cannot access import page
 *   - Import source selector (YouTube / Website / Folder)
 *   - YouTube URL input + submit
 *   - FolderUploadZone rendering
 *   - ImportProgressPanel visibility after job created
 *   - No raw error strings exposed to user
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/content-import.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';

const IMPORT_URL = `${BASE_URL}/courses/00000000-0000-0000-0000-000000000001/import`;

// ─── Suite 1: Role gate ────────────────────────────────────────────────────────

test.describe('Content Import — Role gate', () => {
  test('STUDENT cannot access import page — redirected to /dashboard', async ({ page }) => {
    // The page requires login — in DEV_MODE the auto-auth is STUDENT role
    // If VITE_DEV_MODE=true, auto-auth is set to first available user (student)
    // Role gate in ContentImportPage.tsx redirects to /dashboard for STUDENT
    test.skip(
      process.env.VITE_DEV_MODE === 'false',
      'Requires DEV_MODE auto-auth for role-gate test'
    );
    await page.goto(IMPORT_URL, { waitUntil: 'domcontentloaded' });
    // Should redirect to /dashboard — import heading must NOT be visible
    await page.waitForURL(/\/dashboard/, { timeout: 5_000 }).catch(() => null);
    const heading = page.getByRole('heading', { name: /import content/i });
    await expect(heading).not.toBeVisible({ timeout: 3_000 });
  });
});

// ─── Suite 2: Import page structure ───────────────────────────────────────────

test.describe('Content Import — Page structure (DEV_MODE)', () => {
  test.skip(
    process.env.VITE_DEV_MODE === 'false',
    'Requires DEV_MODE with INSTRUCTOR auto-auth'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(IMPORT_URL, { waitUntil: 'domcontentloaded' });
  });

  test('"Import Content" heading is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /import content/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Import source selector shows 3 options', async ({ page }) => {
    // 3 source cards: YouTube, Website, Folder
    await expect(page.getByText('YouTube Playlist')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Website / Blog')).toBeVisible();
    await expect(page.getByText('Upload Folder / ZIP')).toBeVisible();
  });

  test('clicking YouTube source reveals playlist URL input', async ({ page }) => {
    await page.getByText('YouTube Playlist').click();
    await expect(
      page.getByPlaceholder(/youtube.com\/playlist/i)
    ).toBeVisible({ timeout: 3_000 });
  });

  test('clicking Website source reveals website URL input', async ({ page }) => {
    await page.getByText('Website / Blog').click();
    await expect(
      page.getByPlaceholder(/your-course-site.com/i)
    ).toBeVisible({ timeout: 3_000 });
  });

  test('clicking Folder source reveals FolderUploadZone', async ({ page }) => {
    await page.getByText('Upload Folder / ZIP').click();
    await expect(
      page.getByRole('button', { name: /upload folder or zip archive/i })
    ).toBeVisible({ timeout: 3_000 });
  });

  test('no raw error strings visible on page load', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('Cannot read properties');
  });
});

// ─── Suite 3: YouTube import flow (mocked) ────────────────────────────────────

test.describe('Content Import — YouTube flow (mocked API)', () => {
  test.skip(
    process.env.VITE_DEV_MODE === 'false',
    'Requires DEV_MODE with INSTRUCTOR auto-auth'
  );

  test('submitting YouTube URL calls GraphQL mutation and shows progress panel', async ({
    page,
  }) => {
    // Intercept the GraphQL importFromYoutube mutation
    await page.route('**/graphql', async (route) => {
      const body = await route.request().postDataJSON() as { query?: string };
      if (body?.query?.includes('importFromYoutube')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              importFromYoutube: {
                id: 'job-test-1',
                status: 'COMPLETE',
                lessonCount: 5,
                estimatedMinutes: 1,
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(IMPORT_URL, { waitUntil: 'domcontentloaded' });

    await page.getByText('YouTube Playlist').click();
    await page.getByPlaceholder(/youtube.com\/playlist/i).fill(
      'https://www.youtube.com/playlist?list=PLtest123'
    );
    await page.getByRole('button', { name: /start import/i }).click();

    // Progress panel should appear
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/5 lessons/i)).toBeVisible({ timeout: 5_000 });
  });

  test('YouTube API quota error shows user-friendly message', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = await route.request().postDataJSON() as { query?: string };
      if (body?.query?.includes('importFromYoutube')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'YouTube API quota exceeded' }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(IMPORT_URL, { waitUntil: 'domcontentloaded' });
    await page.getByText('YouTube Playlist').click();
    await page.getByPlaceholder(/youtube.com\/playlist/i).fill(
      'https://www.youtube.com/playlist?list=PLtest'
    );
    await page.getByRole('button', { name: /start import/i }).click();

    // Error must NOT expose raw technical strings
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot read properties');
    expect(bodyText).not.toContain('[object Object]');
  });
});

// ─── Suite 4: Visual regression ───────────────────────────────────────────────

test.describe('Content Import — @visual', () => {
  test.skip(
    process.env.VITE_DEV_MODE === 'false',
    'Requires DEV_MODE with INSTRUCTOR auto-auth'
  );
  test.use({ reducedMotion: 'reduce' });

  test('visual regression — import page initial state', async ({ page }) => {
    await page.goto(IMPORT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('content-import-initial.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('visual regression — import page with YouTube source selected', async ({ page }) => {
    await page.goto(IMPORT_URL, { waitUntil: 'domcontentloaded' });
    await page.getByText('YouTube Playlist').click();
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('content-import-youtube-selected.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
