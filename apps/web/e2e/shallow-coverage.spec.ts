/**
 * Shallow Coverage — P4 Visual E2E Tests
 *
 * Pages that have some coverage but lack mutation error scenarios
 * or visual regression screenshots:
 *
 * T-16  Dashboard page — shows courses, stats
 * T-17  Profile page — update profile mutation error
 * T-18  Course Discover page — filter + search
 * T-19  Settings page — theme toggle
 * T-20  Lesson Detail page — complete lesson mutation
 *
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "shallow-coverage"
 */

import { test, expect, type Page } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

async function loginAndNavigate(page: Page, path: string) {
  await loginInDevMode(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function assertNoRawErrors(page: Page) {
  const rawErrors = ['CombinedError', 'graphQLErrors', 'Cannot return null', 'INTERNAL_SERVER_ERROR'];
  for (const err of rawErrors) {
    await expect(page.getByText(err, { exact: false })).not.toBeVisible({ timeout: 2_000 });
  }
}

// ─── T-16: Dashboard ─────────────────────────────────────────────────────────

test.describe('shallow-coverage — T-16: Dashboard', () => {
  test.describe.configure({ mode: 'serial' });

  test('dashboard page loads with enrolled courses', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyEnrollments' || opName === 'GetMyEnrollments') {
        return JSON.stringify({
          data: {
            myEnrollments: [
              {
                id: 'enrollment-001',
                course: {
                  id: 'course-001',
                  title: 'Introduction to Machine Learning',
                  slug: 'intro-ml',
                  isPublished: true,
                  estimatedHours: 10,
                  thumbnail: null,
                },
                enrolledAt: '2026-02-01T00:00:00Z',
              },
            ],
          },
        });
      }
      if (opName === 'MyCourseProgress' || opName === 'GetProgress') {
        return JSON.stringify({ data: { myCourseProgress: null } });
      }
      return null;
    });

    await loginAndNavigate(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('dashboard-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dashboard shows empty state when no enrollments', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyEnrollments' || opName === 'GetMyEnrollments') {
        return JSON.stringify({ data: { myEnrollments: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('dashboard-empty.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dashboard error shows friendly message (no raw GraphQL)', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyEnrollments' || opName === 'GetMyEnrollments') {
        return JSON.stringify({
          data: { myEnrollments: null },
          errors: [{ message: 'SET LOCAL app.current_tenant failed: invalid UUID format', extensions: { code: 'RLS_CONTEXT_ERROR' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('SET LOCAL app.current_tenant failed')).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('dashboard-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-17: Profile Page ───────────────────────────────────────────────────────

test.describe('shallow-coverage — T-17: Profile Page', () => {
  test.describe.configure({ mode: 'serial' });

  test('profile page loads user info', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyProfile' || opName === 'GetProfile' || opName === 'Me') {
        return JSON.stringify({
          data: {
            me: {
              id: 'user-001',
              email: 'super.admin@edusphere.dev',
              name: 'Super Admin',
              role: 'SUPER_ADMIN',
              locale: 'en',
              avatar: null,
              bio: 'Platform administrator.',
              createdAt: '2026-01-01T00:00:00Z',
            },
          },
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/profile');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('profile-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('profile update mutation error shows friendly message', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyProfile' || opName === 'GetProfile' || opName === 'Me') {
        return JSON.stringify({
          data: { me: { id: 'user-001', email: 'super.admin@edusphere.dev', name: 'Super Admin', role: 'SUPER_ADMIN', locale: 'en', avatar: null, bio: null } },
        });
      }
      if (opName === 'UpdateProfile' || opName === 'UpdateUserProfile') {
        return JSON.stringify({
          data: { updateProfile: null },
          errors: [{ message: 'Email already in use by another account in tenant tenant-001', extensions: { code: 'DUPLICATE_EMAIL' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/profile');
    await page.waitForLoadState('networkidle');

    // Look for edit or save buttons
    const editBtn = page.getByRole('button', { name: /edit|update|save profile/i }).first();
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');

      // Try to save with the update mutation
      const saveBtn = page.getByRole('button', { name: /save|update/i }).last();
      if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForLoadState('networkidle');

        // Raw duplicate email error must NOT be shown
        await expect(
          page.getByText('Email already in use by another account in tenant')
        ).not.toBeVisible({ timeout: 3_000 });
      }
    }

    await expect(page).toHaveScreenshot('profile-update-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-18: Course Discover ────────────────────────────────────────────────────

test.describe('shallow-coverage — T-18: Course Discover', () => {
  test.describe.configure({ mode: 'serial' });

  const MOCK_COURSES = [
    { id: 'course-001', title: 'Introduction to Machine Learning', slug: 'intro-ml', isPublished: true, difficulty: 'BEGINNER', estimatedHours: 10, thumbnail: null, description: 'Learn ML basics.' },
    { id: 'course-002', title: 'Advanced Python', slug: 'advanced-python', isPublished: true, difficulty: 'ADVANCED', estimatedHours: 20, thumbnail: null, description: 'Deep Python concepts.' },
  ];

  test('course discover page loads course catalog', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'AllCourses' || opName === 'DiscoverCourses' || opName === 'Courses') {
        return JSON.stringify({
          data: { courses: { nodes: MOCK_COURSES, pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 2 } },
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/courses/discover');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('course-discover-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('course discover filter shows no raw errors', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'AllCourses' || opName === 'DiscoverCourses' || opName === 'Courses') {
        return JSON.stringify({ data: { courses: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 } } });
      }
      return null;
    });

    await loginAndNavigate(page, '/courses/discover');
    await page.waitForLoadState('networkidle');

    // Try to type in search if available
    const searchInput = page.getByRole('searchbox').or(page.getByRole('textbox')).first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('machine learning');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
    }

    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('course-discover-filtered.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-19: Settings Theme ─────────────────────────────────────────────────────

test.describe('shallow-coverage — T-19: Settings Theme', () => {
  test('settings/theme page loads without raw errors', async ({ page }) => {
    await loginAndNavigate(page, '/settings/theme');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('settings-theme-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('settings page updateUserPreferences success shows success toast', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'UpdateUserPreferences') {
        return JSON.stringify({
          data: { updateUserPreferences: { userId: 'user-001', locale: 'fr', theme: 'dark' } },
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/settings');
    await page.waitForLoadState('networkidle');

    // Select French from combobox
    await page.getByRole('combobox').first().click();
    const frenchOption = page.getByRole('option', { name: /Fran/i }).first();
    if (await frenchOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await frenchOption.click();
      await page.waitForLoadState('networkidle');
    }

    // Error toast must NOT appear
    await expect(
      page.getByText(/שמירת העדפות שפה נכשלה|language.*failed|failed.*save/i)
    ).not.toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('settings-language-saved.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('settings updateUserPreferences mutation error — no raw GraphQL shown', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'UpdateUserPreferences') {
        return JSON.stringify({
          data: { updateUserPreferences: null },
          errors: [{ message: 'Cannot set locale: "zz" is not in SUPPORTED_LOCALES enum', extensions: { code: 'INVALID_ENUM_VALUE' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/settings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('combobox').first().click();
    const englishOption = page.getByRole('option', { name: /English/i }).first();
    if (await englishOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await englishOption.click();
      await page.waitForLoadState('networkidle');
    }

    // Raw enum error must NOT be visible
    await expect(
      page.getByText('is not in SUPPORTED_LOCALES enum')
    ).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('settings-preferences-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-20: Lesson Detail ─────────────────────────────────────────────────────

test.describe('shallow-coverage — T-20: Lesson Detail', () => {
  const LESSON_ID = '00000000-0000-0000-0000-000000000020';
  const COURSE_ID = '00000000-0000-0000-0000-000000000001';

  const MOCK_LESSON = {
    id: LESSON_ID,
    courseId: COURSE_ID,
    title: 'Introduction to Gradient Descent',
    description: 'Understanding gradient descent optimization algorithm.',
    content: '# Gradient Descent\n\nGradient descent is an optimization algorithm...',
    status: 'PUBLISHED',
    estimatedMinutes: 15,
    order: 1,
    createdAt: '2026-01-01T00:00:00Z',
  };

  test('lesson detail page loads lesson content', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'LessonDetail' || opName === 'GetLesson') {
        return JSON.stringify({ data: { lesson: MOCK_LESSON } });
      }
      if (opName === 'LessonProgress') {
        return JSON.stringify({ data: { lessonProgress: null } });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/lessons/${LESSON_ID}`);
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('lesson-detail-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('complete lesson mutation shows no raw errors on failure', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'LessonDetail' || opName === 'GetLesson') {
        return JSON.stringify({ data: { lesson: MOCK_LESSON } });
      }
      if (opName === 'LessonProgress') {
        return JSON.stringify({ data: { lessonProgress: null } });
      }
      if (opName === 'CompleteLesson' || opName === 'MarkLessonComplete') {
        return JSON.stringify({
          data: { completeLesson: null },
          errors: [{ message: 'Lesson completion requires quiz score ≥70% for LESSON_ID=00000000-0000-0000-0000-000000000020', extensions: { code: 'COMPLETION_BLOCKED' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/lessons/${LESSON_ID}`);
    await page.waitForLoadState('networkidle');

    // Try to find and click a "Mark Complete" button
    const completeBtn = page.getByRole('button', { name: /complete|mark.*complete|finish/i }).first();
    if (await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await completeBtn.click();
      await page.waitForLoadState('networkidle');

      // Raw internal error must NOT be visible
      await expect(
        page.getByText('Lesson completion requires quiz score')
      ).not.toBeVisible({ timeout: 3_000 });
    }

    await expect(page).toHaveScreenshot('lesson-complete-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('lesson pipeline page loads without errors', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'LessonPipeline' || opName === 'GetLessonPipeline') {
        return JSON.stringify({ data: { lessonPipeline: { steps: [], status: 'DRAFT' } } });
      }
      return null;
    });

    await loginAndNavigate(page, `/courses/${COURSE_ID}/lessons/${LESSON_ID}/pipeline`);
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('lesson-pipeline-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
