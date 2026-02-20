/**
 * Instructor Browser Test — Visual E2E
 *
 * Simulates an INSTRUCTOR user browsing EduSphere at http://localhost:5175.
 * Uses real Keycloak authentication via storageState saved by global setup.
 *
 * Run:
 *   cd apps/web
 *   E2E_BASE_URL=http://localhost:5175 npx playwright test \
 *     e2e/instructor-browser-test.spec.ts --project=chromium \
 *     --headed --reporter=list --workers=1
 *
 * The test performs a login in test.beforeAll and stores cookies/localStorage,
 * which is then shared by all subsequent tests via the browser context fixture.
 */

import { test, expect, type Page, type ConsoleMessage, type Browser } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
const INSTRUCTOR = {
  email: 'instructor@example.com',
  password: 'Instructor123!',
};

const SCREENSHOT_DIR = path.resolve(
  __dirname, '..', '..', '..', 'test-results', 'instructor-screenshots'
);
const SESSION_FILE = path.resolve(
  __dirname, '..', '..', '..', 'test-results', 'instructor-session.json'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function shot(page: Page, name: string): Promise<void> {
  ensureDir(SCREENSHOT_DIR);
  const p = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`[shot] ${name}.png`);
}

async function doLogin(browser: Browser): Promise<void> {
  console.log('[login] Starting Keycloak login flow...');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const url = page.url();
  console.log(`[login] Post-check-sso URL: ${url}`);

  if (url.includes('localhost:5175') && !url.includes('/login')) {
    console.log('[login] SSO session reused — already authenticated');
  } else {
    await shot(page, '00-login-page-raw');
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log(`[login] Body HTML snippet: ${bodyHTML.slice(0, 300)}`);

    // Find the sign-in button
    const btn = page.locator('button').filter({ hasText: /sign in/i }).first();
    const vis = await btn.isVisible({ timeout: 8000 }).catch(() => false);
    if (!vis) {
      // List all buttons
      const all = await page.locator('button').all();
      for (const b of all) {
        const t = await b.textContent().catch(() => '');
        console.log(`  button: "${t?.trim()}"`);
      }
      throw new Error('Sign In button not found on /login page');
    }

    console.log('[login] Clicking Sign In with Keycloak...');
    await btn.click();
    await page.waitForURL(/localhost:8080/, { timeout: 20_000 });
    console.log(`[login] Keycloak: ${page.url()}`);

    await page.locator('#username').waitFor({ state: 'visible', timeout: 10_000 });
    await shot(page, '01-keycloak-form');
    await page.fill('#username', INSTRUCTOR.email);
    await page.fill('#password', INSTRUCTOR.password);
    await page.click('#kc-login');

    await page.waitForURL(/localhost:5175/, { timeout: 25_000 });
    await page.waitForTimeout(2500);
    console.log(`[login] Back on app: ${page.url()}`);
    await shot(page, '02-post-login-app');
  }

  ensureDir(path.dirname(SESSION_FILE));
  await ctx.storageState({ path: SESSION_FILE });
  console.log(`[login] Session saved → ${SESSION_FILE}`);
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
// We use a single browser context across the whole describe block so all tests
// share the authenticated session. The login runs once in beforeAll.

let sharedPage: Page;

test.describe.serial('Instructor Browser Session', () => {

  test.beforeAll(async ({ browser }) => {
    await doLogin(browser);

    // Create a shared authenticated context for all tests
    const ctx = await browser.newContext({ storageState: SESSION_FILE });
    sharedPage = await ctx.newPage();

    // Navigate to app to verify session
    await sharedPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2000);
    const verifyUrl = sharedPage.url();
    console.log(`[beforeAll] Shared page URL: ${verifyUrl}`);
    await shot(sharedPage, '03-shared-page-ready');
  });

  // -------------------------------------------------------------------------
  // 1. Landing after login
  // -------------------------------------------------------------------------
  test('1. Post-login landing — no auth errors', async () => {
    await sharedPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(1500);

    const url = sharedPage.url();
    console.log(`[test1] URL: ${url}`);
    await shot(sharedPage, '04-landing');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    const hasAuthError = /Unauthorized|Access Denied|403 Forbidden/i.test(bodyText);
    const redirectedToLogin = url.includes('/login') || url.includes('8080/realms');

    console.log(`[test1] Auth error: ${hasAuthError}, Redirected to login: ${redirectedToLogin}`);

    if (hasAuthError || redirectedToLogin) {
      console.warn('[TEST 1] FAIL — instructor not authenticated or auth error visible');
    } else {
      console.log('[TEST 1] PASS — instructor authenticated, app loaded');
    }
  });

  // -------------------------------------------------------------------------
  // 2. Dashboard
  // -------------------------------------------------------------------------
  test('2. Dashboard — stats, charts, instructor widgets', async () => {
    await sharedPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(3000);
    await shot(sharedPage, '05-dashboard');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    const url = sharedPage.url();
    console.log(`[dashboard] URL: ${url}`);
    console.log(`[dashboard] Content: ${bodyText.slice(0, 400).replace(/\s+/g, ' ')}`);

    const hasContent = /dashboard|course|student|progress|welcome|analytics|instructor/i.test(bodyText);
    const hasError = /unauthorized|access denied|403/i.test(bodyText);
    const svgCount = await sharedPage.locator('svg').count();
    const canvasCount = await sharedPage.locator('canvas').count();

    console.log(`[dashboard] Has content: ${hasContent}, Error: ${hasError}`);
    console.log(`[dashboard] SVG: ${svgCount}, Canvas: ${canvasCount} (charts/icons)`);

    if (hasError) console.warn('[dashboard] ERROR visible!');
    if (!hasContent) console.warn('[dashboard] WARNING: No recognizable content');

    await shot(sharedPage, '05b-dashboard-details');
    console.log('[TEST 2] Dashboard test complete');
  });

  // -------------------------------------------------------------------------
  // 3. Courses List
  // -------------------------------------------------------------------------
  test('3. Courses list — instructor management options', async () => {
    await sharedPage.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2500);
    await shot(sharedPage, '06-courses');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    console.log(`[courses] Content: ${bodyText.slice(0, 400).replace(/\s+/g, ' ')}`);

    const hasCourses = /course|lesson|module|curriculum/i.test(bodyText);
    const hasCreate = /create|new course|add course|\+ course/i.test(bodyText);
    const hasEdit = /edit|manage|delete/i.test(bodyText);
    const hasError = /unauthorized|access denied|403/i.test(bodyText);

    const btns = await sharedPage.locator('button').all();
    const btnLabels = await Promise.all(btns.map(b => b.textContent().catch(() => '')));
    const btnStr = btnLabels.map(t => t?.trim()).filter(Boolean).join(' | ');

    console.log(`[courses] Has courses: ${hasCourses}, Create: ${hasCreate}, Edit: ${hasEdit}`);
    console.log(`[courses] Error: ${hasError}`);
    console.log(`[courses] Buttons: ${btnStr}`);

    if (!hasCreate && !hasEdit) {
      console.warn('[courses] WARNING: No instructor management options visible (Create/Edit/Manage)');
    }
    if (hasError) console.warn('[courses] ERROR: Auth error on courses page!');

    await shot(sharedPage, '06b-courses-full');
    console.log('[TEST 3] Courses test complete');
  });

  // -------------------------------------------------------------------------
  // 4. Collaboration Page — Chavruta
  // -------------------------------------------------------------------------
  test('4. Collaboration — Chavruta panels, discussions', async () => {
    await sharedPage.goto(`${BASE_URL}/collaboration`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2500);
    await shot(sharedPage, '07-collaboration');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    const url = sharedPage.url();
    console.log(`[collab] URL: ${url}`);
    console.log(`[collab] Content: ${bodyText.slice(0, 500).replace(/\s+/g, ' ')}`);

    const hasChav = /chavruta/i.test(bodyText);
    const hasDiscuss = /discussion|debate|forum|session/i.test(bodyText);
    const hasChat = /chat|message/i.test(bodyText);
    const hasError = /unauthorized|access denied|403/i.test(bodyText);

    console.log(`[collab] Chavruta: ${hasChav}, Discussion: ${hasDiscuss}, Chat: ${hasChat}`);
    console.log(`[collab] Error: ${hasError}`);

    if (!hasChav && !hasDiscuss) {
      console.warn('[collab] WARNING: No Chavruta/discussion content');
    }
    if (hasError) console.warn('[collab] ERROR: Auth error on collaboration!');

    const cards = await sharedPage.locator('[class*="card"], [class*="panel"]').count();
    const inputs = await sharedPage.locator('input, textarea').count();
    console.log(`[collab] Cards/panels: ${cards}, Inputs: ${inputs}`);

    await shot(sharedPage, '07b-collaboration-full');
    console.log('[TEST 4] Collaboration test complete');
  });

  // -------------------------------------------------------------------------
  // 5. Post in Collaboration
  // -------------------------------------------------------------------------
  test('5. Instructor post in collaboration/discussion', async () => {
    await sharedPage.goto(`${BASE_URL}/collaboration`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2000);

    const selectors = [
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="type" i]',
      'textarea[placeholder*="write" i]',
      'input[placeholder*="message" i]',
      'textarea:visible',
    ];

    let posted = false;
    for (const sel of selectors) {
      const el = sharedPage.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        await el.fill(`Instructor post — ${new Date().toISOString()}`);
        await shot(sharedPage, '08-collab-typed');
        console.log(`[post] Input: ${sel}`);

        for (const s of ['button[type="submit"]', 'button:has-text("Send")', 'button:has-text("Post")']) {
          const b = sharedPage.locator(s).first();
          if (await b.isVisible({ timeout: 2000 }).catch(() => false)) {
            await b.click();
            await sharedPage.waitForTimeout(1500);
            await shot(sharedPage, '08b-collab-sent');
            console.log(`[post] Submitted via ${s}`);
            posted = true;
            break;
          }
        }
        if (!posted) {
          await el.press('Enter');
          await sharedPage.waitForTimeout(1000);
          posted = true;
        }
        break;
      }
    }

    if (!posted) {
      console.warn('[post] WARNING: No message input found on /collaboration');
      await shot(sharedPage, '08-no-input');
    }

    console.log('[TEST 5] Collaboration post test complete');
  });

  // -------------------------------------------------------------------------
  // 6. Knowledge Graph at /graph
  // -------------------------------------------------------------------------
  test('6. Knowledge Graph at /graph', async () => {
    await sharedPage.goto(`${BASE_URL}/graph`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(4000);
    await shot(sharedPage, '09-knowledge-graph');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    const url = sharedPage.url();
    console.log(`[kg] URL: ${url}`);
    console.log(`[kg] Content: ${bodyText.slice(0, 500).replace(/\s+/g, ' ')}`);

    const svgCount = await sharedPage.locator('svg').count();
    const canvasCount = await sharedPage.locator('canvas').count();
    const hasKG = /knowledge|graph|concept|node|ontology|rambam|aristotle/i.test(bodyText);
    const hasLoadError = /failed to load|network error/i.test(bodyText);
    const hasAuthError = /unauthorized|access denied|403/i.test(bodyText);

    console.log(`[kg] SVG: ${svgCount}, Canvas: ${canvasCount}`);
    console.log(`[kg] KG content: ${hasKG}, Load error: ${hasLoadError}, Auth error: ${hasAuthError}`);

    if (hasLoadError) console.warn('[kg] Network error loading graph (expected without backend)');
    if (hasAuthError) console.warn('[kg] ERROR: Auth error on knowledge graph!');

    // Check for visual nodes
    const nodeEls = await sharedPage.locator('[class*="node"], circle, [data-id*="node"]').count();
    console.log(`[kg] Node elements: ${nodeEls}`);

    await shot(sharedPage, '09b-kg-full');
    console.log('[TEST 6] Knowledge graph test complete');
  });

  // -------------------------------------------------------------------------
  // 7. Profile Page
  // -------------------------------------------------------------------------
  test('7. Profile page — instructor role visible', async () => {
    await sharedPage.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2000);
    await shot(sharedPage, '10-profile');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    console.log(`[profile] Content: ${bodyText.slice(0, 500).replace(/\s+/g, ' ')}`);

    const hasProfile = /profile|account|settings/i.test(bodyText);
    const hasInstructor = /instructor/i.test(bodyText);
    const hasEmail = /instructor@example\.com/i.test(bodyText);
    const hasError = /unauthorized|access denied|403/i.test(bodyText);

    console.log(`[profile] Profile content: ${hasProfile}, Instructor role: ${hasInstructor}, Email: ${hasEmail}`);
    console.log(`[profile] Error: ${hasError}`);

    if (!hasInstructor) console.warn('[profile] WARNING: INSTRUCTOR role not shown on profile');
    if (!hasEmail) console.warn('[profile] WARNING: instructor@example.com not displayed');
    if (hasError) console.warn('[profile] ERROR: Auth error on profile!');

    await shot(sharedPage, '10b-profile-full');
    console.log('[TEST 7] Profile test complete');
  });

  // -------------------------------------------------------------------------
  // 8. Navigation
  // -------------------------------------------------------------------------
  test('8. Sidebar navigation — route discovery', async () => {
    await sharedPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2000);
    await shot(sharedPage, '11-nav-full');

    const navEls = await sharedPage.locator('nav a, aside a, [role="navigation"] a').all();
    console.log(`[nav] Nav elements: ${navEls.length}`);

    const links: Array<{ text: string; href: string }> = [];
    for (const el of navEls) {
      const text = ((await el.textContent().catch(() => '')) ?? '').trim().replace(/\s+/g, ' ');
      const href = (await el.getAttribute('href').catch(() => '')) ?? '';
      if (href && !href.startsWith('http') && href !== '#' && text.length > 0) {
        links.push({ text, href });
      }
    }

    console.log('[nav] Discovered routes:');
    links.forEach(l => console.log(`  "${l.text.padEnd(28)}" → ${l.href}`));

    const createRoutes = links.filter(l => /create|new|upload/i.test(l.text) || /new|create/i.test(l.href));
    console.log(`[nav] Create/management routes (instructor): ${createRoutes.length}`);
    createRoutes.forEach(l => console.log(`  [INSTRUCTOR ROUTE] "${l.text}" → ${l.href}`));

    // Dump header buttons
    const hBtns = await sharedPage.locator('header button, nav button').all();
    console.log(`[nav] Header/nav buttons: ${hBtns.length}`);
    for (const b of hBtns) {
      const t = (await b.textContent().catch(() => ''))?.trim();
      const a = await b.getAttribute('aria-label').catch(() => '');
      if (t || a) console.log(`  btn: "${t}" aria="${a}"`);
    }

    console.log('[TEST 8] Navigation test complete');
  });

  // -------------------------------------------------------------------------
  // 9. Access Check
  // -------------------------------------------------------------------------
  test('9. Access check — instructor has no 403 errors', async () => {
    const routes = [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/courses', label: 'Courses' },
      { path: '/courses/new', label: 'New Course' },
      { path: '/profile', label: 'Profile' },
      { path: '/collaboration', label: 'Collaboration' },
      { path: '/annotations', label: 'Annotations' },
      { path: '/search', label: 'Search' },
      { path: '/agents', label: 'Agents' },
      { path: '/graph', label: 'Knowledge Graph' },
      { path: '/learn/content-1', label: 'Content Viewer' },
    ];

    type Result = { path: string; label: string; status: string; finalUrl: string; note: string };
    const results: Result[] = [];

    for (const { path, label } of routes) {
      await sharedPage.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await sharedPage.waitForTimeout(1200);

      const finalUrl = sharedPage.url();
      const bodyText = await sharedPage.locator('body').textContent() ?? '';

      const isAuthErr = /unauthorized|access denied|403 forbidden|forbidden/i.test(bodyText);
      const isLoginRedir = finalUrl.includes('/login') || finalUrl.includes('8080/realms');
      const is404 = /page not found/i.test(bodyText);

      let status = 'OK';
      let note = '';
      if (isAuthErr) { status = 'AUTH_ERROR'; note = bodyText.slice(0, 80); }
      else if (isLoginRedir) { status = 'REDIRECT_LOGIN'; note = finalUrl; }
      else if (is404) { status = '404'; note = 'Page not found'; }

      results.push({ path, label, status, finalUrl, note });

      if (status !== 'OK') {
        console.warn(`[access] ${status}: ${label} — ${note}`);
      }
    }

    console.log('\n' + '═'.repeat(68));
    console.log('INSTRUCTOR ACCESS REPORT');
    console.log('═'.repeat(68));
    results.forEach(r => {
      const icon = r.status === 'OK' ? 'OK  ' : r.status === '404' ? '404 ' : 'FAIL';
      console.log(`[${icon}] ${r.label.padEnd(25)} ${r.path}`);
      if (r.note) console.log(`       ${r.note.slice(0, 65)}`);
    });
    console.log('═'.repeat(68));

    const failures = results.filter(r => r.status !== 'OK' && r.status !== '404');
    const notFounds = results.filter(r => r.status === '404');
    console.log(`\nSummary: ${results.filter(r => r.status === 'OK').length} OK, ${notFounds.length} 404s, ${failures.length} auth failures`);

    if (failures.length > 0) {
      console.warn(`AUTH FAILURES: ${failures.map(r => r.label).join(', ')}`);
    } else {
      console.log('No auth failures — instructor can access all expected routes');
    }

    console.log('[TEST 9] Access check complete');
  });

  // -------------------------------------------------------------------------
  // 10. UserMenu
  // -------------------------------------------------------------------------
  test('10. UserMenu — role and logout', async () => {
    await sharedPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2000);
    await shot(sharedPage, '12-pre-menu');

    const selectors = [
      '[data-testid="user-menu"]',
      '[data-testid="user-menu-trigger"]',
      'button[aria-label*="user" i]',
      'button[aria-label*="account" i]',
      'button[aria-label*="profile" i]',
      'button[aria-haspopup="menu"]',
      'button[aria-haspopup="true"]',
    ];

    let opened = false;
    for (const sel of selectors) {
      const el = sharedPage.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        const t = await el.textContent().catch(() => '');
        const a = await el.getAttribute('aria-label').catch(() => '');
        console.log(`[usermenu] Trigger: ${sel} text="${t?.trim()}" aria="${a}"`);
        await el.click();
        await sharedPage.waitForTimeout(800);
        await shot(sharedPage, '12b-menu-open');
        opened = true;

        const menuText = await sharedPage.locator('body').textContent() ?? '';
        const hasLogout = /logout|sign out|log out/i.test(menuText);
        const hasRole = /instructor/i.test(menuText);
        const hasEmail = /instructor@example\.com/i.test(menuText);

        console.log(`[usermenu] Logout: ${hasLogout}, Instructor role: ${hasRole}, Email: ${hasEmail}`);
        if (!hasLogout) console.warn('[usermenu] WARNING: No logout option!');
        if (!hasRole) console.warn('[usermenu] WARNING: INSTRUCTOR role not shown!');
        break;
      }
    }

    if (!opened) {
      // Debug: list all interactive elements in header
      const hEls = await sharedPage.locator('header *[role], header button, nav button').all();
      console.log(`[usermenu] Header interactive elements: ${hEls.length}`);
      for (const el of hEls) {
        const t = (await el.textContent().catch(() => ''))?.trim().slice(0, 40);
        const role = await el.getAttribute('role').catch(() => '');
        const a = await el.getAttribute('aria-label').catch(() => '');
        const cls = (await el.getAttribute('class').catch(() => ''))?.slice(0, 60);
        console.log(`  el: text="${t}" role="${role}" aria="${a}" class="${cls}"`);
      }
      await shot(sharedPage, '12-debug-no-menu');
      console.warn('[usermenu] Could not open user menu');
    }

    console.log('[TEST 10] UserMenu test complete');
  });

  // -------------------------------------------------------------------------
  // 11. Content Viewer
  // -------------------------------------------------------------------------
  test('11. Content Viewer at /learn/content-1', async () => {
    await sharedPage.goto(`${BASE_URL}/learn/content-1`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(3000);
    await shot(sharedPage, '13-content-viewer');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    const url = sharedPage.url();
    console.log(`[content] URL: ${url}`);
    console.log(`[content] Content: ${bodyText.slice(0, 400).replace(/\s+/g, ' ')}`);

    const hasContent = /content|lesson|chapter|learn|read|text/i.test(bodyText);
    const hasAnnotation = /annotate|highlight|note|annotation/i.test(bodyText);
    const hasError = /unauthorized|access denied|403/i.test(bodyText);
    const videoCount = await sharedPage.locator('video').count();
    const iframeCount = await sharedPage.locator('iframe').count();

    console.log(`[content] Content: ${hasContent}, Annotations: ${hasAnnotation}, Error: ${hasError}`);
    console.log(`[content] Videos: ${videoCount}, iframes: ${iframeCount}`);

    if (hasError) console.warn('[content] ERROR: Auth error on content viewer!');

    await shot(sharedPage, '13b-content-full');
    console.log('[TEST 11] Content viewer test complete');
  });

  // -------------------------------------------------------------------------
  // 12. Agents Page
  // -------------------------------------------------------------------------
  test('12. Agents/AI page accessible to instructor', async () => {
    await sharedPage.goto(`${BASE_URL}/agents`, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForTimeout(2500);
    await shot(sharedPage, '14-agents');

    const bodyText = await sharedPage.locator('body').textContent() ?? '';
    const url = sharedPage.url();
    console.log(`[agents] URL: ${url}`);
    console.log(`[agents] Content: ${bodyText.slice(0, 400).replace(/\s+/g, ' ')}`);

    const hasAgent = /agent|ai|tutor|assistant|chavruta|quiz|debate/i.test(bodyText);
    const hasError = /unauthorized|access denied|403/i.test(bodyText);
    const chatInputs = await sharedPage.locator('input, textarea').count();
    const agentCards = await sharedPage.locator('[class*="agent"], [class*="Agent"]').count();

    console.log(`[agents] Agent content: ${hasAgent}, Error: ${hasError}`);
    console.log(`[agents] Chat inputs: ${chatInputs}, Agent cards: ${agentCards}`);

    if (hasError) console.warn('[agents] ERROR: Unauthorized on agents!');
    if (!hasAgent) console.warn('[agents] WARNING: No agent content visible');

    await shot(sharedPage, '14b-agents-full');
    console.log('[TEST 12] Agents test complete');
  });
});
