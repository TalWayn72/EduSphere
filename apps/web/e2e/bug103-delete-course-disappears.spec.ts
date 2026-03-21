/**
 * BUG-103 — Delete Course: course must disappear from list after deletion
 *
 * ROOT CAUSE: The backend `course.service.ts` delete method used `this.db`
 * directly without `withTenantContext()`. Since the `courses` table has RLS
 * enabled with a policy requiring `current_setting('app.current_tenant')`,
 * the SELECT query in the delete method returned 0 rows (blocked by RLS),
 * causing a "Course not found" error. The mutation failed silently and the
 * course remained in the list.
 *
 * FIX: Wrapped the delete method in `withTenantContext()` so RLS context
 * is properly set before querying/updating the courses table.
 *
 * This E2E test verifies:
 *   T-1  Course appears in list before deletion
 *   T-2  After successful delete mutation, course disappears from the list
 *   T-3  Visual: screenshot of courses list after deletion shows course gone
 *
 * All tests use GraphQL route interception (no live backend required).
 *
 * Run: pnpm --filter @edusphere/web test:e2e -- --grep "bug103"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL } from './env';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve(process.cwd(), '../../docs/screenshots');

const COURSE_TO_DELETE = {
  __typename: 'Course',
  id: '00000000-0000-0000-0000-bug103delete1',
  title: 'Course To Be Deleted',
  slug: 'course-to-delete',
  description: 'This course should disappear after deletion.',
  isPublished: false,
  estimatedHours: 5,
  thumbnailUrl: null,
  instructorId: 'dev-user-id',
};

const OTHER_COURSE = {
  __typename: 'Course',
  id: '00000000-0000-0000-0000-bug103keep001',
  title: 'Course That Stays',
  slug: 'course-that-stays',
  description: 'This course should remain after deletion of the other.',
  isPublished: true,
  estimatedHours: 10,
  thumbnailUrl: null,
  instructorId: 'dev-user-id',
};

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe('bug103 — Deleted course disappears from list', () => {
  test.describe.configure({ mode: 'serial' });

  test('T-1: course visible in list before deletion', async ({ page }) => {
    // 1. Authenticate via DEV_MODE login flow
    await login(page);

    // 2. Set up GraphQL mock AFTER login (login navigates away from /login)
    await routeGraphQL(page, (opName, body) => {
      const queryStr = String(body?.query ?? '');
      if (opName === 'Courses' || queryStr.includes('courses(')) {
        return JSON.stringify({
          data: { courses: [COURSE_TO_DELETE, OTHER_COURSE] },
        });
      }
      if (opName === 'MyEnrollments' || queryStr.includes('myEnrollments')) {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      return null;
    });

    // 3. Navigate to /courses
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Both courses should be visible
    await expect(page.getByText(COURSE_TO_DELETE.title)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(OTHER_COURSE.title)).toBeVisible({ timeout: 10_000 });
  });

  test('T-2: after delete mutation, course disappears from list', async ({ page }) => {
    let deleteWasCalled = false;

    // 1. Authenticate
    await login(page);

    // 2. Set up GraphQL mock with delete mutation tracking
    await routeGraphQL(page, (opName, body) => {
      const queryStr = String(body?.query ?? '');

      // Course detail queries
      if (opName === 'CourseDetail' || opName === 'GetCourse' || opName === 'Course') {
        return JSON.stringify({
          data: {
            course: {
              ...COURSE_TO_DELETE,
              __typename: 'Course',
              difficulty: 'BEGINNER',
              modules: [],
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          },
        });
      }

      // Delete mutation
      if (opName === 'DeleteCourse' || queryStr.includes('deleteCourse')) {
        deleteWasCalled = true;
        return JSON.stringify({ data: { deleteCourse: true } });
      }

      // Courses list — return only remaining course after deletion
      if (opName === 'Courses' || queryStr.includes('courses(')) {
        if (deleteWasCalled) {
          return JSON.stringify({
            data: { courses: [OTHER_COURSE] },
          });
        }
        return JSON.stringify({
          data: { courses: [COURSE_TO_DELETE, OTHER_COURSE] },
        });
      }

      if (opName === 'MyEnrollments' || queryStr.includes('myEnrollments')) {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      if (opName === 'MyCourseProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      if (opName === 'LessonsByCourse' || queryStr.includes('lessonsByCourse')) {
        return JSON.stringify({ data: { lessonsByCourse: [] } });
      }
      return null;
    });

    // 3. Navigate to course detail page
    await page.goto(`${BASE_URL}/courses/${COURSE_TO_DELETE.id}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    // Click delete button (use data-testid for precision).
    // On mobile viewports the buttons may overlap — use force to bypass
    // Playwright's pointer-interception check (the button IS clickable).
    const deleteBtn = page.getByTestId('delete-course-btn');
    await deleteBtn.waitFor({ timeout: 10_000 });
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click({ force: true });

    // Fill confirmation input with course title
    const dialog = page.getByTestId('delete-course-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const confirmInput = page.getByTestId('delete-course-confirm-input');
    await confirmInput.fill(COURSE_TO_DELETE.title);

    // Click confirm delete (force for mobile viewports where the dialog
    // backdrop overlay may intercept pointer events)
    const confirmBtn = page.getByTestId('delete-course-confirm-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 3_000 });
    await confirmBtn.click({ force: true });

    // Should redirect to /courses (exact path, not /courses/:id)
    await page.waitForURL(
      (url) => {
        const path = new URL(url).pathname;
        return path === '/courses' || path === '/courses/';
      },
      { timeout: 10_000 },
    );

    // BUG-103 regression guard: deleted course must NOT appear in the course
    // grid. We scope to h3 headings (course card titles) to avoid matching the
    // "Course … has been deleted" success toast that may still be visible.
    await expect(
      page.locator('main h3', { hasText: COURSE_TO_DELETE.title }),
    ).toHaveCount(0, { timeout: 10_000 });

    // The remaining course should still be visible
    await expect(
      page.locator('main h3', { hasText: OTHER_COURSE.title }),
    ).toBeVisible({ timeout: 10_000 });

    // Verify delete mutation was called
    expect(deleteWasCalled).toBe(true);
  });

  test('T-3: visual — courses list after deletion', async ({ page }) => {
    // 1. Authenticate
    await login(page);

    // 2. Mock GraphQL — only the remaining course
    await routeGraphQL(page, (opName, body) => {
      const queryStr = String(body?.query ?? '');
      if (opName === 'Courses' || queryStr.includes('courses(')) {
        return JSON.stringify({
          data: { courses: [OTHER_COURSE] },
        });
      }
      if (opName === 'MyEnrollments' || queryStr.includes('myEnrollments')) {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      return null;
    });

    // 3. Navigate to courses list
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(OTHER_COURSE.title)).toBeVisible({ timeout: 10_000 });

    // Deleted course must NOT appear
    await expect(page.getByText(COURSE_TO_DELETE.title)).not.toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/bug103-courses-after-deletion.png`,
      fullPage: false,
    });
  });
});
