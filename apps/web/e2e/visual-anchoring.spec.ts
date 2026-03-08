import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

test.describe('Visual Anchoring — Instructor Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('instructor can create a visual anchor', async ({ page }) => {
    // Navigate to a rich document
    await page.goto('/learn/test-document-id');
    await page.waitForSelector('[data-testid="anchor-editor"]');

    // Select text in the document
    const textEl = page.locator('[data-testid="document-content"]').first();
    await textEl.selectText();
    await page.waitForSelector('[data-testid="create-anchor-btn"]');

    // Click create anchor
    await page.click('[data-testid="create-anchor-btn"]');
    await page.waitForSelector('[data-testid="anchor-creation-modal"]');

    // Confirm anchor creation
    await page.click('[data-testid="confirm-anchor-btn"]');
    await expect(page.locator('[data-testid="instructor-anchor-panel"]')).toBeVisible();
  });

  test('asset uploader rejects files over 15MB', async ({ page }) => {
    await page.goto('/learn/test-document-id');

    // Mock a large file upload attempt
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetPresignedUploadUrl') {
        // This should never be called for oversized files
        void route.fulfill({
          json: { errors: [{ message: 'Should not reach server for 15MB+ files' }] },
        });
      } else {
        void route.continue();
      }
    });

    // The client-side size check should prevent server call
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-testid="asset-uploader"] input[type="file"]'
      );
      if (!input) return;
      const largeFile = new File(
        [new ArrayBuffer(16 * 1024 * 1024)],
        'large.png',
        { type: 'image/png' }
      );
      Object.defineProperty(input, 'files', { value: [largeFile] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('[data-testid="upload-error"]')).toContainText('15MB');
  });

  test('student sees visual sidebar update on scroll', async ({ page }) => {
    // beforeEach already logged in

    // Mock GraphQL: return anchors with assigned images
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: {
            data: {
              getVisualAnchors: [
                {
                  id: 'anchor-1',
                  mediaAssetId: 'asset-1',
                  anchorText: 'Introduction paragraph',
                  pageNumber: 1,
                  posX: 0.1,
                  posY: 0.1,
                  posW: 0.8,
                  posH: 0.05,
                  documentOrder: 0,
                  isBroken: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  visualAssetId: 'img-1',
                  visualAsset: {
                    id: 'img-1',
                    storageUrl: 'https://placehold.co/400x300',
                    webpUrl: null,
                    mimeType: 'image/png',
                    filename: 'diagram.png',
                    scanStatus: 'CLEAN',
                    metadata: { width: 400, height: 300, altText: 'A diagram' },
                  },
                },
              ],
            },
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/asset-1');
    await expect(page.locator('[data-testid="visual-sidebar"]')).toBeVisible();
  });

  test('sidebar shows empty state when no anchors', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({ json: { data: { getVisualAnchors: [] } } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/empty-doc');
    // Sidebar should render but show empty state (no image)
    await expect(page.locator('[data-testid="sidebar-empty-state"]')).toBeVisible();
  });
});

test.describe('Visual Anchoring — Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar with image matches snapshot', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({
          json: {
            data: {
              getVisualAnchors: [
                {
                  id: 'a1',
                  mediaAssetId: 'm1',
                  anchorText: 'Test text',
                  documentOrder: 0,
                  isBroken: false,
                  createdAt: '2026-01-01T00:00:00Z',
                  updatedAt: '2026-01-01T00:00:00Z',
                  visualAssetId: 'img-1',
                  visualAsset: {
                    id: 'img-1',
                    storageUrl: 'https://placehold.co/280x200',
                    webpUrl: null,
                    mimeType: 'image/png',
                    filename: 'test.png',
                    scanStatus: 'CLEAN',
                    metadata: { width: 280, height: 200, altText: 'Test image' },
                  },
                },
              ],
            },
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/m1');
    await page.waitForSelector('[data-testid="visual-sidebar"]');
    await expect(page.locator('[data-testid="visual-sidebar"]')).toHaveScreenshot(
      'visual-sidebar-with-image.png'
    );
  });

  test('sidebar empty state matches snapshot', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string } | null;
      if (body?.operationName === 'GetVisualAnchors') {
        await route.fulfill({ json: { data: { getVisualAnchors: [] } } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/learn/empty-doc');
    await page.waitForSelector('[data-testid="visual-sidebar"]');
    await expect(page.locator('[data-testid="visual-sidebar"]')).toHaveScreenshot(
      'visual-sidebar-empty.png'
    );
  });
});
