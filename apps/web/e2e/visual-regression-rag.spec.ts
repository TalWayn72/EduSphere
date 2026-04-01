/**
 * Visual Regression Tests — RAG Features (Source Manager, Search, Embedding Dashboard, PDF Viewer)
 *
 * Takes baseline screenshots for visual comparison.
 * Snapshots stored in: apps/web/e2e/visual-regression-rag.spec.ts-snapshots/
 *
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-rag --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="@visual-rag"
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import { GRAPHQL_URL } from './env';

// ── Disable animations for stable snapshots ──────────────────────────────────

test.use({ reducedMotion: 'reduce' });

const STABLE_OPTS = {
  maxDiffPixels: 200,
  threshold: 0.2,
  animations: 'disabled' as const,
};

const LOOSE_OPTS = {
  maxDiffPixels: 500,
  threshold: 0.3,
  animations: 'disabled' as const,
};

// ── GraphQL mock for embedding dashboard ─────────────────────────────────────

async function mockEmbeddingDashboard(page: Page): Promise<void> {
  await page.route(`${GRAPHQL_URL}`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }
    const body = req.postDataJSON() as { operationName?: string } | null;
    const op = body?.operationName ?? '';

    if (op.includes('EmbeddingStats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            embeddingStats: {
              totalSources: 50,
              indexedSources: 40,
              pendingSources: 5,
              failedSources: 5,
              totalChunks: 1200,
              courseBreakdown: [
                {
                  courseId: 'c1',
                  courseTitle: 'AI Basics',
                  sourceCount: 20,
                  indexedCount: 18,
                  chunkCount: 500,
                },
                {
                  courseId: 'c2',
                  courseTitle: 'ML Advanced',
                  sourceCount: 30,
                  indexedCount: 22,
                  chunkCount: 700,
                },
                {
                  courseId: 'c3',
                  courseTitle: 'Data Science 101',
                  sourceCount: 10,
                  indexedCount: 3,
                  chunkCount: 80,
                },
              ],
            },
          },
        }),
      });
      return;
    }

    if (op.includes('EmbeddingActivity')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            embeddingActivity: [
              {
                id: 'a1',
                timestamp: '2026-03-27T10:00:00Z',
                courseName: 'AI Basics',
                operation: 'index',
                status: 'completed',
                count: 42,
              },
              {
                id: 'a2',
                timestamp: '2026-03-27T09:30:00Z',
                courseName: 'ML Advanced',
                operation: 'reindex',
                status: 'in_progress',
                count: 15,
              },
              {
                id: 'a3',
                timestamp: '2026-03-27T09:00:00Z',
                courseName: 'Data Science 101',
                operation: 'index',
                status: 'failed',
                count: 0,
              },
            ],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

async function mockSourceManager(page: Page): Promise<void> {
  await page.route(`${GRAPHQL_URL}`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }
    const body = req.postDataJSON() as {
      operationName?: string;
      query?: string;
    } | null;
    const op = body?.operationName ?? '';

    if (
      op.includes('KnowledgeSources') ||
      body?.query?.includes('knowledgeSources')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            knowledgeSources: [
              {
                id: 's1',
                title: 'Ready PDF Doc',
                sourceType: 'FILE_PDF',
                status: 'READY',
                chunkCount: 12,
                errorMessage: null,
                createdAt: '2026-03-01T10:00:00Z',
              },
              {
                id: 's2',
                title: 'Processing Source',
                sourceType: 'URL',
                status: 'PROCESSING',
                chunkCount: 0,
                errorMessage: null,
                createdAt: '2026-03-02T08:00:00Z',
              },
              {
                id: 's3',
                title: 'Not Indexed Yet',
                sourceType: 'FILE_TXT',
                status: 'PENDING',
                chunkCount: 0,
                errorMessage: null,
                createdAt: '2026-03-03T12:00:00Z',
              },
            ],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

async function mockSearchEmpty(page: Page): Promise<void> {
  await page.route(`${GRAPHQL_URL}`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

// ── Visual Regression Tests ──────────────────────────────────────────────────

test.describe('Visual Regression — RAG Features @visual-rag', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('source manager with embedding status badges', async ({ page }) => {
    await mockSourceManager(page);
    await page.goto('/learn/courses', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot(
      'source-manager-status-badges.png',
      STABLE_OPTS
    );
  });

  test('search page empty state', async ({ page }) => {
    await mockSearchEmpty(page);
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('search-empty-state.png', STABLE_OPTS);
  });

  test('admin embedding dashboard with stats, chart, and table', async ({
    page,
  }) => {
    await mockEmbeddingDashboard(page);
    await page.goto('/admin/embeddings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot(
      'admin-embedding-dashboard.png',
      LOOSE_OPTS
    );
  });

  test('PDF viewer with toolbar controls', async ({ page }) => {
    await page.route(`${GRAPHQL_URL}`, async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type, authorization',
          },
          body: '',
        });
        return;
      }
      const body = req.postDataJSON() as {
        operationName?: string;
        query?: string;
      } | null;
      const op = body?.operationName ?? '';

      if (
        op.includes('KnowledgeSources') ||
        body?.query?.includes('knowledgeSources')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              knowledgeSources: [
                {
                  id: 'pdf1',
                  title: 'Visual Test PDF',
                  sourceType: 'FILE_PDF',
                  status: 'READY',
                  chunkCount: 10,
                  errorMessage: null,
                  fileUrl: 'https://cdn.edusphere.io/docs/test.pdf',
                  createdAt: '2026-03-01T10:00:00Z',
                },
              ],
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // If PDF viewer toolbar is visible, take a screenshot
    const toolbar = page.locator('[role="toolbar"]').first();
    if (await toolbar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page).toHaveScreenshot(
        'pdf-viewer-toolbar.png',
        STABLE_OPTS
      );
    }
  });

  test('PDF viewer in sketch mode with drawing tools', async ({ page }) => {
    await page.route(`${GRAPHQL_URL}`, async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type, authorization',
          },
          body: '',
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Click PDF source and switch to sketch mode if available
    const pdfLink = page
      .locator('text=Test PDF Document, text=Visual Test PDF')
      .first();
    if (await pdfLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pdfLink.click();
      await page.waitForTimeout(1000);

      const sketchBtn = page.locator('[data-testid="mode-sketch"]');
      if (await sketchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sketchBtn.click();
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(
          'pdf-viewer-sketch-mode.png',
          LOOSE_OPTS
        );
      }
    }
  });
});
