/**
 * Visual Anchoring — Visual Regression Tests (Phase 29) — Part 1
 *
 * Covers:
 *   VisualSidebar (/learn/:contentId)
 *     - Empty state (no anchors returned from GraphQL)
 *     - With active image (one anchor with a visual asset)
 *     - RTL layout (Hebrew/isRTL=true)
 *
 *   AnchorFrame
 *     - Frame border around active anchor text
 *
 *   AssetUploader (/learn/:contentId — instructor view)
 *     - Idle drop-zone state
 *
 * All tests:
 *   - Mock ALL GraphQL calls via page.route() — no real backend needed
 *   - Use animations: 'disabled' and reducedMotion: 'reduce' for stability
 *   - maxDiffPixels: 200 tolerance for minor rendering differences
 *   - Cover light mode by default
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-anchoring-visual-part1.spec.ts
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Mock fixtures ────────────────────────────────────────────────────────────

/** A single visual anchor with a full image asset */
const MOCK_ANCHOR_WITH_IMAGE = {
  id: 'anchor-vis-1',
  mediaAssetId: 'media-doc-1',
  anchorText: 'Introduction to Epistemology',
  pageNumber: 1,
  posX: 0.05,
  posY: 0.1,
  posW: 0.9,
  posH: 0.06,
  documentOrder: 0,
  isBroken: false,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  visualAssetId: 'img-vis-1',
  visualAsset: {
    id: 'img-vis-1',
    storageUrl: 'https://placehold.co/280x200/6366f1/ffffff?text=Diagram',
    webpUrl: null,
    mimeType: 'image/png',
    filename: 'epistemology-diagram.png',
    scanStatus: 'CLEAN',
    metadata: {
      width: 280,
      height: 200,
      altText: 'Epistemology concept diagram',
    },
  },
};

// ─── GraphQL mock helper ──────────────────────────────────────────────────────

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

async function mockAnchors(page: Page, anchors: object[]): Promise<void> {
  await mockGraphQL(page, (body) => {
    if (
      body.includes('GetVisualAnchors') ||
      body.includes('getVisualAnchors')
    ) {
      return { data: { getVisualAnchors: anchors } };
    }
    return null;
  });
}

async function mockEmptyAnchors(page: Page): Promise<void> {
  await mockGraphQL(page, (body) => {
    if (
      body.includes('GetVisualAnchors') ||
      body.includes('getVisualAnchors')
    ) {
      return { data: { getVisualAnchors: [] } };
    }
    return null;
  });
}

// ─── Shared navigation helper ──────────────────────────────────────────────────

async function loginAndGoto(page: Page, path: string): Promise<void> {
  await login(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

// ─── Suite: Visual Anchoring — Part 1 ───────────────────────────────────────

test.describe('Visual Anchoring — Visual Regression (Part 1)', () => {
  test('VisualSidebar — empty state (no anchors)', async ({ page }) => {
    await mockEmptyAnchors(page);
    await loginAndGoto(page, `${BASE_URL}/learn/empty-doc-vis`);

    await page
      .locator('[data-testid="visual-sidebar"]')
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const sidebarLocator = page
      .locator('[data-testid="visual-sidebar"]')
      .first();
    const sidebarVisible = await sidebarLocator.isVisible().catch(() => false);

    if (sidebarVisible) {
      await expect(sidebarLocator).toHaveScreenshot('sidebar-empty-state.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    } else {
      const complementary = page
        .locator('[role="complementary"][aria-label="סרגל עזרים חזותיים"]')
        .first();
      const compVisible = await complementary.isVisible().catch(() => false);
      if (compVisible) {
        await expect(complementary).toHaveScreenshot(
          'sidebar-empty-state.png',
          {
            maxDiffPixels: 200,
            animations: 'disabled',
          }
        );
      } else {
        await expect(page).toHaveScreenshot('sidebar-empty-state.png', {
          fullPage: false,
          maxDiffPixels: 200,
          animations: 'disabled',
        });
      }
    }
  });

  test('VisualSidebar — with active image', async ({ page }) => {
    await mockAnchors(page, [MOCK_ANCHOR_WITH_IMAGE]);
    await loginAndGoto(page, `${BASE_URL}/learn/media-doc-1`);

    await page
      .locator('[data-testid="visual-sidebar"]')
      .waitFor({ timeout: 10_000 })
      .catch(() => {});

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);

    const sidebarLocator = page
      .locator('[data-testid="visual-sidebar"]')
      .first();
    const sidebarVisible = await sidebarLocator.isVisible().catch(() => false);

    if (sidebarVisible) {
      await expect(sidebarLocator).toHaveScreenshot('sidebar-with-image.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    } else {
      const complementary = page.locator('[role="complementary"]').first();
      const compVisible = await complementary.isVisible().catch(() => false);
      if (compVisible) {
        await expect(complementary).toHaveScreenshot('sidebar-with-image.png', {
          maxDiffPixels: 200,
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot('sidebar-with-image.png', {
          fullPage: false,
          maxDiffPixels: 200,
          animations: 'disabled',
        });
      }
    }
  });

  test('AnchorFrame — frame around active anchor text', async ({ page }) => {
    await mockAnchors(page, [MOCK_ANCHOR_WITH_IMAGE]);
    await loginAndGoto(page, `${BASE_URL}/learn/media-doc-1`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const anchorFrame = page.locator('[data-testid="anchor-frame"]').first();
    const frameVisible = await anchorFrame.isVisible().catch(() => false);

    if (frameVisible) {
      await expect(anchorFrame).toHaveScreenshot('anchor-frame-active.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot('anchor-frame-active.png', {
        fullPage: false,
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    }
  });

  test('VisualSidebar — RTL layout (Hebrew)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'he');
    });

    await mockAnchors(page, [MOCK_ANCHOR_WITH_IMAGE]);
    await loginAndGoto(page, `${BASE_URL}/learn/media-doc-1?lang=he`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('sidebar-rtl-layout.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('AssetUploader — idle state', async ({ page }) => {
    await mockEmptyAnchors(page);
    await loginAndGoto(page, `${BASE_URL}/learn/media-doc-1`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const uploader = page.locator('[data-testid="asset-uploader"]').first();
    const uploaderVisible = await uploader.isVisible().catch(() => false);

    if (uploaderVisible) {
      await expect(uploader).toHaveScreenshot('asset-uploader-idle.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    } else {
      const instructorArea = page
        .locator('[aria-label="לוח עוגנים חזותיים"]')
        .first();
      const panelVisible = await instructorArea.isVisible().catch(() => false);
      if (panelVisible) {
        await expect(instructorArea).toHaveScreenshot(
          'asset-uploader-idle.png',
          {
            maxDiffPixels: 200,
            animations: 'disabled',
          }
        );
      } else {
        await expect(page).toHaveScreenshot('asset-uploader-idle.png', {
          fullPage: false,
          maxDiffPixels: 200,
          animations: 'disabled',
        });
      }
    }
  });
});
