/**
 * Visual E2E — Assessment Routes
 *
 * Covers /assessments, /assessments/create, /item-bank, /exam/:id,
 * /exam/:id/results, /quiz/:id across 3 viewports.
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

/* ═══════════════ /assessments ═══════════════ */

test('/assessments desktop full', async ({ page }) => {
  await nav(page, '/assessments', 1280, 720);
  await expect(page).toHaveScreenshot('assess-list-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/assessments desktop header', async ({ page }) => {
  await nav(page, '/assessments', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-list-desktop-header.png', STABLE_OPTS);
});
test('/assessments desktop main', async ({ page }) => {
  await nav(page, '/assessments', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-list-desktop-main.png',
    STABLE_OPTS
  );
});
test('/assessments tablet full', async ({ page }) => {
  await nav(page, '/assessments', 768, 1024);
  await expect(page).toHaveScreenshot('assess-list-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/assessments tablet header', async ({ page }) => {
  await nav(page, '/assessments', 768, 1024);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-list-tablet-header.png', STABLE_OPTS);
});
test('/assessments tablet main', async ({ page }) => {
  await nav(page, '/assessments', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-list-tablet-main.png',
    STABLE_OPTS
  );
});
test('/assessments tablet sidebar', async ({ page }) => {
  await nav(page, '/assessments', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="filter-sidebar"]')
  ).toHaveScreenshot('assess-list-tablet-sidebar.png', STABLE_OPTS);
});
test('/assessments mobile full', async ({ page }) => {
  await nav(page, '/assessments', 375, 812);
  await expect(page).toHaveScreenshot('assess-list-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/assessments mobile header', async ({ page }) => {
  await nav(page, '/assessments', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-list-mobile-header.png', STABLE_OPTS);
});
test('/assessments mobile main', async ({ page }) => {
  await nav(page, '/assessments', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-list-mobile-main.png',
    STABLE_OPTS
  );
});
test('/assessments mobile footer', async ({ page }) => {
  await nav(page, '/assessments', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('assess-list-mobile-footer.png', STABLE_OPTS);
});

/* ═══════════════ /assessments/create ═══════════════ */

test('/assessments/create desktop full', async ({ page }) => {
  await nav(page, '/assessments/create', 1280, 720);
  await expect(page).toHaveScreenshot('assess-create-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/assessments/create desktop header', async ({ page }) => {
  await nav(page, '/assessments/create', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-create-desktop-header.png', STABLE_OPTS);
});
test('/assessments/create desktop main', async ({ page }) => {
  await nav(page, '/assessments/create', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-create-desktop-main.png',
    STABLE_OPTS
  );
});
test('/assessments/create tablet full', async ({ page }) => {
  await nav(page, '/assessments/create', 768, 1024);
  await expect(page).toHaveScreenshot('assess-create-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/assessments/create tablet main', async ({ page }) => {
  await nav(page, '/assessments/create', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-create-tablet-main.png',
    STABLE_OPTS
  );
});
test('/assessments/create mobile full', async ({ page }) => {
  await nav(page, '/assessments/create', 375, 812);
  await expect(page).toHaveScreenshot('assess-create-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/assessments/create mobile header', async ({ page }) => {
  await nav(page, '/assessments/create', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-create-mobile-header.png', STABLE_OPTS);
});
test('/assessments/create mobile main', async ({ page }) => {
  await nav(page, '/assessments/create', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-create-mobile-main.png',
    STABLE_OPTS
  );
});

/* ═══════════════ /item-bank ═══════════════ */

test('/item-bank desktop full', async ({ page }) => {
  await nav(page, '/item-bank', 1280, 720);
  await expect(page).toHaveScreenshot('assess-bank-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/item-bank desktop header', async ({ page }) => {
  await nav(page, '/item-bank', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-bank-desktop-header.png', STABLE_OPTS);
});
test('/item-bank desktop main', async ({ page }) => {
  await nav(page, '/item-bank', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-bank-desktop-main.png',
    STABLE_OPTS
  );
});
test('/item-bank tablet full', async ({ page }) => {
  await nav(page, '/item-bank', 768, 1024);
  await expect(page).toHaveScreenshot('assess-bank-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/item-bank tablet main', async ({ page }) => {
  await nav(page, '/item-bank', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-bank-tablet-main.png',
    STABLE_OPTS
  );
});
test('/item-bank mobile full', async ({ page }) => {
  await nav(page, '/item-bank', 375, 812);
  await expect(page).toHaveScreenshot('assess-bank-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/item-bank mobile header', async ({ page }) => {
  await nav(page, '/item-bank', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-bank-mobile-header.png', STABLE_OPTS);
});
test('/item-bank mobile main', async ({ page }) => {
  await nav(page, '/item-bank', 375, 812);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-bank-mobile-main.png',
    STABLE_OPTS
  );
});

/* ═══════════════ /exam/:id ═══════════════ */

test('/exam/:id desktop full', async ({ page }) => {
  await nav(page, '/exam/exam-1', 1280, 720);
  await expect(page).toHaveScreenshot('assess-exam-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/exam/:id desktop header', async ({ page }) => {
  await nav(page, '/exam/exam-1', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-exam-desktop-header.png', STABLE_OPTS);
});
test('/exam/:id desktop main', async ({ page }) => {
  await nav(page, '/exam/exam-1', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-exam-desktop-main.png',
    STABLE_OPTS
  );
});
test('/exam/:id tablet full', async ({ page }) => {
  await nav(page, '/exam/exam-1', 768, 1024);
  await expect(page).toHaveScreenshot('assess-exam-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/exam/:id tablet main', async ({ page }) => {
  await nav(page, '/exam/exam-1', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-exam-tablet-main.png',
    STABLE_OPTS
  );
});
test('/exam/:id mobile full', async ({ page }) => {
  await nav(page, '/exam/exam-1', 375, 812);
  await expect(page).toHaveScreenshot('assess-exam-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/exam/:id mobile header', async ({ page }) => {
  await nav(page, '/exam/exam-1', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-exam-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /exam/:id/results ═══════════════ */

test('/exam/:id/results desktop full', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 1280, 720);
  await expect(page).toHaveScreenshot('assess-results-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/exam/:id/results desktop header', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-results-desktop-header.png', STABLE_OPTS);
});
test('/exam/:id/results desktop main', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-results-desktop-main.png',
    STABLE_OPTS
  );
});
test('/exam/:id/results tablet full', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 768, 1024);
  await expect(page).toHaveScreenshot('assess-results-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/exam/:id/results tablet main', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-results-tablet-main.png',
    STABLE_OPTS
  );
});
test('/exam/:id/results mobile full', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 375, 812);
  await expect(page).toHaveScreenshot('assess-results-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/exam/:id/results mobile header', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-results-mobile-header.png', STABLE_OPTS);
});

/* ═══════════════ /quiz/:id ═══════════════ */

test('/quiz/:id desktop full', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 1280, 720);
  await expect(page).toHaveScreenshot('assess-quiz-desktop-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/quiz/:id desktop header', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 1280, 720);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-quiz-desktop-header.png', STABLE_OPTS);
});
test('/quiz/:id desktop main', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 1280, 720);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-quiz-desktop-main.png',
    STABLE_OPTS
  );
});
test('/quiz/:id tablet full', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 768, 1024);
  await expect(page).toHaveScreenshot('assess-quiz-tablet-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/quiz/:id tablet main', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 768, 1024);
  await expect(await elOrPage(page, 'main', '[role="main"]')).toHaveScreenshot(
    'assess-quiz-tablet-main.png',
    STABLE_OPTS
  );
});
test('/quiz/:id mobile full', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 375, 812);
  await expect(page).toHaveScreenshot('assess-quiz-mobile-full.png', {
    ...LOOSE_OPTS,
    mask: dynamicMasks(page),
  });
});
test('/quiz/:id mobile header', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 375, 812);
  await expect(
    await elOrPage(page, 'header', '[data-testid="page-header"]')
  ).toHaveScreenshot('assess-quiz-mobile-header.png', STABLE_OPTS);
});
test('/quiz/:id mobile footer', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('assess-quiz-mobile-footer.png', STABLE_OPTS);
});

/* ════════════���══ Extra section & sidebar screenshots ═══════════════ */

test('/assessments desktop sidebar', async ({ page }) => {
  await nav(page, '/assessments', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-list-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/assessments/create tablet sidebar', async ({ page }) => {
  await nav(page, '/assessments/create', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-create-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/item-bank desktop sidebar', async ({ page }) => {
  await nav(page, '/item-bank', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-bank-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/item-bank tablet sidebar', async ({ page }) => {
  await nav(page, '/item-bank', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-bank-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/exam/:id desktop sidebar', async ({ page }) => {
  await nav(page, '/exam/exam-1', 1280, 720);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="exam-sidebar"]')
  ).toHaveScreenshot('assess-exam-desktop-sidebar.png', STABLE_OPTS);
});
test('/exam/:id tablet sidebar', async ({ page }) => {
  await nav(page, '/exam/exam-1', 768, 1024);
  await expect(
    await elOrPage(page, 'aside', '[data-testid="exam-sidebar"]')
  ).toHaveScreenshot('assess-exam-tablet-sidebar.png', STABLE_OPTS);
});
test('/exam/:id/results desktop sidebar', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-results-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/exam/:id/results tablet sidebar', async ({ page }) => {
  await nav(page, '/exam/exam-1/results', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-results-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/quiz/:id desktop sidebar', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-quiz-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/quiz/:id tablet sidebar', async ({ page }) => {
  await nav(page, '/quiz/quiz-1', 768, 1024);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-quiz-tablet-sidebar.png',
    STABLE_OPTS
  );
});
test('/assessments/create desktop sidebar', async ({ page }) => {
  await nav(page, '/assessments/create', 1280, 720);
  await expect(await elOrPage(page, 'aside', 'nav')).toHaveScreenshot(
    'assess-create-desktop-sidebar.png',
    STABLE_OPTS
  );
});
test('/assessments/create mobile footer', async ({ page }) => {
  await nav(page, '/assessments/create', 375, 812);
  await expect(
    await elOrPage(page, 'footer', '[data-testid="page-footer"]')
  ).toHaveScreenshot('assess-create-mobile-footer.png', STABLE_OPTS);
});
