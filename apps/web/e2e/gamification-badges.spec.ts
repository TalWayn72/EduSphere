/**
 * E2E test — Gamification org badge creation flow (F-12).
 *
 * Tests: badge CRUD via admin UI, auto-award editor, leaderboard toggle.
 */
import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  email: 'org.admin@example.com',
  password: 'OrgAdmin123!',
};

test.describe('Gamification Badges (F-12)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GraphQL responses for isolated testing
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON();
      const opName = body?.operationName ?? '';

      if (opName === 'GamificationConfig') {
        await route.fulfill({
          json: {
            data: {
              gamificationConfig: {
                enabled: true,
                showLeaderboard: true,
                showBadges: true,
                showPoints: true,
                showStreaks: true,
                xpRules: {
                  lesson_completion: 10,
                  quiz_pass: 25,
                  streak_bonus_per_day: 2,
                },
                leaderboardScope: 'TENANT',
              },
            },
          },
        });
      } else if (opName === 'OrgBadges') {
        await route.fulfill({
          json: {
            data: {
              orgBadges: [
                {
                  id: 'badge-1',
                  name: 'Quick Learner',
                  description: 'Complete 5 courses',
                  iconUrl: null,
                  xpRequired: 50,
                  autoAwardCriteria: {
                    type: 'COURSE_COMPLETE',
                  },
                  isActive: true,
                  createdAt: '2026-03-22T00:00:00Z',
                },
              ],
            },
          },
        });
      } else if (opName === 'CreateOrgBadge') {
        await route.fulfill({
          json: {
            data: {
              createOrgBadge: {
                id: 'badge-2',
                name: body.variables?.input?.name ?? 'New Badge',
                description: body.variables?.input?.description ?? '',
                iconUrl: null,
                xpRequired: body.variables?.input?.xpRequired ?? 100,
                autoAwardCriteria: body.variables?.input?.autoAwardCriteria ?? null,
                isActive: true,
                createdAt: '2026-03-22T00:00:00Z',
              },
            },
          },
        });
      } else if (opName === 'DeleteOrgBadge') {
        await route.fulfill({
          json: { data: { deleteOrgBadge: true } },
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should display gamification config page with badges', async ({
    page,
  }) => {
    await page.goto('/admin/org-gamification');
    await expect(
      page.getByTestId('gamification-config-page')
    ).toBeVisible();
  });

  test('should show auto-award editor in badge form', async ({ page }) => {
    await page.goto('/admin/org-gamification');
    await expect(page.getByTestId('auto-award-editor')).toBeVisible();
  });

  test('should display existing badges in table', async ({ page }) => {
    await page.goto('/admin/org-gamification');
    await expect(page.getByText('Quick Learner')).toBeVisible();
    await expect(page.getByText('50 XP')).toBeVisible();
  });

  test('leaderboard disabled message shows when toggle is off', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON();
      const opName = body?.operationName ?? '';

      if (opName === 'GamificationConfigForLeaderboard') {
        await route.fulfill({
          json: {
            data: {
              gamificationConfig: { showLeaderboard: false },
            },
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/leaderboard');
    await expect(
      page.getByText('leaderboardDisabledByOrg')
    ).toBeVisible();
  });
});
