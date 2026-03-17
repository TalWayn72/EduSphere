/**
 * E2E: bug-072-apq-courses.spec.ts
 *
 * BUG-072 regression guard: /courses showed OfflineBanner with mock fallback
 * because persistedExchange (APQ) was gated on `import.meta.env.PROD` instead
 * of explicit `VITE_APQ_ENABLED === 'true'`.
 *
 * Fix: Changed APQ guard in urql-client.ts. Default is now disabled.
 */
import { test, expect, type Page } from '@playwright/test';

async function devAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.setItem('edusphere_dev_logged_in', 'true');
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });
}

test.describe('BUG-072: APQ courses regression', () => {
  test.beforeEach(async ({ page }) => {
    await devAuth(page);
  });

  test('/courses loads WITHOUT OfflineBanner', async ({ page }) => {
    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Primary BUG-072 guard: OfflineBanner must NOT be visible
    const banner = page.getByTestId('offline-banner');
    await expect(banner).not.toBeVisible();
  });

  test('/courses renders course cards (not blank)', async ({ page }) => {
    await page.goto('/courses', { waitUntil: 'domcontentloaded' });

    // Wait for heading "Courses" to confirm page loaded
    await expect(page.locator('h1')).toContainText('Courses', { timeout: 8_000 });

    // At least one h3 course title should be visible
    const h3 = page.locator('h3');
    await expect(h3.first()).toBeVisible({ timeout: 8_000 });
    expect(await h3.count()).toBeGreaterThanOrEqual(1);
  });

  test('no APQ/technical error strings visible on /courses', async ({ page }) => {
    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const body = await page.textContent('body');
    expect(body).not.toContain('PersistedRequestNotFound');
    expect(body).not.toContain('PERSISTED_QUERY_NOT_FOUND');
    expect(body).not.toContain('Must provide query string');
    expect(body).not.toContain('[Network]');
    expect(body).not.toContain('ECONNREFUSED');
    expect(body).not.toContain('Server unavailable');
  });
});

test.describe('BUG-072: OfflineBanner negative case', () => {
  test('OfflineBanner appears when GraphQL is blocked', async ({ page }) => {
    await devAuth(page);

    // Set up route interception BEFORE navigation
    await page.route('**/graphql', (route) => route.abort('internetdisconnected'));

    await page.goto('/courses', { waitUntil: 'domcontentloaded' });

    // OfflineBanner SHOULD appear when GraphQL is truly unreachable
    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 10_000 });

    // No raw technical strings in banner
    const bannerText = await page.getByTestId('offline-banner').textContent();
    expect(bannerText).not.toContain('TypeError');
    expect(bannerText).not.toContain('ECONNREFUSED');
    expect(bannerText).not.toContain('[object Object]');
  });
});
