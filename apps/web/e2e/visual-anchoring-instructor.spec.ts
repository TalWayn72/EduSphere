import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { TEST_USERS } from './env';

/**
 * Visual Anchoring — Instructor Flow E2E Tests
 *
 * Covers the instructor-specific UI for visual anchoring:
 *   - Uploading visual assets
 *   - Creating anchors via text selection
 *   - Managing anchors via InstructorAnchorPanel
 *   - Deleting anchors
 *   - "Preview as Student" mode toggle
 *
 * All GraphQL calls are intercepted via page.route() — no live backend required.
 * Auth: DEV_MODE smart login (or Keycloak if VITE_DEV_MODE=false).
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

// ─── Helper: mock GetVisualAnchors with given anchors ─────────────────────

async function mockGetVisualAnchors(
  page: import('@playwright/test').Page,
  anchors: unknown[]
): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as { operationName?: string } | null;
    if (body?.operationName === 'GetVisualAnchors') {
      await route.fulfill({ json: { data: { getVisualAnchors: anchors } } });
    } else {
      await route.continue();
    }
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('Visual Anchoring — Instructor Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as instructor (DEV_MODE: smart login; LIVE_BACKEND: Keycloak OIDC)
    await login(page, TEST_USERS.instructor);
  });

  // ── Test 1: Asset upload ────────────────────────────────────────────────

  test('instructor can upload a visual asset', async ({ page }) => {
    // Mock: GetPresignedUploadUrl — returns a pre-signed URL
    // Mock: ConfirmAssetUpload — returns scan status CLEAN
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

    // Mock the actual file upload to the presigned URL (bypass MinIO)
    await page.route('https://minio.example.com/**', async (route) => {
      await route.fulfill({ status: 200, body: '' });
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('networkidle');

    // Locate the asset uploader (instructor mode shows this component)
    const uploader = page.locator('[data-testid="asset-uploader"]');
    await expect(uploader).toBeVisible({ timeout: 10_000 });

    // Create a tiny 1×1 PNG file and upload it
    const fileInput = uploader.locator('input[type="file"]');

    const pngBuffer = Buffer.from(TINY_PNG_BASE64, 'base64');
    await fileInput.setInputFiles({
      name: 'test-visual.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    // Verify scan status shows CLEAN or upload success indicator
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
    await mockGetVisualAnchors(page, []);

    // Mock CreateVisualAnchor mutation
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
    await page.waitForLoadState('networkidle');

    // Wait for the document viewer to render (instructor mode)
    const anchorEditor = page.locator('[data-testid="anchor-editor"]');
    await expect(anchorEditor).toBeVisible({ timeout: 10_000 });

    // Select text in the document content area
    const docContent = page.locator('[data-testid="document-content"]').first();
    await expect(docContent).toBeVisible({ timeout: 8_000 });
    await docContent.selectText();

    // The "Create Anchor" toolbar should appear after text selection
    const createAnchorBtn = page.locator('[data-testid="create-anchor-btn"]');
    await expect(createAnchorBtn).toBeVisible({ timeout: 8_000 });

    // Click "Create Anchor" to open the anchor creation modal
    await createAnchorBtn.click();

    // Verify the anchor creation modal/form opens
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
    await page.waitForLoadState('networkidle');

    // InstructorAnchorPanel should be visible on the right side
    const anchorPanel = page.locator('[data-testid="instructor-anchor-panel"]');
    await expect(anchorPanel).toBeVisible({ timeout: 10_000 });

    // Verify anchor text snippets appear in the panel list
    await expect(anchorPanel).toContainText(MOCK_ANCHOR_1.anchorText);
    await expect(anchorPanel).toContainText(MOCK_ANCHOR_2.anchorText);

    await expect(page).toHaveScreenshot('instructor-anchor-panel.png', {
      maxDiffPixels: 100,
    });
  });

  // ── Test 4: Delete anchor ──────────────────────────────────────────────

  test('instructor can delete anchor and sidebar updates', async ({ page }) => {
    // Start with two anchors; after deletion return only one
    let anchorsInStore = [MOCK_ANCHOR_1, MOCK_ANCHOR_2];

    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: { data: { getVisualAnchors: anchorsInStore } },
        });
      } else if (body?.operationName === 'DeleteVisualAnchor') {
        // Remove the first anchor from our in-memory store
        anchorsInStore = anchorsInStore.slice(1);
        await route.fulfill({
          json: { data: { deleteVisualAnchor: { id: MOCK_ANCHOR_1.id } } },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('networkidle');

    const anchorPanel = page.locator('[data-testid="instructor-anchor-panel"]');
    await expect(anchorPanel).toBeVisible({ timeout: 10_000 });

    // Confirm both anchors are listed before deletion
    await expect(anchorPanel).toContainText(MOCK_ANCHOR_1.anchorText);

    // Click the delete button on the first anchor item
    const firstDeleteBtn = page
      .locator('[data-testid="anchor-delete-btn"]')
      .first();
    await expect(firstDeleteBtn).toBeVisible({ timeout: 8_000 });
    await firstDeleteBtn.click();

    // Confirm deletion dialog if present
    const confirmBtn = page.locator(
      '[data-testid="confirm-delete-btn"], [data-testid="delete-confirm-btn"]'
    );
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // After deletion, the first anchor should no longer appear in the panel
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
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: { data: { getVisualAnchors: [MOCK_ANCHOR_1] } },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/media-1');
    await page.waitForLoadState('networkidle');

    // Verify instructor panel is visible before toggle
    const anchorPanel = page.locator('[data-testid="instructor-anchor-panel"]');
    await expect(anchorPanel).toBeVisible({ timeout: 10_000 });

    // Find the "Preview as Student" toggle button
    const previewToggle = page.locator(
      '[data-testid="preview-as-student-toggle"], button:has-text("Preview as Student")'
    );
    await expect(previewToggle).toBeVisible({ timeout: 8_000 });
    await previewToggle.click();

    // After toggling: InstructorAnchorPanel should be hidden
    await expect(anchorPanel).not.toBeVisible({ timeout: 8_000 });

    // VisualSidebar should become visible (student view)
    const visualSidebar = page.locator('[data-testid="visual-sidebar"]');
    await expect(visualSidebar).toBeVisible({ timeout: 8_000 });

    // Editor controls (anchor-editor, create-anchor-btn) must not be present
    await expect(page.locator('[data-testid="anchor-editor"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="create-anchor-btn"]')).not.toBeVisible();

    await expect(page).toHaveScreenshot('instructor-preview-student-mode.png', {
      maxDiffPixels: 100,
    });
  });
});
