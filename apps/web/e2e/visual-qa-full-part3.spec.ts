/**
 * COMPREHENSIVE VISUAL QA — All Routes (Part 3: Admin Routes 40-61)
 * Split from visual-qa-full.spec.ts for file size compliance.
 */

import { test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_URL as BASE } from './env';
test.use({ reducedMotion: 'reduce' });

const USERS = {
  admin: { email: 'super.admin@edusphere.dev', password: 'Demo1234' },
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
    path.join(RESULTS_DIR, 'visual-qa-full-part3.json'),
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

test('40 — Admin: Dashboard', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin',
    '40 — Admin Dashboard',
    '40-admin',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('41 — Admin: Users', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/users',
    '41 — Admin Users',
    '41-admin-users',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('42 — Admin: Roles', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/roles',
    '42 — Admin Roles',
    '42-admin-roles',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('43 — Admin: Branding', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/branding',
    '43 — Admin Branding',
    '43-admin-branding',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('44 — Admin: SCIM', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/scim',
    '44 — Admin SCIM',
    '44-admin-scim',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('45 — Admin: LTI', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/lti',
    '45 — Admin LTI',
    '45-admin-lti',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('46 — Admin: Compliance', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/compliance',
    '46 — Admin Compliance',
    '46-admin-compliance',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('47 — Admin: xAPI', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/xapi',
    '47 — Admin xAPI',
    '47-admin-xapi',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('48 — Admin: Enrollment', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/enrollment',
    '48 — Admin Enrollment',
    '48-admin-enrollment',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('49 — Admin: At-Risk', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/at-risk',
    '49 — Admin At-Risk',
    '49-admin-at-risk',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('50 — Admin: Security', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/security',
    '50 — Admin Security',
    '50-admin-security',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('51 — Admin: Audit Log', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/audit',
    '51 — Admin Audit Log',
    '51-admin-audit',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('52 — Admin: Audit Log Admin', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/audit-log',
    '52 — Admin Audit Log Admin',
    '52-admin-audit-log',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('53 — Admin: Notifications', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/notifications',
    '53 — Admin Notifications',
    '53-admin-notifications',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('54 — Admin: Gamification', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/gamification',
    '54 — Admin Gamification',
    '54-admin-gamification',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('55 — Admin: Announcements', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/announcements',
    '55 — Admin Announcements',
    '55-admin-announcements',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('56 — Admin: Assessments', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/assessments',
    '56 — Admin Assessments',
    '56-admin-assessments',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('57 — Admin: BI Export', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/bi-export',
    '57 — Admin BI Export',
    '57-admin-bi-export',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('58 — Admin: CPD', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/cpd',
    '58 — Admin CPD',
    '58-admin-cpd',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('59 — Admin: Language', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/language',
    '59 — Admin Language',
    '59-admin-language',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('60 — Admin: CRM', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/crm',
    '60 — Admin CRM',
    '60-admin-crm',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
test('61 — Admin: Portal Builder', async ({ page }) => {
  await login(page, USERS.admin);
  const r = await visitRoute(
    page,
    '/admin/portal',
    '61 — Admin Portal Builder',
    '61-admin-portal',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});
