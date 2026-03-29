/**
 * VISUAL QA — Student Session Browser Test (Part 5: Tests 13-15)
 * Split from visual-qa-student.spec.ts for file size compliance.
 */

import { test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_URL as BASE } from './env';
test.use({ reducedMotion: 'reduce' });
const STUDENT = { email: 'student@example.com', password: 'Student123!' };
const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

interface PageReport {
  label: string; url: string; screenshot: string;
  consoleErrors: string[]; consoleWarnings: string[]; networkErrors: string[];
  loadedSuccessfully: boolean; notes: string[];
}

const report: PageReport[] = [];

test.beforeAll(() => { if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true }); });
test.afterAll(() => { fs.writeFileSync(path.join(RESULTS_DIR, 'qa-report-part5.json'), JSON.stringify(report, null, 2)); });

function attachErrorListeners(page: Page, entry: PageReport): void {
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('favicon') || text.includes('Extension') || text.includes('[vite]')) return;
    if (msg.type() === 'error') entry.consoleErrors.push(text);
    else if (msg.type() === 'warn' || msg.type() === 'warning') entry.consoleWarnings.push(text);
  });
  page.on('pageerror', (err) => { entry.consoleErrors.push(`[PAGE ERROR] ${err.message}`); });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if ((url.includes('localhost') || url.includes('4000') || url.includes('8080') || url.startsWith(BASE)) &&
          !url.includes('silent-check-sso') && !url.includes('login-status-iframe'))
        entry.networkErrors.push(`HTTP ${res.status()} — ${url}`);
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('localhost'))
      entry.networkErrors.push(`FAILED REQUEST — ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`);
  });
}

async function snap(page: Page, label: string): Promise<string> {
  const sanitized = label.replace(/[^a-z0-9-]/gi, '_');
  const file = path.join(RESULTS_DIR, `${sanitized}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginViaKeycloak(page: Page): Promise<void> {
  if (process.env.VITE_DEV_MODE !== 'false') {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    await devBtn.waitFor({ timeout: 10_000 });
    await devBtn.click();
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    return;
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () => !!document.querySelector('button') && !document.body.textContent?.includes('Initializing authentication...'),
    { timeout: 15_000 }
  ).catch(() => {});
  const signInBtn = page.getByRole('button', { name: /sign in with keycloak/i });
  await signInBtn.waitFor({ timeout: 8_000 });
  await signInBtn.click();
  await page.waitForURL(/localhost:8080.*realms/, { timeout: 20_000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');
  await page.waitForURL(/localhost/, { timeout: 30_000 });
  await page.waitForURL(/\/(dashboard|courses|learn|agents|annotations|graph|profile|search)/, { timeout: 20_000 });
}

test.describe.configure({ mode: 'serial' });

test('13 — User Menu and Logout flow', async ({ page }) => {
  const entry: PageReport = {
    label: '13 — UserMenu / Logout', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  const userMenuBtn = page.getByRole('button', { name: /user menu/i })
    .or(page.locator('[data-testid="user-menu"]'))
    .or(page.locator('button').filter({ has: page.locator('[class*="avatar"], [class*="Avatar"]') })).first();
  const userMenuVisible = await userMenuBtn.isVisible().catch(() => false);
  if (!userMenuVisible) {
    const altBtn = page.locator('button[aria-label*="user" i], button[title*="menu" i]').first();
    const altVisible = await altBtn.isVisible().catch(() => false);
    if (!altVisible) {
      entry.notes.push('MISSING: UserMenu button not found in header');
      entry.url = page.url();
      entry.screenshot = await snap(page, '13-usermenu-missing');
      entry.loadedSuccessfully = false;
      return;
    }
    await altBtn.click();
  } else {
    await userMenuBtn.click();
  }
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  entry.screenshot = await snap(page, '13-usermenu-open');
  const logoutItem = page.getByRole('menuitem', { name: /log out/i })
    .or(page.getByRole('menuitem', { name: /sign out/i }))
    .or(page.getByText(/log out/i).first());
  const logoutVisible = await logoutItem.isVisible().catch(() => false);
  if (!logoutVisible) {
    entry.notes.push('MISSING: Logout menu item not visible in UserMenu dropdown');
  } else {
    await logoutItem.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);
    const finalUrl = page.url();
    entry.notes.push(`After logout URL: ${finalUrl}`);
    const onLoginOrKeycloak = finalUrl.includes('/login') || finalUrl.includes('keycloak') || finalUrl.includes('8080');
    if (!onLoginOrKeycloak) entry.notes.push(`BUG: After logout, user is still on ${finalUrl}`);
    else entry.notes.push('SUCCESS: Logout redirected correctly to login/Keycloak');
    entry.loadedSuccessfully = onLoginOrKeycloak;
  }
  entry.url = page.url();
  entry.screenshot = await snap(page, '13-after-logout');
});

test('14 — Navigation sidebar — all links reachable', async ({ page }) => {
  const entry: PageReport = {
    label: '14 — Navigation Sidebar', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '14-sidebar-navigation');
  const nav = page.locator('nav');
  const navVisible = await nav.isVisible().catch(() => false);
  const expectedLinks = [
    { name: 'Dashboard', expectedUrl: '/dashboard' },
    { name: 'Courses', expectedUrl: '/courses' },
    { name: 'Annotations', expectedUrl: '/annotations' },
    { name: 'Agents', expectedUrl: '/agents' },
    { name: 'Graph', expectedUrl: '/graph' },
  ];
  for (const link of expectedLinks) {
    const el = nav.getByRole('link', { name: link.name })
      .or(page.getByRole('link', { name: link.name })).first();
    const visible = await el.isVisible().catch(() => false);
    if (!visible) entry.notes.push(`MISSING nav link: "${link.name}"`);
    else entry.notes.push(`FOUND nav link: "${link.name}"`);
  }
  entry.loadedSuccessfully = navVisible;
});

test('15 — Unknown route redirects gracefully', async ({ page }) => {
  const entry: PageReport = {
    label: '15 — Unknown Route / 404', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/this-page-does-not-exist-xyz`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '15-unknown-route');
  const finalUrl = page.url();
  const redirectedToContent = finalUrl.includes('/learn/') || finalUrl.includes('/dashboard') || finalUrl.includes('/courses');
  const showed404 = page.getByText(/404|not found|page not found/i);
  const has404 = await showed404.isVisible().catch(() => false);
  if (redirectedToContent) {
    entry.notes.push(`INFO: Unknown route redirected to ${finalUrl} — fallback route working`);
    entry.loadedSuccessfully = true;
  } else if (has404) {
    entry.notes.push('INFO: 404 page displayed for unknown route');
    entry.loadedSuccessfully = true;
  } else {
    entry.notes.push(`WARNING: Unknown route not handled gracefully — landed on ${finalUrl}`);
    entry.loadedSuccessfully = false;
  }
});
