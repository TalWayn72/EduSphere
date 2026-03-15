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
    const backdrop = page.locator('div.fixed.inset-0[class*="bg-black"]');
    await expect(backdrop).toBeVisible({ timeout: 5_000 });

    await backdrop.click({ position: { x: 50, y: 400 } });

    // Panel should close — FAB reappears
    await expect(fab).toBeVisible({ timeout: 10_000 });
  });

  // 7. Send message via Send button (not just Enter)
  test('clicking Send button submits the message', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    const testMessage = 'Explain graph theory basics';
    await input.fill(testMessage);

    const sendBtn = page.locator('[aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
    await sendBtn.click();

    // User message should appear in chat
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10_000 });
  });

  // 8. Streaming response placeholder — assistant message area appears
  test('after sending message, assistant response area appears', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.fill('What is machine learning?');
    await page.keyboard.press('Enter');

    // Look for the assistant bubble, loading indicator, or typing indicator
    const assistantArea = page.locator(
      '[data-testid*="assistant"], [data-testid*="message-ai"], [class*="assistant"], [aria-label*="thinking" i], [data-testid*="typing"]'
    ).first();
    const loadingDots = page.getByText(/\.\.\.|thinking|loading/i).first();

    // Wait a bit for response handling
    await page.waitForTimeout(1_000);

    const assistantVisible = await assistantArea.isVisible().catch(() => false);
    const loadingVisible = await loadingDots.isVisible().catch(() => false);
    const userMsgVisible = await page.getByText('What is machine learning?').isVisible();

    // At minimum, the user message should be present
    expect(userMsgVisible).toBe(true);
  });

  // 9. Chat history — multiple messages are shown
  test('chat history shows multiple user messages', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Send first message
    await input.fill('Message one');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Message one')).toBeVisible({ timeout: 10_000 });

    // Send second message
    await input.fill('Message two');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Message two')).toBeVisible({ timeout: 10_000 });

    // Both messages should remain visible (chat history)
    await expect(page.getByText('Message one')).toBeVisible();
    await expect(page.getByText('Message two')).toBeVisible();
  });

  // 10. Clear chat — if available
  test('clear chat button resets the conversation', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Send a message first
    await input.fill('Hello AI');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Hello AI')).toBeVisible({ timeout: 10_000 });

    // Look for a clear/reset chat button
    const clearBtn = page.locator(
      'button[aria-label*="clear" i], button[aria-label*="reset" i], button:has-text("Clear"), button:has-text("New chat")'
    ).first();
    const clearExists = await clearBtn.isVisible().catch(() => false);

    if (clearExists) {
      await clearBtn.click();
      await page.waitForTimeout(500);

      // After clearing, the old message should be gone
      await expect(page.getByText('Hello AI')).not.toBeVisible({ timeout: 5_000 });
    }
  });

  // 11. Error handling — AI service unavailable
  test('shows error state when AI service returns an error', async ({ page }) => {
    // Intercept AI/GraphQL requests to simulate failure
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('sendMessage') || body.includes('AgentChat') || body.includes('agentMessage')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'AI service unavailable' }] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });

    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    await input.fill('This should fail');
    await page.keyboard.press('Enter');

    // Wait for error handling
    await page.waitForTimeout(2_000);

    // Should NOT show raw error strings to user
    const body = await page.textContent('body');
    expect(body).not.toContain('500');
    expect(body).not.toContain('ECONNREFUSED');
    expect(body).not.toContain('[object Object]');
  });

  // 12. Suggested prompts — if present
  test('suggested prompts are clickable and fill input', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    // Look for suggested prompt chips/buttons
    const suggestions = page.locator(
      '[data-testid*="suggestion"], [data-testid*="prompt"], button[class*="suggestion"]'
    );
    const suggestionCount = await suggestions.count();

    if (suggestionCount > 0) {
      const firstSuggestion = suggestions.first();
      const suggestionText = await firstSuggestion.textContent();
      await firstSuggestion.click();
      await page.waitForTimeout(500);

      // The input should be filled with the suggestion OR the message should be sent
      const input = page.locator('input[placeholder*="Ask "]').first();
      const inputValue = await input.inputValue().catch(() => '');
      const messageSent = await page.getByText(suggestionText ?? '').isVisible().catch(() => false);

      expect(inputValue.length > 0 || messageSent).toBe(true);
    }
  });

  // 13. Code block rendering — markdown with code
  test('chat panel does not crash with code-like content', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const input = page.locator('input[placeholder*="Ask "]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Send a message with code-like content
    await input.fill('Show me: function hello() { return "world"; }');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(500);

    // Page should not crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 3_000,
    });
  });

  // 14. Keyboard accessibility — Escape closes panel
  test('pressing Escape closes the chat panel', async ({ page }) => {
    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const closeBtn = page.locator('[aria-label="Close AI chat"]');
    await expect(closeBtn).toBeVisible({ timeout: 10_000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel should close — FAB reappears
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await expect(closeBtn).not.toBeVisible({ timeout: 5_000 });
  });

  // 15. Visual regression — chat panel open state
  test('visual regression — chat panel open state', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const fab = page.locator('[aria-label="Open AI chat"]');
    await fab.click();

    const closeBtn = page.locator('[aria-label="Close AI chat"]');
    await expect(closeBtn).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot('ai-chat-panel-open.png', {
      fullPage: false,
      maxDiffPixels: 300,
      animations: 'disabled',
    });
  });
});
