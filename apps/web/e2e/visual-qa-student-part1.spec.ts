/**
 * VISUAL QA — Student Session Browser Test (Part 1: Setup + Tests 01-03)
 * Split from visual-qa-student.spec.ts for file size compliance.
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_URL as BASE } from './env';
test.use({ reducedMotion: 'reduce' });
const STUDENT = { email: 'student@example.com', password: 'Student123!' };
const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

interface PageReport {
  label: string;
  url: string;
  screenshot: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  networkErrors: string[];
  loadedSuccessfully: boolean;
  notes: string[];
}

const report: PageReport[] = [];

test.beforeAll(() => {
  if (!fs.existsSync(RESULTS_DIR))
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
});

test.afterAll(() => {
  const reportPath = path.join(RESULTS_DIR, 'qa-report-part1.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
});

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
          !url.includes('silent-check-sso') && !url.includes('login-status-iframe')) {
        entry.networkErrors.push(`HTTP ${res.status()} — ${url}`);
      }
    }
  });
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('localhost')) {
      entry.networkErrors.push(`FAILED REQUEST — ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`);
    }
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

test('01 — Login page renders with EduSphere branding', async ({ page }) => {
  const entry: PageReport = {
    label: '01 — Login Page', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Initializing authentication...'),
    { timeout: 12_000 }
  ).catch(() => { entry.notes.push('BUG: App stuck on "Initializing authentication..." after 12s'); });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '01-login-page');
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText?.includes('Initializing authentication'))
    entry.notes.push('STUCK: Login page still showing "Initializing authentication..."');
  const cspErrors = entry.consoleErrors.filter((e) => e.includes('Content Security Policy') || e.includes('frame-ancestors'));
  if (cspErrors.length > 0) {
    entry.notes.push('CSP ERROR: Keycloak iframe blocked by CSP frame-ancestors');
    entry.notes.push(`Detail: ${cspErrors[0]}`);
  }
  const ssoErrors = entry.networkErrors.filter((e) => e.includes('silent-check-sso') || e.includes('BLOCKED'));
  if (ssoErrors.length > 0) entry.notes.push(`SILENT SSO FAILURE: ${ssoErrors[0]}`);
  const heading = page.getByRole('heading', { name: 'Welcome to EduSphere' });
  const signInBtn = page.getByRole('button', { name: /sign in with keycloak/i });
  const description = page.getByText('Knowledge Graph Educational Platform');
  const initSpinner = page.getByText('Initializing authentication...');
  const headingVisible = await heading.isVisible().catch(() => false);
  const btnVisible = await signInBtn.isVisible().catch(() => false);
  const descVisible = await description.isVisible().catch(() => false);
  const spinnerVisible = await initSpinner.isVisible().catch(() => false);
  if (spinnerVisible) entry.notes.push('BUG: Keycloak init spinner still visible');
  if (!headingVisible) entry.notes.push('MISSING: "Welcome to EduSphere" heading not visible');
  if (!btnVisible) entry.notes.push('MISSING: "Sign In with Keycloak" button not visible');
  if (!descVisible) entry.notes.push('MISSING: Description text not visible');
  entry.loadedSuccessfully = headingVisible && btnVisible;
  if (!headingVisible || !btnVisible) console.warn(`[QA BUG-01] Login page not rendered`);
  if (spinnerVisible) console.warn('[QA BUG-01] CRITICAL: Keycloak init is hanging');
});

test('02 — Keycloak login flow completes and lands on app', async ({ page }) => {
  const entry: PageReport = {
    label: '02 — Keycloak Auth Flow', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '02-post-keycloak-login');
  const notOnLogin = !page.url().includes('/login');
  if (!notOnLogin) entry.notes.push('BUG: Still on /login after successful auth');
  const doubleInit = entry.consoleErrors.find((e) => e.includes('can only be initialized once'));
  if (doubleInit) entry.notes.push(`SEC-KC-001 REGRESSION: ${doubleInit}`);
  const devFallback = entry.consoleWarnings.find((w) => w.includes('Falling back to DEV MODE'));
  if (devFallback) entry.notes.push('WARNING: DEV MODE fallback occurred');
  entry.loadedSuccessfully = notOnLogin;
  expect(notOnLogin).toBe(true);
});

test('03 — Dashboard page — stats cards and user profile', async ({ page }) => {
  const entry: PageReport = {
    label: '03 — Dashboard', url: '', screenshot: '',
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
  entry.screenshot = await snap(page, '03-dashboard');
  const heading = page.getByRole('heading', { name: 'Dashboard' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible) entry.notes.push('MISSING: Dashboard heading not visible');
  const statsToCheck = ['Study Time', 'Concepts Mastered', 'Active Courses', 'Annotations'];
  for (const stat of statsToCheck) {
    const el = page.getByText(stat).first();
    const visible = await el.isVisible().catch(() => false);
    if (!visible) entry.notes.push(`MISSING stat card: "${stat}"`);
  }
  const errorCard = page.locator('.border-destructive');
  const hasErrorCard = await errorCard.isVisible().catch(() => false);
  if (hasErrorCard) {
    const errorText = await errorCard.textContent().catch(() => '');
    entry.notes.push(`ERROR CARD VISIBLE: ${errorText}`);
  }
  const nav = page.locator('nav');
  const navVisible = await nav.isVisible().catch(() => false);
  if (!navVisible) entry.notes.push('MISSING: Navigation sidebar not visible');
  entry.loadedSuccessfully = headingVisible;
  expect(headingVisible).toBe(true);
});
