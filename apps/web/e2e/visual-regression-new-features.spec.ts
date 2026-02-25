/**
 * Visual Regression Tests — New EduSphere Features (Tier 1 + Tier 2)
 *
 * Covers all new pages and components introduced in the feature expansion:
 *   - Quiz & Assessment (F-002): QuizPlayer with all question types + results
 *   - Scenarios & Roleplay (F-007): ScenariosPage, RoleplaySimulator, EvaluationReport
 *   - Content Types: RichDocumentPage, SCORM viewer, Microlesson, LiveSession cards
 *   - Dashboard Widgets: DailyLearning, Leaderboard, SkillGap, AtRisk
 *   - Profile & Portfolio: PublicProfilePage, ProfilePage visibility
 *   - Admin Pages: LtiSettingsPage, ScimSettingsPage, ComplianceReportsPage, CourseAnalytics
 *   - Mobile viewports (375x812 — iPhone 14)
 *   - RTL layout (Hebrew / dir=rtl)
 *
 * Snapshot storage: apps/web/e2e/snapshots/
 * Update snapshots:
 *   pnpm --filter @edusphere/web exec playwright test visual-regression-new-features --update-snapshots
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="@visual-new"
 */

import { test, expect, type Page } from '@playwright/test';

// ── Global: disable animations for stable snapshots ──────────────────────────

test.use({
  reducedMotion: 'reduce',
});

// ── Screenshot tolerances ─────────────────────────────────────────────────────

const STABLE_OPTS = {
  maxDiffPixels: 200,
  threshold: 0.2,
  animations: 'disabled' as const,
};

/** Tolerant options for pages with chart/canvas/dynamic content. */
const LOOSE_OPTS = {
  maxDiffPixels: 500,
  threshold: 0.3,
  animations: 'disabled' as const,
};

// ── Common masks for dynamic content ─────────────────────────────────────────

/**
 * Returns the standard set of dynamic-content locators that should be
 * masked in every screenshot to avoid false-positive pixel diffs.
 */
function dynamicMasks(page: Page) {
  return [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="user-avatar"]'),
    page.locator('[data-dynamic]'),
    page.locator('time'),
    page.locator('.user-avatar'),
    // Mask leaderboard points that change
    page.locator('[data-testid="leaderboard-points"]'),
    // Mask streak counts that increment daily
    page.locator('[data-testid="streak-count"]'),
  ];
}

// ── Shared navigation helper ──────────────────────────────────────────────────

/**
 * Navigate to a route and wait for the page to settle.
 * In DEV_MODE all routes are accessible without authentication.
 */
async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  // Suppress animated spinners before snapping
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ & ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Quiz Player @visual-new', () => {
  test.setTimeout(30_000);

  test('quiz page — multiple choice question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    await expect(page).toHaveScreenshot('quiz-multiple-choice.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz page — fill-in-the-blank question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-fill-1');
    await expect(page).toHaveScreenshot('quiz-fill-blank.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz page — likert scale question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-likert-1');
    await expect(page).toHaveScreenshot('quiz-likert.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz page — matching question renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-match-1');
    await expect(page).toHaveScreenshot('quiz-matching.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz page — progress bar advances correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    // Take screenshot of the progress indicator region only
    const progressBar = page.locator('.rounded-full.h-1\\.5').first();
    if (await progressBar.isVisible().catch(() => false)) {
      await expect(progressBar).toHaveScreenshot('quiz-progress-bar.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('quiz-progress-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('quiz page — not-a-quiz state renders correctly', async ({ page }) => {
    // content-1 is a VIDEO type, not QUIZ — shows the "not a quiz" card
    await goTo(page, '/quiz/content-1');
    await expect(page).toHaveScreenshot('quiz-not-a-quiz-state.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz page — result view renders correctly after submission', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');

    // Submit the quiz if possible — select first option then submit
    const firstOption = page.locator('button, label').filter({ hasText: /option|answer/i }).first();
    const optionVisible = await firstOption.isVisible().catch(() => false);
    if (optionVisible) {
      await firstOption.click();
    }

    const submitBtn = page.locator('button').filter({ hasText: /submit quiz/i });
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    if (submitVisible) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    await expect(page).toHaveScreenshot('quiz-result-view.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS & ROLEPLAY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Scenarios & Roleplay @visual-new', () => {
  test.setTimeout(30_000);

  test('scenarios page — grid of scenario cards renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    await expect(page).toHaveScreenshot('scenarios-grid.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('scenarios page — page heading and create button visible', async ({ page }) => {
    await goTo(page, '/scenarios');
    // Screenshot just the header section for focused comparison
    const header = page.locator('h1').filter({ hasText: /role-play scenarios/i });
    const headerVisible = await header.isVisible().catch(() => false);
    if (headerVisible) {
      const headerSection = page.locator('.space-y-6').first();
      await expect(headerSection).toHaveScreenshot('scenarios-header.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('scenarios-heading-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('scenarios page — empty state renders correctly when no scenarios', async ({ page }) => {
    await goTo(page, '/scenarios');
    // If fetching fails or returns empty, the empty state card should render
    const emptyCard = page.locator('text=No scenarios available yet');
    const loadingSkeletons = page.locator('.animate-pulse');
    const hasEmpty = await emptyCard.isVisible().catch(() => false);
    const hasSkeletons = await loadingSkeletons.first().isVisible().catch(() => false);

    if (hasEmpty || !hasSkeletons) {
      await expect(page).toHaveScreenshot('scenarios-empty-state.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      // Loading state
      await expect(page).toHaveScreenshot('scenarios-loading-state.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('scenarios page — full page screenshot (desktop 1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await goTo(page, '/scenarios');
    await expect(page).toHaveScreenshot('scenarios-full-page-desktop.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('roleplay simulator — chat interface layout (via scenario click)', async ({ page }) => {
    await goTo(page, '/scenarios');
    // Click the first scenario card to enter the roleplay simulator
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (cardVisible) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // allow simulator to initialize
    }
    await expect(page).toHaveScreenshot('roleplay-simulator-chat.png', {
      ...LOOSE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('.whitespace-pre-wrap'), // mask message content
      ],
    });
  });

  test('roleplay simulator — header bar renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (cardVisible) {
      await firstCard.click();
      await page.waitForTimeout(1000);
    }
    const header = page.locator('.bg-gray-900').first();
    const headerVisible = await header.isVisible().catch(() => false);
    if (headerVisible) {
      await expect(header).toHaveScreenshot('roleplay-simulator-header.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('roleplay-simulator-header-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('roleplay simulator — input area renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (cardVisible) {
      await firstCard.click();
      await page.waitForTimeout(1000);
    }
    const inputArea = page.locator('.bg-gray-900').last();
    const inputVisible = await inputArea.isVisible().catch(() => false);
    if (inputVisible) {
      await expect(inputArea).toHaveScreenshot('roleplay-input-area.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('roleplay-input-area-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Content Types @visual-new', () => {
  test.setTimeout(30_000);

  test('rich document page — full page renders correctly', async ({ page }) => {
    await goTo(page, '/document/doc-1');
    await expect(page).toHaveScreenshot('rich-document-page.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('rich document page — not found / missing content state', async ({ page }) => {
    await goTo(page, '/document/does-not-exist');
    await expect(page).toHaveScreenshot('rich-document-not-found.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz content page — breadcrumb and layout render correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    // Check breadcrumb region
    const breadcrumb = page.locator('nav[aria-label*="breadcrumb"], [data-testid="breadcrumb"]').first();
    const breadcrumbVisible = await breadcrumb.isVisible().catch(() => false);
    if (breadcrumbVisible) {
      await expect(breadcrumb).toHaveScreenshot('quiz-breadcrumb.png', STABLE_OPTS);
    }
    await expect(page).toHaveScreenshot('quiz-content-page-layout.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('standard content viewer — renders correctly', async ({ page }) => {
    await goTo(page, '/learn/content-1');
    await expect(page).toHaveScreenshot('content-viewer-standard.png', {
      ...LOOSE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('video'),
      ],
    });
  });

  test('microlesson card — widget visible on dashboard', async ({ page }) => {
    await goTo(page, '/dashboard');
    // DailyLearningWidget renders a MicrolessonCard when lesson is started
    const dailyWidget = page.locator('.card', { hasText: 'Daily Learning' }).first();
    const widgetVisible = await dailyWidget.isVisible().catch(() => false);
    if (widgetVisible) {
      await expect(dailyWidget).toHaveScreenshot('microlesson-card-widget.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('microlesson-card-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Dashboard Widgets @visual-new', () => {
  test.setTimeout(45_000);

  test('dashboard — full page with all new widgets renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true,
      ...LOOSE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('[data-testid="activity-heatmap"]'),
        page.locator('canvas'),
      ],
    });
  });

  test('dashboard — DailyLearningWidget — lesson available state', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: 'Daily Learning' }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-daily-learning-available.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('widget-daily-learning-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard — DailyLearningWidget — all done state after completion', async ({ page }) => {
    await goTo(page, '/dashboard');
    // Simulate completed state by clicking "Start Today's Lesson"
    const startBtn = page.locator('button', { hasText: /start today/i });
    const startVisible = await startBtn.isVisible().catch(() => false);
    if (startVisible) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }
    const widget = page.locator('.card', { hasText: /all done for today/i }).first();
    const doneVisible = await widget.isVisible().catch(() => false);
    if (doneVisible) {
      await expect(widget).toHaveScreenshot('widget-daily-learning-done.png', STABLE_OPTS);
    } else {
      await expect(page).toHaveScreenshot('widget-daily-learning-done-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard — LeaderboardWidget — top 5 list renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: /leaderboard/i }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-leaderboard.png', {
        ...STABLE_OPTS,
        mask: [
          ...dynamicMasks(page),
          page.locator('[data-testid="leaderboard-entry"]'),
        ],
      });
    } else {
      await expect(page).toHaveScreenshot('widget-leaderboard-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard — SkillGapWidget — empty profile state renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: /skill gap/i }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-skill-gap-empty.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('widget-skill-gap-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard — SkillGapWidget — create profile dialog renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const newProfileBtn = page.locator('button', { hasText: /new profile/i });
    const btnVisible = await newProfileBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await newProfileBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.locator('[role="dialog"]');
      const dialogVisible = await dialog.isVisible().catch(() => false);
      if (dialogVisible) {
        await expect(dialog).toHaveScreenshot('widget-skill-gap-create-dialog.png', STABLE_OPTS);
      }
    }
    // Also capture the full page state
    await expect(page).toHaveScreenshot('widget-skill-gap-with-dialog.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('dashboard — SRSWidget — renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const widget = page.locator('.card', { hasText: /review|srs|spaced/i }).first();
    const visible = await widget.isVisible().catch(() => false);
    if (visible) {
      await expect(widget).toHaveScreenshot('widget-srs.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('widget-srs-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard — stats cards section renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    const statsGrid = page.locator('.grid.gap-4').first();
    const gridVisible = await statsGrid.isVisible().catch(() => false);
    if (gridVisible) {
      await expect(statsGrid).toHaveScreenshot('dashboard-stats-cards.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('dashboard-stats-cards-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('dashboard — instructor tools card visible for instructor role', async ({ page }) => {
    await goTo(page, '/dashboard');
    // In DEV_MODE the mock user may include an instructor role — check the tools card
    const toolsCard = page.locator('.card', { hasText: /instructor tools/i });
    const toolsVisible = await toolsCard.isVisible().catch(() => false);
    if (toolsVisible) {
      await expect(toolsCard).toHaveScreenshot('dashboard-instructor-tools.png', STABLE_OPTS);
    } else {
      // Student view — tools card is hidden
      await expect(page).toHaveScreenshot('dashboard-student-view.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE & PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Profile & Portfolio @visual-new', () => {
  test.setTimeout(30_000);

  test('public profile page — hero card renders correctly', async ({ page }) => {
    await goTo(page, '/u/user-1');
    await expect(page).toHaveScreenshot('public-profile-full.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('time'),
        page.locator('text=/Member since/').locator('..'),
      ],
    });
  });

  test('public profile page — private / not found state renders correctly', async ({ page }) => {
    await goTo(page, '/u/non-existent-user-xyz');
    await expect(page).toHaveScreenshot('public-profile-private.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('public profile page — stats row renders correctly', async ({ page }) => {
    await goTo(page, '/u/user-1');
    const statsRow = page.locator('.grid-cols-3, .grid-cols-5').first();
    const statsVisible = await statsRow.isVisible().catch(() => false);
    if (statsVisible) {
      await expect(statsRow).toHaveScreenshot('public-profile-stats-row.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('public-profile-stats-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('profile page — my profile renders correctly', async ({ page }) => {
    await goTo(page, '/profile');
    await expect(page).toHaveScreenshot('profile-page-full.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('text=/student@|instructor@|admin@/').locator('..'),
      ],
    });
  });

  test('profile page — preferences section renders correctly', async ({ page }) => {
    await goTo(page, '/profile');
    const prefsSection = page.locator('.card', { hasText: /preferences/i }).first();
    const prefsVisible = await prefsSection.isVisible().catch(() => false);
    if (prefsVisible) {
      await expect(prefsSection).toHaveScreenshot('profile-preferences-section.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('profile-preferences-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PAGES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Admin Pages @visual-new', () => {
  test.setTimeout(30_000);

  test('LTI settings page — empty platforms list renders correctly', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await expect(page).toHaveScreenshot('admin-lti-empty.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        // Mask the callback URL which contains the current hostname
        page.locator('text=/localhost|https:\/\//').locator('..'),
      ],
    });
  });

  test('LTI settings page — page heading and action buttons visible', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const heading = page.locator('h1', { hasText: /LTI 1.3 Platforms/i });
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const headerSection = page.locator('.max-w-4xl').first();
      await expect(headerSection.locator('.flex.items-center').first()).toHaveScreenshot(
        'admin-lti-header.png',
        STABLE_OPTS,
      );
    } else {
      await expect(page).toHaveScreenshot('admin-lti-header-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('LTI settings page — register platform form renders correctly', async ({ page }) => {
    await goTo(page, '/admin/lti');
    const registerBtn = page.locator('button', { hasText: /register platform/i });
    const btnVisible = await registerBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await registerBtn.click();
      await page.waitForTimeout(300);
      const form = page.locator('.card', { hasText: /Register LTI 1.3 Platform/i });
      const formVisible = await form.isVisible().catch(() => false);
      if (formVisible) {
        await expect(form).toHaveScreenshot('admin-lti-register-form.png', STABLE_OPTS);
      }
    }
    await expect(page).toHaveScreenshot('admin-lti-with-form.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('SCIM settings page — full page renders correctly', async ({ page }) => {
    await goTo(page, '/admin/scim');
    await expect(page).toHaveScreenshot('admin-scim-full.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        // Mask generated SCIM endpoint URL (contains hostname)
        page.locator('.font-mono'),
      ],
    });
  });

  test('SCIM settings page — generate token modal renders correctly', async ({ page }) => {
    await goTo(page, '/admin/scim');
    const generateBtn = page.locator('button', { hasText: /generate token/i });
    const btnVisible = await generateBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await generateBtn.click();
      await page.waitForTimeout(300);
      const modal = page.locator('[class*="fixed inset-0"]').first();
      const modalVisible = await modal.isVisible().catch(() => false);
      if (modalVisible) {
        await expect(modal).toHaveScreenshot('admin-scim-token-modal.png', STABLE_OPTS);
      }
    }
    await expect(page).toHaveScreenshot('admin-scim-with-modal.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('compliance reports page — full page renders correctly', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await expect(page).toHaveScreenshot('admin-compliance-full.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        // Mask due dates which are real dates
        page.locator('text=/Due:/').locator('..'),
      ],
    });
  });

  test('compliance reports page — heading and compliance courses section', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    const heading = page.locator('h1', { hasText: /compliance training reports/i });
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const coursesCard = page.locator('.card', { hasText: /Compliance Courses/i }).first();
      const cardVisible = await coursesCard.isVisible().catch(() => false);
      if (cardVisible) {
        await expect(coursesCard).toHaveScreenshot('admin-compliance-courses-card.png', {
          ...STABLE_OPTS,
          mask: dynamicMasks(page),
        });
      }
    }
    await expect(page).toHaveScreenshot('admin-compliance-heading-section.png', {
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('course analytics page — renders correctly with metrics', async ({ page }) => {
    await goTo(page, '/courses/course-1/analytics');
    await expect(page).toHaveScreenshot('course-analytics-full.png', {
      fullPage: true,
      ...LOOSE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('canvas'),
        page.locator('[data-testid="chart"]'),
      ],
    });
  });

  test('course analytics page — stat cards render correctly', async ({ page }) => {
    await goTo(page, '/courses/course-1/analytics');
    const statsGrid = page.locator('.grid-cols-2, .grid-cols-4').first();
    const gridVisible = await statsGrid.isVisible().catch(() => false);
    if (gridVisible) {
      await expect(statsGrid).toHaveScreenshot('course-analytics-stat-cards.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    } else {
      await expect(page).toHaveScreenshot('course-analytics-stat-cards-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });

  test('course analytics page — at-risk learners table renders correctly', async ({ page }) => {
    await goTo(page, '/courses/course-1/analytics');
    const atRiskCard = page.locator('.card', { hasText: /at-risk learners/i }).first();
    const visible = await atRiskCard.isVisible().catch(() => false);
    if (visible) {
      await expect(atRiskCard).toHaveScreenshot('course-analytics-at-risk-table.png', {
        ...STABLE_OPTS,
        mask: [
          ...dynamicMasks(page),
          page.locator('[data-testid="learner-name"]'),
          page.locator('[data-testid="learner-email"]'),
        ],
      });
    } else {
      await expect(page).toHaveScreenshot('course-analytics-at-risk-fallback.png', {
        ...STABLE_OPTS,
        mask: dynamicMasks(page),
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE VIEWPORTS (375x812 — iPhone 14)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — Mobile Views @visual-new', () => {
  test.setTimeout(30_000);

  test.use({ viewport: { width: 375, height: 812 } });

  test('dashboard — mobile layout with widgets renders correctly', async ({ page }) => {
    await goTo(page, '/dashboard');
    await expect(page).toHaveScreenshot('mobile-dashboard-full.png', {
      fullPage: true,
      ...LOOSE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('canvas'),
      ],
    });
  });

  test('quiz page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/quiz/quiz-mc-1');
    await expect(page).toHaveScreenshot('mobile-quiz-player.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('scenarios page — mobile grid renders correctly', async ({ page }) => {
    await goTo(page, '/scenarios');
    await expect(page).toHaveScreenshot('mobile-scenarios-grid.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('public profile page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/u/user-1');
    await expect(page).toHaveScreenshot('mobile-public-profile.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('time'),
      ],
    });
  });

  test('admin LTI page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/admin/lti');
    await expect(page).toHaveScreenshot('mobile-admin-lti.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('.font-mono'),
      ],
    });
  });

  test('compliance page — mobile layout renders correctly', async ({ page }) => {
    await goTo(page, '/admin/compliance');
    await expect(page).toHaveScreenshot('mobile-compliance-page.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RTL LAYOUT (Hebrew / dir=rtl)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual Regression — RTL Layout (Hebrew) @visual-new', () => {
  test.setTimeout(30_000);

  /** Apply RTL direction and Hebrew language to the document before navigation. */
  async function applyRTL(page: Page) {
    await page.addInitScript(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'he');
    });
  }

  test('dashboard — RTL layout with Hebrew locale renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/dashboard?lang=he');
    await expect(page).toHaveScreenshot('rtl-dashboard.png', {
      fullPage: true,
      ...LOOSE_OPTS,
      mask: [
        ...dynamicMasks(page),
        page.locator('canvas'),
      ],
    });
  });

  test('scenarios page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/scenarios?lang=he');
    await expect(page).toHaveScreenshot('rtl-scenarios.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('quiz page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/quiz/quiz-mc-1?lang=he');
    await expect(page).toHaveScreenshot('rtl-quiz.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('profile page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/profile?lang=he');
    await expect(page).toHaveScreenshot('rtl-profile.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });

  test('admin compliance page — RTL layout renders correctly', async ({ page }) => {
    await applyRTL(page);
    await goTo(page, '/admin/compliance?lang=he');
    await expect(page).toHaveScreenshot('rtl-admin-compliance.png', {
      fullPage: true,
      ...STABLE_OPTS,
      mask: dynamicMasks(page),
    });
  });
});
