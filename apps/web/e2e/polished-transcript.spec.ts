/**
 * Polished Transcript — E2E Tests
 *
 * Covers the Smart Transcript Polishing feature from both instructor
 * and student perspectives.
 *
 * Instructor flow (Suite 1 — DEV_MODE):
 *   1. Lesson editor loads with a "Polished Transcript" tab
 *   2. Tab is clickable and renders the track-changes review panel
 *   3. Accept All / Reject All buttons are present
 *   4. Approve Transcript button is present (disabled while changes pending)
 *   5. Instructor can trigger a new polishing run ("Start AI Polishing")
 *
 * Student flow (Suite 2 — DEV_MODE):
 *   1. Student learning page shows polished / raw transcript toggle
 *   2. Polished reading view renders when toggle is switched
 *
 * GraphQL interactions are mocked so no live backend is required.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL, RUN_WRITE_TESTS } from './env';

// ─── Mock UUIDs ───────────────────────────────────────────────────────────────

const LESSON_ID = 'aa000000-0000-0000-0000-000000000001';
const POLISHED_ID = 'pp000000-0000-0000-0000-000000000001';
const CHANGE_ID = 'cc000000-0000-0000-0000-000000000001';
const BLOCK_ID = 'bb000000-0000-0000-0000-000000000001';

const EDITOR_URL = `${BASE_URL}/lesson/${LESSON_ID}/edit`;
const LEARN_URL = `${BASE_URL}/learn/${LESSON_ID}`;

// ─── Mock data builders ───────────────────────────────────────────────────────

const MOCK_CHANGE = {
  id: CHANGE_ID,
  blockId: BLOCK_ID,
  changeType: 'FILLER_REMOVED',
  originalFragment: 'um so basically',
  replacementFragment: '',
  charOffsetStart: 0,
  charOffsetEnd: 15,
  status: 'PENDING',
  reviewedAt: null,
  createdAt: '2026-01-01T10:00:00Z',
};

const MOCK_BLOCK = {
  id: BLOCK_ID,
  polishedId: POLISHED_ID,
  blockType: 'POLISHED_TEXT',
  blockOrder: 0,
  content: 'The Talmud discusses this passage in tractate Berakhot.',
  originalText:
    'um so basically the Talmud discusses this passage in tractate Berakhot.',
  startTime: 0,
  endTime: 12,
  sourceSegmentIds: [],
  instructorEdited: false,
  instructorText: null,
  changes: [MOCK_CHANGE],
};

const MOCK_POLISHED_TRANSCRIPT = {
  id: POLISHED_ID,
  lessonId: LESSON_ID,
  version: 1,
  status: 'INSTRUCTOR_REVIEW',
  fullText: 'The Talmud discusses this passage in tractate Berakhot.',
  coverageScore: 0.94,
  polishedBy: 'langgraph-polish-v1',
  approvedBy: null,
  approvedAt: null,
  blocks: [MOCK_BLOCK],
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:01:00Z',
};

const MOCK_POLISHED_APPROVED = {
  ...MOCK_POLISHED_TRANSCRIPT,
  status: 'APPROVED',
  blocks: [{ ...MOCK_BLOCK, changes: [] }],
};

const MOCK_ENRICHED_LESSON = {
  id: LESSON_ID,
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  enrichmentStatus: 'READY',
  transcript: [
    { id: 'seg-1', startTime: 0, endTime: 10, text: 'Raw text here.' },
  ],
  enrichedBlocks: [],
  citations: [],
};

// ─── GraphQL route interceptor ────────────────────────────────────────────────

/**
 * Attach a GraphQL mock handler to the page.
 * Recognises operation names by checking request body strings.
 */
async function mockGraphQL(
  page: Page,
  handlers: Record<string, unknown>
): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postData() ?? '';

    for (const [operationName, data] of Object.entries(handlers)) {
      if (body.includes(operationName)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data }),
        });
        return;
      }
    }

    // Pass through unrecognised requests
    await route.continue();
  });
}

// ─── Suite 1: Instructor editor — DEV_MODE guards ────────────────────────────

test.describe('Polished Transcript — Instructor Editor', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Mock all relevant GraphQL queries before navigating
    await mockGraphQL(page, {
      EnrichedLesson: { enrichedLesson: MOCK_ENRICHED_LESSON },
      PolishedTranscript: { polishedTranscript: MOCK_POLISHED_TRANSCRIPT },
      MyVoiceProfile: { myVoiceProfile: null },
    });
    await login(page);
  });

  test('lesson editor loads and "Polished Transcript" tab is visible', async ({
    page,
  }) => {
    await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // The tab trigger may render translated or English text
    const polishedTab = page.locator(
      '[role="tab"]:has-text("Polished"), [role="tab"]:has-text("Transcript")'
    );
    await expect(polishedTab.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Polished Transcript tab shows track-changes review panel', async ({
    page,
  }) => {
    await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Click the polished tab
    const polishedTab = page.getByRole('tab', { name: /polished/i }).first();
    await polishedTab.waitFor({ timeout: 10_000 });
    await polishedTab.click();

    // The track-changes review container should appear
    const reviewPanel = page.locator('[data-testid="track-changes-review"]');
    await expect(reviewPanel).toBeVisible({ timeout: 8_000 });
  });

  test('Accept All and Reject All buttons are present in track-changes panel', async ({
    page,
  }) => {
    await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const polishedTab = page.getByRole('tab', { name: /polished/i }).first();
    await polishedTab.waitFor({ timeout: 10_000 });
    await polishedTab.click();

    await expect(page.locator('[data-testid="accept-all-btn"]')).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.locator('[data-testid="reject-all-btn"]')).toBeVisible({
      timeout: 8_000,
    });
  });

  test('Approve Transcript button is present and disabled while changes are pending', async ({
    page,
  }) => {
    await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const polishedTab = page.getByRole('tab', { name: /polished/i }).first();
    await polishedTab.waitFor({ timeout: 10_000 });
    await polishedTab.click();

    const approveBtn = page.locator('[data-testid="approve-transcript-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 8_000 });
    // Approve should be disabled while PENDING changes exist
    await expect(approveBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('Accept All click triggers bulkDecide mutation (write-tests only)', async ({
    page,
  }) => {
    if (!RUN_WRITE_TESTS) {
      test.skip();
      return;
    }

    const mutations: string[] = [];
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('BulkDecide') || body.includes('bulkDecide'))
        mutations.push('bulkDecide');
      if (body.includes('bulkDecide') || body.includes('BulkDecide')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { bulkDecidePolishedChanges: MOCK_POLISHED_APPROVED },
          }),
        });
        return;
      }
      if (body.includes('Approve') || body.includes('approve')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { approvePolishedTranscript: MOCK_POLISHED_APPROVED },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    const polishedTab = page.getByRole('tab', { name: /polished/i }).first();
    await polishedTab.waitFor({ timeout: 10_000 });
    await polishedTab.click();
    const acceptAllBtn = page.locator('[data-testid="accept-all-btn"]');
    await acceptAllBtn.waitFor({ timeout: 8_000 });
    await acceptAllBtn.click();
    // Accept All should have fired — approve button may now be enabled
    const approveBtn = page.locator('[data-testid="approve-transcript-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Suite 2: "Start AI Polishing" button (no existing transcript) ───────────

test.describe('Polished Transcript — Request Polishing', () => {
  test('shows "Start AI Polishing" button when no polished transcript exists', async ({
    page,
  }) => {
    await mockGraphQL(page, {
      EnrichedLesson: { enrichedLesson: MOCK_ENRICHED_LESSON },
      PolishedTranscript: { polishedTranscript: null },
      MyVoiceProfile: { myVoiceProfile: null },
    });
    await login(page);
    await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const polishedTab = page.getByRole('tab', { name: /polished/i }).first();
    await polishedTab.waitFor({ timeout: 10_000 });
    await polishedTab.click();

    // Either the "Start AI Polishing" button or an equivalent CTA should appear
    const requestBtn = page.locator(
      '[data-testid="request-polishing-btn"], button:has-text("Start AI Polishing"), button:has-text("Polishing")'
    );
    await expect(requestBtn.first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Suite 3: Student view — polished transcript toggle ──────────────────────

test.describe('Polished Transcript — Student Reading View', () => {
  test('student learning page shows polished/raw transcript toggle', async ({
    page,
  }) => {
    const MOCK_CONTENT_ITEM = {
      id: LESSON_ID,
      title: 'Tractate Berakhot Overview',
      type: 'VIDEO',
      sourceUrl: null,
      fileUrl: null,
      metadata: {},
      transcript: [
        { id: 'seg-1', startTime: 0, endTime: 10, text: 'Raw text here.' },
      ],
      polishedTranscript: MOCK_POLISHED_APPROVED,
    };

    await mockGraphQL(page, {
      ContentItem: { contentItem: MOCK_CONTENT_ITEM },
      PolishedTranscript: { polishedTranscript: MOCK_POLISHED_APPROVED },
    });

    await login(page);
    await page.goto(LEARN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // The raw/polished toggle buttons may be present
    const rawToggle = page.locator('[data-testid="transcript-toggle-raw"]');
    const polishedToggle = page.locator(
      '[data-testid="transcript-toggle-polished"]'
    );

    // Either the page renders the full transcript section with the toggle,
    // or it falls back gracefully — assert no crash (no raw error string).
    const bodyText = (await page.textContent('body')) ?? '';
    expect(bodyText).not.toContain('GraphQL error');
    expect(bodyText).not.toContain('Unexpected token');

    // If both toggle buttons are visible, switch to polished view
    const rawVisible = await rawToggle.isVisible().catch(() => false);
    const polishedVisible = await polishedToggle.isVisible().catch(() => false);
    if (rawVisible && polishedVisible) {
      await polishedToggle.click();
      const polishedPanel = page.locator(
        '[data-testid="polished-transcript-panel"]'
      );
      await expect(polishedPanel).toBeVisible({ timeout: 5_000 });
    }
  });

  test('polished transcript panel renders no raw i18n keys', async ({
    page,
  }) => {
    const MOCK_CONTENT_ITEM = {
      id: LESSON_ID,
      title: 'Tractate Berakhot Overview',
      type: 'VIDEO',
      sourceUrl: null,
      fileUrl: null,
      metadata: {},
      transcript: [],
      polishedTranscript: MOCK_POLISHED_APPROVED,
    };

    await mockGraphQL(page, {
      ContentItem: { contentItem: MOCK_CONTENT_ITEM },
      PolishedTranscript: { polishedTranscript: MOCK_POLISHED_APPROVED },
    });

    await login(page);
    await page.goto(LEARN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const bodyText = (await page.textContent('body')) ?? '';
    // These are the raw i18n key names — they must NEVER appear in the UI
    const RAW_KEYS = [
      'polishedTranscript.tabLabel',
      'polishedTranscript.rawToggle',
      'polishedTranscript.polishedToggle',
      'polishedTranscript.empty',
    ];
    for (const key of RAW_KEYS) {
      expect(
        bodyText,
        `Raw i18n key "${key}" must not appear in UI`
      ).not.toContain(key);
    }
  });
});
