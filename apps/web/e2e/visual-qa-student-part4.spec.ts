/**
 * VISUAL QA — Student Session Browser Test (Part 4: Tests 10-12)
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
    path.join(RESULTS_DIR, 'qa-report-part4.json'),
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

test('10 — AI Agents Page — Chavruta mode and chat', async ({ page }) => {
  const entry: PageReport = {
    label: '10 — AI Agents (Chavruta)',
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
  await page.goto(`${BASE}/agents`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '10-agents-page');
  const heading = page.getByRole('heading', { name: 'AI Learning Agents' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible)
    entry.notes.push('MISSING: "AI Learning Agents" heading not visible');
  const modes = [
    'Chavruta Debate',
    'Quiz Master',
    'Summarizer',
    'Research Scout',
    'Explainer',
  ];
  for (const mode of modes) {
    const modeEl = page.getByText(mode).first();
    const visible = await modeEl.isVisible().catch(() => false);
    if (!visible) entry.notes.push(`MISSING agent mode card: "${mode}"`);
  }
  const chatInput = page.locator('input[placeholder*="Ask the"]').first();
  const inputVisible = await chatInput.isVisible().catch(() => false);
  if (!inputVisible) entry.notes.push('MISSING: Chat input field not visible');
  const greeting = page
    .getByText(/Chavruta partner/i)
    .or(page.getByText(/שלום/))
    .or(page.getByText(/debate/i));
  const greetingVisible = await greeting
    .first()
    .isVisible()
    .catch(() => false);
  if (!greetingVisible)
    entry.notes.push('WARNING: Chavruta greeting message not visible in chat');
  if (inputVisible) {
    await chatInput.fill('What is free will from a Talmudic perspective?');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    entry.screenshot = await snap(page, '10-agents-message-sent');
    const userMsg = page.getByText(
      'What is free will from a Talmudic perspective?'
    );
    const userMsgVisible = await userMsg.isVisible().catch(() => false);
    if (!userMsgVisible)
      entry.notes.push('BUG: User message not visible after sending');
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);
    entry.screenshot = await snap(page, '10-agents-ai-response');
    const agentBubbles = page.locator(
      '[class*="bg-muted"][class*="rounded-lg"]'
    );
    const bubbleCount = await agentBubbles.count().catch(() => 0);
    entry.notes.push(`AI response bubbles visible: ${bubbleCount}`);
    if (bubbleCount < 2)
      entry.notes.push('WARNING: AI response did not appear after message');
  }
  entry.loadedSuccessfully = headingVisible && inputVisible;
});

test('11 — Collaboration Page', async ({ page }) => {
  const entry: PageReport = {
    label: '11 — Collaboration Page',
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
  await page.goto(`${BASE}/collaboration`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '11-collaboration');
  const header = page.locator('header');
  const headerVisible = await header.isVisible().catch(() => false);
  const heading = page.locator('h1, h2').first();
  const headingText = await heading.textContent().catch(() => '');
  entry.notes.push(`Page heading: "${headingText}"`);
  const crashed = page.getByText(/something went wrong/i);
  const hasCrashed = await crashed.isVisible().catch(() => false);
  if (hasCrashed)
    entry.notes.push(
      'CRITICAL: Collaboration page crashed with error boundary'
    );
  entry.loadedSuccessfully = headerVisible && !hasCrashed;
});

test('12 — Profile Page', async ({ page }) => {
  const entry: PageReport = {
    label: '12 — Profile Page',
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
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  entry.url = page.url();
  entry.screenshot = await snap(page, '12-profile');
  const header = page.locator('header');
  const headerVisible = await header.isVisible().catch(() => false);
  const profileHeading = page
    .getByRole('heading', { name: /profile/i })
    .first();
  const profileVisible = await profileHeading.isVisible().catch(() => false);
  if (!profileVisible) entry.notes.push('MISSING: Profile heading not visible');
  const emailField = page.getByText(STUDENT.email);
  const emailVisible = await emailField.isVisible().catch(() => false);
  if (!emailVisible)
    entry.notes.push('INFO: Student email not visible on profile page');
  entry.loadedSuccessfully = headerVisible;
});
