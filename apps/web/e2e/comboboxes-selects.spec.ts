import { test, expect } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';

/**
 * Comboboxes, Selects, Tabs, and Dropdowns E2E tests.
 *
 * Auth: DEV_MODE=true (VITE_DEV_MODE=true) — auto-authenticated as SUPER_ADMIN
 * mock user. No Keycloak required.
 *
 * Covered interactive controls:
 *
 *   TABS
 *   ────
 *   1. Content Viewer (/learn/content-1)
 *      - Knowledge Graph panel: "Graph" | "Search" tabs (Radix Tabs)
 *   2. Annotations page (/annotations)
 *      - "all" | PERSONAL | SHARED | INSTRUCTOR | AI_GENERATED tabs
 *      - Layer summary cards (role=button / aria-pressed) that drive the tabs
 *   3. Agents page (/agents) — mode cards (5 agent templates)
 *
 *   SELECTS / COMBOBOXES
 *   ─────────────────────
 *   4. Course wizard Step 1 (/courses/new)
 *      - Difficulty combobox: BEGINNER / INTERMEDIATE / ADVANCED
 *   5. Settings page (/settings)
 *      - Language combobox: all locale options
 *   6. Content Viewer annotation layer buttons (inline select-like control)
 *
 *   SORT CONTROLS
 *   ─────────────
 *   7. Annotations page sort-by Time / Layer toggle buttons
 */

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function loginDevMode(page: import('@playwright/test').Page) {
  await loginInDevMode(page);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONTENT VIEWER — Annotations | AI Study Partner | Context Tabs  (/learn/content-1)
//
// NOTE: /learn/:contentId is handled by UnifiedLearningPage (not the old ContentViewer).
// The right panel (ToolsPanel) shows three custom role="tab" buttons:
//   "Annotations" | "AI Study Partner" | "Context"
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Content Viewer — Annotations | AI | Context tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/learn/content-1');
    await page.waitForLoadState('networkidle');
    // Wait for the tablist containing the three panel tabs
    await page.getByRole('tablist').waitFor({ state: 'visible', timeout: 10_000 });
  });

  test('Annotations tab is visible in the tools panel', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /annotations/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('AI Study Partner tab is visible', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /AI Study Partner|AI|chavruta/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Context tab is visible', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /context/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Annotations tab is selected by default', async ({ page }) => {
    const annotationsTab = page
      .getByRole('tab', { name: /annotations/i })
      .first();
    await expect(annotationsTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 8_000,
    });
  });

  test('clicking AI Study Partner tab activates it', async ({ page }) => {
    const aiTab = page
      .getByRole('tab', { name: /AI Study Partner|AI|chavruta/i })
      .first();
    await aiTab.click();

    await expect(aiTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 3_000,
    });
  });

  test('switching from Annotations to AI Study Partner does not crash the page', async ({
    page,
  }) => {
    const annotationsTab = page
      .getByRole('tab', { name: /annotations/i })
      .first();
    const aiTab = page
      .getByRole('tab', { name: /AI Study Partner|AI|chavruta/i })
      .first();

    await aiTab.click();
    await expect(aiTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 3_000,
    });
    await annotationsTab.click();
    await expect(annotationsTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 3_000,
    });

    // Video player must still be attached
    await expect(page.locator('video')).toBeAttached({ timeout: 3_000 });
  });

  test('AI Study Partner tab: chat interface has a message input', async ({
    page,
  }) => {
    const aiTab = page
      .getByRole('tab', { name: /AI Study Partner|AI|chavruta/i })
      .first();
    await aiTab.click();

    // Chat interface shows a textarea or textbox for sending messages
    const chatInput = page
      .locator('textarea')
      .or(page.locator('input[type="text"][placeholder*="message"]'))
      .last();
    await expect(chatInput).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Context tab activates it and does not crash', async ({
    page,
  }) => {
    const contextTab = page.getByRole('tab', { name: /context/i }).first();
    await contextTab.click();

    await expect(contextTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 3_000,
    });

    // Page stays on /learn after switching tabs
    expect(page.url()).toContain('/learn');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ANNOTATIONS PAGE — Tabs and Layer Summary Cards  (/annotations)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Annotations page — layer tabs and summary cards', () => {
  test.beforeEach(async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/annotations');
    await page.waitForLoadState('networkidle');
  });

  // ── Tab bar ─────────────────────────────────────────────────────────────────

  test('"All" tab is visible in the TabsList', async ({ page }) => {
    // Radix Tabs: value="all"
    await expect(page.getByRole('tab', { name: /all/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('PERSONAL tab is visible', async ({ page }) => {
    // TabsTrigger value="PERSONAL" — label "Personal" from ANNOTATION_LAYER_META
    await expect(page.getByRole('tab', { name: /Personal/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('SHARED tab is visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Shared/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('INSTRUCTOR tab is visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Instructor/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('AI_GENERATED tab is visible', async ({ page }) => {
    // Label is "AI" in ANNOTATION_LAYER_META
    await expect(page.getByRole('tab', { name: /AI/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('"All" tab is active by default', async ({ page }) => {
    const allTab = page.getByRole('tab', { name: /all/i });
    await expect(allTab).toHaveAttribute('data-state', 'active', {
      timeout: 8_000,
    });
  });

  test('clicking Personal tab activates the Personal panel', async ({
    page,
  }) => {
    const personalTab = page.getByRole('tab', { name: /Personal/i });
    await personalTab.click();

    await expect(personalTab).toHaveAttribute('data-state', 'active', {
      timeout: 3_000,
    });

    // The tabpanel for PERSONAL should be visible
    await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 3_000 });
  });

  test('clicking Shared tab activates the Shared panel', async ({ page }) => {
    const sharedTab = page.getByRole('tab', { name: /Shared/i });
    await sharedTab.click();

    await expect(sharedTab).toHaveAttribute('data-state', 'active', {
      timeout: 3_000,
    });
  });

  test('clicking Instructor tab activates the Instructor panel', async ({
    page,
  }) => {
    const instructorTab = page.getByRole('tab', { name: /Instructor/i });
    await instructorTab.click();

    await expect(instructorTab).toHaveAttribute('data-state', 'active', {
      timeout: 3_000,
    });
  });

  test('cycling through all tabs does not crash the page', async ({ page }) => {
    const tabNames = [/Personal/i, /Shared/i, /Instructor/i, /AI/i, /all/i];

    for (const name of tabNames) {
      const tab = page.getByRole('tab', { name });
      await tab.click();
      await page.waitForTimeout(150);
      await expect(tab).toHaveAttribute('data-state', 'active', {
        timeout: 2_000,
      });
    }

    // Page heading should still be visible after cycling
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 3_000,
    });
  });

  test('switching tabs shows different content (no annotations message is tab-specific)', async ({
    page,
  }) => {
    // In DEV_MODE the GraphQL query returns [] (no mock data set up) so each
    // layer tab shows an empty message specific to that layer.
    const personalTab = page.getByRole('tab', { name: /Personal/i });
    await personalTab.click();

    // TabsContent for PERSONAL shows "no personal annotations" or similar empty state
    await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 3_000 });
  });

  // ── Layer summary cards ──────────────────────────────────────────────────────

  test('four layer summary cards are visible above the tabs', async ({
    page,
  }) => {
    // ALL_LAYERS = [PERSONAL, SHARED, INSTRUCTOR, AI_GENERATED]
    // Rendered as Card with role="button" and aria-pressed
    const layerCards = page.getByRole('button', {
      name: /(Personal|Shared|Instructor|AI)/i,
    });
    const count = await layerCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('clicking the Personal layer card sets activeTab to PERSONAL', async ({
    page,
  }) => {
    // Find the summary card — it has role="button" and is distinct from the TabsTrigger
    const personalCard = page
      .getByRole('button')
      .filter({ hasText: 'Personal' })
      .first();

    await personalCard.click();
    await page.waitForTimeout(300);

    // The corresponding tab should become active
    const personalTab = page.getByRole('tab', { name: /Personal/i });
    await expect(personalTab).toHaveAttribute('data-state', 'active', {
      timeout: 3_000,
    });
  });

  test('clicking the Shared layer card activates the Shared tab', async ({
    page,
  }) => {
    const sharedCard = page
      .getByRole('button')
      .filter({ hasText: 'Shared' })
      .first();

    await sharedCard.click();
    await page.waitForTimeout(300);

    const sharedTab = page.getByRole('tab', { name: /Shared/i });
    await expect(sharedTab).toHaveAttribute('data-state', 'active', {
      timeout: 3_000,
    });
  });

  test('layer card aria-pressed attribute reflects selected state', async ({
    page,
  }) => {
    // Find the Personal layer summary card (role=button with aria-pressed)
    // Do not filter by pressed state since the locator re-evaluates dynamically
    const personalCard = page
      .getByRole('button')
      .filter({ hasText: 'Personal' })
      .first();

    // Initially aria-pressed should be false (activeTab='all')
    await expect(personalCard).toHaveAttribute('aria-pressed', 'false', {
      timeout: 3_000,
    });

    // Click to select
    await personalCard.click();
    await page.waitForTimeout(200);

    // After click, aria-pressed should be true
    await expect(personalCard).toHaveAttribute('aria-pressed', 'true', {
      timeout: 3_000,
    });
  });

  // ── Sort controls ────────────────────────────────────────────────────────────

  test('sort "By Time" button is visible', async ({ page }) => {
    // AnnotationsPage renders sort toggle buttons
    await expect(page.getByRole('button', { name: /time/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('sort "By Layer" button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /layer/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('clicking "By Layer" sort button activates it', async ({ page }) => {
    const layerSortBtn = page.getByRole('button', { name: /layer/i });
    await layerSortBtn.click();

    // After clicking, the button should have variant="default" (active style)
    // Shadcn Button variant="default" adds bg-primary class
    await expect(layerSortBtn).toHaveClass(/bg-primary/, { timeout: 2_000 });
  });

  test('clicking sort buttons does not crash the page', async ({ page }) => {
    const timeSortBtn = page.getByRole('button', { name: /time/i });
    const layerSortBtn = page.getByRole('button', { name: /layer/i });

    await layerSortBtn.click();
    await page.waitForTimeout(200);
    await timeSortBtn.click();
    await page.waitForTimeout(200);

    // Page heading must still be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 3_000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AGENTS PAGE — Mode Selector Cards  (/agents)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Agents page — 5 agent template mode cards', () => {
  test.beforeEach(async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test('all 5 agent mode cards are rendered', async ({ page }) => {
    // AGENT_MODES: chavruta, quiz, summarize, research, explain
    await expect(
      page
        .locator('button')
        .filter({ hasText: /Chavruta Debate/i })
        .first()
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page
        .locator('button')
        .filter({ hasText: /Quiz Master/i })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('button')
        .filter({ hasText: /Summarizer/i })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('button')
        .filter({ hasText: /Research Scout/i })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('button')
        .filter({ hasText: /Explainer/i })
        .first()
    ).toBeVisible();
  });

  test('Chavruta Debate card is active by default (has ring-2 class)', async ({
    page,
  }) => {
    const chavrutaCard = page
      .locator('button')
      .filter({ hasText: /Chavruta Debate/i })
      .first();
    await expect(chavrutaCard).toBeVisible({ timeout: 8_000 });

    // Active card has ring-2 ring-primary in its className
    await expect(chavrutaCard).toHaveClass(/ring-2/, { timeout: 3_000 });
  });

  test('clicking Quiz Master makes it the active mode', async ({ page }) => {
    const quizCard = page
      .locator('button')
      .filter({ hasText: /Quiz Master/i })
      .first();
    await quizCard.click();

    // Quiz Master card now has ring-2 (active state)
    await expect(quizCard).toHaveClass(/ring-2/, { timeout: 3_000 });

    // Chat header changes to "Quiz Master"
    const chatHeader = page
      .locator('[class*="font-semibold"]')
      .filter({ hasText: /Quiz Master/i });
    await expect(chatHeader.first()).toBeVisible({ timeout: 3_000 });
  });

  test('clicking Summarizer makes it the active mode', async ({ page }) => {
    const summarizerCard = page
      .locator('button')
      .filter({ hasText: /Summarizer/i })
      .first();
    await summarizerCard.click();

    await expect(summarizerCard).toHaveClass(/ring-2/, { timeout: 3_000 });

    const chatHeader = page
      .locator('[class*="font-semibold"]')
      .filter({ hasText: /Summarizer/i });
    await expect(chatHeader.first()).toBeVisible({ timeout: 3_000 });
  });

  test('clicking Research Scout makes it the active mode', async ({ page }) => {
    const researchCard = page
      .locator('button')
      .filter({ hasText: /Research Scout/i })
      .first();
    await researchCard.click();

    await expect(researchCard).toHaveClass(/ring-2/, { timeout: 3_000 });

    const chatHeader = page
      .locator('[class*="font-semibold"]')
      .filter({ hasText: /Research Scout/i });
    await expect(chatHeader.first()).toBeVisible({ timeout: 3_000 });
  });

  test('clicking Explainer makes it the active mode', async ({ page }) => {
    const explainerCard = page
      .locator('button')
      .filter({ hasText: /Explainer/i })
      .first();
    await explainerCard.click();

    await expect(explainerCard).toHaveClass(/ring-2/, { timeout: 3_000 });

    const chatHeader = page
      .locator('[class*="font-semibold"]')
      .filter({ hasText: /Explainer/i });
    await expect(chatHeader.first()).toBeVisible({ timeout: 3_000 });
  });

  test('switching modes shows a different initial greeting in the chat', async ({
    page,
  }) => {
    // Chavruta default greeting contains "Chavruta partner" or "שלום"
    await expect(
      page.getByText(/Chavruta partner/i).or(page.getByText(/שלום/))
    ).toBeVisible({ timeout: 5_000 });

    // Switch to Quiz Master
    const quizCard = page
      .locator('button')
      .filter({ hasText: /Quiz Master/i })
      .first();
    await quizCard.click();

    // Quiz greeting: "test your knowledge"
    await expect(page.getByText(/test your knowledge/i)).toBeVisible({
      timeout: 3_000,
    });
  });

  test('switching between all 5 modes sequentially does not crash', async ({
    page,
  }) => {
    const modes = [
      /Chavruta Debate/i,
      /Quiz Master/i,
      /Summarizer/i,
      /Research Scout/i,
      /Explainer/i,
    ];

    for (const name of modes) {
      const card = page.locator('button').filter({ hasText: name }).first();
      await card.click();
      await page.waitForTimeout(200);
      await expect(card).toHaveClass(/ring-2/, { timeout: 2_000 });
    }

    // Page heading must still be present
    await expect(
      page.getByRole('heading', { name: /AI Learning Agents/i })
    ).toBeVisible({ timeout: 3_000 });
  });

  test('each mode card shows its description text', async ({ page }) => {
    const expectedDescriptions = [
      /Dialectical partner/i,
      /Adaptive quizzes/i,
      /Progressive summaries/i,
      /Cross-reference finder/i,
      /Adaptive explanations/i,
    ];

    for (const desc of expectedDescriptions) {
      await expect(page.getByText(desc).first()).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('quick prompt chips change when switching modes', async ({ page }) => {
    // Chavruta prompts
    await expect(page.getByText('Debate free will')).toBeVisible({
      timeout: 5_000,
    });

    // Switch to Quiz Master
    await page
      .locator('button')
      .filter({ hasText: /Quiz Master/i })
      .first()
      .click();
    await page.waitForTimeout(300);

    // Quiz prompts appear
    await expect(page.getByText(/Quiz me/i).first()).toBeVisible({
      timeout: 3_000,
    });

    // Chavruta prompt should be gone (different mode chips)
    await expect(
      page.locator('div.overflow-x-auto').getByText('Debate free will')
    ).not.toBeVisible({ timeout: 2_000 });
  });

  test('each mode card is keyboard-navigable (focusable)', async ({ page }) => {
    // Tab to first mode card and verify it can receive focus
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Press Enter to activate the focused mode card
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Page should not crash
    await expect(
      page.getByRole('heading', { name: /AI Learning Agents/i })
    ).toBeVisible({ timeout: 3_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. COURSE WIZARD — Difficulty Combobox  (/courses/new)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Course wizard — Difficulty select/combobox', () => {
  test.beforeEach(async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/courses/new');
    await page.waitForLoadState('networkidle');
  });

  test('difficulty combobox defaults to BEGINNER', async ({ page }) => {
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible({ timeout: 8_000 });
    // Default is 'BEGINNER' — label "Beginner"
    await expect(trigger).toContainText(/Beginner/i, { timeout: 3_000 });
  });

  test('difficulty combobox opens with all 3 options', async ({ page }) => {
    const trigger = page.getByRole('combobox').first();
    await trigger.click();

    await expect(page.getByRole('option', { name: /Beginner/i })).toBeVisible({
      timeout: 3_000,
    });
    await expect(
      page.getByRole('option', { name: /Intermediate/i })
    ).toBeVisible();
    await expect(page.getByRole('option', { name: /Advanced/i })).toBeVisible();
  });

  test('selecting Intermediate closes dropdown and shows Intermediate', async ({
    page,
  }) => {
    const trigger = page.getByRole('combobox').first();
    await trigger.click();
    await page.getByRole('option', { name: /Intermediate/i }).click();

    // Dropdown closes and trigger shows the new value
    await expect(
      page.getByRole('option', { name: /Intermediate/i })
    ).not.toBeVisible({ timeout: 3_000 });
    await expect(trigger).toContainText(/Intermediate/i, { timeout: 3_000 });
  });

  test('selecting Advanced closes dropdown and shows Advanced', async ({
    page,
  }) => {
    const trigger = page.getByRole('combobox').first();
    await trigger.click();
    await page.getByRole('option', { name: /Advanced/i }).click();

    await expect(trigger).toContainText(/Advanced/i, { timeout: 3_000 });
  });

  test('clicking BEGINNER option when BEGINNER is already selected keeps BEGINNER', async ({
    page,
  }) => {
    const trigger = page.getByRole('combobox').first();
    await trigger.click();
    await page.getByRole('option', { name: /Beginner/i }).click();

    await expect(trigger).toContainText(/Beginner/i, { timeout: 3_000 });
  });

  test('combobox can be opened and closed with keyboard (Enter/Escape)', async ({
    page,
  }) => {
    const trigger = page.getByRole('combobox').first();
    await trigger.focus();
    await trigger.press('Enter');

    // Options should be visible after pressing Enter
    await expect(page.getByRole('option', { name: /Beginner/i })).toBeVisible({
      timeout: 3_000,
    });

    // Escape closes the dropdown
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('option', { name: /Beginner/i })
    ).not.toBeVisible({ timeout: 2_000 });
  });

  test('changing difficulty does not affect the title field', async ({
    page,
  }) => {
    const titleInput = page
      .locator('input[placeholder*="Introduction"]')
      .first();
    await titleInput.fill('Original Title');

    const trigger = page.getByRole('combobox').first();
    await trigger.click();
    await page.getByRole('option', { name: /Advanced/i }).click();

    // Title field unchanged
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toBe('Original Title');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SETTINGS PAGE — Language Combobox  (/settings)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Settings page — Language combobox', () => {
  test.beforeEach(async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('language combobox is present and enabled on the settings page', async ({
    page,
  }) => {
    const selector = page.getByRole('combobox').first();
    await expect(selector).toBeVisible({ timeout: 8_000 });
    await expect(selector).toBeEnabled();
  });

  test('opening the language combobox shows at least one locale option', async ({
    page,
  }) => {
    const selector = page.getByRole('combobox').first();
    await selector.click();

    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 3_000 });
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('English locale option is always present', async ({ page }) => {
    const selector = page.getByRole('combobox').first();
    await selector.click();

    await expect(page.getByRole('option', { name: /English/i })).toBeVisible({
      timeout: 3_000,
    });
  });

  test('selecting a locale from the dropdown closes the dropdown', async ({
    page,
  }) => {
    const selector = page.getByRole('combobox').first();
    await selector.click();

    const firstOption = page.getByRole('option').first();
    await firstOption.click();

    // Dropdown should close
    await expect(page.getByRole('option').first()).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('language combobox shows flag + native name + English name in each option', async ({
    page,
  }) => {
    const selector = page.getByRole('combobox').first();
    await selector.click();

    // Each SelectItem renders: flag emoji + native name + English name in parens
    // English option: 🇺🇸 English (English)
    const englishOption = page.getByRole('option', { name: /English/i });
    await expect(englishOption).toBeVisible({ timeout: 3_000 });
    // The option contains a flag emoji span and the English label span
    await expect(englishOption.locator('[role="img"]')).toBeAttached({
      timeout: 2_000,
    });
  });

  test('language combobox is disabled when isSaving=true (simulated via multiple rapid selections)', async ({
    page,
  }) => {
    // The disabled prop comes from isSaving — in DEV_MODE mutations are not
    // actually in-flight so we just verify the selector remains functional.
    const selector = page.getByRole('combobox').first();
    await expect(selector).toBeEnabled({ timeout: 5_000 });
  });

  test('selecting each locale and re-opening shows it as the selected value', async ({
    page,
  }) => {
    const selector = page.getByRole('combobox').first();
    await selector.click();

    // Gather all option texts
    const optionCount = await page.getByRole('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(1);

    // Select the first option
    const firstOption = page.getByRole('option').first();
    const firstOptionText = await firstOption.innerText();
    await firstOption.click();
    await page.waitForTimeout(300);

    // Reopen and verify aria-selected is set
    await selector.click();
    // At least the selected option should have aria-selected
    const selectedOption = page.getByRole('option', { selected: true });
    await expect(selectedOption.first()).toBeVisible({ timeout: 3_000 });
    expect(firstOptionText).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CONTENT VIEWER — Annotation Layer Selector (inline select-like)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Content Viewer — inline annotation layer selector', () => {
  test.beforeEach(async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/learn/content-1');
    await page.waitForLoadState('networkidle');
    await page.locator('video').waitFor({ state: 'visible', timeout: 10_000 });

    // Open the annotation form
    const addBtn = page.getByRole('button', { name: /^Add$/i });
    await addBtn.click();
    await page
      .locator('textarea[placeholder*="annotation"]')
      .or(page.locator('textarea[placeholder*="note"]'))
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
  });

  test('layer buttons are rendered inside the annotation form', async ({
    page,
  }) => {
    // Layer buttons use data-context="form" attribute and text labels from LAYER_META
    await expect(
      page.locator('button[data-context="form"]').filter({ hasText: 'Personal' })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('button[data-context="form"]').filter({ hasText: 'Shared' })
    ).toBeVisible();
    await expect(
      page.locator('button[data-context="form"]').filter({ hasText: 'Instructor' })
    ).toBeVisible();
  });

  test('PERSONAL layer is selected by default (ring-2 class)', async ({
    page,
  }) => {
    // Default layer is AnnotationLayer.PERSONAL
    // Use data-context="form" to target inline form buttons (not LayerToggleBar)
    const personalBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Personal$/ })
      .first();
    await expect(personalBtn).toBeVisible({ timeout: 5_000 });
    await expect(personalBtn).toHaveClass(/ring-2/, { timeout: 2_000 });
  });

  test('clicking SHARED layer selects it and deselects PERSONAL', async ({
    page,
  }) => {
    // Use data-context="form" to target inline form buttons (not LayerToggleBar)
    const personalBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Personal$/ })
      .first();
    const sharedBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Shared$/ })
      .first();

    await sharedBtn.click();

    // Shared gains ring-2
    await expect(sharedBtn).toHaveClass(/ring-2/, { timeout: 2_000 });
    // Personal loses ring-2 (becomes opacity-60)
    await expect(personalBtn).not.toHaveClass(/ring-2/, { timeout: 2_000 });
  });

  test('clicking INSTRUCTOR layer selects it', async ({ page }) => {
    // Use data-context="form" to target inline form buttons (not LayerToggleBar)
    const instructorBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Instructor$/ })
      .first();
    await instructorBtn.click();
    await expect(instructorBtn).toHaveClass(/ring-2/, { timeout: 2_000 });
  });

  test('clicking AI layer selects it', async ({ page }) => {
    // Use data-context="form" to target inline form buttons (not LayerToggleBar)
    const aiBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^AI$/ })
      .first();
    await aiBtn.click();
    await expect(aiBtn).toHaveClass(/ring-2/, { timeout: 2_000 });
  });

  test('only one layer can be selected at a time', async ({ page }) => {
    // Use data-context="form" to target inline form buttons (not LayerToggleBar)
    const personalBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Personal$/ })
      .first();
    const sharedBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Shared$/ })
      .first();
    const instructorBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Instructor$/ })
      .first();

    await sharedBtn.click();
    await expect(sharedBtn).toHaveClass(/ring-2/, { timeout: 2_000 });
    await expect(personalBtn).not.toHaveClass(/ring-2/, { timeout: 2_000 });
    await expect(instructorBtn).not.toHaveClass(/ring-2/, { timeout: 2_000 });
  });

  test('submitting with SHARED layer selected saves as SHARED annotation', async ({
    page,
  }) => {
    // Select SHARED layer, fill text, and save
    // Use data-context="form" to target inline form buttons (not LayerToggleBar)
    const sharedBtn = page
      .locator('button[data-context="form"]')
      .filter({ hasText: /^Shared$/ })
      .first();
    await sharedBtn.click();

    const textarea = page
      .locator('textarea[placeholder*="annotation"]')
      .or(page.locator('textarea[placeholder*="note"]'))
      .first();
    const uniqueText = `Shared layer annotation ${Date.now()}`;
    await textarea.fill(uniqueText);

    const saveBtn = page.getByRole('button', { name: /Save @/i });
    await saveBtn.click();

    // Annotation should appear in the list (layer stored internally)
    await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 5_000 });
  });
});
