/**
 * BUG-096 verification script — Authenticated Knowledge Graph page test.
 *
 * 1. Navigates to the login page
 * 2. Detects DEV_MODE vs Keycloak and logs in accordingly
 * 3. Navigates to /knowledge-graph
 * 4. Verifies no error banners, no mock data
 * 5. Takes screenshots as proof
 */
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');
const BASE_URL = 'http://localhost:5173';

// Keycloak token endpoint for non-dev-mode fallback
const KC_TOKEN_URL =
  'http://localhost:8080/realms/edusphere/protocol/openid-connect/token';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log('=== BUG-096 Knowledge Graph Verification ===\n');

  // Step 1: Navigate to login page
  console.log('[1] Navigating to login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'bug096-01-login-page.png'),
  });
  console.log('  Screenshot: bug096-01-login-page.png');

  // Step 2: Check for DEV_MODE login button
  const devLoginBtn = page.locator('[data-testid="dev-login-btn"]');
  const hasDevLogin = (await devLoginBtn.count()) > 0;
  console.log(`  DEV_MODE detected: ${hasDevLogin}`);

  if (hasDevLogin) {
    // DEV_MODE path — click the dev login button
    console.log('[2] Clicking Dev Mode login button...');
    await devLoginBtn.click();
    // login() sets sessionStorage and does window.location.href = '/'
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
      // May redirect to / or /dashboard
    });
    await page.waitForLoadState('networkidle');
  } else {
    // Keycloak path — fill in the Keycloak login form
    console.log('[2] Keycloak login — filling credentials...');
    // Keycloak redirects to its own login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Click the "Sign In with Keycloak" button
    const signInBtn = page.locator('button', { hasText: /sign in/i });
    if ((await signInBtn.count()) > 0) {
      await signInBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // Now we should be on the Keycloak login form
    const usernameField = page.locator('#username, input[name="username"]');
    const passwordField = page.locator('#password, input[name="password"]');

    if ((await usernameField.count()) > 0) {
      await usernameField.fill('student@example.com');
      await passwordField.fill('Student123!');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug096-02-keycloak-form.png'),
      });
      console.log('  Screenshot: bug096-02-keycloak-form.png');

      const loginSubmit = page.locator(
        '#kc-login, input[type="submit"], button[type="submit"]'
      );
      await loginSubmit.click();
      await page.waitForURL(`${BASE_URL}/**`, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    } else {
      console.log(
        '  WARNING: No Keycloak form found. Taking screenshot for debug.'
      );
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'bug096-02-no-kc-form.png'),
      });
    }
  }

  // Step 3: Verify we're logged in
  const currentUrl = page.url();
  console.log(`[3] After login, URL: ${currentUrl}`);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'bug096-02-after-login.png'),
  });
  console.log('  Screenshot: bug096-02-after-login.png');

  // Step 4: Navigate to Knowledge Graph page
  console.log('[4] Navigating to /knowledge-graph...');
  await page.goto(`${BASE_URL}/knowledge-graph`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  // Give the page a moment to render any async content
  await page.waitForTimeout(3000);

  const kgUrl = page.url();
  console.log(`  Current URL: ${kgUrl}`);

  // Check if we got redirected to login (auth failure)
  if (kgUrl.includes('/login')) {
    console.log('  ERROR: Redirected to login — authentication not persisted!');
    await page.screenshot({
      path: path.join(
        SCREENSHOTS_DIR,
        'bug096-03-knowledge-graph-auth-failure.png'
      ),
    });
    await browser.close();
    process.exit(1);
  }

  await page.screenshot({
    path: path.join(
      SCREENSHOTS_DIR,
      'bug096-03-knowledge-graph-authenticated.png'
    ),
    fullPage: true,
  });
  console.log('  Screenshot: bug096-03-knowledge-graph-authenticated.png');

  // Step 5: Verify page content
  console.log('\n[5] Verifying page content...');
  const pageText = await page.textContent('body');

  // Check for error banner: "שרת לא נגיש"
  const hasServerError =
    pageText.includes('שרת לא נגיש') || pageText.includes('Server unavailable');
  console.log(
    `  "שרת לא נגיש" error banner: ${hasServerError ? 'FOUND (BAD)' : 'NOT FOUND (GOOD)'}`
  );

  // Check for mock data (fake Jewish philosophy concepts)
  const mockConcepts = [
    'Talmud',
    'Mishnah',
    'Halakha',
    'Midrash',
    'Gemara',
    'Torah',
    'Kabbalah',
  ];
  const foundMockConcepts = mockConcepts.filter((c) => pageText.includes(c));
  const hasMockData = foundMockConcepts.length > 0;
  console.log(
    `  Mock data present: ${hasMockData ? `YES (BAD) — found: ${foundMockConcepts.join(', ')}` : 'NO (GOOD)'}`
  );

  // Check for empty state or real data
  const hasEmptyState =
    pageText.includes('No data') ||
    pageText.includes('empty') ||
    pageText.includes('No concepts') ||
    pageText.includes('no results') ||
    pageText.includes('אין') ||
    pageText.includes('Get started');
  console.log(`  Empty state visible: ${hasEmptyState ? 'YES' : 'NO'}`);

  // Look for knowledge graph specific elements
  const canvas = await page.locator('canvas').count();
  const svgElements = await page
    .locator('svg.graph, svg[data-testid*="graph"], div[class*="graph"]')
    .count();
  console.log(`  Canvas elements: ${canvas}`);
  console.log(`  Graph SVG/div elements: ${svgElements}`);

  // Check for any visible error alerts or banners
  const alerts = await page
    .locator('[role="alert"], .alert, .error-banner, [data-testid*="error"]')
    .count();
  console.log(`  Alert/error elements: ${alerts}`);

  if (alerts > 0) {
    const alertTexts = await page
      .locator('[role="alert"], .alert, .error-banner, [data-testid*="error"]')
      .allTextContents();
    console.log(`  Alert texts: ${JSON.stringify(alertTexts)}`);
  }

  // Take a focused screenshot of the main content area
  const mainContent = page.locator(
    'main, [role="main"], .main-content, #root > div > div'
  );
  if ((await mainContent.count()) > 0) {
    await mainContent.first().screenshot({
      path: path.join(SCREENSHOTS_DIR, 'bug096-04-knowledge-graph-content.png'),
    });
    console.log('  Screenshot: bug096-04-knowledge-graph-content.png');
  }

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`URL: ${kgUrl}`);
  console.log(
    `Server error banner: ${hasServerError ? '❌ PRESENT' : '✅ ABSENT'}`
  );
  console.log(`Mock data: ${hasMockData ? '❌ PRESENT' : '✅ ABSENT'}`);
  console.log(
    `Page state: ${hasEmptyState ? 'Empty state' : canvas > 0 || svgElements > 0 ? 'Graph rendering' : 'Content present'}`
  );
  console.log(`Auth status: ✅ Authenticated (not redirected to /login)`);

  await browser.close();
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
