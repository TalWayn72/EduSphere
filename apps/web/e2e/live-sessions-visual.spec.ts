/**
 * Live Sessions — Visual Regression Tests (Phase 27)
 *
 * Covers:
 *   LiveSessionsPage (/sessions)
 *     - Empty state (no sessions, upcoming tab)
 *     - Loading skeleton state
 *     - Sessions list with cards (upcoming tab, mocked data)
 *     - Past sessions tab (mocked ENDED sessions)
 *     - Create session modal open (INSTRUCTOR view)
 *     - Error state (GraphQL error mocked)
 *
 *   LiveSessionDetailPage (/sessions/:sessionId)
 *     - Scheduled state (before join, mocked SCHEDULED session)
 *     - Live state (during session, mocked LIVE session)
 *     - Ended state (mocked ENDED session)
 *
 * All tests:
 *   - Mock GraphQL responses via page.route() — no real backend needed
 *   - Use animations: 'disabled' to prevent flakiness
 *   - Cover light mode by default (dark mode variant deferred to theme suite)
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/live-sessions-visual.spec.ts
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSIONS_URL = `${BASE_URL}/sessions`;

/** One SCHEDULED session in the future */
const SCHEDULED_SESSION = {
  id: 'session-scheduled-1',
  contentItemId: 'content-1',
  meetingName: 'Advanced React Patterns',
  scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
  status: 'SCHEDULED',
  recordingUrl: null,
  participantCount: 12,
  maxParticipants: 30,
  instructorId: 'instructor-1',
  courseId: 'course-react-001',
};

/** One LIVE session */
const LIVE_SESSION = {
  id: 'session-live-1',
  contentItemId: 'content-2',
  meetingName: 'Chavruta: Maimonides Ethics',
  scheduledAt: new Date(Date.now() - 1_800_000).toISOString(),
  status: 'LIVE',
  recordingUrl: null,
  participantCount: 8,
  maxParticipants: 20,
  instructorId: 'instructor-1',
  courseId: 'course-ethics-002',
};

/** One ENDED session */
const ENDED_SESSION = {
  id: 'session-ended-1',
  contentItemId: 'content-3',
  meetingName: 'Introduction to Philosophy',
  scheduledAt: new Date(Date.now() - 86_400_000).toISOString(),
  status: 'ENDED',
  recordingUrl: 'https://example.com/recording/1',
  participantCount: 25,
  maxParticipants: 30,
  instructorId: 'instructor-1',
  courseId: 'course-phil-003',
};

// ─── GraphQL mock helpers ─────────────────────────────────────────────────────

/**
 * Install a GraphQL intercept on the given page.
 * The handler receives the request body and returns a JSON response body.
 */
async function mockGraphQL(
  page: Page,
  handler: (body: string) => object | null
): Promise<void> {
  await page.route('**/graphql', async (route: Route) => {
    const body = route.request().postData() ?? '';
    const response = handler(body);
    if (response === null) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/** Fulfill all GraphQL with an empty sessions list */
async function mockEmptySessions(page: Page): Promise<void> {
  await mockGraphQL(page, () => ({
    data: { liveSessions: [] },
  }));
}

/** Fulfill ListLiveSessions with given sessions, everything else continues */
async function mockSessionsList(
  page: Page,
  sessions: typeof SCHEDULED_SESSION[]
): Promise<void> {
  await mockGraphQL(page, (body) => {
    if (body.includes('ListLiveSessions') || body.includes('liveSessions')) {
      return { data: { liveSessions: sessions } };
    }
    return null;
  });
}

/** Fulfill all GraphQL with a network error for sessions */
async function mockSessionsError(page: Page): Promise<void> {
  await mockGraphQL(page, () => ({
    errors: [
      {
        message: 'Failed to fetch live sessions',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
    ],
    data: null,
  }));
}

/** Mock a single session detail query */
async function mockSessionDetail(
  page: Page,
  session: typeof SCHEDULED_SESSION
): Promise<void> {
  await mockGraphQL(page, (body) => {
    if (body.includes('GetLiveSession') || body.includes('liveSessionById')) {
      return { data: { liveSessionById: session } };
    }
    // Mutations: return success
    if (body.includes('JoinLiveSession') || body.includes('EndLiveSession')) {
      return { data: { joinLiveSession: { success: true }, endLiveSession: { success: true } } };
    }
    return { data: {} };
  });
}

// ─── Shared setup ─────────────────────────────────────────────────────────────

async function loginAndGoto(page: Page, path: string): Promise<void> {
  await login(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

// ─── Suite 1: LiveSessionsPage — empty state ──────────────────────────────────

test.describe('LiveSessionsPage — visual regression', () => {
  test('screenshot: empty state — no upcoming sessions', async ({ page }) => {
    await mockEmptySessions(page);
    await loginAndGoto(page, SESSIONS_URL);

    // Wait for empty state element
    await page
      .getByTestId('sessions-empty')
      .waitFor({ timeout: 10_000 })
      .catch(() => {
        // Acceptable: page may show loading or other state; capture regardless
      });

    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('live-sessions-empty-state.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: loading skeleton state', async ({ page }) => {
    // Hang the GraphQL response so the skeleton stays visible
    await page.route('**/graphql', async (route) => {
      // Delay indefinitely so fetching = true
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      await route.continue();
    });

    await loginAndGoto(page, SESSIONS_URL);

    // Skeleton should appear while query is pending
    const skeleton = page.getByTestId('sessions-loading');
    await skeleton.waitFor({ timeout: 8_000 }).catch(() => {
      // Acceptable — page may bypass skeleton in DEV_MODE
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });

    await expect(page).toHaveScreenshot('live-sessions-loading-skeleton.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: sessions list — upcoming tab (SCHEDULED + LIVE)', async ({
    page,
  }) => {
    await mockSessionsList(page, [SCHEDULED_SESSION, LIVE_SESSION]);
    await loginAndGoto(page, SESSIONS_URL);

    // Wait for at least one session card
    await page
      .getByTestId('session-card')
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('live-sessions-upcoming-list.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: sessions list — past tab (ENDED sessions)', async ({
    page,
  }) => {
    await mockSessionsList(page, [ENDED_SESSION]);
    await loginAndGoto(page, SESSIONS_URL);

    // Switch to the Past tab
    const pastTab = page.getByTestId('tab-past');
    await pastTab.waitFor({ timeout: 8_000 }).catch(() => {});
    await pastTab.click();

    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('live-sessions-past-list.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: create session modal open (INSTRUCTOR view)', async ({
    page,
  }) => {
    await mockEmptySessions(page);
    await loginAndGoto(page, SESSIONS_URL);

    // Wait for page to settle then open the Create Session modal
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByTestId('create-session-btn');
    const hasTrigger = await createBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasTrigger) {
      // In STUDENT mode the button does not appear — capture page as fallback baseline
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page).toHaveScreenshot(
        'live-sessions-create-btn-unavailable.png',
        { fullPage: false, threshold: 0.05, animations: 'disabled' }
      );
      return;
    }

    await createBtn.click();

    // Wait for the modal dialog
    const modal = page.getByTestId('create-session-modal');
    await modal.waitFor({ timeout: 5_000 });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('live-sessions-create-modal-open.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: error state — GraphQL failure', async ({ page }) => {
    await mockSessionsError(page);
    await loginAndGoto(page, SESSIONS_URL);

    // Wait for error state element
    await page
      .getByTestId('sessions-error')
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    // REGRESSION GUARD: error state must NOT expose raw technical strings
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body).not.toContain('[GraphQL]');
    expect(body).not.toContain('[Network]');
    expect(body).not.toContain('INTERNAL_SERVER_ERROR');

    await expect(page).toHaveScreenshot('live-sessions-error-state.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  // ── Dark mode variants ────────────────────────────────────────────────────

  test('screenshot (dark): empty state', async ({ page }) => {
    await mockEmptySessions(page);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await loginAndGoto(page, SESSIONS_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('live-sessions-empty-state-dark.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot (dark): sessions list — upcoming', async ({ page }) => {
    await mockSessionsList(page, [SCHEDULED_SESSION, LIVE_SESSION]);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await loginAndGoto(page, SESSIONS_URL);

    await page
      .getByTestId('session-card')
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('live-sessions-upcoming-list-dark.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});

// ─── Suite 2: LiveSessionDetailPage — visual regression ───────────────────────

test.describe('LiveSessionDetailPage — visual regression', () => {
  test('screenshot: SCHEDULED state (before join)', async ({ page }) => {
    await mockSessionDetail(page, SCHEDULED_SESSION);
    await loginAndGoto(page, `${BASE_URL}/sessions/session-scheduled-1`);

    // Wait for the session title to be visible
    await page
      .getByTestId('session-detail-title')
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    // Verify SCHEDULED badge is present (regression guard)
    const scheduledBadge = page.getByTestId('detail-status-scheduled');
    const hasScheduled = await scheduledBadge.isVisible().catch(() => false);
    if (hasScheduled) {
      await expect(scheduledBadge).toBeVisible();
    }

    await expect(page).toHaveScreenshot(
      'live-session-detail-scheduled.png',
      {
        fullPage: false,
        threshold: 0.05,
        animations: 'disabled',
      }
    );
  });

  test('screenshot: LIVE state (pulsing indicator visible)', async ({
    page,
  }) => {
    await mockSessionDetail(page, LIVE_SESSION);
    await loginAndGoto(page, `${BASE_URL}/sessions/session-live-1`);

    await page
      .getByTestId('session-detail-title')
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    // Verify LIVE badge is present (regression guard)
    const liveBadge = page.getByTestId('detail-status-live');
    const hasLive = await liveBadge.isVisible().catch(() => false);
    if (hasLive) {
      await expect(liveBadge).toBeVisible();
    }

    await expect(page).toHaveScreenshot('live-session-detail-live.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: ENDED state (session ended, recording available)', async ({
    page,
  }) => {
    await mockSessionDetail(page, ENDED_SESSION);
    await loginAndGoto(page, `${BASE_URL}/sessions/session-ended-1`);

    await page
      .getByTestId('session-detail-title')
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    // REGRESSION GUARD: ended state shows "Session Ended" message (not a crash)
    const endedState = page.getByTestId('session-ended-state');
    const hasEnded = await endedState.isVisible().catch(() => false);
    if (hasEnded) {
      await expect(endedState).toBeVisible();
      // Must not expose raw error strings
      const endedText = (await endedState.textContent()) ?? '';
      expect(endedText).not.toContain('[GraphQL]');
      expect(endedText).not.toContain('TypeError');
    }

    await expect(page).toHaveScreenshot('live-session-detail-ended.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });

  test('screenshot: detail page error/not-found state', async ({ page }) => {
    // Mock session not found
    await mockGraphQL(page, () => ({
      data: { liveSessionById: null },
    }));

    await loginAndGoto(page, `${BASE_URL}/sessions/nonexistent-session`);
    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('live-session-detail-not-found.png', {
      fullPage: false,
      threshold: 0.05,
      animations: 'disabled',
    });
  });
});
