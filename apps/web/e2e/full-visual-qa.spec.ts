/**
 * COMPREHENSIVE VISUAL QA — All 3 User Scenarios
 *
 * Covers: Student, Instructor, Super Admin
 * Tests: All routes, login/logout flows, navigation, page content
 *
 * Run:
 *   VITE_DEV_MODE=false E2E_BASE_URL=http://localhost:5175 \
 *   pnpm --filter @edusphere/web exec playwright test e2e/full-visual-qa.spec.ts \
 *   --workers=1 --project=chromium --reporter=list
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

const USERS = {
  student: { email: 'student@example.com', password: 'Student123!', role: 'Student' },
  instructor: { email: 'instructor@example.com', password: 'Instructor123!', role: 'Instructor' },
  admin: { email: 'super.admin@edusphere.dev', password: 'SuperAdmin123!', role: 'Super Admin' },
};

interface PageEntry {
  label: string;
  url: string;
  screenshot: string;
  headings: string[];
  bodySnippet: string;
  consoleErrors: string[];
  networkErrors: string[];
  notes: string[];
  loadedOk: boolean;
}

const allEntries: PageEntry[] = [];

test.beforeAll(() => {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
});

test.afterAll(() => {
  const reportPath = path.join(RESULTS_DIR, 'full-qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allEntries, null, 2));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  FULL VISUAL QA REPORT — EduSphere (Student + Instructor + Super Admin)');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  for (const e of allEntries) {
    const icon = e.loadedOk ? 'OK ' : 'ERR';
    console.log(`\n[${icon}] ${e.label}`);
    console.log(`     URL: ${e.url}`);
    if (e.headings.length > 0) console.log(`     Headings: ${e.headings.join(' | ')}`);
    if (e.bodySnippet) console.log(`     Content: ${e.bodySnippet.substring(0, 200)}`);
    if (e.consoleErrors.length > 0) {
      console.log(`     CONSOLE ERRORS (${e.consoleErrors.length}):`);
      e.consoleErrors.slice(0, 5).forEach(err => console.log(`       - ${err}`));
    }
    if (e.networkErrors.length > 0) {
      console.log(`     NETWORK ERRORS (${e.networkErrors.length}):`);
      e.networkErrors.slice(0, 5).forEach(err => console.log(`       - ${err}`));
    }
    if (e.notes.length > 0) {
      console.log(`     NOTES:`);
      e.notes.forEach(n => console.log(`       * ${n}`));
    }
    console.log(`     Screenshot: ${path.basename(e.screenshot)}`);
  }

  const failed = allEntries.filter(e => !e.loadedOk).length;
  const totalErrors = allEntries.reduce((s, e) => s + e.consoleErrors.length + e.networkErrors.length, 0);
  console.log(`\n\nSUMMARY: ${allEntries.length} pages | ${failed} failures | ${totalErrors} total errors`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function attachListeners(page: Page, entry: PageEntry) {
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('favicon') || text.includes('[vite]') || text.includes('Extension')) return;
    if (msg.type() === 'error') entry.consoleErrors.push(text);
  });
  page.on('pageerror', err => entry.consoleErrors.push(`[PAGE ERROR] ${err.message}`));
  page.on('response', res => {
    if (res.status() >= 400 && res.status() !== 401) {
      const url = res.url();
      if (url.includes('localhost') && !url.includes('silent-check-sso') && !url.includes('login-status-iframe')) {
        entry.networkErrors.push(`HTTP ${res.status()} ${url}`);
      }
    }
  });
  page.on('requestfailed', req => {
    const url = req.url();
    if (url.includes('localhost') && !url.includes('silent-check-sso')) {
      entry.networkErrors.push(`FAILED: ${url} (${req.failure()?.errorText ?? 'unknown'})`);
    }
  });
}

async function snap(page: Page, name: string): Promise<string> {
  const file = path.join(RESULTS_DIR, `${name.replace(/[^a-z0-9-]/gi, '_')}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function getInfo(page: Page) {
  const headings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(el => (el as HTMLElement).innerText.trim())
      .filter(Boolean).slice(0, 5);
  }).catch(() => [] as string[]);

  const bodySnippet = await page.evaluate(() => {
    return (document.body?.innerText ?? '').substring(0, 300);
  }).catch(() => '');

  return { headings, bodySnippet };
}

async function keycloakLogin(page: Page, email: string, password: string): Promise<boolean> {
  const url = page.url();
  if (!url.includes('8080') && !url.includes('keycloak') && !url.includes('auth/realms')) {
    return false;
  }

  await page.fill('#username', email).catch(() =>
    page.fill('input[name="username"]', email).catch(() => {})
  );
  await page.fill('#password', password).catch(() =>
    page.fill('input[name="password"]', password).catch(() => {})
  );
  await page.click('#kc-login').catch(() =>
    page.click('button[type="submit"]').catch(() => {})
  );
  await page.waitForTimeout(3000);
  return true;
}

async function doLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Click Sign In button
  const signInBtn = page.getByRole('button', { name: /sign in with keycloak/i });
  const btnVisible = await signInBtn.isVisible().catch(() => false);
  if (btnVisible) {
    await signInBtn.click();
    await page.waitForTimeout(2000);
  }

  // Handle Keycloak redirect
  await keycloakLogin(page, email, password);

  // Wait for redirect back to app
  await page.waitForURL(/localhost:5175/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function doLogout(page: Page): Promise<void> {
  // Try to find the user menu and click logout
  const menuBtn = page
    .locator('[data-testid="user-menu"]')
    .or(page.getByRole('button', { name: /user menu/i }))
    .or(page.locator('button').filter({ has: page.locator('span.sr-only') }))
    .first();

  const menuVisible = await menuBtn.isVisible().catch(() => false);
  if (menuVisible) {
    await menuBtn.click();
    await page.waitForTimeout(500);
  }

  const logoutItem = page
    .getByRole('menuitem', { name: /log out/i })
    .or(page.getByRole('button', { name: /log out/i }))
    .or(page.getByText(/log out/i).first());

  const logoutVisible = await logoutItem.isVisible().catch(() => false);
  if (logoutVisible) {
    await logoutItem.click();
    await page.waitForTimeout(3000);
  }
}

// ── TESTS ───────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

// ─── S1: Login Page Render ─────────────────────────────────────────────────────

test('S1.01 — Login page initial render', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.01 — Login Page',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.01-login-page');

  const heading = await page.getByRole('heading', { name: 'Welcome to EduSphere' }).isVisible().catch(() => false);
  const signInBtn = await page.getByRole('button', { name: /sign in with keycloak/i }).isVisible().catch(() => false);
  const logo = await page.locator('[class*="BookOpen"], svg').first().isVisible().catch(() => false);

  if (!heading) entry.notes.push('MISSING: "Welcome to EduSphere" heading');
  if (!signInBtn) entry.notes.push('MISSING: "Sign In with Keycloak" button');
  if (!logo) entry.notes.push('INFO: Logo/icon not visible');
  if (heading && signInBtn) entry.notes.push('SUCCESS: Login page fully rendered with heading + button');

  entry.loadedOk = heading && signInBtn;
  // Non-fatal — capture state without hard assertion
  if (!heading) {
    entry.notes.push(`Full body text: ${info.bodySnippet}`);
  }
});

// ─── S1: Student — Full Navigation ────────────────────────────────────────────

test('S1.02 — Student login via Keycloak', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.02 — Student Keycloak Login',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.02-student-after-login');

  const isOnApp = page.url().includes('localhost:5175') && !page.url().includes('/login');
  const isOnLogin = page.url().includes('/login');

  if (isOnApp) {
    entry.notes.push(`SUCCESS: Landed on ${page.url()} after login`);
    entry.loadedOk = true;
  } else if (isOnLogin) {
    entry.notes.push('FAILURE: Still on login page — Keycloak auth failed or redirect broken');
    entry.loadedOk = false;
  } else {
    entry.notes.push(`On Keycloak page: ${page.url()}`);
    entry.loadedOk = false;
  }

  // Check for double-init error
  const doubleInit = entry.consoleErrors.find(e => e.includes('can only be initialized once'));
  if (doubleInit) entry.notes.push('SEC-KC-001: Keycloak double-init error: ' + doubleInit);
});

test('S1.03 — Student — Dashboard', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.03 — Student Dashboard',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.03-student-dashboard');

  const headingVisible = await page.getByRole('heading', { name: 'Dashboard' }).isVisible().catch(() => false);
  const statsCards = ['Study Time', 'Concepts Mastered', 'Active Courses', 'Annotations'];
  for (const stat of statsCards) {
    const visible = await page.getByText(stat).first().isVisible().catch(() => false);
    entry.notes.push(`Stat card "${stat}": ${visible ? 'VISIBLE' : 'MISSING'}`);
  }
  const navVisible = await page.locator('nav').isVisible().catch(() => false);
  entry.notes.push(`Navigation sidebar: ${navVisible ? 'VISIBLE' : 'MISSING'}`);

  const errorCard = await page.locator('.border-destructive').isVisible().catch(() => false);
  if (errorCard) {
    const errText = await page.locator('.border-destructive').textContent().catch(() => '');
    entry.notes.push(`ERROR CARD: ${errText}`);
  }

  if (!headingVisible) entry.notes.push('MISSING: Dashboard heading not found');
  entry.loadedOk = headingVisible;
});

test('S1.04 — Student — Courses', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.04 — Student Courses',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.04-student-courses');

  const headingVisible = await page.getByRole('heading', { name: 'Courses' }).isVisible().catch(() => false);
  const courseCards = page.locator('[data-testid="course-card"], .course-card').or(
    page.locator('[class*="card"]').filter({ has: page.locator('h3') })
  );
  const cardCount = await courseCards.count().catch(() => 0);
  entry.notes.push(`Course cards visible: ${cardCount}`);

  const emptyState = await page.getByText(/no courses/i).isVisible().catch(() => false);
  if (emptyState) entry.notes.push('WARNING: Empty state — no courses loaded');

  const enrollBtn = await page.getByRole('button', { name: /enroll/i }).first().isVisible().catch(() => false);
  entry.notes.push(`Enroll button visible: ${enrollBtn}`);

  if (!headingVisible) entry.notes.push('MISSING: Courses heading');
  entry.loadedOk = headingVisible;
});

test('S1.05 — Student — Content Viewer (/learn/content-1)', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.05 — Content Viewer',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/learn/content-1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.05-content-viewer');

  const videoVisible = await page.locator('video').isVisible().catch(() => false);
  const transcriptVisible = await page.getByText('Transcript').isVisible().catch(() => false);
  const annotationsPanel = await page.getByText('Annotations').first().isVisible().catch(() => false);
  const crashed = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
  const notFound = await page.getByText(/not found|404/i).isVisible().catch(() => false);

  entry.notes.push(`Video player: ${videoVisible ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Transcript panel: ${transcriptVisible ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Annotations panel: ${annotationsPanel ? 'VISIBLE' : 'MISSING'}`);
  if (crashed) entry.notes.push('CRITICAL: Error boundary triggered');
  if (notFound) entry.notes.push('WARNING: Content not found / 404');

  entry.loadedOk = (videoVisible || transcriptVisible) && !crashed;
});

test('S1.06 — Student — Agents page', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.06 — AI Agents',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/agents`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.06-agents');

  const headingVisible = await page.getByRole('heading', { name: /AI Learning Agents/i }).isVisible().catch(() => false);
  const modes = ['Chavruta Debate', 'Quiz Master', 'Summarizer', 'Research Scout', 'Explainer'];
  for (const mode of modes) {
    const visible = await page.getByText(mode).first().isVisible().catch(() => false);
    entry.notes.push(`Agent mode "${mode}": ${visible ? 'VISIBLE' : 'MISSING'}`);
  }
  const chatInput = await page.locator('input[placeholder*="Ask"]').first().isVisible().catch(() => false);
  entry.notes.push(`Chat input: ${chatInput ? 'VISIBLE' : 'MISSING'}`);

  if (!headingVisible) entry.notes.push('MISSING: AI Learning Agents heading');
  entry.loadedOk = headingVisible;
});

test('S1.07 — Student — Knowledge Graph', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.07 — Knowledge Graph',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);

  // Try /knowledge-graph and /graph routes
  await page.goto(`${BASE}/knowledge-graph`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  const urlAfterKG = page.url();
  if (!urlAfterKG.includes('knowledge-graph') && !urlAfterKG.includes('graph')) {
    // Try /graph
    await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
  }

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.07-knowledge-graph');

  const canvas = await page.locator('canvas').first().isVisible().catch(() => false);
  const svgGraph = await page.locator('svg').first().isVisible().catch(() => false);
  const crashed = await page.getByText(/something went wrong/i).isVisible().catch(() => false);

  entry.notes.push(`Canvas element: ${canvas ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`SVG element: ${svgGraph ? 'VISIBLE' : 'MISSING'}`);
  if (crashed) entry.notes.push('CRITICAL: Knowledge Graph crashed');
  entry.notes.push(`Final URL: ${page.url()}`);

  entry.loadedOk = !crashed;
});

test('S1.08 — Student — Collaboration', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.08 — Collaboration',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/collaboration`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.08-collaboration');

  const crashed = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
  const header = await page.locator('header, nav').first().isVisible().catch(() => false);

  if (crashed) entry.notes.push('CRITICAL: Collaboration page crashed');
  entry.notes.push(`Header/nav visible: ${header}`);
  entry.loadedOk = !crashed && header;
});

test('S1.09 — Student — Search for Talmud', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.09 — Search (Talmud)',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Empty state screenshot
  await snap(page, 'S1.09a-search-empty');

  const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
  const inputVisible = await searchInput.isVisible().catch(() => false);

  if (inputVisible) {
    await searchInput.fill('Talmud');
    await page.waitForTimeout(1500); // debounce
  } else {
    entry.notes.push('MISSING: Search input not found');
  }

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.09b-search-talmud-results');

  const results = page.locator('[class*="card"]').filter({ has: page.locator('h3, h4, [class*="font-semibold"]') });
  const resultCount = await results.count().catch(() => 0);
  entry.notes.push(`Search results for "Talmud": ${resultCount} cards`);

  const noResults = await page.getByText(/no results/i).isVisible().catch(() => false);
  if (noResults) entry.notes.push('Empty state: no results returned');

  entry.loadedOk = inputVisible;
});

test('S1.10 — Student — Profile page', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.10 — Student Profile',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.10-student-profile');

  const header = await page.locator('header, nav').first().isVisible().catch(() => false);
  const emailVisible = await page.getByText(USERS.student.email).isVisible().catch(() => false);
  const profileHeading = await page.getByRole('heading', { name: /profile/i }).first().isVisible().catch(() => false);

  entry.notes.push(`Header/nav: ${header ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Profile heading: ${profileHeading ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Student email visible: ${emailVisible ? 'YES' : 'NO'}`);

  entry.loadedOk = header;
});

test('S1.11 — Student — UserMenu open and Logout', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S1.11 — UserMenu & Logout',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.student.email, USERS.student.password);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);

  // Identify and click user menu
  const menuBtn = page
    .locator('[data-testid="user-menu"]')
    .or(page.getByRole('button', { name: /user menu/i }))
    .or(page.locator('header button').last())
    .first();

  const menuVisible = await menuBtn.isVisible().catch(() => false);
  if (menuVisible) {
    await menuBtn.click();
    await page.waitForTimeout(600);
    await snap(page, 'S1.11a-usermenu-open');

    const dropdown = page.locator('[role="menu"]');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    entry.notes.push(`Dropdown menu: ${dropdownVisible ? 'VISIBLE' : 'MISSING'}`);

    const menuItems = await page.evaluate(() => {
      const items = document.querySelectorAll('[role="menuitem"]');
      return Array.from(items).map(el => (el as HTMLElement).innerText.trim());
    }).catch(() => [] as string[]);
    entry.notes.push(`Menu items: ${menuItems.join(', ')}`);

    // Look for logout
    const logoutEl = page.getByRole('menuitem', { name: /log out/i })
      .or(page.getByRole('button', { name: /log out/i }));
    const logoutVisible = await logoutEl.isVisible().catch(() => false);

    if (logoutVisible) {
      await logoutEl.click();
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      entry.notes.push(`After logout URL: ${finalUrl}`);
      const backToLogin = finalUrl.includes('/login') || finalUrl.includes('8080');
      entry.notes.push(`Redirected to login: ${backToLogin}`);
      entry.loadedOk = true;
    } else {
      entry.notes.push('MISSING: Log Out menu item not found');
      entry.loadedOk = false;
    }
  } else {
    // Try direct button discovery
    const allButtons = await page.evaluate(() => {
      const btns = document.querySelectorAll('header button');
      return Array.from(btns).map(el => ({
        text: (el as HTMLElement).innerText.trim(),
        ariaLabel: el.getAttribute('aria-label') ?? '',
      }));
    }).catch(() => [] as { text: string; ariaLabel: string }[]);
    entry.notes.push(`Header buttons: ${JSON.stringify(allButtons)}`);
    entry.notes.push('MISSING: UserMenu button not found');
  }

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S1.11b-after-logout');
});

// ─── S2: Instructor ────────────────────────────────────────────────────────────

test('S2.01 — Instructor — Dashboard', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S2.01 — Instructor Dashboard',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.instructor.email, USERS.instructor.password);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S2.01-instructor-dashboard');

  const headingVisible = await page.getByRole('heading', { name: 'Dashboard' }).isVisible().catch(() => false);

  // Look for instructor-specific UI differences
  const createCourseBtn = await page.getByRole('button', { name: /create course/i }).isVisible().catch(() => false);
  const manageBtn = await page.getByRole('button', { name: /manage/i }).first().isVisible().catch(() => false);

  entry.notes.push(`Dashboard heading: ${headingVisible ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Create Course button (instructor feature): ${createCourseBtn ? 'VISIBLE' : 'NOT VISIBLE'}`);
  entry.notes.push(`Manage button: ${manageBtn ? 'VISIBLE' : 'NOT VISIBLE'}`);

  // Check if user role is shown
  const instructorText = await page.getByText(/instructor/i).first().isVisible().catch(() => false);
  entry.notes.push(`Instructor role shown: ${instructorText}`);

  entry.loadedOk = headingVisible;
});

test('S2.02 — Instructor — Courses with management options', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S2.02 — Instructor Courses',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.instructor.email, USERS.instructor.password);
  await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S2.02-instructor-courses');

  const headingVisible = await page.getByRole('heading', { name: 'Courses' }).isVisible().catch(() => false);
  const createBtn = await page.getByRole('button', { name: /create|new course|add course/i }).first().isVisible().catch(() => false);
  const editBtn = await page.getByRole('button', { name: /edit/i }).first().isVisible().catch(() => false);

  entry.notes.push(`Courses heading: ${headingVisible ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Create/New Course button: ${createBtn ? 'VISIBLE (instructor feature)' : 'NOT VISIBLE'}`);
  entry.notes.push(`Edit button on course: ${editBtn ? 'VISIBLE (instructor feature)' : 'NOT VISIBLE'}`);

  entry.loadedOk = headingVisible;
});

// ─── S3: Super Admin ──────────────────────────────────────────────────────────

test('S3.01 — Super Admin — Dashboard', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S3.01 — Super Admin Dashboard',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.admin.email, USERS.admin.password);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S3.01-admin-dashboard');

  const headingVisible = await page.getByRole('heading', { name: 'Dashboard' }).isVisible().catch(() => false);
  const adminPanel = await page.getByText(/admin|administration|manage tenants/i).first().isVisible().catch(() => false);
  const navItems = await page.evaluate(() => {
    const items = document.querySelectorAll('nav a, nav button');
    return Array.from(items).map(el => (el as HTMLElement).innerText.trim()).filter(Boolean);
  }).catch(() => [] as string[]);

  entry.notes.push(`Dashboard heading: ${headingVisible ? 'VISIBLE' : 'MISSING'}`);
  entry.notes.push(`Admin-specific content: ${adminPanel ? 'VISIBLE' : 'NOT VISIBLE'}`);
  entry.notes.push(`Nav items: ${navItems.join(', ')}`);

  // Check for super admin specific links
  const adminLink = await page.getByRole('link', { name: /admin/i }).first().isVisible().catch(() => false);
  entry.notes.push(`Admin nav link: ${adminLink ? 'VISIBLE' : 'NOT VISIBLE'}`);

  entry.loadedOk = headingVisible;
});

test('S3.02 — Super Admin — All routes accessible', async ({ page }) => {
  const entry: PageEntry = {
    label: 'S3.02 — Super Admin Route Check',
    url: '', screenshot: '', headings: [], bodySnippet: '',
    consoleErrors: [], networkErrors: [], notes: [], loadedOk: false,
  };
  attachListeners(page, entry);
  allEntries.push(entry);

  await doLogin(page, USERS.admin.email, USERS.admin.password);

  const routes = ['/dashboard', '/courses', '/agents', '/search', '/profile', '/annotations'];
  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1500);
    const crashed = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    const finalUrl = page.url();
    entry.notes.push(`${route}: finalURL=${finalUrl} crashed=${crashed}`);
  }

  entry.url = page.url();
  const info = await getInfo(page);
  entry.headings = info.headings;
  entry.bodySnippet = info.bodySnippet;
  entry.screenshot = await snap(page, 'S3.02-admin-routes');
  entry.loadedOk = true;
});
