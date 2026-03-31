/**
 * E2E Auth Helpers — Shared authentication utilities.
 *
 * Use these instead of inline login code in each spec file.
 * Supports both DEV_MODE (no Keycloak) and LIVE_BACKEND (real OIDC flow).
 *
 * @example
 * import { login, loginViaKeycloak } from './auth.helpers';
 *
 * test.beforeEach(async ({ page }) => {
 *   await login(page);                    // smart: DEV_MODE or Keycloak
 * });
 *
 * test.beforeEach(async ({ page }) => {
 *   await login(page, TEST_USERS.student); // as specific user
 * });
 */

import type { Page } from '@playwright/test';
import {
  BASE_URL,
  KEYCLOAK_REALM_URL,
  TestUser,
  TEST_USERS,
} from './env';

// ─── DEV_MODE login (no Keycloak required) ───────────────────────────────────

/**
 * Authenticate in DEV_MODE by clicking the "Sign In (Dev Mode)" button.
 *
 * After the BUG-028 fix, DEV_MODE no longer auto-authenticates on cold start.
 * initKeycloak() now requires sessionStorage('edusphere_dev_logged_in', 'true')
 * to be set before it marks devAuthenticated=true. The login button calls
 * auth.login() which sets the key and does window.location.href='/' — this
 * function performs that exact user interaction so subsequent page.goto() calls
 * in the same test will find the app in an authenticated state.
 *
 * Fast — no Keycloak round-trip needed.
 *
 * NOTE: Callers must call page.addInitScript() BEFORE calling this function,
 * and must have already navigated to /login.
 */
export async function loginInDevMode(page: Page): Promise<void> {
  // Inject English locale into localStorage BEFORE any app scripts run.
  // GlobalLocaleSync queries the DB for the user's preferred locale and overrides
  // i18next when localStorage is empty. The seeded super.admin has locale='he',
  // so without this guard every test sees Hebrew UI, breaking English assertions.
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    // Collapse the AppSidebar (64 px) for all E2E tests — ensures the layout
    // fits narrow mobile-chrome viewports (393 px) without overflow.
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  // Click "Sign In (Dev Mode)" → calls auth.login() which:
  //   1. sessionStorage.setItem('edusphere_dev_logged_in', 'true')
  //   2. devAuthenticated = true
  //   3. window.location.href = '/' (full page reload)
  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  await devBtn.waitFor({ timeout: 10_000 });
  await devBtn.click();
  // Wait for redirect away from /login. On some browsers/viewports the app
  // may redirect to /dashboard or /admin rather than /learn/, so we use a
  // broad "not /login" predicate instead of a specific path pattern.
  await page
    .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20_000 })
    .catch(() => {
      // URL never changed — app may already be on the target route
    });
  // Always wait for domcontentloaded so React Router client-side navigation
  // (e.g. / → /learn/content-1) completes before the caller does page.goto().
  // Without this, a competing React Router navigate() can race with the next
  // page.goto() call, causing "Target page, context or browser has been closed"
  // in mobile-chrome.
  await page.waitForLoadState('domcontentloaded');
}

// ─── Keycloak OIDC login ─────────────────────────────────────────────────────

/**
 * Perform a full Keycloak OIDC Authorization Code + PKCE login.
 *
 * Prerequisites: VITE_DEV_MODE=false and a running Keycloak instance.
 *
 * The function handles the full redirect chain:
 *   /login → click "Sign In" → Keycloak form → fill credentials → submit →
 *   Keycloak redirect → app callback → router renders authenticated route
 *
 * NOTE: This function navigates to /login internally. If the page has already
 * been navigated (e.g. by login()), pass skipGoto=true to avoid a second goto.
 */
export async function loginViaKeycloak(
  page: Page,
  user: Pick<TestUser, 'email' | 'password'> = TEST_USERS.superAdmin,
  skipGoto = false
): Promise<void> {
  if (!skipGoto) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  }

  // Wait for Keycloak.init() to complete (silent SSO check via iframe may add delay)
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 15_000 }
    )
    .catch(() => {
      // init is hanging — try to click the button anyway
    });

  const signInBtn = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  await signInBtn.waitFor({ timeout: 10_000 });
  await signInBtn.click();

  // Wait for Keycloak login form
  await page.waitForURL(
    new RegExp(KEYCLOAK_REALM_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    {
      timeout: 20_000,
    }
  );
  await page.locator('#username').waitFor({ timeout: 10_000 });

  await page.fill('#username', user.email);
  await page.fill('#password', user.password);
  await page.click('#kc-login');

  // Wait for Keycloak to redirect back to the app
  const appHostPattern = BASE_URL.replace(/^https?:\/\//, '').replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
  await page.waitForURL(new RegExp(appHostPattern), { timeout: 30_000 });

  // Wait for the router to navigate to an authenticated route
  await page
    .waitForURL(
      /\/(learn|courses|dashboard|agents|search|annotations|graph|profile)/,
      { timeout: 20_000 }
    )
    .catch(() => {
      // Acceptable — router may have settled on a different route
    });
}

// ─── Smart login ─────────────────────────────────────────────────────────────

/**
 * Smart login — detects the actual running app mode (DEV_MODE vs Keycloak)
 * by inspecting the DOM and uses the appropriate login flow.
 *
 * This is more reliable than reading process.env.VITE_DEV_MODE because:
 *   - The test process env may differ from the running Vite server's env.
 *   - reuseExistingServer:true means Playwright may reuse a server started
 *     with VITE_DEV_MODE=false, even when the test process has no VITE_DEV_MODE.
 *
 * Flow:
 *   1. Inject localStorage (locale + sidebar) via addInitScript.
 *   2. Navigate once to /login.
 *   3. Check for [data-testid="dev-login-btn"] in the DOM (timeout 5s).
 *      - Present  → DEV_MODE: click the button and wait for redirect.
 *      - Absent   → Keycloak: click "Sign In with Keycloak", fill the form,
 *                   wait for OIDC callback, then authenticated route.
 *
 * @param user - Optional credentials (only used in Keycloak/LIVE_BACKEND mode)
 */
export async function login(
  page: Page,
  user?: Pick<TestUser, 'email' | 'password'>
): Promise<void> {
  // Inject locale/sidebar into EVERY page (including Vite HMR reloads).
  // Must be registered BEFORE the first page.goto() call.
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // Single navigation to /login — shared by both paths.
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Detect the actual app mode from the DOM.
  // The process.env.VITE_DEV_MODE flag IS_DEV_MODE may be stale if the test
  // runner reused a server with a different VITE_DEV_MODE setting.
  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  const isActuallyDevMode = await devBtn.isVisible().catch(() => false) ||
    await devBtn.waitFor({ timeout: 3_000 }).then(() => true).catch(() => false);

  if (isActuallyDevMode) {
    // ── DEV_MODE path ──────────────────────────────────────────────────────
    await devBtn.click();
    await page
      .waitForURL((url) => !url.toString().includes('/login'), { timeout: 20_000 })
      .catch(() => {});
    await page.waitForLoadState('domcontentloaded');
  } else {
    // ── Keycloak/OIDC path — app already on /login ──────────────────────────
    await loginViaKeycloak(page, user ?? TEST_USERS.superAdmin, true);
  }
}

// ─── Network error monitor ───────────────────────────────────────────────────

export interface NetworkErrorEntry {
  type: 'response' | 'request_failed';
  status?: number;
  url: string;
  errorText?: string;
}

/**
 * Attach network error listeners to a page.
 * Collects 4xx/5xx responses and failed requests from localhost services.
 * Ignores known false-positives (Keycloak silent SSO iframes, etc.).
 *
 * @returns Array reference that accumulates errors during the test
 */
export function attachNetworkMonitor(page: Page): NetworkErrorEntry[] {
  const errors: NetworkErrorEntry[] = [];

  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    // Only track errors from our own services
    if (!url.includes('localhost') && !url.includes('edusphere')) return;
    // Skip expected non-200 Keycloak SSO iframe requests
    if (url.includes('silent-check-sso') || url.includes('login-status-iframe'))
      return;
    errors.push({ type: 'response', status: res.status(), url });
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.includes('localhost') && !url.includes('edusphere')) return;
    errors.push({
      type: 'request_failed',
      url,
      errorText: req.failure()?.errorText ?? 'unknown',
    });
  });

  return errors;
}
