import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { TEST_USERS } from './env';
test.use({ reducedMotion: 'reduce' });

/**
 * Visual Anchoring — Instructor Flow E2E Tests (Part 1)
 *
 * Covers: asset upload, anchor creation, anchor panel listing.
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
    metadata: { width: 400, height: 300, altText: 'Traversal algorithm illustration' },
  },
};

// Minimal valid 1x1 transparent PNG (base64)
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Visual Anchoring — Instructor Flow (Part 1)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.instructor);
  });

  // ── Test 1: Asset upload ────────────────────────────────────────────────

  test('instructor can upload a visual asset', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetPresignedUploadUrl') {
        await route.fulfill({
          json: {
            data: {
              getPresignedUploadUrl: {
                uploadUrl: 'https://minio.example.com/upload/test-asset',
                assetId: 'new-asset-id',
              },
            },
          },
        });
      } else if (body?.operationName === 'ConfirmAssetUpload') {
        await route.fulfill({
          json: {
            data: {
              confirmAssetUpload: {
                id: 'new-asset-id',
                scanStatus: 'CLEAN',
                filename: 'test-visual.png',
                storageUrl: 'https://placehold.co/200x150/6366f1/ffffff?text=Uploaded',
              },
            },
          },
        });
      } else if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({ json: { data: { getVisualAnchors: [] } } });
      } else {
        await route.continue();
      }
    });

    await page.route('https://minio.example.com/**', async (route) => {
      await route.fulfill({ status: 200, body: '' });
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const uploader = page.locator('[data-testid="asset-uploader"]');
    await expect(uploader).toBeVisible({ timeout: 10_000 });

    const fileInput = uploader.locator('input[type="file"]');
    const pngBuffer = Buffer.from(TINY_PNG_BASE64, 'base64');
    await fileInput.setInputFiles({
      name: 'test-visual.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    const successIndicator = page.locator(
      '[data-testid="upload-success"], [data-testid="scan-status-clean"]'
    );
    await expect(successIndicator).toBeVisible({ timeout: 10_000 });

    await expect(page).toHaveScreenshot('instructor-asset-upload-success.png', {
      maxDiffPixels: 100,
    });
  });

  // ── Test 2: Create anchor on text selection ────────────────────────────

  test('instructor can create a visual anchor on text selection', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'CreateVisualAnchor') {
        await route.fulfill({
          json: {
            data: {
              createVisualAnchor: {
                id: 'new-anchor-id',
                anchorText: 'Selected text',
                documentOrder: 0,
                isBroken: false,
                createdAt: new Date().toISOString(),
              },
            },
          },
        });
      } else if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({ json: { data: { getVisualAnchors: [] } } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const anchorEditor = page.locator('[data-testid="anchor-editor"]');
    await expect(anchorEditor).toBeVisible({ timeout: 10_000 });

    const docContent = page.locator('[data-testid="document-content"]').first();
    await expect(docContent).toBeVisible({ timeout: 8_000 });
    await docContent.selectText();

    const createAnchorBtn = page.locator('[data-testid="create-anchor-btn"]');
    await expect(createAnchorBtn).toBeVisible({ timeout: 8_000 });
    await createAnchorBtn.click();

    const modal = page.locator('[data-testid="anchor-creation-modal"]');
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await expect(page).toHaveScreenshot('instructor-create-anchor-modal.png', {
      maxDiffPixels: 100,
    });
  });

  // ── Test 3: InstructorAnchorPanel lists anchors ────────────────────────

  test('InstructorAnchorPanel lists anchors', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: { data: { getVisualAnchors: [MOCK_ANCHOR_1, MOCK_ANCHOR_2] } },
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
    await expect(anchorPanel).toContainText(MOCK_ANCHOR_2.anchorText);

    await expect(page).toHaveScreenshot('instructor-anchor-panel.png', {
      maxDiffPixels: 100,
    });
  });
});
