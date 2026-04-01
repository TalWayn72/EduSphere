/**
 * org-gamification-config.spec.ts — E2E tests for Per-Org Gamification Config.
 *
 * Route: /admin/gamification (requires ORG_ADMIN auth)
 *
 * Covers:
 *   - Custom badge creation
 *   - Toggle gamification on/off
 *   - Leaderboard preview
 *   - XP configuration
 *   - Visual regression
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, RUN_WRITE_TESTS } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const GAMIFICATION_ROUTE = '/admin/gamification';

async function mockGamificationAPIs(
  page: import('@playwright/test').Page
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (
      op === 'GetGamificationConfig' ||
      op.toLowerCase().includes('gamification')
    ) {
      return JSON.stringify({
        data: {
          gamificationConfig: {
            enabled: true,
            xpRules: {
              courseCompletion: 100,
              quizPass: 50,
              lessonView: 10,
              dailyLogin: 5,
            },
            customBadges: [
              {
                id: 'b1',
                name: 'Course Champion',
                iconUrl: '/badges/champion.png',
                criteria: 'Complete 10 courses',
              },
              {
                id: 'b2',
                name: 'Quiz Master',
                iconUrl: '/badges/quiz.png',
                criteria: 'Pass 50 quizzes',
              },
            ],
          },
          leaderboard: [
            { userId: 'u1', displayName: 'Alice', points: 500 },
            { userId: 'u2', displayName: 'Bob', points: 450 },
            { userId: 'u3', displayName: 'Charlie', points: 380 },
          ],
        },
      });
    }
    if (op === 'ToggleGamification' || op.toLowerCase().includes('toggle')) {
      return JSON.stringify({
        data: { toggleGamification: { enabled: false } },
      });
    }
    if (op === 'CreateCustomBadge' || op.toLowerCase().includes('badge')) {
      return JSON.stringify({
        data: { createCustomBadge: { id: 'b-new', name: 'New Badge' } },
      });
    }
    if (op === 'Me' || op.toLowerCase().includes('me')) {
      return JSON.stringify({
        data: {
          me: { id: 'user-001', roles: ['ORG_ADMIN'], tenantId: 'tenant-001' },
        },
      });
    }
    return null;
  });
}

test.describe('Gamification Config — Structure', () => {
  test.beforeEach(async ({ page }) => {
    await mockGamificationAPIs(page);
    await page.goto(`${BASE_URL}${GAMIFICATION_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="gamification-config"]')
      .waitFor({ timeout: 15_000 });
  });

  test('page loads with gamification toggle', async ({ page }) => {
    await expect(
      page.locator('[data-testid="toggle-gamification"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('custom badges section is visible', async ({ page }) => {
    await expect(page.getByText('Course Champion')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Quiz Master')).toBeVisible();
  });

  test('leaderboard preview shows top users', async ({ page }) => {
    await expect(page.getByText('Alice')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Bob')).toBeVisible();
    await expect(page.getByText('Charlie')).toBeVisible();
  });

  test('XP configuration fields are visible', async ({ page }) => {
    await expect(
      page.locator('[data-testid="xp-course-completion"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="xp-quiz-pass"]')).toBeVisible();
  });

  test('create badge button is present', async ({ page }) => {
    await expect(page.locator('[data-testid="btn-create-badge"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Gamification Config — Interactions', () => {
  test('toggle gamification off shows confirmation', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockGamificationAPIs(page);
    await page.goto(`${BASE_URL}${GAMIFICATION_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="gamification-config"]')
      .waitFor({ timeout: 15_000 });

    await page.locator('[data-testid="toggle-gamification"]').click();
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('create badge opens modal form', async ({ page }) => {
    test.skip(!RUN_WRITE_TESTS, 'Write tests disabled');
    await mockGamificationAPIs(page);
    await page.goto(`${BASE_URL}${GAMIFICATION_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="gamification-config"]')
      .waitFor({ timeout: 15_000 });

    await page.locator('[data-testid="btn-create-badge"]').click();
    await expect(
      page.locator('[data-testid="badge-creation-modal"]')
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Gamification Config — Visual', () => {
  test('visual regression — gamification page', async ({ page }) => {
    await mockGamificationAPIs(page);
    await page.goto(`${BASE_URL}${GAMIFICATION_ROUTE}`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .locator('[data-testid="gamification-config"]')
      .waitFor({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('gamification-config.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
