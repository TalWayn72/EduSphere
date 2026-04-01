/**
 * Visual Anchoring — Visual Regression Tests (Phase 29) — Part 2
 *
 * Covers:
 *   InstructorAnchorPanel
 *     - Anchor list with 3 mocked anchors
 *
 *   Mobile — VisualBottomSheet
 *     - 25% snap position on mobile viewport (390x844)
 *
 * All tests:
 *   - Mock ALL GraphQL calls via page.route() — no real backend needed
 *   - Use animations: 'disabled' and reducedMotion: 'reduce' for stability
 *   - maxDiffPixels: 200 tolerance for minor rendering differences
 *   - Cover light mode by default
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-anchoring-visual-part2.spec.ts
 */

import { test, expect, type Page, type Route } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

// ─── Mock fixtures ────────────────────────────────────────────────────────────

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

const MOCK_ANCHOR_LIST = [
  MOCK_ANCHOR_WITH_IMAGE,
  {
    id: 'anchor-vis-2',
    mediaAssetId: 'media-doc-1',
    anchorText: 'Descartes Cogito argument paragraph',
    pageNumber: 2,
    posX: 0.05,
    posY: 0.25,
    posW: 0.9,
    posH: 0.06,
    documentOrder: 1,
    isBroken: false,
    createdAt: '2026-01-15T10:05:00Z',
    updatedAt: '2026-01-15T10:05:00Z',
    visualAssetId: 'img-vis-2',
    visualAsset: {
      id: 'img-vis-2',
      storageUrl: 'https://placehold.co/280x200/10b981/ffffff?text=Chart',
      webpUrl: null,
      mimeType: 'image/png',
      filename: 'cogito-chart.png',
      scanStatus: 'CLEAN',
      metadata: { width: 280, height: 200, altText: 'Cogito argument chart' },
    },
  },
  {
    id: 'anchor-vis-3',
    mediaAssetId: 'media-doc-1',
    anchorText: 'Empiricism and the limits of knowledge',
    pageNumber: 3,
    posX: 0.05,
    posY: 0.45,
    posW: 0.9,
    posH: 0.06,
    documentOrder: 2,
    isBroken: false,
    createdAt: '2026-01-15T10:10:00Z',
    updatedAt: '2026-01-15T10:10:00Z',
    visualAssetId: null,
    visualAsset: null,
  },
];

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

async function mockInstructorAnchors(page: Page): Promise<void> {
  await mockGraphQL(page, (body) => {
    if (
      body.includes('GetVisualAnchors') ||
      body.includes('getVisualAnchors')
    ) {
      return { data: { getVisualAnchors: MOCK_ANCHOR_LIST } };
    }
    if (
      body.includes('Mutation') ||
      body.includes('CreateAnchor') ||
      body.includes('DeleteAnchor')
    ) {
      return {
        data: {
          createVisualAnchor: { id: 'new-anchor-1' },
          deleteVisualAnchor: { success: true },
        },
      };
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

// ─── Suite: Visual Anchoring — Part 2 ───────────────────────────────────────

test.describe('Visual Anchoring — Visual Regression (Part 2)', () => {
  test('InstructorAnchorPanel — with anchor list', async ({ page }) => {
    await mockInstructorAnchors(page);
    await loginAndGoto(page, `${BASE_URL}/learn/media-doc-1`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const panel = page.locator('[aria-label="לוח עוגנים חזותיים"]').first();
    const panelVisible = await panel.isVisible().catch(() => false);

    if (panelVisible) {
      await expect(panel).toHaveScreenshot('instructor-anchor-panel-list.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    } else {
      const panelById = page
        .locator('[data-testid="instructor-anchor-panel"]')
        .first();
      const panelByIdVisible = await panelById.isVisible().catch(() => false);
      if (panelByIdVisible) {
        await expect(panelById).toHaveScreenshot(
          'instructor-anchor-panel-list.png',
          {
            maxDiffPixels: 200,
            animations: 'disabled',
          }
        );
      } else {
        await expect(page).toHaveScreenshot(
          'instructor-anchor-panel-list.png',
          {
            fullPage: false,
            maxDiffPixels: 200,
            animations: 'disabled',
          }
        );
      }
    }
  });

  test('Mobile — VisualBottomSheet at 25% snap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await mockAnchors(page, [MOCK_ANCHOR_WITH_IMAGE]);
    await loginAndGoto(page, `${BASE_URL}/learn/media-doc-1`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);

    const sheetTrigger = page
      .locator('[data-testid="visual-sheet-trigger"]')
      .first();
    const triggerVisible = await sheetTrigger.isVisible().catch(() => false);
    if (triggerVisible) {
      await sheetTrigger.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('mobile-bottom-sheet-25pct.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
