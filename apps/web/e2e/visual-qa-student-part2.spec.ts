/**
 * VISUAL QA — Student Session Browser Test (Part 2: Tests 04-06)
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
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'qa-report-part2.json'),
    JSON.stringify(report, null, 2)
  );
});

function attachErrorListeners(page: Page, entry: PageReport): void {
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('favicon') ||
      text.includes('Extension') ||
      text.includes('[vite]')
    )
      return;
    if (msg.type() === 'error') entry.consoleErrors.push(text);
    else if (msg.type() === 'warn' || msg.type() === 'warning')
      entry.consoleWarnings.push(text);
  });
  page.on('pageerror', (err) => {
    entry.consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (
        (url.includes('localhost') ||
          url.includes('4000') ||
          url.includes('8080') ||
          url.startsWith(BASE)) &&
        !url.includes('silent-check-sso') &&
        !url.includes('login-status-iframe')
      )
        entry.networkErrors.push(`HTTP ${res.status()} — ${url}`);
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('localhost'))
      entry.networkErrors.push(
        `FAILED REQUEST — ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`
      );
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
    await page
      .waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 20_000,
      })
      .catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    return;
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 15_000 }
    )
    .catch(() => {});
  const signInBtn = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  await signInBtn.waitFor({ timeout: 8_000 });
  await signInBtn.click();
  await page.waitForURL(/localhost:8080.*realms/, { timeout: 20_000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');
  await page.waitForURL(/localhost/, { timeout: 30_000 });
  await page.waitForURL(
    /\/(dashboard|courses|learn|agents|annotations|graph|profile|search)/,
    { timeout: 20_000 }
  );
}

test.describe.configure({ mode: 'serial' });

test('04 — Course List page — courses grid', async ({ page }) => {
  const entry: PageReport = {
    label: '04 — Course List',
    url: '',
    screenshot: '',
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    loadedSuccessfully: false,
    notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '04-courses-list');
  const heading = page.getByRole('heading', { name: 'Courses' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible) entry.notes.push('MISSING: Courses heading not visible');
  const courseCards = page
    .locator('[data-testid="course-card"], .course-card, [class*="card"]')
    .filter({ has: page.getByRole('heading') });
  const cardCount = await courseCards.count().catch(() => 0);
  entry.notes.push(`Found ${cardCount} course cards`);
  const emptyState = page.getByText(/no courses/i);
  const isEmpty = await emptyState.isVisible().catch(() => false);
  if (isEmpty)
    entry.notes.push('WARNING: Empty state shown — no courses loaded');
  entry.loadedSuccessfully = headingVisible;
  expect(headingVisible).toBe(true);
});

test('05 — Content Viewer — video player and transcript', async ({ page }) => {
  const entry: PageReport = {
    label: '05 — Content Viewer',
    url: '',
    screenshot: '',
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    loadedSuccessfully: false,
    notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/learn/content-1`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '05-content-viewer');
  const video = page.locator('video');
  const videoVisible = await video.isVisible().catch(() => false);
  if (!videoVisible) entry.notes.push('MISSING: Video element not visible');
  const transcript = page.getByText('Transcript');
  const transcriptVisible = await transcript.isVisible().catch(() => false);
  if (!transcriptVisible)
    entry.notes.push('MISSING: Transcript panel not visible');
  const annotationsPanel = page.getByText('Annotations').first();
  const annotationsPanelVisible = await annotationsPanel
    .isVisible()
    .catch(() => false);
  if (!annotationsPanelVisible)
    entry.notes.push('MISSING: Annotations panel not visible');
  const errorBoundary = page.getByText(/something went wrong/i);
  const hasCrashed = await errorBoundary.isVisible().catch(() => false);
  if (hasCrashed)
    entry.notes.push('CRITICAL: Error boundary triggered — component crashed');
  entry.loadedSuccessfully = videoVisible || transcriptVisible;
});

test('06 — Content Viewer — create an annotation', async ({ page }) => {
  const entry: PageReport = {
    label: '06 — Create Annotation',
    url: '',
    screenshot: '',
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    loadedSuccessfully: false,
    notes: [],
  };
  attachErrorListeners(page, entry);
  report.push(entry);
  await loginViaKeycloak(page);
  await page.goto(`${BASE}/learn/content-1`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  const addBtn = page
    .getByRole('button', { name: /Add/i })
    .or(page.locator('button:has(svg)').filter({ hasText: /Add/i }))
    .first();
  const addBtnVisible = await addBtn.isVisible().catch(() => false);
  if (!addBtnVisible) {
    entry.notes.push('MISSING: Add annotation button not visible');
    entry.url = page.url();
    entry.screenshot = await snap(page, '06-annotation-no-button');
    entry.loadedSuccessfully = false;
    return;
  }
  await addBtn.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  const textarea = page.locator('textarea').first();
  const textareaVisible = await textarea.isVisible().catch(() => false);
  if (!textareaVisible) {
    entry.notes.push(
      'BUG: Annotation form did not open after clicking Add button'
    );
    entry.url = page.url();
    entry.screenshot = await snap(page, '06-annotation-form-missing');
    entry.loadedSuccessfully = false;
    return;
  }
  await textarea.fill(
    'Visual QA Test Annotation — automated student session test'
  );
  entry.screenshot = await snap(page, '06-annotation-form-filled');
  const saveBtn = page.getByRole('button', { name: /Save/i });
  const saveBtnVisible = await saveBtn.isVisible().catch(() => false);
  if (!saveBtnVisible) {
    entry.notes.push('MISSING: Save button not visible in annotation form');
  } else {
    await saveBtn.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const annotationText = page.getByText(
      'Visual QA Test Annotation — automated student session test'
    );
    const annotationVisible = await annotationText
      .isVisible()
      .catch(() => false);
    if (!annotationVisible)
      entry.notes.push('WARNING: Annotation text not visible after save');
    else entry.notes.push('SUCCESS: Annotation created and visible in list');
  }
  entry.url = page.url();
  entry.screenshot = await snap(page, '06-annotation-result');
  entry.loadedSuccessfully = saveBtnVisible;
});
