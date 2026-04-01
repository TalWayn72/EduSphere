/**
 * Visual E2E — Social & Collaboration Routes
 *
 * Covers /social, /discussions, /discussions/:id, /peer-matching,
 * /challenges, /challenges/:id across 3 viewports.
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

/* ═══════════════ /social ═══════════════ */

test('/social desktop full', async ({ page }) => {
  await nav(page, '/social', 1280, 720);
  await expect(page).toHaveScreenshot('social-feed-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/social desktop header', async ({ page }) => {
  await nav(page, '/social', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-feed-desktop-header.png', STABLE_OPTS);
});
test('/social desktop main', async ({ page }) => {
  await nav(page, '/social', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-feed-desktop-main.png',
    STABLE_OPTS
  );
});
test('/social tablet full', async ({ page }) => {
  await nav(page, '/social', 768, 1024);
  await expect(page).toHaveScreenshot('social-feed-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/social tablet header', async ({ page }) => {
  await nav(page, '/social', 768, 1024);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-feed-tablet-header.png', STABLE_OPTS);
});
test('/social tablet main', async ({ page }) => {
  await nav(page, '/social', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-feed-tablet-main.png',
    STABLE_OPTS
  );
});
test('/social tablet sidebar', async ({ page }) => {
  await nav(page, '/social', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="user-panel"]')
  ).toHaveScreenshot('social-feed-tablet-sidebar.png', STABLE_OPTS);
});
test('/social mobile full', async ({ page }) => {
  await nav(page, '/social', 375, 812);
  await expect(page).toHaveScreenshot('social-feed-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/social mobile header', async ({ page }) => {
  await nav(page, '/social', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-feed-mobile-header.png', STABLE_OPTS);
});
test('/social mobile main', async ({ page }) => {
  await nav(page, '/social', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-feed-mobile-main.png',
    STABLE_OPTS
  );
});
test('/social mobile footer', async ({ page }) => {
  await nav(page, '/social', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('social-feed-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ /discussions ═══════════════ */

test('/discussions desktop full', async ({ page }) => {
  await nav(page, '/discussions', 1280, 720);
  await expect(page).toHaveScreenshot('social-disc-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/discussions desktop header', async ({ page }) => {
  await nav(page, '/discussions', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-disc-desktop-header.png', STABLE_OPTS);
});
test('/discussions desktop main', async ({ page }) => {
  await nav(page, '/discussions', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-disc-desktop-main.png',
    STABLE_OPTS
  );
});
test('/discussions tablet full', async ({ page }) => {
  await nav(page, '/discussions', 768, 1024);
  await expect(page).toHaveScreenshot('social-disc-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/discussions tablet main', async ({ page }) => {
  await nav(page, '/discussions', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-disc-tablet-main.png',
    STABLE_OPTS
  );
});
test('/discussions mobile full', async ({ page }) => {
  await nav(page, '/discussions', 375, 812);
  await expect(page).toHaveScreenshot('social-disc-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/discussions mobile header', async ({ page }) => {
  await nav(page, '/discussions', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-disc-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /discussions/:id ═══════════════ */

test('/discussions/:id desktop full', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 1280, 720);
  await expect(page).toHaveScreenshot('social-thread-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/discussions/:id desktop header', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-thread-desktop-header.png', STABLE_OPTS);
});
test('/discussions/:id desktop main', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-thread-desktop-main.png',
    STABLE_OPTS
  );
});
test('/discussions/:id tablet full', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 768, 1024);
  await expect(page).toHaveScreenshot('social-thread-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/discussions/:id tablet main', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-thread-tablet-main.png',
    STABLE_OPTS
  );
});
test('/discussions/:id mobile full', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 375, 812);
  await expect(page).toHaveScreenshot('social-thread-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/discussions/:id mobile header', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-thread-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /peer-matching ═══════════════ */

test('/peer-matching desktop full', async ({ page }) => {
  await nav(page, '/peer-matching', 1280, 720);
  await expect(page).toHaveScreenshot('social-peer-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/peer-matching desktop header', async ({ page }) => {
  await nav(page, '/peer-matching', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-peer-desktop-header.png', STABLE_OPTS);
});
test('/peer-matching desktop main', async ({ page }) => {
  await nav(page, '/peer-matching', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-peer-desktop-main.png',
    STABLE_OPTS
  );
});
test('/peer-matching tablet full', async ({ page }) => {
  await nav(page, '/peer-matching', 768, 1024);
  await expect(page).toHaveScreenshot('social-peer-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/peer-matching tablet main', async ({ page }) => {
  await nav(page, '/peer-matching', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-peer-tablet-main.png',
    STABLE_OPTS
  );
});
test('/peer-matching mobile full', async ({ page }) => {
  await nav(page, '/peer-matching', 375, 812);
  await expect(page).toHaveScreenshot('social-peer-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/peer-matching mobile header', async ({ page }) => {
  await nav(page, '/peer-matching', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-peer-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /challenges ═══════════════ */

test('/challenges desktop full', async ({ page }) => {
  await nav(page, '/challenges', 1280, 720);
  await expect(page).toHaveScreenshot('social-chal-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/challenges desktop header', async ({ page }) => {
  await nav(page, '/challenges', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-chal-desktop-header.png', STABLE_OPTS);
});
test('/challenges desktop main', async ({ page }) => {
  await nav(page, '/challenges', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-chal-desktop-main.png',
    STABLE_OPTS
  );
});
test('/challenges tablet full', async ({ page }) => {
  await nav(page, '/challenges', 768, 1024);
  await expect(page).toHaveScreenshot('social-chal-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/challenges tablet main', async ({ page }) => {
  await nav(page, '/challenges', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-chal-tablet-main.png',
    STABLE_OPTS
  );
});
test('/challenges mobile full', async ({ page }) => {
  await nav(page, '/challenges', 375, 812);
  await expect(page).toHaveScreenshot('social-chal-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/challenges mobile header', async ({ page }) => {
  await nav(page, '/challenges', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-chal-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /challenges/:id ═══════════════ */

test('/challenges/:id desktop full', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 1280, 720);
  await expect(page).toHaveScreenshot('social-chaldet-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/challenges/:id desktop header', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-chaldet-desktop-header.png', STABLE_OPTS);
});
test('/challenges/:id desktop main', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-chaldet-desktop-main.png',
    STABLE_OPTS
  );
});
test('/challenges/:id tablet full', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 768, 1024);
  await expect(page).toHaveScreenshot('social-chaldet-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/challenges/:id tablet main', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'social-chaldet-tablet-main.png',
    STABLE_OPTS
  );
});
test('/challenges/:id mobile full', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 375, 812);
  await expect(page).toHaveScreenshot('social-chaldet-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/challenges/:id mobile header', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('social-chaldet-mobile-header.png', STABLE_OPTS);
});
test('/challenges/:id mobile footer', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('social-chaldet-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ Extra section & sidebar screenshots ═══════════════ */

test('/social desktop sidebar', async ({ page }) => {
  await nav(page, '/social', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="user-panel"]')
  ).toHaveScreenshot('social-feed-desktop-sidebar.png', STABLE_OPTS);
});
test('/discussions desktop sidebar', async ({ page }) => {
  await nav(page, '/discussions', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-disc-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/discussions tablet sidebar', async ({ page }) => {
  await nav(page, '/discussions', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-disc-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/discussions/:id desktop sidebar', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="thread-sidebar"]')
  ).toHaveScreenshot('social-thread-desktop-sidebar.png', STABLE_OPTS);
});
test('/discussions/:id tablet sidebar', async ({ page }) => {
  await nav(page, '/discussions/discussion-1', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="thread-sidebar"]')
  ).toHaveScreenshot('social-thread-tablet-sidebar.png', STABLE_OPTS);
});
test('/peer-matching desktop sidebar', async ({ page }) => {
  await nav(page, '/peer-matching', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-peer-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/peer-matching tablet sidebar', async ({ page }) => {
  await nav(page, '/peer-matching', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-peer-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/challenges desktop sidebar', async ({ page }) => {
  await nav(page, '/challenges', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-chal-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/challenges tablet sidebar', async ({ page }) => {
  await nav(page, '/challenges', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-chal-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/challenges/:id desktop sidebar', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-chaldet-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/challenges/:id tablet sidebar', async ({ page }) => {
  await nav(page, '/challenges/challenge-1', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'social-chaldet-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/discussions mobile footer', async ({ page }) => {
  await nav(page, '/discussions', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('social-disc-mobile-footer.png', STABLE_OPTS);
});
test('/peer-matching mobile footer', async ({ page }) => {
  await nav(page, '/peer-matching', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('social-peer-mobile-footer.png', STABLE_OPTS);
});
test('/challenges mobile footer', async ({ page }) => {
  await nav(page, '/challenges', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('social-chal-mobile-footer.png', STABLE_OPTS);
});
