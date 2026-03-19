/**
 * Exam Security / Browser Lockdown — E2E Tests
 *
 * Covers:
 *  - Exam enters fullscreen mode (or shows lockdown status)
 *  - Violation warning shown on simulated visibility change
 *  - Lockdown status indicator visible during secure exam
 *
 * Run: pnpm --filter @edusphere/web test:e2e --grep "exam-security"
 */

import { test, expect } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

const MOCK_SESSION = {
  id: 'sess-sec',
  blueprintId: 'bp-1',
  status: 'IN_PROGRESS',
  timeRemainingSeconds: 1800,
  currentItemIndex: 0,
  totalItems: 2,
  items: [
    {
      itemId: 'q1',
      domain: 'Security',
      bloomLevel: 'APPLY',
      questionData: {
        type: 'MULTIPLE_CHOICE',
        question: 'What is XSS?',
        options: [
          { id: 'a', text: 'Cross-site scripting' },
          { id: 'b', text: 'Cross-site styling' },
        ],
        correctOptionIds: ['a'],
      },
    },
    {
      itemId: 'q2',
      domain: 'Security',
      bloomLevel: 'REMEMBER',
      questionData: {
        type: 'MULTIPLE_CHOICE',
        question: 'SQL injection uses?',
        options: [
          { id: 'c', text: 'Malicious SQL' },
          { id: 'd', text: 'Valid SQL' },
        ],
        correctOptionIds: ['c'],
      },
    },
  ],
  secureMode: true,
};

function handleGraphQL(op: string): string | null {
  if (op === 'ExamSession' || op === 'GetExamSession') {
    return JSON.stringify({ data: { examSession: MOCK_SESSION } });
  }
  if (op === 'StartExamSession') {
    return JSON.stringify({ data: { startExamSession: MOCK_SESSION } });
  }
  if (op === 'ExamBlueprint' || op === 'GetExamBlueprint') {
    return JSON.stringify({
      data: {
        examBlueprint: {
          id: 'bp-1',
          title: 'Security Exam',
          totalItems: 2,
          timeLimitMinutes: 30,
          passingThreshold: 70,
          passingMethod: 'PERCENTAGE',
          secureMode: true,
        },
      },
    });
  }
  // Intercept browser event recording
  if (op === 'RecordBrowserEvent') {
    return JSON.stringify({ data: { recordBrowserEvent: { success: true } } });
  }
  return null;
}

test.describe('exam-security', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, handleGraphQL);
    // Also intercept the REST browser-event endpoint
    await page.route('**/api/exam/browser-event', (route) =>
      route.fulfill({ status: 200, body: '{"ok":true}' }),
    );
    await loginInDevMode(page);
  });

  test('secure exam page shows lockdown status indicator', async ({ page }) => {
    await page.goto('/exam/session/sess-sec');
    await page.waitForLoadState('domcontentloaded');
    // Look for the secure mode indicator
    const lockdownIndicator = page.getByRole('status', { name: /secure mode/i })
      .or(page.getByText(/secure mode active/i));
    await expect(lockdownIndicator).toBeVisible({ timeout: 10_000 });
  });

  test('violation warning appears on simulated visibility change', async ({ page }) => {
    await page.goto('/exam/session/sess-sec');
    await page.waitForLoadState('domcontentloaded');

    // Wait for secure mode to be active
    await page.getByText(/secure mode active/i).waitFor({ timeout: 10_000 });

    // Simulate a visibility change event (tab switch)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // The violation warning dialog should appear
    const warningDialog = page.getByText(/integrity violation/i)
      .or(page.getByText(/navigated away/i))
      .or(page.getByText(/warning/i));
    await expect(warningDialog).toBeVisible({ timeout: 10_000 });
  });

  test('right-click is blocked during secure exam', async ({ page }) => {
    await page.goto('/exam/session/sess-sec');
    await page.waitForLoadState('domcontentloaded');
    await page.getByText(/secure mode active/i).waitFor({ timeout: 10_000 });

    // Attempt right-click — the contextmenu event should be prevented
    const wasDefault = await page.evaluate(() => {
      let defaultPrevented = false;
      document.addEventListener(
        'contextmenu',
        (e) => { defaultPrevented = e.defaultPrevented; },
        { once: true, capture: false },
      );
      const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.body.dispatchEvent(evt);
      return evt.defaultPrevented;
    });

    expect(wasDefault).toBe(true);
  });
});
