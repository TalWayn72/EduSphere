import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { TEST_USERS } from './env';
test.use({ reducedMotion: 'reduce' });

/**
 * Visual Anchoring — Instructor Flow E2E Tests (Part 2)
 *
 * Covers: anchor deletion, "Preview as Student" mode toggle.
 * All GraphQL calls are intercepted via page.route() — no live backend required.
 */

// ─── Shared mock data ──────────────────────────────────────────────────────

const MOCK_ANCHOR_1 = {
  id: 'anchor-instr-1',
  mediaAssetId: 'media-1',
  anchorText: 'Introduction to Knowledge Graphs',
  pageNumber: 1,
  posX: 0.05,
  posY: 0.1,
  posW: 0.9,
  posH: 0.04,
  documentOrder: 0,
  isBroken: false,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  visualAssetId: 'visual-1',
  visualAsset: {
    id: 'visual-1',
    storageUrl: 'https://placehold.co/400x300/6366f1/ffffff?text=Diagram+1',
    webpUrl: null,
    mimeType: 'image/png',
    filename: 'knowledge-graph-diagram.png',
    scanStatus: 'CLEAN',
    metadata: { width: 400, height: 300, altText: 'Knowledge graph diagram' },
  },
};

const MOCK_ANCHOR_2 = {
  id: 'anchor-instr-2',
  mediaAssetId: 'media-1',
  anchorText: 'Core graph traversal algorithm',
  pageNumber: 2,
  posX: 0.05,
  posY: 0.4,
  posW: 0.9,
  posH: 0.04,
  documentOrder: 1,
  isBroken: false,
  createdAt: '2026-01-15T11:00:00Z',
  updatedAt: '2026-01-15T11:00:00Z',
  visualAssetId: 'visual-2',
  visualAsset: {
    id: 'visual-2',
    storageUrl: 'https://placehold.co/400x300/6366f1/ffffff?text=Diagram+2',
    webpUrl: null,
    mimeType: 'image/png',
    filename: 'traversal-algorithm.png',
    scanStatus: 'CLEAN',
    metadata: {
      width: 400,
      height: 300,
      altText: 'Traversal algorithm illustration',
    },
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Visual Anchoring — Instructor Flow (Part 2)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.instructor);
  });

  // ── Test 4: Delete anchor ──────────────────────────────────────────────

  test('instructor can delete anchor and sidebar updates', async ({ page }) => {
    let anchorsInStore = [MOCK_ANCHOR_1, MOCK_ANCHOR_2];

    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as {
        operationName?: string;
      } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: { data: { getVisualAnchors: anchorsInStore } },
        });
      } else if (body?.operationName === 'DeleteVisualAnchor') {
        anchorsInStore = anchorsInStore.slice(1);
        await route.fulfill({
          json: { data: { deleteVisualAnchor: { id: MOCK_ANCHOR_1.id } } },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const anchorPanel = page.locator('[data-testid="instructor-anchor-panel"]');
    await expect(anchorPanel).toBeVisible({ timeout: 10_000 });

    await expect(anchorPanel).toContainText(MOCK_ANCHOR_1.anchorText);

    const firstDeleteBtn = page
      .locator('[data-testid="anchor-delete-btn"]')
      .first();
    await expect(firstDeleteBtn).toBeVisible({ timeout: 8_000 });
    await firstDeleteBtn.click();

    const confirmBtn = page.locator(
      '[data-testid="confirm-delete-btn"], [data-testid="delete-confirm-btn"]'
    );
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(anchorPanel).not.toContainText(MOCK_ANCHOR_1.anchorText, {
      timeout: 8_000,
    });

    await expect(page).toHaveScreenshot('instructor-anchor-deleted.png', {
      maxDiffPixels: 100,
    });
  });

  // ── Test 5: Preview as Student mode ───────────────────────────────────

  test('Preview as Student mode shows VisualSidebar without editor controls', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as {
        operationName?: string;
      } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: { data: { getVisualAnchors: [MOCK_ANCHOR_1] } },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const anchorPanel = page.locator('[data-testid="instructor-anchor-panel"]');
    await expect(anchorPanel).toBeVisible({ timeout: 10_000 });

    const previewToggle = page.locator(
      '[data-testid="preview-as-student-toggle"], button:has-text("Preview as Student")'
    );
    await expect(previewToggle).toBeVisible({ timeout: 8_000 });
    await previewToggle.click();

    await expect(anchorPanel).not.toBeVisible({ timeout: 8_000 });

    const visualSidebar = page.locator('[data-testid="visual-sidebar"]');
    await expect(visualSidebar).toBeVisible({ timeout: 8_000 });

    await expect(
      page.locator('[data-testid="anchor-editor"]')
    ).not.toBeVisible();
    await expect(
      page.locator('[data-testid="create-anchor-btn"]')
    ).not.toBeVisible();

    await expect(page).toHaveScreenshot('instructor-preview-student-mode.png', {
      maxDiffPixels: 100,
    });
  });
});
