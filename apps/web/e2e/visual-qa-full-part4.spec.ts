/**
 * COMPREHENSIVE VISUAL QA — All Routes (Part 4: Student Routes 70-75)
 * Split from visual-qa-full.spec.ts for file size compliance.
 */

import { test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_URL as BASE } from './env';
test.use({ reducedMotion: 'reduce' });

const SEED = { contentId: '5e9d4794-f57b-4145-8ee6-11d89ad134e2' };
const USERS = {
  student: { email: 'student@example.com', password: 'Demo1234' },
};
const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

interface RouteResult {
  label: string;
  url: string;
  screenshot: string;
  headings: string[];
  consoleErrors: string[];
  networkErrors: string[];
  notes: string[];
  ok: boolean;
}

const results: RouteResult[] = [];

test.beforeAll(() => {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
});
test.afterAll(() => {
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'visual-qa-full-part4.json'),
    JSON.stringify(results, null, 2)
  );
});
test.describe.configure({ mode: 'serial' });

function mkResult(label: string): RouteResult {
  return {
    label,
    url: '',
    screenshot: '',
    headings: [],
    consoleErrors: [],
    networkErrors: [],
    notes: [],
    ok: false,
  };
}

function listen(page: Page, r: RouteResult) {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (
      t.includes('[vite]') ||
      t.includes('favicon') ||
      t.includes('Extension context')
    )
      return;
    r.consoleErrors.push(t);
  });
  page.on('pageerror', (err) => r.consoleErrors.push(`[PAGE] ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (
        url.includes('localhost') &&
        !url.includes('silent-check') &&
        !url.includes('login-status')
      )
        r.networkErrors.push(`HTTP ${res.status()} ${url}`);
    }
  });
}

async function snap(page: Page, name: string): Promise<string> {
  const file = path.join(
    RESULTS_DIR,
    `${name.replace(/[^a-z0-9-]/gi, '_')}.png`
  );
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

async function headings(page: Page): Promise<string[]> {
  return page
    .evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3'))
        .map((el) => (el as HTMLElement).innerText.trim())
        .filter(Boolean)
        .slice(0, 4)
    )
    .catch(() => []);
}

async function keycloakLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page
    .fill('#username', email)
    .catch(() => page.fill('input[name="username"]', email).catch(() => {}));
  await page
    .fill('#password', password)
    .catch(() => page.fill('input[name="password"]', password).catch(() => {}));
  await page
    .click('#kc-login')
    .catch(() => page.click('button[type="submit"]').catch(() => {}));
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
}

async function login(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  // DEV_MODE: use the dev-login-btn shortcut (no Keycloak required)
  const isDevMode = process.env.VITE_DEV_MODE !== 'false';
  if (isDevMode) {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await page.goto(`${BASE}/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(500);
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    if (await devBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await devBtn.click();
      await page
        .waitForURL((url) => !url.toString().includes('/login'), {
          timeout: 20000,
        })
        .catch(() => {});
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      return;
    }
  }
  // LIVE_BACKEND: use Keycloak OIDC flow
  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
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
    await page
      .waitForURL(new RegExp(BASE.replace(/https?:\/\//, '') + '/'), {
        timeout: 25000,
      })
      .catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(500);
  }
  if (page.url().includes('/login')) {
    const retryBtn = page.getByRole('button', {
      name: /sign in with keycloak/i,
    });
    if (await retryBtn.isVisible().catch(() => false)) {
      await retryBtn.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
      if (page.url().includes('8080')) {
        await keycloakLogin(page, user.email, user.password);
        await page
          .waitForURL(new RegExp(BASE.replace(/https?:\/\//, '') + '/'), {
            timeout: 25000,
          })
          .catch(() => {});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }
}

async function visitRoute(
  page: Page,
  route: string,
  label: string,
  snapName: string,
  _waitMs = 3000
): Promise<RouteResult> {
  const r = mkResult(label);
  listen(page, r);
  results.push(r);
  await page
    .goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, snapName);
  const crashed = await page
    .getByText(/something went wrong/i)
    .isVisible()
    .catch(() => false);
  const has500 = r.networkErrors.some((e) => e.includes('HTTP 500'));
  if (crashed) r.notes.push('CRITICAL: Error boundary triggered');
  if (has500) r.notes.push('CRITICAL: 500 Server Error detected');
  r.ok =
    !crashed &&
    !has500 &&
    r.consoleErrors.filter((e) => !e.includes('ResizeObserver')).length === 0;
  return r;
}

test('70 — Student: Dashboard', async ({ page }) => {
  await login(page, USERS.student);
  const r = await visitRoute(
    page,
    '/dashboard',
    '70 — Student Dashboard',
    '70-student-dashboard',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('71 — Student: Courses', async ({ page }) => {
  await login(page, USERS.student);
  const r = await visitRoute(
    page,
    '/courses',
    '71 — Student Courses',
    '71-student-courses',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('72 — Student: Content viewer', async ({ page }) => {
  await login(page, USERS.student);
  const r = await visitRoute(
    page,
    `/learn/${SEED.contentId}`,
    '72 — Student Content Viewer',
    '72-student-content-viewer',
    5000
  );
  const crashed = r.notes.some((n) => n.includes('CRITICAL'));
  r.ok = !crashed;
});

test('73 — Student: Agents', async ({ page }) => {
  await login(page, USERS.student);
  const r = await visitRoute(
    page,
    '/agents',
    '73 — Student Agents',
    '73-student-agents',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('74 — Student: My Badges', async ({ page }) => {
  await login(page, USERS.student);
  const r = await visitRoute(
    page,
    '/my-badges',
    '74 — Student My Badges',
    '74-student-my-badges',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('75 — Student: Search', async ({ page }) => {
  await login(page, USERS.student);
  const r = await visitRoute(
    page,
    '/search',
    '75 — Student Search',
    '75-student-search',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
