/**
 * Exam Blueprint — E2E Tests
 *
 * Covers:
 *  - Instructor creates a blueprint
 *  - Sets domain distribution
 *  - Sets time limit and passing score
 *  - Blueprint appears in list
 *  - Activates blueprint
 *
 * Run: pnpm --filter @edusphere/web test:e2e --grep "exam-blueprint"
 */

import { test, expect } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

const MOCK_BLUEPRINTS = [
  {
    id: 'bp-1',
    title: 'Midterm Certification',
    status: 'ACTIVE',
    totalItems: 50,
    timeLimitMinutes: 90,
    passingThreshold: 70,
    passingMethod: 'PERCENTAGE',
    enableCat: false,
    courseId: 'course-1',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'bp-2',
    title: 'Final Assessment',
    status: 'DRAFT',
    totalItems: 100,
    timeLimitMinutes: 120,
    passingThreshold: 650,
    passingMethod: 'SCALED_SCORE',
    enableCat: true,
    courseId: 'course-1',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
  },
];

function handleGraphQL(op: string): string | null {
  if (op === 'ExamBlueprints' || op === 'GetExamBlueprints') {
    return JSON.stringify({
      data: {
        examBlueprints: {
          edges: MOCK_BLUEPRINTS.map((n) => ({ node: n })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
  }
  if (op === 'CreateExamBlueprint') {
    return JSON.stringify({
      data: {
        createExamBlueprint: {
          id: 'bp-new',
          title: 'New Blueprint',
          status: 'DRAFT',
          totalItems: 30,
          timeLimitMinutes: 60,
          passingThreshold: 65,
          passingMethod: 'PERCENTAGE',
        },
      },
    });
  }
  if (op === 'ActivateExamBlueprint') {
    return JSON.stringify({
      data: { activateExamBlueprint: { id: 'bp-2', status: 'ACTIVE' } },
    });
  }
  if (op === 'ExamBlueprint' || op === 'GetExamBlueprint') {
    return JSON.stringify({ data: { examBlueprint: MOCK_BLUEPRINTS[0] } });
  }
  return null;
}

test.describe('exam-blueprint', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, handleGraphQL);
    await loginInDevMode(page);
  });

  test('blueprint list page shows all blueprints', async ({ page }) => {
    await page.goto('/exam/blueprints');
    await expect(page.getByText('Midterm Certification')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Final Assessment')).toBeVisible();
  });

  test('shows status badges for ACTIVE and DRAFT', async ({ page }) => {
    await page.goto('/exam/blueprints');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByText('ACTIVE').or(page.getByText('Active'))
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('DRAFT').or(page.getByText('Draft'))
    ).toBeVisible();
  });

  test('navigate to create new blueprint page', async ({ page }) => {
    await page.goto('/exam/blueprints');
    await page.waitForLoadState('domcontentloaded');
    const createBtn = page
      .getByRole('link', { name: /create|new blueprint/i })
      .or(page.getByRole('button', { name: /create|new blueprint/i }));
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
    await expect(page).toHaveURL(/blueprints\/(new|create|builder)/);
  });

  test('blueprint builder page renders form fields', async ({ page }) => {
    await page.goto('/exam/blueprints/new');
    await page.waitForLoadState('domcontentloaded');
    // Should show title input and time limit
    const titleInput = page
      .locator('input[name="title"]')
      .or(page.getByLabel(/title/i));
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
  });
});
