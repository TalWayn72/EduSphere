/**
 * Global setup for instructor browser tests.
 * Performs Keycloak login once and saves storage state for reuse.
 */
import { chromium, type FullConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
export const SESSION_FILE = path.resolve(
  __dirname, '..', '..', '..', 'test-results', 'instructor-session.json'
);

export default async function globalSetup(_config: FullConfig) {
  const sessionDir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  // If a recent session exists (< 5 min old), reuse it
  if (fs.existsSync(SESSION_FILE)) {
    const stat = fs.statSync(SESSION_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 5 * 60 * 1000) {
      console.log('[setup] Reusing existing session (< 5 min old)');
      return;
    }
  }

  console.log('[setup] Performing Keycloak login...');
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to login page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // Wait for check-sso

  const url = page.url();
  console.log(`[setup] URL after check-sso: ${url}`);

  if (!url.includes('/login') && url.includes('localhost:5175')) {
    // Already authenticated
    console.log('[setup] Already authenticated via SSO');
  } else {
    // Click Sign In with Keycloak
    const btn = page.locator('button').filter({ hasText: /sign in with keycloak/i }).first();
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await btn.click();

    // Wait for Keycloak
    await page.waitForURL(/localhost:8080/, { timeout: 20_000 });
    console.log(`[setup] Keycloak: ${page.url()}`);

    // Fill login form
    await page.locator('#username').waitFor({ state: 'visible', timeout: 10_000 });
    await page.fill('#username', 'instructor@example.com');
    await page.fill('#password', 'Instructor123!');
    await page.click('#kc-login');

    // Wait for redirect back
    await page.waitForURL(/localhost:5175/, { timeout: 25_000 });
    await page.waitForTimeout(2500);
    console.log(`[setup] Authenticated: ${page.url()}`);
  }

  // Save storage state
  await context.storageState({ path: SESSION_FILE });
  console.log(`[setup] Session saved: ${SESSION_FILE}`);

  await browser.close();
}
