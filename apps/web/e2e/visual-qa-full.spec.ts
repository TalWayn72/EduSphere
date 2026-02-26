/**
 * COMPREHENSIVE VISUAL QA — All Routes, All Roles
 *
 * Covers every route defined in router.tsx, with real Keycloak auth.
 * Captures console errors, network errors, screenshots for each page.
 *
 * Usage (against the running dev server on 5173):
 *   E2E_ENV=staging E2E_BASE_URL=http://localhost:5173 \
 *   VITE_DEV_MODE=false \
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-qa-full.spec.ts \
 *   --workers=1 --project=chromium --reporter=list
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ── Config ──────────────────────────────────────────────────────────────────

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

// Known seed data IDs (from nahar-shalom-course.ts + DB query)
const SEED = {
  courseId: 'cc000000-0000-0000-0000-000000000002',
  contentId: '5e9d4794-f57b-4145-8ee6-11d89ad134e2', // first MARKDOWN item
};

const USERS = {
  instructor: { email: 'instructor@example.com', password: 'Demo1234' },
  student: { email: 'student@example.com', password: 'Demo1234' },
  admin: { email: 'super.admin@edusphere.dev', password: 'Demo1234' },
};

const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

// ── Types ───────────────────────────────────────────────────────────────────

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

// ── Setup ───────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
});

test.afterAll(() => {
  const reportPath = path.join(RESULTS_DIR, 'visual-qa-full.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const errCount = results.reduce(
    (n, r) => n + r.consoleErrors.length + r.networkErrors.length,
    0
  );

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  VISUAL QA REPORT — EduSphere Full Route Coverage');
  console.log('══════════════════════════════════════════════════════');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    console.log(`\n[${icon}] ${r.label}`);
    if (r.headings.length) console.log(`     H: ${r.headings.join(' | ')}`);
    if (r.consoleErrors.length) {
      console.log(`     CONSOLE ERRORS (${r.consoleErrors.length}):`);
      r.consoleErrors
        .slice(0, 3)
        .forEach((e) => console.log(`       - ${e.slice(0, 200)}`));
    }
    if (r.networkErrors.length) {
      console.log(`     NETWORK ERRORS (${r.networkErrors.length}):`);
      r.networkErrors
        .slice(0, 3)
        .forEach((e) => console.log(`       - ${e.slice(0, 200)}`));
    }
    if (r.notes.length) r.notes.forEach((n) => console.log(`     * ${n}`));
  }
  console.log(`\n── SUMMARY ──`);
  console.log(
    `Routes: ${results.length} | OK: ${ok} | FAIL: ${fail} | Total errors: ${errCount}`
  );
  console.log(`Report: ${reportPath}`);
  console.log('══════════════════════════════════════════════════════\n');
});

test.describe.configure({ mode: 'serial' });

// ── Helpers ─────────────────────────────────────────────────────────────────

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
      ) {
        r.networkErrors.push(`HTTP ${res.status()} ${url}`);
      }
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
  await page.waitForTimeout(3000);
}

async function login(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.waitForTimeout(1500);

  const btn = page.getByRole('button', { name: /sign in with keycloak/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(2000);
  }

  if (page.url().includes('8080') || page.url().includes('auth')) {
    await keycloakLogin(page, user.email, user.password);
    await page.waitForURL(/localhost:5173/, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Retry if still on login
  if (page.url().includes('/login')) {
    const retryBtn = page.getByRole('button', {
      name: /sign in with keycloak/i,
    });
    if (await retryBtn.isVisible().catch(() => false)) {
      await retryBtn.click();
      await page.waitForTimeout(2000);
      if (page.url().includes('8080')) {
        await keycloakLogin(page, user.email, user.password);
        await page
          .waitForURL(/localhost:5173/, { timeout: 25000 })
          .catch(() => {});
        await page.waitForTimeout(2000);
      }
    }
  }
}

async function visitRoute(
  page: Page,
  route: string,
  label: string,
  snapName: string,
  waitMs = 3000
): Promise<RouteResult> {
  const r = mkResult(label);
  listen(page, r);
  results.push(r);

  await page
    .goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(waitMs);

  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, snapName);

  const crashed = await page
    .getByText(/something went wrong/i)
    .isVisible()
    .catch(() => false);
  const unauthorized = await page
    .getByText(/unauthorized|403|forbidden/i)
    .isVisible()
    .catch(() => false);
  const notFound = await page
    .getByText(/404|not found/i)
    .isVisible()
    .catch(() => false);

  if (crashed) r.notes.push('CRITICAL: Error boundary triggered');
  if (unauthorized) r.notes.push('AUTH: Unauthorized/Forbidden shown');
  if (notFound) r.notes.push('INFO: 404/Not Found state');

  const has400 = r.networkErrors.some((e) => e.includes('HTTP 400'));
  const has500 = r.networkErrors.some((e) => e.includes('HTTP 500'));
  if (has400) r.notes.push('WARNING: 400 Bad Request detected');
  if (has500) r.notes.push('CRITICAL: 500 Server Error detected');

  r.ok =
    !crashed &&
    !has500 &&
    r.consoleErrors.filter((e) => !e.includes('ResizeObserver')).length === 0;
  return r;
}

// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC PAGES (no auth)
// ════════════════════════════════════════════════════════════════════════════

test('01 — Public: Login page', async ({ page }) => {
  const r = mkResult('01 — Login');
  listen(page, r);
  results.push(r);

  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, '01-login');

  const hasBtn = await page
    .getByRole('button', { name: /sign in with keycloak/i })
    .isVisible()
    .catch(() => false);
  r.notes.push(`Sign-in button: ${hasBtn}`);
  r.ok = hasBtn;
});

test('02 — Public: Accessibility statement', async ({ page }) => {
  await visitRoute(
    page,
    '/accessibility',
    '02 — Accessibility',
    '02-accessibility'
  );
});

test('03 — Public: Badge verifier', async ({ page }) => {
  await visitRoute(
    page,
    '/verify/badge/test-assertion-123',
    '03 — Badge Verifier',
    '03-badge-verifier'
  );
});

test('04 — Public: Portal', async ({ page }) => {
  await visitRoute(page, '/portal', '04 — Portal', '04-portal');
});

// ════════════════════════════════════════════════════════════════════════════
//  INSTRUCTOR SESSION — full route sweep
// ════════════════════════════════════════════════════════════════════════════

test('10 — Auth: Instructor Keycloak login', async ({ page }) => {
  const r = mkResult('10 — Instructor Login');
  listen(page, r);
  results.push(r);

  await login(page, USERS.instructor);

  r.url = page.url();
  r.headings = await headings(page);
  r.screenshot = await snap(page, '10-instructor-login');

  const loggedIn = !r.url.includes('/login') && r.url.includes('5173');
  r.notes.push(`Logged in: ${loggedIn} | URL: ${r.url}`);
  r.ok = loggedIn;
});

test('11 — Dashboard', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/dashboard',
    '11 — Dashboard',
    '11-dashboard',
    4000
  );
  const hasHeading = r.headings.some((h) => /dashboard/i.test(h));
  if (!hasHeading) r.notes.push('MISSING: Dashboard heading');
  r.ok = r.ok && !r.url.includes('/login');
});

test('12 — Courses list', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/courses',
    '12 — Courses',
    '12-courses',
    4000
  );
  const cardCount = await page
    .locator('[class*="card"]')
    .count()
    .catch(() => 0);
  r.notes.push(`Course cards: ${cardCount}`);
  r.ok = r.ok && !r.url.includes('/login');
});

test('13 — Course detail (nahar-shalom)', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    `/courses/${SEED.courseId}`,
    '13 — Course Detail',
    '13-course-detail',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('14 — Course analytics', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    `/courses/${SEED.courseId}/analytics`,
    '14 — Course Analytics',
    '14-course-analytics',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('15 — Course create', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/courses/new',
    '15 — Course Create',
    '15-course-create',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('16 — Content viewer (MARKDOWN)', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    `/learn/${SEED.contentId}?courseId=${SEED.courseId}`,
    '16 — Content Viewer',
    '16-content-viewer',
    5000
  );
  const has400 = r.networkErrors.some((e) => e.includes('HTTP 400'));
  const crashed = r.notes.some((n) => n.includes('CRITICAL'));
  r.notes.push(`400 errors: ${has400}, crashed: ${crashed}`);
  r.ok = !crashed && !has400;
});

test('17 — Knowledge graph', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/graph',
    '17 — Knowledge Graph',
    '17-graph',
    5000
  );
  const canvas = await page
    .locator('canvas')
    .isVisible()
    .catch(() => false);
  const svg = await page
    .locator('svg')
    .isVisible()
    .catch(() => false);
  r.notes.push(`canvas: ${canvas}, svg: ${svg}`);
  r.ok = r.ok && !r.url.includes('/login');
});

test('18 — AI Agents page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/agents',
    '18 — AI Agents',
    '18-agents',
    4000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('19 — Annotations page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/annotations',
    '19 — Annotations',
    '19-annotations',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('20 — Collaboration page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/collaboration',
    '20 — Collaboration',
    '20-collaboration',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('21 — Search page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(page, '/search', '21 — Search', '21-search', 3000);
  const input = await page
    .locator('input')
    .first()
    .isVisible()
    .catch(() => false);
  r.notes.push(`Search input: ${input}`);
  r.ok = r.ok && !r.url.includes('/login');
});

test('22 — Profile page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/profile',
    '22 — Profile',
    '22-profile',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('23 — Settings page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/settings',
    '23 — Settings',
    '23-settings',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('24 — Chavruta page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/chavruta',
    '24 — Chavruta',
    '24-chavruta',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('25 — Scenarios page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/scenarios',
    '25 — Scenarios',
    '25-scenarios',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('26 — Programs page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/programs',
    '26 — Programs',
    '26-programs',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('27 — Marketplace page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/marketplace',
    '27 — Marketplace',
    '27-marketplace',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('28 — Library page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/library',
    '28 — Library',
    '28-library',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('29 — My Badges page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/my-badges',
    '29 — My Badges',
    '29-my-badges',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

test('30 — Instructor Earnings page', async ({ page }) => {
  await login(page, USERS.instructor);
  const r = await visitRoute(
    page,
    '/instructor/earnings',
    '30 — Instructor Earnings',
    '30-instructor-earnings',
    3000
  );
  r.ok = r.ok && !r.url.includes('/login');
});

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES (super.admin@edusphere.dev)
// ════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════
//  STUDENT SESSION
// ════════════════════════════════════════════════════════════════════════════

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
  // Student is in tenant 11111111-... so may not see nahar-shalom
  // But the page should still render without crashing
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
