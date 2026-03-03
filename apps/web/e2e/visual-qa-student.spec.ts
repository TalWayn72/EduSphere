/**
 * VISUAL QA — Student Session Browser Test
 *
 * Simulates a real student user browsing EduSphere at http://localhost:5175
 * with live Keycloak authentication.
 *
 * Captures: screenshots, console errors, network errors, broken UI elements.
 *
 * Run:
 *   VITE_DEV_MODE=false E2E_BASE_URL=http://localhost:5175 \
 *   pnpm --filter @edusphere/web exec playwright test e2e/visual-qa-student.spec.ts \
 *   --workers=1 --headed --project=chromium
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
const STUDENT = { email: 'student@example.com', password: 'Student123!' };
const RESULTS_DIR = path.join(process.cwd(), 'visual-qa-results');

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  if (!fs.existsSync(RESULTS_DIR))
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
});

test.afterAll(() => {
  const reportPath = path.join(RESULTS_DIR, 'qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary to stdout for CI visibility
  console.log(
    '\n\n═══════════════════════════════════════════════════════════════'
  );
  console.log('  VISUAL QA REPORT — EduSphere Student Session');
  console.log(
    '═══════════════════════════════════════════════════════════════\n'
  );

  for (const entry of report) {
    const status = entry.loadedSuccessfully ? '✅' : '❌';
    console.log(`${status}  ${entry.label}`);
    console.log(`   URL: ${entry.url}`);
    console.log(`   Screenshot: ${entry.screenshot}`);

    if (entry.consoleErrors.length > 0) {
      console.log(`   ❌ Console Errors (${entry.consoleErrors.length}):`);
      entry.consoleErrors.forEach((e) => console.log(`      • ${e}`));
    }
    if (entry.consoleWarnings.length > 0) {
      console.log(`   ⚠️  Console Warnings (${entry.consoleWarnings.length}):`);
      entry.consoleWarnings
        .slice(0, 3)
        .forEach((w) => console.log(`      • ${w}`));
    }
    if (entry.networkErrors.length > 0) {
      console.log(`   🔴 Network Errors (${entry.networkErrors.length}):`);
      entry.networkErrors.forEach((n) => console.log(`      • ${n}`));
    }
    if (entry.notes.length > 0) {
      console.log(`   📝 Notes:`);
      entry.notes.forEach((n) => console.log(`      • ${n}`));
    }
    console.log('');
  }

  const totalErrors = report.reduce(
    (sum, e) => sum + e.consoleErrors.length + e.networkErrors.length,
    0
  );
  const failedPages = report.filter((e) => !e.loadedSuccessfully).length;
  console.log(
    `\nSUMMARY: ${report.length} pages tested | ${failedPages} failed to load | ${totalErrors} total errors\n`
  );
  console.log(
    '═══════════════════════════════════════════════════════════════\n'
  );
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function attachErrorListeners(page: Page, entry: PageReport): void {
  page.on('console', (msg) => {
    const text = msg.text();
    // Skip known browser noise
    if (
      text.includes('favicon') ||
      text.includes('Extension') ||
      text.includes('[vite]')
    )
      return;

    if (msg.type() === 'error') {
      entry.consoleErrors.push(text);
    } else if (msg.type() === 'warn' || msg.type() === 'warning') {
      entry.consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    entry.consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (
        url.includes('localhost') ||
        url.includes('4000') ||
        url.includes('8080') ||
        url.startsWith(BASE)
      ) {
        // Skip Keycloak redirect/silent-sso responses that are expected non-200
        if (
          !url.includes('silent-check-sso') &&
          !url.includes('login-status-iframe')
        ) {
          entry.networkErrors.push(`HTTP ${res.status()} — ${url}`);
        }
      }
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('localhost')) {
      entry.networkErrors.push(
        `FAILED REQUEST — ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`
      );
    }
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
    // DEV_MODE: click the dev-login button so sessionStorage key is set
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    const devBtn = page.locator('[data-testid="dev-login-btn"]');
    await devBtn.waitFor({ timeout: 10_000 });
    await devBtn.click();
    await page.waitForURL(/\/learn\//, { timeout: 15_000 });
    return;
  }

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

  // The app shows "Initializing authentication..." while Keycloak.init() runs.
  // With VITE_DEV_MODE=false + check-sso, the init involves a hidden iframe.
  // Wait up to 15s for the spinner to disappear and the login button to appear.
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 15_000 }
    )
    .catch(() => {
      // Init is hanging — will try to click directly anyway
    });

  // Wait for login page to render
  const signInBtn = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  await signInBtn.waitFor({ timeout: 8_000 });
  await signInBtn.click();

  // Keycloak redirect
  await page.waitForURL(/localhost:8080.*realms/, { timeout: 20_000 });
  await page.fill('#username', STUDENT.email);
  await page.fill('#password', STUDENT.password);
  await page.click('#kc-login');

  // Wait for redirect back to app
  await page.waitForURL(/localhost/, { timeout: 30_000 });
  // Wait for React router to settle on a real route
  await page.waitForURL(
    /\/(dashboard|courses|learn|agents|annotations|graph|profile|search)/,
    {
      timeout: 20_000,
    }
  );
}

// ── TESTS ──────────────────────────────────────────────────────────────────────
// Serial mode: tests run in order, sharing context state (login cookies).
// We use soft-expects where possible so all pages are visited even if one fails.

test.describe.configure({ mode: 'serial' });

// ─── 1. Login Page ────────────────────────────────────────────────────────────

test('01 — Login page renders with EduSphere branding', async ({ page }) => {
  const entry: PageReport = {
    label: '01 — Login Page',
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

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

  // App shows "Initializing authentication..." while Keycloak.init() runs.
  // With VITE_DEV_MODE=false the init() call includes a silent SSO check
  // (hidden iframe → Keycloak). Wait up to 10s for it to resolve before
  // taking the screenshot for the QA report.
  await page
    .waitForFunction(
      () =>
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 12_000 }
    )
    .catch(() => {
      // If it never resolves, that itself is a bug — record it and continue
      entry.notes.push(
        'BUG: App stuck on "Initializing authentication..." after 12s — Keycloak init may be hanging'
      );
    });

  await page.waitForTimeout(500);

  entry.url = page.url();
  entry.screenshot = await snap(page, '01-login-page');

  // Record what the page actually shows
  const bodyText = await page
    .locator('body')
    .textContent()
    .catch(() => '');
  if (bodyText?.includes('Initializing authentication')) {
    entry.notes.push(
      'STUCK: Login page still showing "Initializing authentication..." — Keycloak init is blocking UI render'
    );
  }

  // Record CSP / silent-SSO errors
  const cspErrors = entry.consoleErrors.filter(
    (e) =>
      e.includes('Content Security Policy') || e.includes('frame-ancestors')
  );
  if (cspErrors.length > 0) {
    entry.notes.push(
      `CSP ERROR: Keycloak iframe blocked by CSP frame-ancestors — silent SSO check failed`
    );
    entry.notes.push(`Detail: ${cspErrors[0]}`);
  }

  const ssoErrors = entry.networkErrors.filter(
    (e) => e.includes('silent-check-sso') || e.includes('BLOCKED')
  );
  if (ssoErrors.length > 0) {
    entry.notes.push(`SILENT SSO FAILURE: ${ssoErrors[0]}`);
  }

  // Visual checks
  const heading = page.getByRole('heading', { name: 'Welcome to EduSphere' });
  const signInBtn = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  const description = page.getByText('Knowledge Graph Educational Platform');
  const initSpinner = page.getByText('Initializing authentication...');

  const headingVisible = await heading.isVisible().catch(() => false);
  const btnVisible = await signInBtn.isVisible().catch(() => false);
  const descVisible = await description.isVisible().catch(() => false);
  const spinnerVisible = await initSpinner.isVisible().catch(() => false);

  if (spinnerVisible)
    entry.notes.push(
      'BUG: Keycloak init spinner still visible — login page not rendering'
    );
  if (!headingVisible)
    entry.notes.push('MISSING: "Welcome to EduSphere" heading not visible');
  if (!btnVisible)
    entry.notes.push('MISSING: "Sign In with Keycloak" button not visible');
  if (!descVisible) entry.notes.push('MISSING: Description text not visible');

  entry.loadedSuccessfully = headingVisible && btnVisible;
  // Record findings — do NOT hard-assert so serial suite continues
  if (!headingVisible || !btnVisible) {
    console.log(
      `[QA BUG-01] Login page not rendered — stuck on "${bodyText?.substring(0, 200)}"`
    );
  }
  if (spinnerVisible) {
    console.log(
      '[QA BUG-01] CRITICAL: Keycloak init is hanging — spinner never resolves'
    );
  }
});

// ─── 2. Keycloak Auth Flow ────────────────────────────────────────────────────

test('02 — Keycloak login flow completes and lands on app', async ({
  page,
}) => {
  const entry: PageReport = {
    label: '02 — Keycloak Auth Flow',
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
  await page.waitForTimeout(2000); // let React settle after PKCE redirect

  entry.url = page.url();
  entry.screenshot = await snap(page, '02-post-keycloak-login');

  const notOnLogin = !page.url().includes('/login');
  if (!notOnLogin)
    entry.notes.push(
      'BUG: Still on /login after successful auth — redirect failed'
    );

  // Check for any double-init errors (SEC-KC-001 regression)
  const doubleInit = entry.consoleErrors.find((e) =>
    e.includes('can only be initialized once')
  );
  if (doubleInit) entry.notes.push(`SEC-KC-001 REGRESSION: ${doubleInit}`);

  // Check for dev-mode fallback warning
  const devFallback = entry.consoleWarnings.find((w) =>
    w.includes('Falling back to DEV MODE')
  );
  if (devFallback)
    entry.notes.push(
      `WARNING: DEV MODE fallback occurred — Keycloak may not have initialized properly`
    );

  entry.loadedSuccessfully = notOnLogin;
  expect(notOnLogin).toBe(true);
});

// ─── 3. Dashboard ─────────────────────────────────────────────────────────────

test('03 — Dashboard page — stats cards and user profile', async ({ page }) => {
  const entry: PageReport = {
    label: '03 — Dashboard',
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
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // allow GraphQL queries to settle

  entry.url = page.url();
  entry.screenshot = await snap(page, '03-dashboard');

  // Check heading
  const heading = page.getByRole('heading', { name: 'Dashboard' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible)
    entry.notes.push('MISSING: Dashboard heading not visible');

  // Check stats cards
  const statsToCheck = [
    'Study Time',
    'Concepts Mastered',
    'Active Courses',
    'Annotations',
  ];
  for (const stat of statsToCheck) {
    const el = page.getByText(stat).first();
    const visible = await el.isVisible().catch(() => false);
    if (!visible) entry.notes.push(`MISSING stat card: "${stat}"`);
  }

  // Check for GraphQL errors displayed on screen
  const errorCard = page.locator('.border-destructive');
  const hasErrorCard = await errorCard.isVisible().catch(() => false);
  if (hasErrorCard) {
    const errorText = await errorCard.textContent().catch(() => '');
    entry.notes.push(`ERROR CARD VISIBLE: ${errorText}`);
  }

  // Check navigation sidebar
  const nav = page.locator('nav');
  const navVisible = await nav.isVisible().catch(() => false);
  if (!navVisible) entry.notes.push('MISSING: Navigation sidebar not visible');

  entry.loadedSuccessfully = headingVisible;
  expect(headingVisible).toBe(true);
});

// ─── 4. Courses List ─────────────────────────────────────────────────────────

test('04 — Course List page — courses grid', async ({ page }) => {
  const entry: PageReport = {
    label: '04 — Course List',
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
  await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  entry.screenshot = await snap(page, '04-courses-list');

  const heading = page.getByRole('heading', { name: 'Courses' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible) entry.notes.push('MISSING: Courses heading not visible');

  // Check for course cards
  const courseCards = page
    .locator('[data-testid="course-card"], .course-card, [class*="card"]')
    .filter({ has: page.getByRole('heading') });
  const cardCount = await courseCards.count().catch(() => 0);
  entry.notes.push(`Found ${cardCount} course cards`);

  // Check for empty state / error
  const emptyState = page.getByText(/no courses/i);
  const isEmpty = await emptyState.isVisible().catch(() => false);
  if (isEmpty)
    entry.notes.push(
      'WARNING: Empty state shown — no courses loaded (GraphQL may be failing)'
    );

  entry.loadedSuccessfully = headingVisible;
  expect(headingVisible).toBe(true);
});

// ─── 5. Content Viewer ────────────────────────────────────────────────────────

test('05 — Content Viewer — video player and transcript', async ({ page }) => {
  const entry: PageReport = {
    label: '05 — Content Viewer',
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
  await page.goto(`${BASE}/learn/content-1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  entry.url = page.url();
  entry.screenshot = await snap(page, '05-content-viewer');

  // Check video element
  const video = page.locator('video');
  const videoVisible = await video.isVisible().catch(() => false);
  if (!videoVisible) entry.notes.push('MISSING: Video element not visible');

  // Check transcript panel
  const transcript = page.getByText('Transcript');
  const transcriptVisible = await transcript.isVisible().catch(() => false);
  if (!transcriptVisible)
    entry.notes.push('MISSING: Transcript panel not visible');

  // Check annotations panel
  const annotationsPanel = page.getByText('Annotations').first();
  const annotationsPanelVisible = await annotationsPanel
    .isVisible()
    .catch(() => false);
  if (!annotationsPanelVisible)
    entry.notes.push('MISSING: Annotations panel not visible');

  // Check for error boundary trigger
  const errorBoundary = page.getByText(/something went wrong/i);
  const hasCrashed = await errorBoundary.isVisible().catch(() => false);
  if (hasCrashed)
    entry.notes.push('CRITICAL: Error boundary triggered — component crashed');

  entry.loadedSuccessfully = videoVisible || transcriptVisible;
});

// ─── 6. Create Annotation ─────────────────────────────────────────────────────

test('06 — Content Viewer — create an annotation', async ({ page }) => {
  const entry: PageReport = {
    label: '06 — Create Annotation',
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
  await page.goto(`${BASE}/learn/content-1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000); // extra wait for Vite HMR to settle

  // Try to add an annotation — button has text "Add" with Plus icon
  const addBtn = page
    .getByRole('button', { name: /Add/i })
    .or(page.locator('button:has(svg)').filter({ hasText: /Add/i }))
    .first();
  const addBtnVisible = await addBtn.isVisible().catch(() => false);

  if (!addBtnVisible) {
    entry.notes.push(
      'MISSING: Add annotation button not visible (possible Vite HMR cache miss)'
    );
    entry.url = page.url();
    entry.screenshot = await snap(page, '06-annotation-no-button');
    entry.loadedSuccessfully = false;
    return;
  }

  await addBtn.click();
  await page.waitForTimeout(500);

  const textarea = page.locator('textarea').first();
  const textareaVisible = await textarea.isVisible().catch(() => false);

  if (!textareaVisible) {
    entry.notes.push(
      'BUG: Annotation form did not open after clicking Add button'
    );
    entry.url = page.url();
    entry.screenshot = await snap(page, '06-annotation-form-missing');
    entry.loadedSuccessfully = false;
    return;
  }

  await textarea.fill(
    'Visual QA Test Annotation — automated student session test'
  );
  entry.screenshot = await snap(page, '06-annotation-form-filled');

  // Try to save
  const saveBtn = page.getByRole('button', { name: /Save/i });
  const saveBtnVisible = await saveBtn.isVisible().catch(() => false);

  if (!saveBtnVisible) {
    entry.notes.push('MISSING: Save button not visible in annotation form');
  } else {
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Check if annotation appears
    const annotationText = page.getByText(
      'Visual QA Test Annotation — automated student session test'
    );
    const annotationVisible = await annotationText
      .isVisible()
      .catch(() => false);
    if (!annotationVisible) {
      entry.notes.push(
        'WARNING: Annotation text not visible after save — may not have saved, or GraphQL mutation failed'
      );
    } else {
      entry.notes.push('SUCCESS: Annotation created and visible in list');
    }
  }

  entry.url = page.url();
  entry.screenshot = await snap(page, '06-annotation-result');
  entry.loadedSuccessfully = saveBtnVisible;
});

// ─── 7. Annotations Page ─────────────────────────────────────────────────────

test('07 — Annotations Page — layer tabs and list', async ({ page }) => {
  const entry: PageReport = {
    label: '07 — Annotations Page',
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
  await page.goto(`${BASE}/annotations`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  entry.url = page.url();
  entry.screenshot = await snap(page, '07-annotations-page');

  const heading = page.getByRole('heading', { name: 'Annotations' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible)
    entry.notes.push('MISSING: Annotations heading not visible');

  // Check layer tabs — use display labels (from ANNOTATION_LAYER_META), not enum values
  const tabs = ['All', 'Personal', 'Shared', 'Instructor', 'AI'];
  for (const tab of tabs) {
    const tabEl = page.getByRole('tab', { name: new RegExp(tab, 'i') });
    const tabVisible = await tabEl.isVisible().catch(() => false);
    if (!tabVisible) entry.notes.push(`MISSING tab: "${tab}"`);
  }

  entry.loadedSuccessfully = headingVisible;
});

// ─── 8. Knowledge Graph ───────────────────────────────────────────────────────

test('08 — Knowledge Graph page', async ({ page }) => {
  const entry: PageReport = {
    label: '08 — Knowledge Graph',
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
  await page.goto(`${BASE}/graph`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000); // graphs take longer to render

  entry.url = page.url();
  entry.screenshot = await snap(page, '08-knowledge-graph');

  // Check header
  const header = page.locator('header');
  const headerVisible = await header.isVisible().catch(() => false);
  if (!headerVisible)
    entry.notes.push('MISSING: Page header not visible — possible crash');

  // Check for graph container
  const graphCanvas = page
    .locator('canvas, svg[class*="graph"], [data-testid="graph"]')
    .first();
  const graphVisible = await graphCanvas.isVisible().catch(() => false);
  if (!graphVisible) {
    entry.notes.push(
      'INFO: No canvas/svg graph element visible — may be text-based fallback or loading'
    );
  }

  // Check for error boundary
  const crashed = page.getByText(/something went wrong/i);
  const hasCrashed = await crashed.isVisible().catch(() => false);
  if (hasCrashed)
    entry.notes.push('CRITICAL: Knowledge Graph crashed with error boundary');

  entry.loadedSuccessfully = headerVisible && !hasCrashed;
});

// ─── 9. Search Page ───────────────────────────────────────────────────────────

test('09 — Search Page — semantic search', async ({ page }) => {
  const entry: PageReport = {
    label: '09 — Search Page',
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
  await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  entry.url = page.url();
  entry.screenshot = await snap(page, '09-search-empty');

  const searchInput = page
    .locator('input[type="search"], input[placeholder*="Search"]')
    .first();
  const inputVisible = await searchInput.isVisible().catch(() => false);
  if (!inputVisible) entry.notes.push('MISSING: Search input not visible');

  if (inputVisible) {
    await searchInput.fill('Talmud');
    await page.waitForTimeout(800); // debounce

    entry.screenshot = await snap(page, '09-search-results');

    // Check for results
    const results = page
      .locator('[class*="card"], [class*="result"], [class*="CardContent"]')
      .filter({
        has: page.locator('[class*="font-semibold"], h3, h4'),
      });
    const resultCount = await results.count().catch(() => 0);
    entry.notes.push(
      `Found ${resultCount} search result cards after querying "Talmud"`
    );

    if (resultCount === 0) {
      const emptyMsg = page.getByText(/no results/i);
      const emptyVisible = await emptyMsg.isVisible().catch(() => false);
      if (emptyVisible) {
        entry.notes.push(
          'INFO: Empty state shown — search returned no results'
        );
      }
    }
  }

  entry.loadedSuccessfully = inputVisible;
});

// ─── 10. AI Agents Page ───────────────────────────────────────────────────────

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
  await page.waitForTimeout(2500);

  entry.url = page.url();
  entry.screenshot = await snap(page, '10-agents-page');

  // Check heading
  const heading = page.getByRole('heading', { name: 'AI Learning Agents' });
  const headingVisible = await heading.isVisible().catch(() => false);
  if (!headingVisible)
    entry.notes.push('MISSING: "AI Learning Agents" heading not visible');

  // Check all 5 agent mode cards
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

  // Check chat input
  const chatInput = page.locator('input[placeholder*="Ask the"]').first();
  const inputVisible = await chatInput.isVisible().catch(() => false);
  if (!inputVisible) entry.notes.push('MISSING: Chat input field not visible');

  // Check greeting message
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

  // Send a message
  if (inputVisible) {
    await chatInput.fill('What is free will from a Talmudic perspective?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    entry.screenshot = await snap(page, '10-agents-message-sent');

    // Check user message appeared
    const userMsg = page.getByText(
      'What is free will from a Talmudic perspective?'
    );
    const userMsgVisible = await userMsg.isVisible().catch(() => false);
    if (!userMsgVisible)
      entry.notes.push('BUG: User message not visible after sending');

    // Wait for AI response
    await page.waitForTimeout(3500); // 600ms delay + ~2s streaming
    entry.screenshot = await snap(page, '10-agents-ai-response');

    const agentBubbles = page.locator(
      '[class*="bg-muted"][class*="rounded-lg"]'
    );
    const bubbleCount = await agentBubbles.count().catch(() => 0);
    entry.notes.push(`AI response bubbles visible: ${bubbleCount}`);

    if (bubbleCount < 2) {
      entry.notes.push(
        'WARNING: AI response did not appear after message — streaming may be broken'
      );
    }
  }

  entry.loadedSuccessfully = headingVisible && inputVisible;
});

// ─── 11. Collaboration Page ───────────────────────────────────────────────────

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
  await page.waitForTimeout(3000);

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

// ─── 12. Profile Page ─────────────────────────────────────────────────────────

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
  await page.waitForTimeout(2500);

  entry.url = page.url();
  entry.screenshot = await snap(page, '12-profile');

  const header = page.locator('header');
  const headerVisible = await header.isVisible().catch(() => false);

  const profileHeading = page
    .getByRole('heading', { name: /profile/i })
    .first();
  const profileVisible = await profileHeading.isVisible().catch(() => false);
  if (!profileVisible) entry.notes.push('MISSING: Profile heading not visible');

  // Check for user data
  const emailField = page.getByText(STUDENT.email);
  const emailVisible = await emailField.isVisible().catch(() => false);
  if (!emailVisible)
    entry.notes.push(
      'INFO: Student email not visible on profile page (may require GraphQL me query)'
    );

  entry.loadedSuccessfully = headerVisible;
});

// ─── 13. UserMenu and Logout ──────────────────────────────────────────────────

test('13 — User Menu and Logout flow', async ({ page }) => {
  const entry: PageReport = {
    label: '13 — UserMenu / Logout',
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
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Find and click UserMenu button
  const userMenuBtn = page
    .getByRole('button', { name: /user menu/i })
    .or(page.locator('[data-testid="user-menu"]'))
    .or(
      page
        .locator('button')
        .filter({ has: page.locator('[class*="avatar"], [class*="Avatar"]') })
    )
    .first();

  const userMenuVisible = await userMenuBtn.isVisible().catch(() => false);
  if (!userMenuVisible) {
    // Try finding by aria-label or title
    const altBtn = page
      .locator('button[aria-label*="user" i], button[title*="menu" i]')
      .first();
    const altVisible = await altBtn.isVisible().catch(() => false);
    if (!altVisible) {
      entry.notes.push(
        'MISSING: UserMenu button not found in header — cannot test logout'
      );
      entry.url = page.url();
      entry.screenshot = await snap(page, '13-usermenu-missing');
      entry.loadedSuccessfully = false;
      return;
    }
    await altBtn.click();
  } else {
    await userMenuBtn.click();
  }

  await page.waitForTimeout(500);
  entry.screenshot = await snap(page, '13-usermenu-open');

  // Check dropdown items
  const logoutItem = page
    .getByRole('menuitem', { name: /log out/i })
    .or(page.getByRole('menuitem', { name: /sign out/i }))
    .or(page.getByText(/log out/i).first());

  const logoutVisible = await logoutItem.isVisible().catch(() => false);
  if (!logoutVisible) {
    entry.notes.push(
      'MISSING: Logout menu item not visible in UserMenu dropdown'
    );
  } else {
    await logoutItem.click();
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    entry.notes.push(`After logout URL: ${finalUrl}`);

    const onLoginOrKeycloak =
      finalUrl.includes('/login') ||
      finalUrl.includes('keycloak') ||
      finalUrl.includes('8080');
    if (!onLoginOrKeycloak) {
      entry.notes.push(
        `BUG: After logout, user is still on ${finalUrl} instead of /login or Keycloak`
      );
    } else {
      entry.notes.push(
        'SUCCESS: Logout redirected correctly to login/Keycloak'
      );
    }

    entry.loadedSuccessfully = onLoginOrKeycloak;
  }

  entry.url = page.url();
  entry.screenshot = await snap(page, '13-after-logout');
});

// ─── 14. Navigation Sidebar Links ─────────────────────────────────────────────

test('14 — Navigation sidebar — all links reachable', async ({ page }) => {
  const entry: PageReport = {
    label: '14 — Navigation Sidebar',
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
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  entry.url = page.url();
  entry.screenshot = await snap(page, '14-sidebar-navigation');

  const nav = page.locator('nav');
  const navVisible = await nav.isVisible().catch(() => false);

  const expectedLinks = [
    { name: 'Dashboard', expectedUrl: '/dashboard' },
    { name: 'Courses', expectedUrl: '/courses' },
    { name: 'Annotations', expectedUrl: '/annotations' },
    { name: 'Agents', expectedUrl: '/agents' },
    { name: 'Graph', expectedUrl: '/graph' },
  ];

  for (const link of expectedLinks) {
    const el = nav
      .getByRole('link', { name: link.name })
      .or(page.getByRole('link', { name: link.name }))
      .first();
    const visible = await el.isVisible().catch(() => false);
    if (!visible) {
      entry.notes.push(`MISSING nav link: "${link.name}"`);
    } else {
      entry.notes.push(`FOUND nav link: "${link.name}"`);
    }
  }

  entry.loadedSuccessfully = navVisible;
});

// ─── 15. 404 / Unknown Route ──────────────────────────────────────────────────

test('15 — Unknown route redirects gracefully', async ({ page }) => {
  const entry: PageReport = {
    label: '15 — Unknown Route / 404',
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
  await page.goto(`${BASE}/this-page-does-not-exist-xyz`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);

  entry.url = page.url();
  entry.screenshot = await snap(page, '15-unknown-route');

  const finalUrl = page.url();

  // App should redirect unknown routes (App.tsx Navigate fallback to /learn/content-1)
  const redirectedToContent =
    finalUrl.includes('/learn/') ||
    finalUrl.includes('/dashboard') ||
    finalUrl.includes('/courses');
  const showed404 = page.getByText(/404|not found|page not found/i);
  const has404 = await showed404.isVisible().catch(() => false);

  if (redirectedToContent) {
    entry.notes.push(
      `INFO: Unknown route redirected to ${finalUrl} — fallback route working`
    );
    entry.loadedSuccessfully = true;
  } else if (has404) {
    entry.notes.push('INFO: 404 page displayed for unknown route');
    entry.loadedSuccessfully = true;
  } else {
    entry.notes.push(
      `WARNING: Unknown route not handled gracefully — landed on ${finalUrl}`
    );
    entry.loadedSuccessfully = false;
  }
});
