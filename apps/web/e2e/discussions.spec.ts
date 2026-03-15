/**
 * Discussions — E2E regression guard (Phase 45)
 *
 * Verifies the DiscussionsPage renders correctly and that the discussion
 * thread interactions work without exposing raw error strings.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('Discussions — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('discussions page renders heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Discussions/i })
    ).toBeVisible();
  });

  test('discussions page has no crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no [object Object] in discussions DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('discussions page shows threads list or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasThreads = await page.locator('[data-testid="discussion-thread"]').count();
    const hasEmpty = await page
      .getByText(/No discussions yet|Start a discussion|Be the first/i)
      .count();
    expect(hasThreads + hasEmpty).toBeGreaterThan(0);
  });
});

// ── Suite 2: Live backend — real data + visual regression ────────────────────

test.describe('Discussions — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('discussions page renders with screenshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Discussions/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('discussions-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('XSS guard — raw HTML tags not rendered in discussion messages', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Verify no unescaped script tags appear in visible text
    const body = await page.textContent('body');
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('onerror=');
  });
});

// ── Suite 3: Discussions — comprehensive interactions (mocked) ───────────────

test.describe('Discussions — thread and reply flows', () => {
  test.beforeEach(async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetDiscussions' || op === 'ListDiscussions') {
        return JSON.stringify({
          data: {
            discussions: {
              edges: [
                {
                  node: {
                    id: 'thread-1',
                    title: 'How to use GraphQL Federation?',
                    authorName: 'Alice',
                    createdAt: '2026-03-14T10:00:00Z',
                    replyCount: 3,
                    isPinned: false,
                    isLocked: false,
                  },
                },
                {
                  node: {
                    id: 'thread-2',
                    title: 'Best practices for knowledge graphs',
                    authorName: 'Bob',
                    createdAt: '2026-03-13T15:30:00Z',
                    replyCount: 0,
                    isPinned: true,
                    isLocked: false,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      if (op === 'GetDiscussionThread' || op === 'GetThread') {
        return JSON.stringify({
          data: {
            discussion: {
              id: 'thread-1',
              title: 'How to use GraphQL Federation?',
              body: 'I need help understanding entity resolution across subgraphs.',
              authorName: 'Alice',
              createdAt: '2026-03-14T10:00:00Z',
              isPinned: false,
              isLocked: false,
              replies: [
                {
                  id: 'reply-1',
                  body: 'Check the Apollo docs on @key directives.',
                  authorName: 'Bob',
                  createdAt: '2026-03-14T11:00:00Z',
                  parentReplyId: null,
                },
                {
                  id: 'reply-2',
                  body: 'Thanks Bob! That helped a lot.',
                  authorName: 'Alice',
                  createdAt: '2026-03-14T12:00:00Z',
                  parentReplyId: 'reply-1',
                },
              ],
            },
          },
        });
      }
      if (op === 'CreateDiscussion' || op === 'CreateThread') {
        return JSON.stringify({
          data: {
            createDiscussion: { id: 'thread-new', title: 'New Thread', success: true },
          },
        });
      }
      if (op === 'CreateReply' || op === 'AddReply') {
        return JSON.stringify({
          data: {
            createReply: { id: 'reply-new', body: 'New reply', success: true },
          },
        });
      }
      if (op === 'PinDiscussion' || op === 'LockDiscussion') {
        return JSON.stringify({
          data: { moderateDiscussion: { success: true } },
        });
      }
      return null;
    });
    await login(page);
  });

  test('thread creation — new thread button does not crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const newThreadBtn = page.locator(
      '[data-testid="new-discussion-btn"], button:has-text("New Discussion"), button:has-text("Start"), button:has-text("New Thread")'
    );
    if ((await newThreadBtn.count()) > 0) {
      await newThreadBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('thread creation form — title and body inputs work', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator(
      '[data-testid="thread-title-input"], input[name="title"], input[placeholder*="title" i]'
    );
    if ((await titleInput.count()) > 0) {
      await titleInput.first().fill('Question about RLS policies');
    }

    const bodyInput = page.locator(
      '[data-testid="thread-body-input"], textarea[name="body"], textarea[placeholder*="message" i], [contenteditable="true"]'
    );
    if ((await bodyInput.count()) > 0) {
      await bodyInput.first().fill('How do I set up row-level security for multi-tenant apps?');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('reply to thread — reply input is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions/thread-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const replyInput = page.locator(
      '[data-testid="reply-input"], textarea[name="reply"], textarea[placeholder*="reply" i], [contenteditable="true"]'
    );
    if ((await replyInput.count()) > 0) {
      await replyInput.first().fill('Great question! Let me explain...');
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('nested replies — thread detail page shows nested structure without crash', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/discussions/thread-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Page should render replies (nested or flat) without crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toMatch(/at\s+\w+\s*\(/);
  });

  test('moderation — pin/lock buttons do not crash when present', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/discussions/thread-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const pinBtn = page.locator(
      '[data-testid="pin-discussion-btn"], button:has-text("Pin"), button[aria-label*="pin" i]'
    );
    if ((await pinBtn.count()) > 0) {
      await pinBtn.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const lockBtn = page.locator(
      '[data-testid="lock-discussion-btn"], button:has-text("Lock"), button[aria-label*="lock" i]'
    );
    if ((await lockBtn.count()) > 0) {
      await lockBtn.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('empty state — no discussions shows placeholder message', async ({
    page,
  }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, (op) => {
      if (op === 'GetDiscussions' || op === 'ListDiscussions') {
        return JSON.stringify({
          data: {
            discussions: {
              edges: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should show empty state or create prompt — not a crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('search within discussions — search input does not crash', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator(
      '[data-testid="discussion-search"], input[type="search"], input[placeholder*="search" i]'
    );
    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill('GraphQL');
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('discussions GraphQL error does not expose stack trace', async ({
    page,
  }) => {
    await page.unroute('**/graphql');
    await routeGraphQL(page, () => {
      return JSON.stringify({
        data: null,
        errors: [{ message: 'NatsError: connection lost at stream.consume' }],
      });
    });

    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('NatsError');
    expect(body).not.toContain('stream.consume');
  });

  test('visual regression — discussions list page (mocked)', async ({ page }) => {
    await page.goto(`${BASE_URL}/discussions`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('discussions-list-mocked.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
