/**
 * COMPREHENSIVE VISUAL QA — All Routes (Part 2: Instructor Routes 11-30)
 * Split from visual-qa-full.spec.ts for file size compliance.
 */

import { test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_URL as BASE } from './env';
test.use({ reducedMotion: 'reduce' });

const SEED = {
  courseId: 'cc000000-0000-0000-0000-000000000002',
  contentId: '5e9d4794-f57b-4145-8ee6-11d89ad134e2',
};
const USERS = { instructor: { email: 'instructor@example.com', password: 'Demo1234' } };
const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

interface RouteResult {
  label: string; url: string; screenshot: string; headings: string[];
  consoleErrors: string[]; networkErrors: string[]; notes: string[]; ok: boolean;
}

const results: RouteResult[] = [];

test.beforeAll(() => { fs.mkdirSync(RESULTS_DIR, { recursive: true }); });
test.afterAll(() => { fs.writeFileSync(path.join(RESULTS_DIR, 'visual-qa-full-part2.json'), JSON.stringify(results, null, 2)); });
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
  // DEV_MODE: use the dev-login-btn shortcut (no Keycloak required)
  const isDevMode = process.env.VITE_DEV_MODE !== 'false';
  if (isDevMode) {
    await page.addInitScript(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    });
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(500);
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    if (await devBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await devBtn.click();
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      return;
    }
  }
  // LIVE_BACKEND: use Keycloak OIDC flow
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
  const has500 = r.networkErrors.some((e) => e.includes('HTTP 500'));
  if (crashed) r.notes.push('CRITICAL: Error boundary triggered');
  if (has500) r.notes.push('CRITICAL: 500 Server Error detected');
  r.ok = !crashed && !has500 && r.consoleErrors.filter((e) => !e.includes('ResizeObserver')).length === 0;
  return r;
}

test('11 — Dashboard', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/dashboard', '11 — Dashboard', '11-dashboard', 4000);
  const hasHeading = r.headings.some((h) => /dashboard/i.test(h));
  if (!hasHeading) r.notes.push('MISSING: Dashboard heading');
  r.ok = r.ok && !r.url.includes('/login');
});

test('12 — Courses list', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/courses', '12 — Courses', '12-courses', 4000);
  const cardCount = await page.locator('[class*="card"]').count().catch(() => 0);
  r.notes.push(`Course cards: ${cardCount}`);
  r.ok = r.ok && !r.url.includes('/login');
});

test('13 — Course detail (nahar-shalom)', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, `/courses/${SEED.courseId}`, '13 — Course Detail', '13-course-detail', 4000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('14 — Course analytics', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, `/courses/${SEED.courseId}/analytics`, '14 — Course Analytics', '14-course-analytics', 4000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('15 — Course create', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/courses/new', '15 — Course Create', '15-course-create', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('16 — Content viewer (MARKDOWN)', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, `/learn/${SEED.contentId}?courseId=${SEED.courseId}`, '16 — Content Viewer', '16-content-viewer', 5000);
  const has400 = r.networkErrors.some((e) => e.includes('HTTP 400'));
  const crashed = r.notes.some((n) => n.includes('CRITICAL'));
  r.notes.push(`400 errors: ${has400}, crashed: ${crashed}`);
  r.ok = !crashed && !has400;
});

test('17 — Knowledge graph', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/graph', '17 — Knowledge Graph', '17-graph', 5000);
  const canvas = await page.locator('canvas').isVisible().catch(() => false);
  const svg = await page.locator('svg').isVisible().catch(() => false);
  r.notes.push(`canvas: ${canvas}, svg: ${svg}`);
  r.ok = r.ok && !r.url.includes('/login');
});

test('18 — AI Agents page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/agents', '18 — AI Agents', '18-agents', 4000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('19 — Annotations page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/annotations', '19 — Annotations', '19-annotations', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('20 — Collaboration page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/collaboration', '20 — Collaboration', '20-collaboration', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('21 — Search page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/search', '21 — Search', '21-search', 3000);
  const input = await page.locator('input').first().isVisible().catch(() => false);
  r.notes.push(`Search input: ${input}`);
  r.ok = r.ok && !r.url.includes('/login');
});

test('22 — Profile page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/profile', '22 — Profile', '22-profile', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('23 — Settings page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/settings', '23 — Settings', '23-settings', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('24 — Chavruta page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/chavruta', '24 — Chavruta', '24-chavruta', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('25 — Scenarios page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/scenarios', '25 — Scenarios', '25-scenarios', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('26 — Programs page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/programs', '26 — Programs', '26-programs', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('27 — Marketplace page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/marketplace', '27 — Marketplace', '27-marketplace', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('28 — Library page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/library', '28 — Library', '28-library', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('29 — My Badges page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/my-badges', '29 — My Badges', '29-my-badges', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});

test('30 — Instructor Earnings page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/instructor/earnings', '30 — Instructor Earnings', '30-instructor-earnings', 3000);
  r.ok = r.ok && !r.url.includes('/login');
});
