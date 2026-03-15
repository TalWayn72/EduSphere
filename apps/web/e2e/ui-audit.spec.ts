/**
 * UI Audit — EduSphere
 * Captures screenshots + console/network errors for every major page.
 * Run with: pnpm --filter @edusphere/web exec playwright test e2e/ui-audit.spec.ts --workers=1 --headed
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
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
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  const signInBtn = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  await signInBtn.waitFor({ timeout: 10_000 });
  await signInBtn.click();

  await page.waitForURL(/localhost:8080/, { timeout: 15_000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');

  await page.waitForURL(/localhost:517[0-9]/, { timeout: 25_000 });
  await page.waitForURL(/\/(dashboard|courses|learn)/, { timeout: 15_000 });
}

// ── Pages to audit ─────────────────────────────────────────────────────────

const PAGES = [
  { label: '03-dashboard', path: '/dashboard' },
  { label: '04-courses', path: '/courses' },
  { label: '05-content-viewer', path: '/learn/content-1' },
  { label: '06-knowledge-graph', path: '/knowledge-graph' },
  { label: '07-collaboration', path: '/collaboration' },
  { label: '08-profile', path: '/profile' },
];

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test('01 — Login page renders', async ({ page }) => {
  const entry: AuditEntry = {
    page: '01-login',
    url: '',
    screenshot: '',
    consoleErrors: [],
    networkErrors: [],
  };
  collectErrors(page, entry);

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  entry.url = page.url();
  entry.screenshot = await snap(page, '01-login');
  auditLog.push(entry);

  // In DEV_MODE (VITE_DEV_MODE=true) Login.tsx immediately redirects to /dashboard
  // — the Sign In button is never rendered. Only assert it when not in DEV_MODE.
  const isDevMode = process.env.VITE_DEV_MODE !== 'false';
  if (!isDevMode) {
    await expect(
      page.getByRole('button', { name: /sign in with keycloak/i })
    ).toBeVisible();
  } else {
    console.log(
      '01-login: DEV_MODE active — skipping Sign In button assertion (page redirected to app)'
    );
  }

  console.log('01-login errors:', entry.consoleErrors, entry.networkErrors);
});

test('02 — Keycloak login flow', async ({ page }) => {
  // Keycloak is not reachable in DEV_MODE — the Sign In button never renders.
  test.skip(
    process.env.VITE_DEV_MODE !== 'false',
    'Keycloak login requires VITE_DEV_MODE=false'
  );

  const entry: AuditEntry = {
    page: '02-keycloak-login',
    url: '',
    screenshot: '',
    consoleErrors: [],
    networkErrors: [],
  };
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
    // Keycloak-based SSO is not available in DEV_MODE.
    test.skip(
      process.env.VITE_DEV_MODE !== 'false',
      'Keycloak login requires VITE_DEV_MODE=false'
    );

    const entry: AuditEntry = {
      page: label,
      url: '',
      screenshot: '',
      consoleErrors: [],
      networkErrors: [],
    };
    collectErrors(page, entry);

    // restore session via silent SSO
    await loginKeycloak(page);
    await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'domcontentloaded' });
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

// ── DEV_MODE audit tests — no Keycloak required ─────────────────────────────

test.describe('UI Audit — DEV_MODE pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard page renders without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('Extension')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (e.g. GraphQL backend not running)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('Failed to fetch') && !e.includes('ECONNREFUSED')
    );
    expect(criticalErrors).toHaveLength(0);

    await expect(page).toHaveScreenshot('ui-audit-dashboard-devmode.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('no raw i18n keys on dashboard page', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toMatch(/\bcommon\.error\b/);
    expect(body).not.toMatch(/\bdashboard\.title\b/);
    expect(body).not.toContain('[object Object]');
  });

  test('profile page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });

    await expect(page).toHaveScreenshot('ui-audit-profile-devmode.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('courses page renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('[GraphQL]');
    expect(body).not.toContain('CombinedError');
  });

  test('knowledge-graph page renders without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/knowledge-graph`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });

    await expect(page).toHaveScreenshot('ui-audit-knowledge-graph-devmode.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('collaboration page renders without crash', async ({ page }) => {
    await page.goto(`${BASE_URL}/collaboration`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('[object Object]');
  });

  test('no network 4xx/5xx errors on page load audit', async ({ page }) => {
    const networkErrors: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 400 && res.url().includes('localhost')) {
        // Skip known acceptable errors
        if (
          !res.url().includes('silent-check-sso') &&
          !res.url().includes('favicon')
        ) {
          networkErrors.push(`HTTP ${res.status()} ${res.url()}`);
        }
      }
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Log errors for debugging but don't fail on GraphQL backend down in DEV_MODE
    if (networkErrors.length > 0) {
      console.log('Network errors during audit:', networkErrors);
    }
    // Ensure no 5xx errors from the web app itself (not GraphQL backend)
    const webAppErrors = networkErrors.filter(
      (e) => e.includes(':5176') || e.includes(':5175')
    );
    expect(webAppErrors).toHaveLength(0);
  });
});
