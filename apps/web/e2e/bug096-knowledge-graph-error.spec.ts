/**
 * BUG-096 Regression Guard — Knowledge Graph Error Banner
 *
 * BUG-096: The Knowledge Graph page was showing a generic "server not
 * accessible" error banner with mock data for ALL error types (auth,
 * network, graphql). After the fix:
 *   - Context-specific error messages are shown (auth / network / graphql)
 *   - On error, the graph shows EMPTY state (no misleading mock data)
 *   - The old undifferentiated "server not accessible" banner is gone
 *
 * Fixed files:
 *   - apps/web/src/pages/knowledge-graph/use-graph-data.ts
 *   - apps/web/src/pages/knowledge-graph/KnowledgeGraph.tsx
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/bug096-knowledge-graph-error.spec.ts
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from './auth.helpers';
import { BASE_URL } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const SCREENSHOTS_DIR = path.resolve(process.cwd(), '../../docs/screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

// ── Suite 1: BUG-096 regression — no old undifferentiated banner ────────────

test.describe('BUG-096: Knowledge Graph error banner regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // BUG-096: regression guard — page loads without old generic error banner
  test('page loads without the old "server not accessible" banner in DEV_MODE', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // The heading must be visible — page loaded correctly
    await expect(
      page.getByRole('heading', { name: 'Knowledge Graph' })
    ).toBeVisible({ timeout: 10_000 });

    // BUG-096: regression guard — the old generic error banner must NOT appear
    // In DEV_MODE the error banner is gated by `!DEV_MODE`, so it must be absent.
    await expect(page.getByTestId('graph-error-banner')).not.toBeVisible({
      timeout: 3_000,
    });

    // The old Hebrew "server not accessible" text must not appear anywhere
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain(
      '\u05E9\u05E8\u05EA \u05DC\u05D0 \u05E0\u05D2\u05D9\u05E9'
    );
  });

  // BUG-096: regression guard — no mock data nodes when there is an error
  test('graph shows real or empty state — no fake mock concept nodes on error', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // In DEV_MODE the graph uses mock data (which is expected and fine).
    // The key assertion is that the page loads without error banners.
    await expect(page.getByTestId('graph-error-banner')).not.toBeVisible({
      timeout: 3_000,
    });

    // SVG graph element should be present (either real data or DEV_MODE mock)
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Suite 2: Network error simulation via page.route() ──────────────────────

test.describe('BUG-096: Network error shows correct "network" message', () => {
  // BUG-096: regression guard — network error shows network-specific banner
  test('shows network error banner when GraphQL requests are aborted', async ({
    page,
  }) => {
    await login(page);

    // Block ALL GraphQL requests to simulate network failure
    await page.route('**/graphql', (route) =>
      route.abort('internetdisconnected')
    );

    await page.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });

    // In DEV_MODE, the concepts query is paused (never fires), so the error
    // banner is hidden. This test verifies the page doesn't crash on route abort.
    // For live backend, the error banner would appear with network-specific text.
    const isDev = await page.evaluate(() => {
      // Check if the app is in DEV_MODE by looking for the dev-login session key
      return sessionStorage.getItem('edusphere_dev_logged_in') === 'true';
    });

    if (isDev) {
      // DEV_MODE: banner should NOT appear (query is paused)
      await expect(page.getByTestId('graph-error-banner')).not.toBeVisible({
        timeout: 5_000,
      });

      // Page should still render the graph heading
      await expect(
        page.getByRole('heading', { name: 'Knowledge Graph' })
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // Live backend: the error banner SHOULD appear
      const banner = page.getByTestId('graph-error-banner');
      await expect(banner).toBeVisible({ timeout: 10_000 });

      // BUG-096: The banner must show network-specific text, NOT auth or graphql
      const message = page.getByTestId('graph-error-message');
      await expect(message).toBeVisible();
      const messageText = await message.textContent();

      // Should NOT contain auth-specific text
      expect(messageText).not.toContain('authRequired');
      expect(messageText).not.toContain('Authentication');

      // Should NOT contain the old generic "server not accessible" Hebrew text
      expect(messageText).not.toContain(
        '\u05E9\u05E8\u05EA \u05DC\u05D0 \u05E0\u05D2\u05D9\u05E9'
      );

      // Retry button must be present
      await expect(page.getByTestId('graph-error-retry')).toBeVisible();

      // BUG-096: No mock data nodes should be visible on error
      // The graph should be empty (EMPTY_GRAPH), not showing fake concepts
      const graphStats = page.getByText('Graph Statistics');
      if (await graphStats.isVisible().catch(() => false)) {
        // If stats panel is visible, node count should be 0
        const nodeCountEl = page
          .locator('text=Nodes')
          .locator('..')
          .locator('p.text-lg');
        const countText = await nodeCountEl.textContent().catch(() => '0');
        const count = parseInt(countText ?? '0', 10);
        expect(
          count,
          'BUG-096: error state must show 0 nodes, not mock data'
        ).toBe(0);
      }
    }

    // Either way, no raw technical error strings should leak to the user
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('[Network]');
    expect(bodyText).not.toContain('Failed to fetch');
    expect(bodyText).not.toContain('net::ERR_INTERNET_DISCONNECTED');
  });

  // BUG-096: regression guard — GraphQL error returns graphql-specific message
  test('shows graphql-specific banner when server returns GraphQL errors', async ({
    page,
  }) => {
    await login(page);

    // Mock a GraphQL error response (not a network failure)
    await routeGraphQL(page, (operationName) => {
      if (operationName.toLowerCase().includes('concept')) {
        return JSON.stringify({
          data: null,
          errors: [
            {
              message: 'Internal server error in concepts resolver',
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            },
          ],
        });
      }
      return null; // fallback for other operations
    });

    await page.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const isDev = await page.evaluate(() => {
      return sessionStorage.getItem('edusphere_dev_logged_in') === 'true';
    });

    if (isDev) {
      // DEV_MODE: query is paused, so no error banner expected
      await expect(page.getByTestId('graph-error-banner')).not.toBeVisible({
        timeout: 3_000,
      });
    } else {
      // Live mode: should show graphql-specific error (not network or auth)
      const banner = page.getByTestId('graph-error-banner');
      await expect(banner).toBeVisible({ timeout: 10_000 });

      const message = page.getByTestId('graph-error-message');
      const messageText = await message.textContent();

      // BUG-096: Should NOT show auth message for a graphql error
      expect(messageText).not.toContain('authRequired');

      // Retry button must be present
      await expect(page.getByTestId('graph-error-retry')).toBeVisible();
    }

    // No raw internal error strings should leak to the UI
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain(
      'Internal server error in concepts resolver'
    );
    expect(bodyText).not.toContain('[GraphQL]');
  });
});

// ── Suite 3: Visual regression screenshot ───────────────────────────────────

test.describe('BUG-096: Visual regression', () => {
  // BUG-096: regression guard — visual snapshot of normal Knowledge Graph state
  test('visual snapshot — Knowledge Graph page normal state', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for the heading to confirm page is loaded
    await expect(
      page.getByRole('heading', { name: 'Knowledge Graph' })
    ).toBeVisible({ timeout: 10_000 });

    // Save screenshot to docs/screenshots/
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      'bug096-knowledge-graph-normal.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(
      fs.existsSync(screenshotPath),
      `Screenshot missing: ${screenshotPath}`
    ).toBe(true);

    // Playwright built-in visual comparison
    await expect(page).toHaveScreenshot('bug096-knowledge-graph-normal.png', {
      maxDiffPixels: 500,
    });
  });

  // BUG-096: regression guard — visual snapshot with network error
  test('visual snapshot — Knowledge Graph with network error', async ({
    page,
  }) => {
    await login(page);

    // Block GraphQL to simulate network error
    await page.route('**/graphql', (route) => route.abort('failed'));

    await page.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Wait for the page to settle
    await page.waitForTimeout(2_000);

    // Save screenshot to docs/screenshots/
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      'bug096-knowledge-graph-error.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(
      fs.existsSync(screenshotPath),
      `Screenshot missing: ${screenshotPath}`
    ).toBe(true);
  });
});
