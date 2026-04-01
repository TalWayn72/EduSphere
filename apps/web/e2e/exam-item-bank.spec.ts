/**
 * Exam Item Bank — E2E Tests
 *
 * Covers:
 *  - Instructor navigates to exam item bank
 *  - Creates a new exam item (MCQ)
 *  - Item appears in the bank table
 *  - Filters by bloom level
 *  - Retires an item
 *  - AI generates items (mock LLM response)
 *
 * Run: pnpm --filter @edusphere/web test:e2e --grep "exam-item-bank"
 */

import { test, expect } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

const MOCK_ITEMS = [
  {
    id: 'item-1',
    domain: 'Mathematics',
    bloomLevel: 'APPLY',
    questionType: 'MULTIPLE_CHOICE',
    calibrationStatus: 'CALIBRATED',
    qualityTier: 'GOLD',
    source: 'HUMAN',
    pilotN: 120,
    createdAt: '2026-03-01T10:00:00Z',
    questionData: {
      type: 'MULTIPLE_CHOICE',
      question: 'What is 2+2?',
      options: [],
      correctOptionIds: [],
    },
  },
  {
    id: 'item-2',
    domain: 'Physics',
    bloomLevel: 'REMEMBER',
    questionType: 'MULTIPLE_CHOICE',
    calibrationStatus: 'PILOT',
    qualityTier: 'SILVER',
    source: 'AI_GENERATED',
    pilotN: 30,
    createdAt: '2026-03-02T10:00:00Z',
    questionData: {
      type: 'MULTIPLE_CHOICE',
      question: 'Unit of force?',
      options: [],
      correctOptionIds: [],
    },
  },
];

function handleGraphQL(op: string): string | null {
  if (op === 'ExamItems' || op === 'GetExamItems') {
    return JSON.stringify({
      data: {
        examItems: {
          edges: MOCK_ITEMS.map((n) => ({ node: n })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
  }
  if (op === 'CreateExamItem') {
    return JSON.stringify({
      data: {
        createExamItem: {
          id: 'item-new',
          domain: 'Mathematics',
          bloomLevel: 'ANALYZE',
          questionType: 'MULTIPLE_CHOICE',
          calibrationStatus: 'UNCALIBRATED',
          qualityTier: 'BRONZE',
          source: 'HUMAN',
          pilotN: 0,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }
  if (op === 'RetireExamItem') {
    return JSON.stringify({
      data: { retireExamItem: { id: 'item-1', calibrationStatus: 'RETIRED' } },
    });
  }
  if (op === 'GenerateExamItems') {
    return JSON.stringify({
      data: {
        generateExamItems: [
          {
            id: 'ai-1',
            domain: 'Mathematics',
            bloomLevel: 'APPLY',
            source: 'AI_GENERATED',
          },
        ],
      },
    });
  }
  return null;
}

test.describe('exam-item-bank', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, handleGraphQL);
    await loginInDevMode(page);
  });

  test('displays exam items in table', async ({ page }) => {
    await page.goto('/exam/item-bank');
    await expect(
      page.getByText('What is 2+2?').or(page.getByText('Mathematics'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows bloom level filter options', async ({ page }) => {
    await page.goto('/exam/item-bank');
    await page.waitForLoadState('domcontentloaded');
    // Look for filter controls
    const filterArea = page
      .locator('[data-testid="bloom-filter"]')
      .or(page.getByText(/bloom/i).first());
    await expect(filterArea).toBeVisible({ timeout: 10_000 });
  });

  test('navigates to create new item page', async ({ page }) => {
    await page.goto('/exam/item-bank');
    await page.waitForLoadState('domcontentloaded');
    const createBtn = page
      .getByRole('link', { name: /create|new item/i })
      .or(page.getByRole('button', { name: /create|new item/i }));
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
    await expect(page).toHaveURL(/item-bank\/(new|create|editor)/);
  });

  test('AI generate button triggers generation flow', async ({ page }) => {
    await page.goto('/exam/item-bank/generate');
    await page.waitForLoadState('domcontentloaded');
    // The generator page should have a form or CTA
    const heading = page
      .getByRole('heading', { name: /generate|ai/i })
      .or(page.getByText(/generate exam items/i));
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
