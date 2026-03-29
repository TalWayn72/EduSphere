/**
 * COMPREHENSIVE VISUAL QA — All Routes (Part 1: Public Pages + Instructor Login)
 * Split from visual-qa-full.spec.ts for file size compliance.
 */

import { test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_URL as BASE } from './env';
test.use({ reducedMotion: 'reduce' });

const USERS = {
  instructor: { email: 'instructor@example.com', password: 'Demo1234' },
  student: { email: 'student@example.com', password: 'Demo1234' },
  admin: { email: 'super.admin@edusphere.dev', password: 'Demo1234' },
};

const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

interface RouteResult {
  label: string; url: string; screenshot: string; headings: string[];
  consoleErrors: string[]; networkErrors: string[]; notes: string[]; ok: boolean;
}

const results: RouteResult[] = [];

test.beforeAll(() => { fs.mkdirSync(RESULTS_DIR, { recursive: true }); });
test.afterAll(() => {
  fs.writeFileSync(path.join(RESULTS_DIR, 'visual-qa-full-part1.json'), JSON.stringify(results, null, 2));
  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.warn(`\n── Part 1 SUMMARY: Routes: ${results.length} | OK: ${ok} | FAIL: ${fail}\n`);
});

test.describe.configure({ mode: 'serial' });

function mkResult(label: string): RouteResult {
  return { label, url: '', screenshot: '', headings: [], consoleErrors: [], networkErrors: [], notes: [], ok: false };
}

function listen(page: Page, r: RouteResult) {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (t.includes('[vite]') || t.includes('favicon') || t.includes('Extension context')) return;
    r.consoleErrors.push(t);
  });
  page.on('pageerror', (err) => r.consoleErrors.push(`[PAGE] ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (url.includes('localhost') && !url.includes('silent-check') && !url.includes('login-status'))
        r.networkErrors.push(`HTTP ${res.status()} ${url}`);
    }
  });
}

async function snap(page: Page, name: string): Promise<string> {
  const file = path.join(RESULTS_DIR, `${name.replace(/[^a-z0-9-]/gi, '_')}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

async function headings(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2,h3'))
      .map((el) => (el as HTMLElement).innerText.trim()).filter(Boolean).slice(0, 4)
  ).catch(() => []);
}

async function keycloakLogin(page: Page, email: string, password: string): Promise<void> {
  await page.fill('#username', email).catch(() => page.fill('input[name="username"]', email).catch(() => {}));
  await page.fill('#password', password).catch(() => page.fill('input[name="password"]', password).catch(() => {}));
  await page.click('#kc-login').catch(() => page.click('button[type="submit"]').catch(() => {}));
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
}

async function login(page: Page, user: { email: string; password: string }): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  const btn = page.getByRole('button', { name: /sign in with keycloak/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);
  }
  if (page.url().includes('8080') || page.url().includes('auth')) {
    await keycloakLogin(page, user.email, user.password);
    await page.waitForURL(new RegExp(BASE.replace(/https?:\/\//, '') + '/'), { timeout: 25000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);
  }
  if (page.url().includes('/login')) {
    const retryBtn = page.getByRole('button', { name: /sign in with keycloak/i });
    if (await retryBtn.isVisible().catch(() => false)) {
      await retryBtn.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      if (page.url().includes('8080')) {
        await keycloakLogin(page, user.email, user.password);
        await page.waitForURL(new RegExp(BASE.replace(/https?:\/\//, '') + '/'), { timeout: 25000 }).catch(() => {});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }
}

async function visitRoute(page: Page, route: string, label: string, snapName: string, _waitMs = 3000): Promise<RouteResult> {
  const r = mkResult(label);
  listen(page, r);
  results.push(r);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, snapName);
  const crashed = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
  const unauthorized = await page.getByText(/unauthorized|403|forbidden/i).isVisible().catch(() => false);
  const notFound = await page.getByText(/404|not found/i).isVisible().catch(() => false);
  if (crashed) r.notes.push('CRITICAL: Error boundary triggered');
  if (unauthorized) r.notes.push('AUTH: Unauthorized/Forbidden shown');
  if (notFound) r.notes.push('INFO: 404/Not Found state');
  const has400 = r.networkErrors.some((e) => e.includes('HTTP 400'));
  const has500 = r.networkErrors.some((e) => e.includes('HTTP 500'));
  if (has400) r.notes.push('WARNING: 400 Bad Request detected');
  if (has500) r.notes.push('CRITICAL: 500 Server Error detected');
  r.ok = !crashed && !has500 && r.consoleErrors.filter((e) => !e.includes('ResizeObserver')).length === 0;
  return r;
}

test('01 — Public: Login page', async ({ page }) => {
  const r = mkResult('01 — Login');
  listen(page, r);
  results.push(r);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, '01-login');
  const hasBtn = await page.getByRole('button', { name: /sign in with keycloak/i }).isVisible().catch(() => false);
  r.notes.push(`Sign-in button: ${hasBtn}`);
  r.ok = hasBtn;
});

test('02 — Public: Accessibility statement', async ({ page }) => {
  await visitRoute(page, '/accessibility', '02 — Accessibility', '02-accessibility');
});

test('03 — Public: Badge verifier', async ({ page }) => {
  await visitRoute(page, '/verify/badge/test-assertion-123', '03 — Badge Verifier', '03-badge-verifier');
});

test('04 — Public: Portal', async ({ page }) => {
  await visitRoute(page, '/portal', '04 — Portal', '04-portal');
});

test('10 — Auth: Instructor Keycloak login', async ({ page }) => {
  const r = mkResult('10 — Instructor Login');
  listen(page, r);
  results.push(r);
  await login(page, USERS.instructor);
  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, '10-instructor-login');
  const loggedIn = !r.url.includes('/login') && r.url.includes(BASE.replace(/https?:\/\//, '').split('/')[0]);
  r.notes.push(`Logged in: ${loggedIn} | URL: ${r.url}`);
  r.ok = loggedIn;
});
