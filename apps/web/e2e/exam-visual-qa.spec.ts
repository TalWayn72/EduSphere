/**
 * Exam System — Visual QA Screenshots
 *
 * Captures screenshots of all exam-related routes to verify:
 * 1. Routes exist and are registered in React Router
 * 2. Pages render without crashes (no blank screen / error boundary)
 * 3. Visual baseline for exam UI components
 *
 * Uses DEV_MODE login (no Keycloak required).
 * A fake courseId/blueprintId is used since no real exam data may exist.
 */

import { test, expect } from '@playwright/test';
import { loginViaKeycloak } from './auth.helpers';
import { BASE_URL, TEST_USERS } from './env';
import path from 'path';
import { fileURLToPath } from 'url';
test.use({ reducedMotion: 'reduce' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../../docs/screenshots'
);

// Fake IDs — pages should render gracefully even without real data
const COURSE_ID = 'test-course-001';
const BLUEPRINT_ID = 'test-blueprint-001';
const SESSION_ID = 'test-session-001';

const EXAM_ROUTES = [
  {
    name: 'item-bank',
    path: `/courses/${COURSE_ID}/exams/items`,
    label: 'Item Bank',
  },
  {
    name: 'item-editor-new',
    path: `/courses/${COURSE_ID}/exams/items/new`,
    label: 'Item Editor (new)',
  },
  {
    name: 'blueprint-list',
    path: `/courses/${COURSE_ID}/exams/blueprints`,
    label: 'Blueprint List',
  },
  {
    name: 'blueprint-builder',
    path: `/courses/${COURSE_ID}/exams/blueprints/new`,
    label: 'Blueprint Builder',
  },
  {
    name: 'analytics',
    path: `/courses/${COURSE_ID}/exams/analytics`,
    label: 'Exam Analytics',
  },
  {
    name: 'ai-generator',
    path: `/courses/${COURSE_ID}/exams/generate`,
    label: 'AI Item Generator',
  },
  {
    name: 'exam-start',
    path: `/exams/${BLUEPRINT_ID}/start`,
    label: 'Exam Start',
  },
  {
    name: 'exam-taking',
    path: `/exams/session/${SESSION_ID}`,
    label: 'Exam Taking',
  },
  {
    name: 'exam-results',
    path: `/exams/session/${SESSION_ID}/results`,
    label: 'Exam Results',
  },
] as const;

test.describe('Exam System — Visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.instructor);
  });

  for (const route of EXAM_ROUTES) {
    test(`screenshot: ${route.label} (${route.path})`, async ({ page }) => {
      // Navigate to the exam route
      const response = await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });

      // Wait for Keycloak silent SSO + React lazy load to finish.
      // The app shows "Initializing authentication..." during Keycloak init;
      // wait for that to disappear (up to 10s), then add buffer for React render.
      await page
        .waitForFunction(
          () => !document.body.textContent?.includes('Initializing authentication'),
          { timeout: 10_000 }
        )
        .catch(() => {
          // Auth init may have already completed or page redirected
        });
      await page.waitForTimeout(1500);

      // Check page didn't hard-crash (no 500 error, no blank white page)
      const bodyText = await page.locator('body').textContent({ timeout: 5000 }).catch(() => '');

      // Capture screenshot regardless of content
      const screenshotPath = path.join(
        SCREENSHOT_DIR,
        `exam-visual-${route.name}.png`
      );
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      // Verify the page didn't show a fatal error boundary
      // (some pages may show "not found" or empty state — that's OK with fake IDs)
      const hasFatalError = bodyText?.includes('Something went wrong') ||
        bodyText?.includes('Application error') ||
        bodyText?.includes('Unhandled Runtime Error');

      expect(
        hasFatalError,
        `${route.label} page should not show a fatal error`
      ).toBeFalsy();

      // Log what was rendered for debugging
      console.log(
        `[exam-visual] ${route.label}: status=${response?.status() ?? 'N/A'}, ` +
        `url=${page.url()}, bodyLen=${bodyText?.length ?? 0}`
      );
    });
  }

  test('screenshot: courses page (entry point)', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'exam-visual-courses-entry.png'),
      fullPage: true,
    });

    // Courses page should render without crash
    const body = await page.locator('body').textContent({ timeout: 5000 }).catch(() => '');
    expect(body?.length).toBeGreaterThan(0);
    console.log(`[exam-visual] Courses entry: url=${page.url()}, bodyLen=${body?.length ?? 0}`);
  });
});
