/**
 * VISUAL QA — Student Session Browser Test (Part 3: Tests 07-09)
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
test.afterAll(() => { fs.writeFileSync(path.join(RESULTS_DIR, 'qa-report-part3.json'), JSON.stringify(report, null, 2)); });

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

test('07 — Annotations Page — layer tabs and list', async ({ page }) => {
  const entry: PageReport = {
    label: '07 — Annotations Page', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/annotations`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '07-annotations-page');
  const heading = page.getByRole('heading', { name: 'Annotations' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible) entry.notes.push('MISSING: Annotations heading not visible');
  const tabs = ['All', 'Personal', 'Shared', 'Instructor', 'AI'];
  for (const tab of tabs) {
    const tabEl = page.getByRole('tab', { name: new RegExp(tab, 'i') });
    const tabVisible = await tabEl.isVisible().catch(() => false);
    if (!tabVisible) entry.notes.push(`MISSING tab: "${tab}"`);
  }
  entry.loadedSuccessfully = headingVisible;
});

test('08 — Knowledge Graph page', async ({ page }) => {
  const entry: PageReport = {
    label: '08 — Knowledge Graph', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '08-knowledge-graph');
  const header = page.locator('header');
  const headerVisible = await header.isVisible().catch(() => false);
  if (!headerVisible) entry.notes.push('MISSING: Page header not visible — possible crash');
  const graphCanvas = page.locator('canvas, svg[class*="graph"], [data-testid="graph"]').first();
  const graphVisible = await graphCanvas.isVisible().catch(() => false);
  if (!graphVisible) entry.notes.push('INFO: No canvas/svg graph element visible');
  const crashed = page.getByText(/something went wrong/i);
  const hasCrashed = await crashed.isVisible().catch(() => false);
  if (hasCrashed) entry.notes.push('CRITICAL: Knowledge Graph crashed with error boundary');
  entry.loadedSuccessfully = headerVisible && !hasCrashed;
});

test('09 — Search Page — semantic search', async ({ page }) => {
  const entry: PageReport = {
    label: '09 — Search Page', url: '', screenshot: '',
    consoleErrors: [], consoleWarnings: [], networkErrors: [],
    loadedSuccessfully: false, notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '09-search-empty');
  const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
  const inputVisible = await searchInput.isVisible().catch(() => false);
  if (!inputVisible) entry.notes.push('MISSING: Search input not visible');
  if (inputVisible) {
    await searchInput.fill('Talmud');
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);
    entry.screenshot = await snap(page, '09-search-results');
    const results = page.locator('[class*="card"], [class*="result"], [class*="CardContent"]')
      .filter({ has: page.locator('[class*="font-semibold"], h3, h4') });
    const resultCount = await results.count().catch(() => 0);
    entry.notes.push(`Found ${resultCount} search result cards after querying "Talmud"`);
    if (resultCount === 0) {
      const emptyMsg = page.getByText(/no results/i);
      const emptyVisible = await emptyMsg.isVisible().catch(() => false);
      if (emptyVisible) entry.notes.push('INFO: Empty state shown — search returned no results');
    }
  }
  entry.loadedSuccessfully = inputVisible;
});
