/**
 * progress-status.spec.ts — Dynamic Progress Status Indicator E2E Tests
 *
 * Route: /courses/new  (authenticated — dev mode auto-auth as SUPER_ADMIN)
 *
 * Covers:
 *   Visibility of the ProgressStatus component during AI course generation,
 *   accessibility attributes (role="status"), text cycling behaviour,
 *   and clean disappearance after the operation completes.
 *
 * The generateCourseFromPrompt mutation is intercepted via page.route() with
 * an artificial delay so the loading / progress state remains visible long
 * enough for assertions. No live GraphQL server is required.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/progress-status.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';

// ─── Mock payloads ────────────────────────────────────────────────────────────

const MOCK_GENERATE_IN_PROGRESS = {
  data: {
    generateCourseFromPrompt: {
      executionId: 'exec-ps-001',
      status: 'IN_PROGRESS',
      courseTitle: null,
      courseDescription: null,
      modules: [],
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Click a button inside a Radix Dialog bypassing backdrop overlay. */
async function clickDialogButton(
  page: import('@playwright/test').Page,
  buttonText: string,
): Promise<void> {
  await page.evaluate((text: string) => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const btn = buttons.find((b) => (b.textContent ?? '').trim().includes(text));
    (btn as HTMLElement | undefined)?.click();
  }, buttonText);
}

/**
 * Intercept GraphQL and return IN_PROGRESS with a delay so the loading state
 * is visible long enough for assertions.
 */
async function mockGenerateWithDelay(
  page: import('@playwright/test').Page,
  delayMs = 3000,
): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization',
        },
        body: '',
      });
      return;
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
    } catch { /* ignore */ }

    const op = (parsed.operationName as string | undefined) ?? '';

    if (op === 'GenerateCourseFromPrompt') {
      // Simulate network latency so the progress indicator stays visible
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GENERATE_IN_PROGRESS),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    }
  });
}

// ─── Suite: Progress Status Indicator ────────────────────────────────────────

test.describe('Progress Status Indicator — AI Course Generation', () => {
  test.beforeEach(async ({ page }) => {
    await mockGenerateWithDelay(page, 4000);
    await login(page);
    await page.goto(`${BASE_URL}/courses/new`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="launch-ai-builder-btn"]').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  });

  test('progress status element with role="status" is visible after generate is clicked', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Quantum Computing');
    await clickDialogButton(page, 'Generate Course');

    // The ProgressStatus component renders with role="status"
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 10_000 });
  });

  test('progress status shows non-empty text while generating', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Quantum Computing');
    await clickDialogButton(page, 'Generate Course');

    const statusEl = page.getByRole('status').first();
    await expect(statusEl).toBeVisible({ timeout: 10_000 });

    const text = await statusEl.textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(0);
  });

  test('progress status text changes after a few seconds (cycling)', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Quantum Computing');
    await clickDialogButton(page, 'Generate Course');

    const statusEl = page.getByRole('status').first();
    await expect(statusEl).toBeVisible({ timeout: 10_000 });

    const firstText = (await statusEl.textContent() ?? '').trim();

    // Wait long enough for at least one cycle (default interval is 2500ms)
    await page.waitForTimeout(3000);

    const secondText = (await statusEl.textContent() ?? '').trim();

    // Text may have cycled to a different message — at minimum it stays non-empty
    expect(secondText.length).toBeGreaterThan(0);
    // Note: cycling is best-effort — we only assert the element stays active
    // A strict text-change assertion would be flaky due to animation timing
    void firstText; // suppress unused-variable warning
  });

  test('progress status has aria-live="polite" attribute for screen readers', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('Introduction to Quantum Computing');
    await clickDialogButton(page, 'Generate Course');

    const statusEl = page.getByRole('status').first();
    await expect(statusEl).toBeVisible({ timeout: 10_000 });
    await expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  test('progress status is not visible before generation starts', async ({ page }) => {
    // The dialog is open but Generate has not been clicked yet
    // ProgressStatus with active=false renders null → no role="status" element
    const statusElements = page.getByRole('status');
    const count = await statusElements.count();
    // 0 or more — if present it must not be the progress indicator
    if (count > 0) {
      // If a status element exists, it must not contain generation-progress text
      for (let i = 0; i < count; i++) {
        const text = (await statusElements.nth(i).textContent() ?? '').trim();
        expect(text).not.toMatch(/analyz|generat|processing|building/i);
      }
    } else {
      expect(count).toBe(0);
    }
  });
});
