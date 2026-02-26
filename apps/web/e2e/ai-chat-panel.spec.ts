/**
 * ai-chat-panel.spec.ts — Floating AI Chat Panel widget E2E tests.
 *
 * The AIChatPanel is a fixed-position floating widget rendered on authenticated
 * pages. It provides a slide-in panel with agent selection, chat history, and
 * a message input.
 *
 * Component: apps/web/src/components/AIChatPanel.tsx
 * Auth: DEV_MODE auto-authenticates as SUPER_ADMIN; Keycloak login otherwise.
 *
 * Key aria-labels:
 *   "Open AI chat"   — FAB toggle button (MessageSquare icon)
 *   "Close AI chat"  — X button inside the panel header
 *   "Send message"   — Send button inside the input area
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="AI Chat Panel"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Navigate to the dashboard (which always renders the AIChatPanel) and wait
 * for the page to settle so the FAB is interactive.
 */
async function gotoPageWithPanel(page: Parameters<typeof login>[0]) {
  await login(page);
  // Navigate to dashboard — AIChatPanel is rendered on all authenticated pages
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe('AI Chat Panel', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await gotoPageWithPanel(page);
  });

  // 1. Toggle open / close
  test('FAB opens the chat panel and close button hides it', async ({
    page,
  }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });

    // Panel should be off-screen before opening (translate-x-full)
    const closeBtn = page.locator('[aria-label="Close AI chat"]');

    // Open the panel
    await fab.click();

    // Close button becomes visible once panel slides in
    await expect(closeBtn).toBeVisible({ timeout: 10_000 });

    // FAB should be hidden while panel is open
    await expect(fab).not.toBeVisible({ timeout: 5_000 });

    // Close the panel
    await closeBtn.click();

    // FAB returns; close button slides away
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await expect(closeBtn).not.toBeVisible({ timeout: 5_000 });
  });

  // 2. Agent selector dropdown contains at least the "Chavruta" option
  test('agent selector dropdown shows at least the Chavruta option', async ({
    page,
  }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    // Wait for the panel to slide in and the select trigger to render
    const selectTrigger = page.locator('[role="combobox"]').first();
    await expect(selectTrigger).toBeVisible({ timeout: 10_000 });

    // Open the dropdown
    await selectTrigger.click();

    // The "Chavruta" agent option must be present in the dropdown list
    const chavrutaOption = page
      .locator('[role="option"]')
      .filter({ hasText: /chavruta/i });
    await expect(chavrutaOption.first()).toBeVisible({ timeout: 5_000 });
  });

  // 3. Typing and pressing Enter adds the user message to the chat
  test('typing a message and pressing Enter appends user bubble to chat', async ({
    page,
  }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const testMessage = 'What is the meaning of life?';

    // The chat input placeholder is `Ask ${agent.name}...`
    // (default agent is "Chavruta", so placeholder = "Ask Chavruta...")
    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.fill(testMessage);
    await page.keyboard.press('Enter');

    // The user message should appear as a chat bubble
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10_000 });
  });

  // 4. Send button is disabled when input is empty
  test('Send button is disabled when the input is empty', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const sendBtn = page.locator('[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });

    // Input starts empty — button must be disabled
    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Ensure input is empty
    await input.clear();

    await expect(sendBtn).toBeDisabled({ timeout: 5_000 });
  });

  // 5. Typing something enables the Send button
  test('Send button is enabled after typing non-whitespace text', async ({
    page,
  }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const sendBtn = page.locator('[aria-label="Send message"]');
    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.fill('Hello');
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
  });

  // 6. Mobile viewport — clicking the backdrop closes the panel
  test('clicking the backdrop on mobile viewport closes the panel', async ({
    page,
  }) => {
    // Resize to mobile width so the md:hidden backdrop becomes visible
    await page.setViewportSize({ width: 375, height: 812 });

    const fab = page.locator('[aria-label="Open AI chat"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await fab.click();

    const closeBtn = page.locator('[aria-label="Close AI chat"]');
    await expect(closeBtn).toBeVisible({ timeout: 10_000 });

    // The backdrop is the semi-transparent overlay (bg-black/50 md:hidden)
    // It covers the left side of the screen on mobile
    const backdrop = page.locator(
      'div.fixed.inset-0[class*="bg-black"]'
    );
    await expect(backdrop).toBeVisible({ timeout: 5_000 });

    await backdrop.click({ position: { x: 50, y: 400 } });

    // Panel should close — FAB reappears
    await expect(fab).toBeVisible({ timeout: 10_000 });
  });
});
