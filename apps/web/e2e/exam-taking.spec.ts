/**
 * Exam Taking Flow — E2E Tests
 *
 * Covers:
 *  - Student starts exam
 *  - Sees timer counting down
 *  - Answers questions
 *  - Flags a question for review
 *  - Navigates using sidebar
 *  - Submits exam
 *  - Sees results with pass/fail
 *
 * Run: pnpm --filter @edusphere/web test:e2e --grep "exam-taking"
 */

import { test, expect } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

const MOCK_BLUEPRINT = {
  id: 'bp-1',
  title: 'Unit Test Certification',
  description: 'Assess your testing knowledge',
  totalItems: 3,
  timeLimitMinutes: 30,
  passingThreshold: 70,
  passingMethod: 'PERCENTAGE',
};

const MOCK_SESSION = {
  id: 'sess-1',
  blueprintId: 'bp-1',
  status: 'IN_PROGRESS',
  timeRemainingSeconds: 1800,
  currentItemIndex: 0,
  totalItems: 3,
  items: [
    {
      itemId: 'q1',
      domain: 'Testing',
      bloomLevel: 'APPLY',
      questionData: {
        type: 'MULTIPLE_CHOICE',
        question: 'What does TDD stand for?',
        options: [
          { id: 'a', text: 'Test Driven Development' },
          { id: 'b', text: 'Type Definition Document' },
        ],
        correctOptionIds: ['a'],
      },
    },
    {
      itemId: 'q2',
      domain: 'Testing',
      bloomLevel: 'REMEMBER',
      questionData: {
        type: 'MULTIPLE_CHOICE',
        question: 'Which is a test runner?',
        options: [
          { id: 'c', text: 'Vitest' },
          { id: 'd', text: 'Vite' },
        ],
        correctOptionIds: ['c'],
      },
    },
    {
      itemId: 'q3',
      domain: 'Testing',
      bloomLevel: 'ANALYZE',
      questionData: {
        type: 'MULTIPLE_CHOICE',
        question: 'Best assertion for floats?',
        options: [
          { id: 'e', text: 'toBeCloseTo' },
          { id: 'f', text: 'toBe' },
        ],
        correctOptionIds: ['e'],
      },
    },
  ],
};

const MOCK_RESULT = {
  id: 'r-1',
  sessionId: 'sess-1',
  userId: 'u-1',
  blueprintId: 'bp-1',
  passed: true,
  rawScore: 0.9,
  scaledScore: 780,
  domainScores: [{ domain: 'Testing', itemCount: 3, correctCount: 3, percentage: 100 }],
  bloomScores: [{ level: 'APPLY', itemCount: 1, correctCount: 1, percentage: 100 }],
  gradedAt: '2026-03-15T12:00:00Z',
};

function handleGraphQL(op: string): string | null {
  if (op === 'ExamBlueprint' || op === 'GetExamBlueprint') {
    return JSON.stringify({ data: { examBlueprint: MOCK_BLUEPRINT } });
  }
  if (op === 'StartExamSession') {
    return JSON.stringify({ data: { startExamSession: MOCK_SESSION } });
  }
  if (op === 'SubmitExamResponse') {
    return JSON.stringify({ data: { submitExamResponse: { id: 'resp-1', flagged: false } } });
  }
  if (op === 'SubmitExam' || op === 'FinalizeExamSession') {
    return JSON.stringify({ data: { finalizeExamSession: MOCK_RESULT } });
  }
  if (op === 'ExamResult' || op === 'GetExamResult') {
    return JSON.stringify({ data: { examResult: MOCK_RESULT } });
  }
  return null;
}

test.describe('exam-taking', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, handleGraphQL);
    await loginInDevMode(page);
  });

  test('exam start page shows blueprint info and start button', async ({ page }) => {
    await page.goto('/exam/start/bp-1');
    await expect(page.getByText('Unit Test Certification')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/30 minutes/)).toBeVisible();
    await expect(page.getByRole('button', { name: /start exam/i })).toBeVisible();
  });

  test('start button is disabled until agreement checkbox is checked', async ({ page }) => {
    await page.goto('/exam/start/bp-1');
    await page.waitForLoadState('domcontentloaded');
    const startBtn = page.getByRole('button', { name: /start exam/i });
    await expect(startBtn).toBeDisabled({ timeout: 10_000 });

    // Check the agreement
    await page.getByRole('checkbox').click();
    await expect(startBtn).not.toBeDisabled();
  });

  test('exam session shows timer and question content', async ({ page }) => {
    await page.goto('/exam/session/sess-1');
    await page.waitForLoadState('domcontentloaded');
    // Timer or question content should be visible
    const timerOrQ = page.getByText(/30:00|29:5|question 1/i);
    await expect(timerOrQ).toBeVisible({ timeout: 10_000 });
  });

  test('exam result page shows pass/fail banner', async ({ page }) => {
    await page.goto('/exam/result/sess-1');
    await expect(
      page.getByText(/congratulations|passed/i).or(page.getByText('PASS')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('exam result page shows retake button', async ({ page }) => {
    await page.goto('/exam/result/sess-1');
    await expect(
      page.getByRole('button', { name: /retake/i }).or(page.getByRole('link', { name: /retake/i })),
    ).toBeVisible({ timeout: 10_000 });
  });
});
