/**
 * Visual E2E — Learning & Content Routes
 *
 * Covers /knowledge-graph, /search, /content-import, /annotations,
 * /ai-chat, /onboarding across 3 viewports.
 *
 * 62 toHaveScreenshot() assertions.
 */
import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';
import {
  STABLE_OPTS,
  LOOSE_OPTS,
  dynamicMasks,
} from './helpers/visual-test-utils';

test.use({ reducedMotion: 'reduce' });

async function nav(page: Page, path: string, vw: number, vh: number) {
  await page.setViewportSize({ width: vw, height: vh });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function elOrPage(page: Page, sel: string, alt: string) {
  const el = page.locator(sel).or(page.locator(alt)).first();
  return (await el.isVisible({ timeout: 3000 }).catch(() => false)) ? el : page;
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

/* ═══════════════ /knowledge-graph ═══════════════ */

test('/knowledge-graph desktop full', async ({ page }) => {
  await nav(page, '/knowledge-graph', 1280, 720);
  await expect(page).toHaveScreenshot('learn-kg-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/knowledge-graph desktop header', async ({ page }) => {
  await nav(page, '/knowledge-graph', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-kg-desktop-header.png', STABLE_OPTS);
});
test('/knowledge-graph desktop main', async ({ page }) => {
  await nav(page, '/knowledge-graph', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-kg-desktop-main.png',
    STABLE_OPTS
  );
});
test('/knowledge-graph tablet full', async ({ page }) => {
  await nav(page, '/knowledge-graph', 768, 1024);
  await expect(page).toHaveScreenshot('learn-kg-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/knowledge-graph tablet header', async ({ page }) => {
  await nav(page, '/knowledge-graph', 768, 1024);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-kg-tablet-header.png', STABLE_OPTS);
});
test('/knowledge-graph tablet main', async ({ page }) => {
  await nav(page, '/knowledge-graph', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-kg-tablet-main.png',
    STABLE_OPTS
  );
});
test('/knowledge-graph tablet sidebar', async ({ page }) => {
  await nav(page, '/knowledge-graph', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="filter-panel"]')
  ).toHaveScreenshot('learn-kg-tablet-sidebar.png', STABLE_OPTS);
});
test('/knowledge-graph mobile full', async ({ page }) => {
  await nav(page, '/knowledge-graph', 375, 812);
  await expect(page).toHaveScreenshot('learn-kg-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/knowledge-graph mobile header', async ({ page }) => {
  await nav(page, '/knowledge-graph', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-kg-mobile-header.png', STABLE_OPTS);
});
test('/knowledge-graph mobile main', async ({ page }) => {
  await nav(page, '/knowledge-graph', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-kg-mobile-main.png',
    STABLE_OPTS
  );
});
test('/knowledge-graph mobile footer', async ({ page }) => {
  await nav(page, '/knowledge-graph', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('learn-kg-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ /search ═══════════════ */

test('/search desktop full', async ({ page }) => {
  await nav(page, '/search', 1280, 720);
  await expect(page).toHaveScreenshot('learn-search-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/search desktop header', async ({ page }) => {
  await nav(page, '/search', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-search-desktop-header.png', STABLE_OPTS);
});
test('/search desktop main', async ({ page }) => {
  await nav(page, '/search', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-search-desktop-main.png',
    STABLE_OPTS
  );
});
test('/search tablet full', async ({ page }) => {
  await nav(page, '/search', 768, 1024);
  await expect(page).toHaveScreenshot('learn-search-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/search tablet main', async ({ page }) => {
  await nav(page, '/search', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-search-tablet-main.png',
    STABLE_OPTS
  );
});
test('/search mobile full', async ({ page }) => {
  await nav(page, '/search', 375, 812);
  await expect(page).toHaveScreenshot('learn-search-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/search mobile header', async ({ page }) => {
  await nav(page, '/search', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-search-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /content-import ═══════════════ */

test('/content-import desktop full', async ({ page }) => {
  await nav(page, '/content-import', 1280, 720);
  await expect(page).toHaveScreenshot('learn-import-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/content-import desktop header', async ({ page }) => {
  await nav(page, '/content-import', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-import-desktop-header.png', STABLE_OPTS);
});
test('/content-import desktop main', async ({ page }) => {
  await nav(page, '/content-import', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-import-desktop-main.png',
    STABLE_OPTS
  );
});
test('/content-import tablet full', async ({ page }) => {
  await nav(page, '/content-import', 768, 1024);
  await expect(page).toHaveScreenshot('learn-import-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/content-import tablet main', async ({ page }) => {
  await nav(page, '/content-import', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-import-tablet-main.png',
    STABLE_OPTS
  );
});
test('/content-import mobile full', async ({ page }) => {
  await nav(page, '/content-import', 375, 812);
  await expect(page).toHaveScreenshot('learn-import-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/content-import mobile header', async ({ page }) => {
  await nav(page, '/content-import', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-import-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /annotations ═══════════════ */

test('/annotations desktop full', async ({ page }) => {
  await nav(page, '/annotations', 1280, 720);
  await expect(page).toHaveScreenshot('learn-annot-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/annotations desktop header', async ({ page }) => {
  await nav(page, '/annotations', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-annot-desktop-header.png', STABLE_OPTS);
});
test('/annotations desktop main', async ({ page }) => {
  await nav(page, '/annotations', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-annot-desktop-main.png',
    STABLE_OPTS
  );
});
test('/annotations tablet full', async ({ page }) => {
  await nav(page, '/annotations', 768, 1024);
  await expect(page).toHaveScreenshot('learn-annot-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/annotations tablet main', async ({ page }) => {
  await nav(page, '/annotations', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-annot-tablet-main.png',
    STABLE_OPTS
  );
});
test('/annotations mobile full', async ({ page }) => {
  await nav(page, '/annotations', 375, 812);
  await expect(page).toHaveScreenshot('learn-annot-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/annotations mobile header', async ({ page }) => {
  await nav(page, '/annotations', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-annot-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /ai-chat ═══════════════ */

test('/ai-chat desktop full', async ({ page }) => {
  await nav(page, '/ai-chat', 1280, 720);
  await expect(page).toHaveScreenshot('learn-chat-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/ai-chat desktop header', async ({ page }) => {
  await nav(page, '/ai-chat', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-chat-desktop-header.png', STABLE_OPTS);
});
test('/ai-chat desktop main', async ({ page }) => {
  await nav(page, '/ai-chat', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-chat-desktop-main.png',
    STABLE_OPTS
  );
});
test('/ai-chat tablet full', async ({ page }) => {
  await nav(page, '/ai-chat', 768, 1024);
  await expect(page).toHaveScreenshot('learn-chat-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/ai-chat tablet main', async ({ page }) => {
  await nav(page, '/ai-chat', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-chat-tablet-main.png',
    STABLE_OPTS
  );
});
test('/ai-chat mobile full', async ({ page }) => {
  await nav(page, '/ai-chat', 375, 812);
  await expect(page).toHaveScreenshot('learn-chat-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/ai-chat mobile header', async ({ page }) => {
  await nav(page, '/ai-chat', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-chat-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /onboarding ═══════════════ */

test('/onboarding desktop full', async ({ page }) => {
  await nav(page, '/onboarding', 1280, 720);
  await expect(page).toHaveScreenshot('learn-onboard-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/onboarding desktop header', async ({ page }) => {
  await nav(page, '/onboarding', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-onboard-desktop-header.png', STABLE_OPTS);
});
test('/onboarding desktop main', async ({ page }) => {
  await nav(page, '/onboarding', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-onboard-desktop-main.png',
    STABLE_OPTS
  );
});
test('/onboarding tablet full', async ({ page }) => {
  await nav(page, '/onboarding', 768, 1024);
  await expect(page).toHaveScreenshot('learn-onboard-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/onboarding tablet main', async ({ page }) => {
  await nav(page, '/onboarding', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'learn-onboard-tablet-main.png',
    STABLE_OPTS
  );
});
test('/onboarding mobile full', async ({ page }) => {
  await nav(page, '/onboarding', 375, 812);
  await expect(page).toHaveScreenshot('learn-onboard-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/onboarding mobile header', async ({ page }) => {
  await nav(page, '/onboarding', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('learn-onboard-mobile-header.png', STABLE_OPTS);
});
test('/onboarding mobile footer', async ({ page }) => {
  await nav(page, '/onboarding', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('learn-onboard-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ Extra section & sidebar screenshots ═══════════════ */

test('/knowledge-graph desktop sidebar', async ({ page }) => {
  await nav(page, '/knowledge-graph', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="graph-controls"]')
  ).toHaveScreenshot('learn-kg-desktop-sidebar.png', STABLE_OPTS);
});
test('/search desktop sidebar', async ({ page }) => {
  await nav(page, '/search', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="search-filters"]')
  ).toHaveScreenshot('learn-search-desktop-sidebar.png', STABLE_OPTS);
});
test('/search tablet sidebar', async ({ page }) => {
  await nav(page, '/search', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="search-filters"]')
  ).toHaveScreenshot('learn-search-tablet-sidebar.png', STABLE_OPTS);
});
test('/content-import desktop sidebar', async ({ page }) => {
  await nav(page, '/content-import', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'learn-import-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/content-import tablet sidebar', async ({ page }) => {
  await nav(page, '/content-import', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'learn-import-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/annotations desktop sidebar', async ({ page }) => {
  await nav(page, '/annotations', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="annotation-filters"]')
  ).toHaveScreenshot('learn-annot-desktop-sidebar.png', STABLE_OPTS);
});
test('/annotations tablet sidebar', async ({ page }) => {
  await nav(page, '/annotations', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="annotation-filters"]')
  ).toHaveScreenshot('learn-annot-tablet-sidebar.png', STABLE_OPTS);
});
test('/ai-chat desktop sidebar', async ({ page }) => {
  await nav(page, '/ai-chat', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="chat-history"]')
  ).toHaveScreenshot('learn-chat-desktop-sidebar.png', STABLE_OPTS);
});
test('/ai-chat tablet sidebar', async ({ page }) => {
  await nav(page, '/ai-chat', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="chat-history"]')
  ).toHaveScreenshot('learn-chat-tablet-sidebar.png', STABLE_OPTS);
});
test('/onboarding desktop sidebar', async ({ page }) => {
  await nav(page, '/onboarding', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'learn-onboard-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/onboarding tablet sidebar', async ({ page }) => {
  await nav(page, '/onboarding', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'learn-onboard-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/search mobile footer', async ({ page }) => {
  await nav(page, '/search', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('learn-search-mobile-footer.png', STABLE_OPTS);
});
test('/content-import mobile footer', async ({ page }) => {
  await nav(page, '/content-import', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('learn-import-mobile-footer.png', STABLE_OPTS);
});
test('/annotations mobile footer', async ({ page }) => {
  await nav(page, '/annotations', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('learn-annot-mobile-footer.png', STABLE_OPTS);
});
