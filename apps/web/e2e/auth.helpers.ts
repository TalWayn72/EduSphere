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
  IS_DEV_MODE,
  KEYCLOAK_REALM_URL,
  TestUser,
  TEST_USERS,
} from './env';

// ─── DEV_MODE login (no Keycloak required) ───────────────────────────────────

/**
 * Navigate to the app root in DEV_MODE.
 * The app auto-authenticates as the SUPER_ADMIN mock user.
 * Fast — no Keycloak round-trip needed.
 */
export async function loginInDevMode(page: Page): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  // Allow the auth init + React hydration to complete
  await page.waitForLoadState('networkidle');
}

// ─── Keycloak OIDC login ─────────────────────────────────────────────────────

/**
 * Perform a full Keycloak OIDC Authorization Code + PKCE login.
 *
 * Prerequisites: VITE_DEV_MODE=false and a running Keycloak instance.
 * The app must be navigated to /login BEFORE calling this.
 *
 * The function handles the full redirect chain:
 *   /login → click "Sign In" → Keycloak form → fill credentials → submit →
 *   Keycloak redirect → app callback → router renders authenticated route
 */
export async function loginViaKeycloak(
  page: Page,
  user: Pick<TestUser, 'email' | 'password'> = TEST_USERS.superAdmin,
): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Wait for Keycloak.init() to complete (silent SSO check via iframe may add delay)
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 15_000 },
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
  await page.waitForURL(new RegExp(KEYCLOAK_REALM_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
    timeout: 20_000,
  });
  await page.locator('#username').waitFor({ timeout: 10_000 });

  await page.fill('#username', user.email);
  await page.fill('#password', user.password);
  await page.click('#kc-login');

  // Wait for Keycloak to redirect back to the app
  const appHostPattern = BASE_URL.replace(/^https?:\/\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.waitForURL(new RegExp(appHostPattern), { timeout: 30_000 });

  // Wait for the router to navigate to an authenticated route
  await page
    .waitForURL(
      /\/(learn|courses|dashboard|agents|search|annotations|graph|profile)/,
      { timeout: 20_000 },
    )
    .catch(() => {
      // Acceptable — router may have settled on a different route
    });
}

// ─── Smart login ─────────────────────────────────────────────────────────────

/**
 * Smart login — uses the fast DEV_MODE shortcut when available,
 * falls back to full Keycloak OIDC flow when VITE_DEV_MODE=false.
 *
 * This is the recommended function for most test `beforeEach` blocks.
 *
 * @param user - Optional user credentials (only used in LIVE_BACKEND mode)
 */
export async function login(
  page: Page,
  user?: Pick<TestUser, 'email' | 'password'>,
): Promise<void> {
  if (IS_DEV_MODE) {
    await loginInDevMode(page);
  } else {
    await loginViaKeycloak(page, user);
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
    if (
      url.includes('silent-check-sso') ||
      url.includes('login-status-iframe')
    )
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
