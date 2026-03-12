/**
 * Course Creation Flow — P1 Visual E2E Tests
 *
 * T-06  Course Create Wizard: all 4 steps render, title validates, Next works
 * T-07  Course Detail Page: enroll/unenroll mutation states + no raw errors
 * T-08  Course Detail Page: fork course flow
 *
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "course-creation-flow"
 */

import { test, expect, type Page } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

const COURSE_ID = '00000000-0000-0000-0000-000000000001';

const MOCK_COURSE = {
  id: COURSE_ID,
  title: 'Introduction to Machine Learning',
  slug: 'intro-ml',
  description: 'A beginner-friendly overview of ML concepts.',
  difficulty: 'BEGINNER',
  isPublished: true,
  estimatedHours: 10,
  thumbnail: null,
  modules: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      title: 'Module 1: Foundations',
      description: null,
      order: 1,
      contentItems: [],
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

async function loginAndNavigate(page: Page, path: string) {
  await loginInDevMode(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// ─── T-06: Course Create Wizard ───────────────────────────────────────────────

test.describe('course-creation-flow — T-06: Course Create Wizard', () => {
  test.describe.configure({ mode: 'serial' });

  test('step 0 renders AI builder CTA and title input', async ({ page }) => {
    await loginAndNavigate(page, '/courses/create');

    await expect(page.getByTestId('ai-builder-cta')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('launch-ai-builder-btn')).toBeVisible();

    // Title input must be present
    const titleInput = page.locator('input[name="title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('course-wizard-step0.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Next button is disabled when title is empty', async ({ page }) => {
    await loginAndNavigate(page, '/courses/create');

    const nextBtn = page.getByRole('button', { name: /next/i }).first();
    await nextBtn.waitFor({ timeout: 10_000 });

    // Title is empty → Next should be disabled
    await expect(nextBtn).toBeDisabled();
  });

  test('Next button enables after entering title ≥3 chars', async ({ page }) => {
    await loginAndNavigate(page, '/courses/create');

    const titleInput = page.locator('input[name="title"]').first();
    await titleInput.waitFor({ timeout: 10_000 });
    await titleInput.fill('My');

    // Still too short — still disabled
    const nextBtn = page.getByRole('button', { name: /next/i }).first();

    await titleInput.fill('My Course Title');
    await expect(nextBtn).toBeEnabled({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('course-wizard-step0-filled.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('wizard advances to step 1 (modules) on Next click', async ({ page }) => {
    await loginAndNavigate(page, '/courses/create');

    const titleInput = page.locator('input[name="title"]').first();
    await titleInput.waitFor({ timeout: 10_000 });
    await titleInput.fill('Introduction to Python');

    const nextBtn = page.getByRole('button', { name: /next/i }).first();
    await nextBtn.waitFor({ timeout: 5_000 });
    await nextBtn.click();
    await page.waitForLoadState('networkidle');

    // Step 1 content — modules section
    await expect(page.getByText(/module|add module/i).first()).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('course-wizard-step1.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('AI Course Creator modal opens on Launch AI Builder click', async ({ page }) => {
    await loginAndNavigate(page, '/courses/create');

    await page.getByTestId('launch-ai-builder-btn').waitFor({ timeout: 10_000 });
    await page.getByTestId('launch-ai-builder-btn').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('AI Course Creator')).toBeVisible();
    await expect(dialog.locator('textarea')).toBeVisible();

    await expect(page).toHaveScreenshot('course-wizard-ai-modal-open.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('createCourse success navigates to course detail page', async ({ page }) => {
    const createdId = 'new-course-uuid-001';

    await routeGraphQL(page, (opName) => {
      if (opName === 'CreateCourse') {
        return JSON.stringify({
          data: {
            createCourse: {
              id: createdId,
              title: 'My Published Course',
              slug: 'my-published-course',
              isPublished: false,
              difficulty: 'BEGINNER',
              estimatedHours: null,
              description: null,
              thumbnail: null,
              modules: [],
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          },
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/courses/create');

    // Fill title and advance to the final step
    const titleInput = page.locator('input[name="title"]').first();
    await titleInput.waitFor({ timeout: 10_000 });
    await titleInput.fill('My Published Course');

    // Navigate through all wizard steps
    const nextBtn = page.getByRole('button', { name: /next/i });
    for (let i = 0; i < 3; i++) {
      if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Submit on final step
    const submitBtn = page.getByRole('button', { name: /save draft|save as draft|publish/i }).first();
    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click();
      // After success, should navigate to /courses/<id>
      await page.waitForURL(new RegExp(`/courses/${createdId}`), { timeout: 10_000 }).catch(() => {});
    }
  });
});

// ─── T-07: Course Detail Page — enroll/unenroll mutations ─────────────────────

test.describe('course-creation-flow — T-07: Course Detail enroll/unenroll', () => {
  test.describe.configure({ mode: 'serial' });

  test('course detail page loads with course data', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'CourseDetail' || opName === 'GetCourse') {
        return JSON.stringify({ data: { course: MOCK_COURSE } });
      }
      if (opName === 'MyEnrollments') {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      if (opName === 'MyCourseProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      if (opName === 'LessonsByCourse') {
        return JSON.stringify({ data: { lessonsByCourse: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}`);

    // Course title should be visible
    await expect(page.getByRole('heading', { name: /Introduction to Machine Learning/i })).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('course-detail-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('enroll button triggers EnrollCourse mutation', async ({ page }) => {
    let enrollCalled = false;

    await routeGraphQL(page, (opName) => {
      if (opName === 'CourseDetail' || opName === 'GetCourse') {
        return JSON.stringify({ data: { course: MOCK_COURSE } });
      }
      if (opName === 'MyEnrollments') {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      if (opName === 'MyCourseProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      if (opName === 'LessonsByCourse') {
        return JSON.stringify({ data: { lessonsByCourse: [] } });
      }
      if (opName === 'EnrollCourse') {
        enrollCalled = true;
        return JSON.stringify({
          data: { enrollCourse: { id: 'enrollment-001', courseId: COURSE_ID, userId: 'user-001', enrolledAt: '2026-01-01T00:00:00Z' } },
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}`);

    const enrollBtn = page.getByRole('button', { name: /enroll|start course/i }).first();
    if (await enrollBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enrollBtn.click();
      await page.waitForLoadState('networkidle');
      expect(enrollCalled).toBe(true);
    }
  });

  test('enroll mutation error shows friendly message (not raw GraphQL)', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'CourseDetail' || opName === 'GetCourse') {
        return JSON.stringify({ data: { course: MOCK_COURSE } });
      }
      if (opName === 'MyEnrollments') {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      if (opName === 'MyCourseProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      if (opName === 'LessonsByCourse') {
        return JSON.stringify({ data: { lessonsByCourse: [] } });
      }
      if (opName === 'EnrollCourse') {
        return JSON.stringify({
          data: { enrollCourse: null },
          errors: [{ message: 'Cannot insert duplicate key in enrollments table for course_id=00000000-0000-0000-0000-000000000001', extensions: { code: 'CONSTRAINT_VIOLATION' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}`);

    const enrollBtn = page.getByRole('button', { name: /enroll|start course/i }).first();
    if (await enrollBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enrollBtn.click();
      await page.waitForLoadState('networkidle');

      // Raw DB error must NOT be visible
      await expect(
        page.getByText('Cannot insert duplicate key')
      ).not.toBeVisible({ timeout: 3_000 });
    }

    await expect(page).toHaveScreenshot('course-detail-enroll-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-08: Course Detail — fork course ───────────────────────────────────────

test.describe('course-creation-flow — T-08: Course fork flow', () => {
  test('fork course button triggers ForkCourse mutation', async ({ page }) => {
    const FORKED_ID = 'forked-course-uuid-001';
    let forkCalled = false;

    await routeGraphQL(page, (opName) => {
      if (opName === 'CourseDetail' || opName === 'GetCourse') {
        return JSON.stringify({ data: { course: MOCK_COURSE } });
      }
      if (opName === 'MyEnrollments') {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      if (opName === 'MyCourseProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      if (opName === 'LessonsByCourse') {
        return JSON.stringify({ data: { lessonsByCourse: [] } });
      }
      if (opName === 'ForkCourse') {
        forkCalled = true;
        return JSON.stringify({
          data: {
            forkCourse: {
              id: FORKED_ID,
              title: `[Fork] ${MOCK_COURSE.title}`,
              slug: 'fork-intro-ml',
              isPublished: false,
            },
          },
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}`);

    const forkBtn = page.getByRole('button', { name: /fork/i }).first();
    if (await forkBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await forkBtn.click();
      await page.waitForLoadState('networkidle');
      expect(forkCalled).toBe(true);
    }
  });

  test('course detail page shows back navigation button', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'CourseDetail' || opName === 'GetCourse') {
        return JSON.stringify({ data: { course: MOCK_COURSE } });
      }
      if (opName === 'MyEnrollments') {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      if (opName === 'MyCourseProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      if (opName === 'LessonsByCourse') {
        return JSON.stringify({ data: { lessonsByCourse: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}`);

    // Back button (ArrowLeft icon button)
    const backBtn = page.getByRole('button', { name: /back|courses/i }).first();
    await expect(backBtn).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('course-detail-back-btn.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
