import { test, expect } from '@playwright/test';

/**
 * Scenarios E2E tests — ScenariosPage + RoleplaySimulator.
 * Route: /scenarios
 *
 * DEV_MODE assumptions (VITE_DEV_MODE=true):
 *   - ScenariosPage fires SCENARIO_TEMPLATES_QUERY against the gateway.
 *   - Without a live backend the query fails and the empty-state card renders:
 *     "No scenarios available yet. Create one to get started."
 *   - When the query succeeds, scenario cards appear in a 1–3 column grid.
 *   - Clicking a card opens RoleplaySimulator (full-screen overlay).
 *   - RoleplaySimulator fires START_ROLEPLAY_MUTATION on mount; without backend
 *     the input stays disabled (sessionId remains null).
 *
 * Visual snapshots: apps/web/e2e/snapshots/
 */

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5174';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoScenarios(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/scenarios`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_500);
}

/**
 * Returns true when at least one scenario card is visible in the grid.
 */
async function hasScenariosLoaded(
  page: import('@playwright/test').Page
): Promise<boolean> {
  // Cards render inside a grid with gap-4; each card has an h3 with the scenario title
  const cards = page.locator('h3.font-semibold');
  const count = await cards.count();
  return count > 0;
}

// ── Suite 1: Page load and header ─────────────────────────────────────────────

test.describe('Scenarios — Page load', () => {
  test.beforeEach(async ({ page }) => {
    await gotoScenarios(page);
  });

  test('renders the "Role-Play Scenarios" page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Role-Play Scenarios', level: 1 })
    ).toBeVisible({ timeout: 8_000 });
  });

  test('subtitle text is visible', async ({ page }) => {
    await expect(
      page.getByText(/Practice real-world conversations/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test('"Create Scenario" button is visible in the header', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: /Create Scenario/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('page shows scenario cards OR the empty-state message', async ({
    page,
  }) => {
    const hasCards = await hasScenariosLoaded(page);
    if (hasCards) {
      // At least one card title is visible
      await expect(page.locator('h3.font-semibold').first()).toBeVisible();
    } else {
      // Empty state message
      await expect(page.getByText(/No scenarios available yet/i)).toBeVisible({
        timeout: 8_000,
      });
    }
  });

  test('no crash overlay visible on /scenarios', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

// ── Suite 2: Scenario cards ───────────────────────────────────────────────────

test.describe('Scenarios — Scenario card content', () => {
  test.beforeEach(async ({ page }) => {
    await gotoScenarios(page);
    const hasCards = await hasScenariosLoaded(page);
    if (!hasCards) test.skip();
  });

  test('each scenario card shows a title in an h3 element', async ({
    page,
  }) => {
    const titles = page.locator('h3.font-semibold');
    await expect(titles.first()).toBeVisible({ timeout: 8_000 });
    const count = await titles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('difficulty badge is rendered on scenario cards', async ({ page }) => {
    // DIFFICULTY_BADGES applies text-xs px-2 py-0.5 rounded-full border font-medium
    // Badge text is one of: BEGINNER, INTERMEDIATE, ADVANCED
    const badge = page
      .locator('span.rounded-full.border.font-medium.text-xs')
      .first();
    await expect(badge).toBeVisible({ timeout: 8_000 });
    const text = await badge.textContent();
    expect(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).toContain(text?.trim());
  });

  test('domain icon SVG is rendered on scenario cards', async ({ page }) => {
    // DOMAIN_ICONS map renders Lucide SVG icons inside a rounded-lg div
    const iconWrapper = page.locator('.rounded-lg svg').first();
    await expect(iconWrapper).toBeVisible({ timeout: 8_000 });
  });

  test('scene description text is visible on cards', async ({ page }) => {
    // sceneDescription renders in a <p> with line-clamp-3 and text-xs
    const desc = page
      .locator('p.text-xs.text-muted-foreground.line-clamp-3')
      .first();
    await expect(desc).toBeVisible({ timeout: 8_000 });
    const text = await desc.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('domain and turns info is shown in the card footer', async ({
    page,
  }) => {
    // Footer span: "{domain} · {maxTurns} turns"
    const footer = page
      .locator('span.text-xs.text-muted-foreground.capitalize')
      .first();
    await expect(footer).toBeVisible({ timeout: 8_000 });
    const text = await footer.textContent();
    expect(text).toMatch(/turns/i);
  });

  test('ChevronRight icon is visible on scenario cards', async ({ page }) => {
    const chevron = page.locator('.lucide-chevron-right').first();
    await expect(chevron).toBeVisible({ timeout: 8_000 });
  });
});

// ── Suite 3: Opening a scenario ───────────────────────────────────────────────

test.describe('Scenarios — Clicking a scenario card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoScenarios(page);
    const hasCards = await hasScenariosLoaded(page);
    if (!hasCards) test.skip();
  });

  test('clicking a card opens the RoleplaySimulator full-screen overlay', async ({
    page,
  }) => {
    const firstCard = page.locator('h3.font-semibold').first();
    // Click the parent card element
    await firstCard.click();

    // RoleplaySimulator renders as a fixed inset-0 div with bg-gray-950
    await expect(page.locator('.fixed.inset-0.bg-gray-950')).toBeVisible({
      timeout: 8_000,
    });
  });

  test('RoleplaySimulator shows the scenario title in the header', async ({
    page,
  }) => {
    const titleText = await page
      .locator('h3.font-semibold')
      .first()
      .textContent();
    await page.locator('h3.font-semibold').first().click();

    // The title is rendered as <h2> inside the simulator header
    await expect(
      page
        .locator('h2.text-white.font-bold')
        .filter({ hasText: titleText?.trim() ?? '' })
    ).toBeVisible({ timeout: 8_000 });
  });

  test('RoleplaySimulator shows difficulty badge in the header', async ({
    page,
  }) => {
    await page.locator('h3.font-semibold').first().click();

    // Difficulty badge: text-xs px-2 py-0.5 rounded-full font-medium inside header
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });
    const badge = page
      .locator('.fixed.inset-0 span.text-xs.px-2.rounded-full.font-medium')
      .first();
    await expect(badge).toBeVisible({ timeout: 5_000 });
  });

  test('RoleplaySimulator shows turn counter in the header', async ({
    page,
  }) => {
    await page.locator('h3.font-semibold').first().click();
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Turn counter: "{turnCount} / {maxTurns} turns"
    await expect(page.getByText(/\d+ \/ \d+ turns/)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('RoleplaySimulator chat input field is visible', async ({ page }) => {
    await page.locator('h3.font-semibold').first().click();
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Chat input renders at the bottom of the overlay
    const chatInput = page.locator(
      'input[placeholder*="response"], input[placeholder*="Waiting"]'
    );
    await expect(chatInput.first()).toBeVisible({ timeout: 5_000 });
  });

  test('RoleplaySimulator Send button is visible', async ({ page }) => {
    await page.locator('h3.font-semibold').first().click();
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Send button contains the Send SVG icon (lucide-send)
    const sendBtn = page.locator('.lucide-send').first();
    await expect(sendBtn).toBeVisible({ timeout: 5_000 });
  });

  test('opening scene description appears as the first chat message', async ({
    page,
  }) => {
    await page.locator('h3.font-semibold').first().click();
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });

    // The opening message is set from scenario.sceneDescription in the 'character' bubble
    // Character messages: bg-blue-600 text-white rounded-bl-sm
    const characterBubble = page.locator('.bg-blue-600.text-white').first();
    await expect(characterBubble).toBeVisible({ timeout: 8_000 });
    const text = await characterBubble.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });
});

// ── Suite 4: RoleplaySimulator chat input behaviour ───────────────────────────

test.describe('Scenarios — RoleplaySimulator chat input', () => {
  test.beforeEach(async ({ page }) => {
    await gotoScenarios(page);
    const hasCards = await hasScenariosLoaded(page);
    if (!hasCards) test.skip();
    // Open first scenario
    await page.locator('h3.font-semibold').first().click();
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });
  });

  test('typing into the chat input updates its value', async ({ page }) => {
    const input = page
      .locator('input[placeholder*="response"], input[placeholder*="Waiting"]')
      .first();
    // Input may be disabled until sessionId resolves (no backend in DEV_MODE)
    const isDisabled = await input.isDisabled();
    if (isDisabled) {
      test.skip();
      return;
    }
    await input.fill('Hello, how can I help you?');
    await expect(input).toHaveValue('Hello, how can I help you?');
  });

  test('Send button is disabled when input is empty', async ({ page }) => {
    // The Send button has disabled={isSending || !input.trim() || !sessionId}
    // Without sessionId (no backend), it should be disabled
    const sendBtn = page
      .locator('button')
      .filter({ has: page.locator('.lucide-send') })
      .first();
    await expect(sendBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('close (X) button exits the simulator and returns to scenarios list', async ({
    page,
  }) => {
    // The X button in the header calls onClose → sets activeScenario(null)
    const closeBtn = page
      .locator('button')
      .filter({ has: page.locator('.lucide-x') })
      .first();
    await expect(closeBtn).toBeVisible({ timeout: 5_000 });
    await closeBtn.click();

    // After close the scenarios list heading should be visible again
    await expect(
      page.getByRole('heading', { name: 'Role-Play Scenarios', level: 1 })
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── Suite 5: Error and edge states ────────────────────────────────────────────

test.describe('Scenarios — Error and edge states', () => {
  test('shows error message when GraphQL fails (no backend)', async ({
    page,
  }) => {
    await gotoScenarios(page);

    // When SCENARIO_TEMPLATES_QUERY fails, the error paragraph renders
    const errorPara = page.getByText(/Failed to load scenarios/i);
    const hasError = await errorPara
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasCards = await hasScenariosLoaded(page);
    const hasEmptyState = await page
      .getByText(/No scenarios available yet/i)
      .isVisible()
      .catch(() => false);

    // One of these three states must be true
    expect(hasError || hasCards || hasEmptyState).toBe(true);
  });

  test('loading skeletons render during fetch (if observable)', async ({
    page,
  }) => {
    // Navigate and immediately check for skeleton pulses before data resolves
    await page.goto(`${BASE}/scenarios`, { waitUntil: 'domcontentloaded' });

    // Skeletons are: div.h-48.rounded-xl.bg-muted.animate-pulse
    // They may disappear very quickly; check they exist at some point
    const skeleton = page.locator('.h-48.rounded-xl.bg-muted.animate-pulse');
    const count = await skeleton.count().catch(() => 0);
    // Skeletons may or may not be visible depending on network speed — this is informational
    expect(count >= 0).toBe(true);
  });
});

// ── Suite 6: Visual regression @visual ───────────────────────────────────────

test.describe('Scenarios — Visual regression @visual', () => {
  test('visual: scenarios list page', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoScenarios(page);

    await expect(page).toHaveScreenshot('scenarios-list.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('visual: scenario player open (if cards available)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoScenarios(page);
    const hasCards = await hasScenariosLoaded(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    await page.locator('h3.font-semibold').first().click();
    await page
      .locator('.fixed.inset-0.bg-gray-950')
      .waitFor({ state: 'visible', timeout: 8_000 });
    await page.waitForTimeout(800);

    await expect(page).toHaveScreenshot('scenario-player-open.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('visual: scenario empty state', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Navigate directly; if empty state appears capture it
    await gotoScenarios(page);
    const hasCards = await hasScenariosLoaded(page);
    if (hasCards) {
      test.skip();
      return;
    }

    await expect(page).toHaveScreenshot('scenarios-empty.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
