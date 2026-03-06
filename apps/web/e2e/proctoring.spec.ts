import { test, expect } from '@playwright/test';

/**
 * Phase 33 — Remote Proctoring E2E tests (PRD §7.2 G-4).
 *
 * Tests the ProctoringOverlay integration in AssessmentForm.
 * Mocks GraphQL mutations to simulate proctoring lifecycle.
 */

const ASSESSMENT_URL = '/courses/course-1/lessons/lesson-1/assessment';

const MOCK_START_RESPONSE = {
  data: {
    startProctoringSession: {
      id: 'sess-e2e-1',
      status: 'ACTIVE',
      startedAt: '2026-01-01T10:00:00Z',
      flagCount: 0,
      __typename: 'ProctoringSession',
    },
  },
};

const MOCK_FLAG_RESPONSE = {
  data: {
    flagProctoringEvent: {
      id: 'sess-e2e-1',
      status: 'FLAGGED',
      flagCount: 1,
      flags: [{ type: 'TAB_SWITCH', timestamp: '2026-01-01T10:01:00Z', detail: 'Tab hidden', __typename: 'ProctoringFlag' }],
      __typename: 'ProctoringSession',
    },
  },
};

const MOCK_END_RESPONSE = {
  data: {
    endProctoringSession: {
      id: 'sess-e2e-1',
      status: 'COMPLETED',
      endedAt: '2026-01-01T11:00:00Z',
      flagCount: 1,
      flags: [{ type: 'TAB_SWITCH', timestamp: '2026-01-01T10:01:00Z', detail: 'Tab hidden', __typename: 'ProctoringFlag' }],
      __typename: 'ProctoringSession',
    },
  },
};

function interceptGraphQL(page: import('@playwright/test').Page) {
  return page.route('**/graphql', (route) => {
    const body = route.request().postDataJSON() as { query?: string; operationName?: string };
    const op = body.operationName ?? body.query ?? '';
    if (op.includes('StartProctoringSession')) {
      return route.fulfill({ json: MOCK_START_RESPONSE });
    }
    if (op.includes('FlagProctoringEvent')) {
      return route.fulfill({ json: MOCK_FLAG_RESPONSE });
    }
    if (op.includes('EndProctoringSession')) {
      return route.fulfill({ json: MOCK_END_RESPONSE });
    }
    return route.continue();
  });
}

test.describe('Remote Proctoring — Phase 33', () => {
  test('proctoring start button visible when proctoring enabled', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    // The start button should be visible in the proctoring overlay
    await expect(
      page.locator('[data-testid="proctoring-start-btn"]')
    ).toBeVisible();
  });

  test('clicking start button shows proctoring-active-badge', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="proctoring-start-btn"]').click();

    await expect(
      page.locator('[data-testid="proctoring-active-badge"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="proctoring-active-badge"]')
    ).toContainText('Proctoring Active');
  });

  test('stop button visible after session starts', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="proctoring-start-btn"]').click();

    await expect(
      page.locator('[data-testid="proctoring-stop-btn"]')
    ).toBeVisible();
  });

  test('flag count badge appears after tab-switch event', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="proctoring-start-btn"]').click();

    // Simulate tab switch by dispatching visibilitychange with document.hidden = true
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(
      page.locator('[data-testid="proctoring-flag-count"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="proctoring-flag-count"]')
    ).toContainText('flag');
  });

  test('stop button ends session and hides active badge', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="proctoring-start-btn"]').click();
    await expect(page.locator('[data-testid="proctoring-active-badge"]')).toBeVisible();

    await page.locator('[data-testid="proctoring-stop-btn"]').click();

    await expect(
      page.locator('[data-testid="proctoring-active-badge"]')
    ).not.toBeVisible();
  });

  test('raw technical strings are NOT shown to users', async ({ page }) => {
    await page.route('**/graphql', (route) => route.fulfill({ json: { errors: [{ message: 'Internal server error' }] } }));

    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[Network Error]');
    expect(bodyText).not.toContain('GraphQL error');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('Cannot read properties');
  });

  // ── Visual regression ─────────────────────────────────────────────────────

  test('proctoring overlay — inactive state visual regression', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('proctoring-inactive.png');
  });

  test('proctoring overlay — active state visual regression', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="proctoring-start-btn"]').click();
    await expect(page.locator('[data-testid="proctoring-active-badge"]')).toBeVisible();

    await expect(page).toHaveScreenshot('proctoring-active.png');
  });

  test('proctoring overlay — flagged state visual regression', async ({ page }) => {
    await interceptGraphQL(page);
    await page.goto(ASSESSMENT_URL);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="proctoring-start-btn"]').click();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for flag count to appear
    await page.locator('[data-testid="proctoring-flag-count"]').waitFor({ timeout: 5000 }).catch(() => {});

    await expect(page).toHaveScreenshot('proctoring-flagged.png');
  });
});
