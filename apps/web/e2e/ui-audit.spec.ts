/**
 * UI Audit — EduSphere
 * Captures screenshots + console/network errors for every major page.
 * Run with: pnpm --filter @edusphere/web exec playwright test e2e/ui-audit.spec.ts --workers=1 --headed
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';

const BASE = 'http://localhost:5173';
const STUDENT = { email: 'student@example.com', password: 'Student123!' };
const DIR = path.join(process.cwd(), 'ui-audit-results');

interface AuditEntry {
  page: string;
  url: string;
  screenshot: string;
  consoleErrors: string[];
  networkErrors: string[];
}

const auditLog: AuditEntry[] = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function collectErrors(page: Page, entry: AuditEntry) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // ignore known browser noise
      if (!text.includes('favicon') && !text.includes('Extension')) {
        entry.consoleErrors.push(text);
      }
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      // only flag graphql and app-origin requests
      if (url.includes('localhost')) {
        entry.networkErrors.push(`HTTP ${res.status()} ${url}`);
      }
    }
  });
}

async function snap(page: Page, label: string): Promise<string> {
  const file = path.join(DIR, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginKeycloak(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded');

  const signInBtn = page.getByRole('button', { name: /sign in with keycloak/i });
  await signInBtn.waitFor({ timeout: 10_000 });
  await signInBtn.click();

  await page.waitForURL(/localhost:8080/, { timeout: 15_000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');

  await page.waitForURL(/localhost:5173/, { timeout: 25_000 });
  await page.waitForURL(/\/(dashboard|courses|learn)/, { timeout: 15_000 });
}

// ── Pages to audit ─────────────────────────────────────────────────────────

const PAGES = [
  { label: '03-dashboard',      path: '/dashboard' },
  { label: '04-courses',        path: '/courses' },
  { label: '05-content-viewer', path: '/learn/content-1' },
  { label: '06-knowledge-graph',path: '/knowledge-graph' },
  { label: '07-collaboration',  path: '/collaboration' },
  { label: '08-profile',        path: '/profile' },
];

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test('01 — Login page renders', async ({ page }) => {
  const entry: AuditEntry = { page: '01-login', url: '', screenshot: '', consoleErrors: [], networkErrors: [] };
  collectErrors(page, entry);

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  entry.url = page.url();
  entry.screenshot = await snap(page, '01-login');
  auditLog.push(entry);

  // Assert Sign In button visible
  await expect(page.getByRole('button', { name: /sign in with keycloak/i })).toBeVisible();
  console.log('01-login errors:', entry.consoleErrors, entry.networkErrors);
});

test('02 — Keycloak login flow', async ({ page }) => {
  const entry: AuditEntry = { page: '02-keycloak-login', url: '', screenshot: '', consoleErrors: [], networkErrors: [] };
  collectErrors(page, entry);

  await loginKeycloak(page);
  await page.waitForTimeout(1500);

  entry.url = page.url();
  entry.screenshot = await snap(page, '02-post-login');
  auditLog.push(entry);

  expect(page.url()).not.toContain('/login');
  console.log('02-login errors:', entry.consoleErrors, entry.networkErrors);
});

for (const { label, path: pagePath } of PAGES) {
  test(`Audit — ${label}`, async ({ page }) => {
    const entry: AuditEntry = { page: label, url: '', screenshot: '', consoleErrors: [], networkErrors: [] };
    collectErrors(page, entry);

    // restore session via silent SSO
    await loginKeycloak(page);
    await page.goto(`${BASE}${pagePath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500); // let data fetch settle

    entry.url = page.url();
    entry.screenshot = await snap(page, label);
    auditLog.push(entry);

    // Log findings
    if (entry.consoleErrors.length > 0) {
      console.log(`❌ ${label} console errors:`, entry.consoleErrors);
    }
    if (entry.networkErrors.length > 0) {
      console.log(`❌ ${label} network errors:`, entry.networkErrors);
    }
    if (entry.consoleErrors.length === 0 && entry.networkErrors.length === 0) {
      console.log(`✅ ${label} — clean`);
    }
  });
}
