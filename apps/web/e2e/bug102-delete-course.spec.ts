/**
 * BUG-102 — Delete Course Button Regression Guard
 *
 * Reproduces and guards against the regression where DeleteCourseButton
 * was not rendered in CourseHeaderCard, leaving instructors unable to
 * delete courses from the course detail page.
 *
 * Tests:
 *   T-1  Delete button IS visible for INSTRUCTOR (canEdit=true)
 *   T-2  Clicking delete button opens the confirmation dialog
 *   T-3  Confirming deletion triggers DeleteCourse mutation + redirects to /courses
 *   T-4  Delete button is NOT present for students (canEdit=false)
 *
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "bug102-delete-course"
 */

import { test, expect } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_ID = '00000000-0000-0000-0000-000000000099';
const COURSE_TITLE = 'Test Course for Deletion';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_COURSE_INSTRUCTOR = {
  id: COURSE_ID,
  title: COURSE_TITLE,
  slug: 'test-course-deletion',
  description: 'A course used to test the delete flow.',
  difficulty: 'BEGINNER',
  isPublished: false,
  estimatedHours: 5,
  thumbnailUrl: null,
  instructorId: 'instructor-user-id',
  modules: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// GraphQL handler factory — returns different responses per operation
function makeCourseHandler(opts: {
  deleteShouldSucceed?: boolean;
  userRole?: 'INSTRUCTOR' | 'STUDENT';
}): Parameters<typeof routeGraphQL>[1] {
  const { deleteShouldSucceed = true, userRole = 'INSTRUCTOR' } = opts;

  return (operationName) => {
    // CourseDetail query
    if (operationName === 'CourseDetail') {
      return JSON.stringify({
        data: { course: MOCK_COURSE_INSTRUCTOR },
      });
    }

    // GetCourseModules / CourseLessons — empty is fine
    if (
      operationName === 'GetCourseModules' ||
      operationName === 'CourseLessons'
    ) {
      return JSON.stringify({
        data: { course: { ...MOCK_COURSE_INSTRUCTOR, modules: [] } },
      });
    }

    // Enrollment status — not enrolled
    if (
      operationName === 'GetEnrollmentStatus' ||
      operationName === 'MyEnrollment'
    ) {
      return JSON.stringify({ data: { myEnrollment: null } });
    }

    // Progress
    if (
      operationName === 'GetCourseProgress' ||
      operationName === 'MyCourseProgress'
    ) {
      return JSON.stringify({ data: { myCourseProgress: null } });
    }

    // Viewer info — sets canEdit via role
    if (
      operationName === 'GetViewerRole' ||
      operationName === 'Viewer' ||
      operationName === 'Me' ||
      operationName === 'GetMe'
    ) {
      return JSON.stringify({
        data: {
          me: {
            id: 'test-user-id',
            role: userRole,
            email:
              userRole === 'INSTRUCTOR'
                ? 'instructor@example.com'
                : 'student@example.com',
          },
        },
      });
    }

    // DeleteCourse mutation
    if (operationName === 'DeleteCourse') {
      if (deleteShouldSucceed) {
        return JSON.stringify({
          data: { deleteCourse: { id: COURSE_ID } },
        });
      } else {
        return JSON.stringify({
          errors: [
            { message: 'permission denied', extensions: { code: 'FORBIDDEN' } },
          ],
          data: null,
        });
      }
    }

    // Fallback: return empty data for anything else
    return null;
  };
}

// ─── T-1: Delete button IS visible for INSTRUCTOR ────────────────────────────

test.describe('bug102-delete-course — T-1: Delete button visible for INSTRUCTOR', () => {
  test('delete-course-btn is rendered when canEdit=true (INSTRUCTOR role)', async ({
    page,
  }) => {
    await loginInDevMode(page);
    await routeGraphQL(page, makeCourseHandler({ userRole: 'INSTRUCTOR' }));

    await page.goto(`/courses/${COURSE_ID}`, { waitUntil: 'domcontentloaded' });

    // BUG-102 regression guard: button must be present, NOT absent
    const deleteBtn = page.getByTestId('delete-course-btn');
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await expect(deleteBtn).not.toBeDisabled();

    await expect(page).toHaveScreenshot('bug102-delete-btn-visible.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-2: Clicking delete button opens confirmation dialog ───────────────────

test.describe('bug102-delete-course — T-2: Dialog opens on click', () => {
  test('clicking delete-course-btn opens DeleteCourseDialog', async ({
    page,
  }) => {
    await loginInDevMode(page);
    await routeGraphQL(page, makeCourseHandler({ userRole: 'INSTRUCTOR' }));

    await page.goto(`/courses/${COURSE_ID}`, { waitUntil: 'domcontentloaded' });

    const deleteBtn = page.getByTestId('delete-course-btn');
    await deleteBtn.waitFor({ timeout: 10_000 });
    await deleteBtn.click();

    // Dialog must appear
    const dialog = page.getByTestId('delete-course-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Confirm input must be present and empty
    const confirmInput = page.getByTestId('delete-course-confirm-input');
    await expect(confirmInput).toBeVisible();
    await expect(confirmInput).toHaveValue('');

    // Confirm button must be disabled (no text typed yet)
    const confirmBtn = page.getByTestId('delete-course-confirm-btn');
    await expect(confirmBtn).toBeDisabled();

    await expect(page).toHaveScreenshot('bug102-delete-dialog-open.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-3: Confirming deletion triggers mutation + redirects to /courses ───────

test.describe('bug102-delete-course — T-3: Deletion triggers mutation + redirect', () => {
  test('typing course title and confirming triggers DeleteCourse mutation and navigates to /courses', async ({
    page,
  }) => {
    await loginInDevMode(page);

    let deleteMutationCalled = false;
    await routeGraphQL(page, (operationName, body) => {
      if (operationName === 'DeleteCourse') {
        deleteMutationCalled = true;
        return JSON.stringify({ data: { deleteCourse: { id: COURSE_ID } } });
      }
      return makeCourseHandler({ userRole: 'INSTRUCTOR' })(operationName, body);
    });

    await page.goto(`/courses/${COURSE_ID}`, { waitUntil: 'domcontentloaded' });

    // Open dialog
    const deleteBtn = page.getByTestId('delete-course-btn');
    await deleteBtn.waitFor({ timeout: 10_000 });
    await deleteBtn.click();

    // Type the course title into confirm input
    const confirmInput = page.getByTestId('delete-course-confirm-input');
    await confirmInput.waitFor({ timeout: 5_000 });
    await confirmInput.fill(COURSE_TITLE);

    // Confirm button should now be enabled
    const confirmBtn = page.getByTestId('delete-course-confirm-btn');
    await expect(confirmBtn).not.toBeDisabled();

    // Click confirm
    await confirmBtn.click();

    // Should navigate away from the course detail page
    await page.waitForURL(
      (url) => !url.toString().includes(`/courses/${COURSE_ID}`),
      {
        timeout: 10_000,
      }
    );

    // Verify the DeleteCourse mutation was actually called
    expect(deleteMutationCalled).toBe(true);
  });
});

// ─── T-4: Delete button NOT present for STUDENT ───────────────────────────────

test.describe('bug102-delete-course — T-4: Delete button absent for STUDENT', () => {
  test('delete-course-btn is NOT rendered when user is a STUDENT (canEdit=false)', async ({
    page,
  }) => {
    await loginInDevMode(page);
    await routeGraphQL(page, makeCourseHandler({ userRole: 'STUDENT' }));

    await page.goto(`/courses/${COURSE_ID}`, { waitUntil: 'domcontentloaded' });

    // Wait for page to settle (enroll button must appear so we know course loaded)
    await expect(page.getByTestId('enroll-button')).toBeVisible({
      timeout: 10_000,
    });

    // Regression guard: student must NOT see delete button
    await expect(page.getByTestId('delete-course-btn')).not.toBeVisible();
  });
});
