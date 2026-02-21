/**
 * UI Audit Script — EduSphere Manual Test Runner
 * Captures screenshots + console errors for all major pages.
 * Run: npx ts-node --esm scripts/ui-audit.ts
 * Or:  npx playwright test scripts/ui-audit.ts (via Playwright runner)
 */
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const KEYCLOAK_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(process.cwd(), 'ui-audit-results');

const STUDENT = { email: 'student@example.com', password: 'Student123!' };

interface PageAudit {
  page: string;
  url: string;
  screenshot: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  networkErrors: string[];
  status: 'ok' | 'error' | 'warning';
  notes: string[];
}

const results: PageAudit[] = [];

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function auditPage(
  page: Page,
  label: string,
  url: string,
  waitFor?: string | RegExp
): Promise<PageAudit> {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  if (waitFor) {
    if (typeof waitFor === 'string') {
      await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => {});
    } else {
      await page.waitForURL(waitFor, { timeout: 15000 }).catch(() => {});
    }
  }

  await page.waitForTimeout(1500); // let hydration settle

  const screenshotPath = path.join(SCREENSHOT_DIR, `${label.replace(/\s+/g, '-').toLowerCase()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const status =
    consoleErrors.length > 0 || networkErrors.some((e) => e.startsWith('4'))
      ? 'error'
      : consoleWarnings.length > 2
      ? 'warning'
      : 'ok';

  return {
    page: label,
    url: page.url(),
    screenshot: screenshotPath,
    consoleErrors,
    consoleWarnings: consoleWarnings.filter(
      (w) => !w.includes('sandbox') // ignore known keycloak iframe warning
    ),
    networkErrors,
    status,
    notes: [],
  };
}

async function loginViaKeycloak(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Sign In")', { timeout: 10000 });
  await page.click('button:has-text("Sign In")');
  await page.waitForURL(/keycloak|localhost:8080/, { timeout: 15000 });
  await page.fill('input[name="username"]', STUDENT.email);
  await page.fill('input[name="password"]', STUDENT.password);
  await page.click('input[type="submit"]');
  await page.waitForURL(/localhost:5173/, { timeout: 20000 });
  await page.waitForURL(/\/(learn|courses|dashboard|login)/, { timeout: 25000 });
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);

  const browser: Browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-web-security', '--disable-features=IsolateOrigins'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: undefined,
  });

  const page = await context.newPage();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 EduSphere UI Audit — Starting');
  console.log('═══════════════════════════════════════════════════\n');

  // ── 1. Login page ──────────────────────────────────────────────
  console.log('📸 [1/7] Login page...');
  results.push(await auditPage(page, '01-login', `${BASE_URL}/login`, 'button'));

  // ── 2. Login flow ──────────────────────────────────────────────
  console.log('🔐 [2/7] Authenticating via Keycloak...');
  try {
    await loginViaKeycloak(page);
    console.log('   ✅ Login succeeded. Current URL:', page.url());
  } catch (err) {
    console.log('   ❌ Login failed:', err);
  }

  // ── 3. Dashboard ───────────────────────────────────────────────
  console.log('📸 [3/7] Dashboard...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  results.push(await auditPage(page, '03-dashboard', `${BASE_URL}/dashboard`, 'h1'));

  // ── 4. Courses ─────────────────────────────────────────────────
  console.log('📸 [4/7] Courses page...');
  results.push(await auditPage(page, '04-courses', `${BASE_URL}/courses`, '[data-testid], h1, h2'));

  // ── 5. Content viewer ──────────────────────────────────────────
  console.log('📸 [5/7] Content viewer (/learn/content-1)...');
  results.push(await auditPage(page, '05-content-viewer', `${BASE_URL}/learn/content-1`, undefined));

  // ── 6. Knowledge Graph ─────────────────────────────────────────
  console.log('📸 [6/7] Knowledge Graph...');
  results.push(await auditPage(page, '06-knowledge-graph', `${BASE_URL}/knowledge-graph`, undefined));

  // ── 7. Profile / Settings ──────────────────────────────────────
  console.log('📸 [7/7] Profile page...');
  results.push(await auditPage(page, '07-profile', `${BASE_URL}/profile`, undefined));

  await browser.close();

  // ── Report ─────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 UI AUDIT REPORT');
  console.log('═══════════════════════════════════════════════════');

  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
    console.log(`\n${icon} ${r.page}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Screenshot: ${r.screenshot}`);
    if (r.consoleErrors.length > 0) {
      console.log(`   Console Errors (${r.consoleErrors.length}):`);
      r.consoleErrors.forEach((e) => console.log(`     - ${e}`));
    }
    if (r.consoleWarnings.length > 0) {
      console.log(`   Warnings (${r.consoleWarnings.length}):`);
      r.consoleWarnings.forEach((w) => console.log(`     - ${w}`));
    }
    if (r.networkErrors.length > 0) {
      console.log(`   Network Errors (${r.networkErrors.length}):`);
      r.networkErrors.forEach((e) => console.log(`     - ${e}`));
    }
  }

  // Write JSON report
  const reportPath = path.join(SCREENSHOT_DIR, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report: ${reportPath}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
