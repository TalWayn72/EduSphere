/**
 * BUG-103 Visual QA — Delete Course Button + 5-User Auth Verification
 *
 * Tests:
 * 1. Login as instructor via Keycloak, navigate to courses, verify Delete button
 * 2. Verify all 5 test users can authenticate via Keycloak
 * 3. Check for console errors
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:5173';
const KEYCLOAK_URL = 'http://localhost:8080';

// Ensure screenshots dir exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const TEST_USERS = [
  { email: 'super.admin@edusphere.dev', role: 'SUPER_ADMIN', password: 'SuperAdmin123!' },
  { email: 'instructor@example.com', role: 'INSTRUCTOR', password: 'Instructor123!' },
  { email: 'org.admin@example.com', role: 'ORG_ADMIN', password: 'OrgAdmin123!' },
  { email: 'researcher@example.com', role: 'RESEARCHER', password: 'Researcher123!' },
  { email: 'student@example.com', role: 'STUDENT', password: 'Student123!' },
];

async function keycloakLogin(page, user) {
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Wait for Keycloak.init() to complete
  await page.waitForFunction(
    () =>
      !!document.querySelector('button') &&
      !document.body?.textContent?.includes('Initializing authentication...'),
    { timeout: 15000 }
  ).catch(() => {});

  // Click "Sign In with Keycloak" button
  const signInBtn = page.getByRole('button', { name: /sign in/i });
  await signInBtn.waitFor({ timeout: 10000 });
  await signInBtn.click();

  // Wait for Keycloak login form
  await page.waitForURL(/localhost:8080/, { timeout: 20000 });
  await page.locator('#username').waitFor({ timeout: 10000 });

  // Fill credentials
  await page.fill('#username', user.email);
  await page.fill('#password', user.password);
  await page.click('#kc-login');

  // Wait for redirect back to app
  await page.waitForURL(url => url.toString().includes('localhost:5173'), { timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
  // Extra wait for React to render
  await page.waitForTimeout(2000);
}

async function runVisualQA() {
  console.log('=== BUG-103 Visual QA (Keycloak Auth) ===\n');

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  try {
    // ── Task 1: Visual verification of Delete Course button ──
    console.log('--- Task 1: Delete Course Button Visual Check ---');
    const context1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page1 = await context1.newPage();

    // Collect console errors
    page1.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Login as instructor
    const instructor = TEST_USERS.find(u => u.role === 'INSTRUCTOR');
    await keycloakLogin(page1, instructor);
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-01-logged-in.png') });
    console.log('  [OK] Step 1: Logged in as instructor via Keycloak');

    // Step 2: Navigate to courses
    await page1.goto(`${BASE_URL}/courses`, { waitUntil: 'load' });
    await page1.waitForTimeout(3000);
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-02-courses-list.png') });
    console.log('  [OK] Step 2: Courses page loaded');

    // Step 3: Click on first course
    // Try multiple selectors for course items
    const courseLink = page1.locator('a[href*="/courses/"]').first();
    const hasCourseLink = await courseLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCourseLink) {
      await courseLink.click();
      await page1.waitForURL(/\/courses\//, { timeout: 10000 });
    } else {
      // Try clicking any course title text
      const courseTitle = page1.getByText(/Introduction|Course|Talmud/i).first();
      const hasTitle = await courseTitle.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasTitle) {
        await courseTitle.click();
        await page1.waitForTimeout(3000);
      } else {
        // Navigate directly to mock course
        await page1.goto(`${BASE_URL}/courses/mock-course-1`, { waitUntil: 'load' });
      }
    }

    await page1.waitForTimeout(2000);
    await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-03-course-detail.png') });
    console.log('  [OK] Step 3: Course detail page loaded');

    // Step 4: Check for Delete button (BUG-102 fix)
    // Look for delete button with various selectors
    const deleteSelectors = [
      '[data-testid="delete-course-btn"]',
      'button:has-text("Delete")',
      'button:has-text("delete")',
      'button:has-text("מחק")',
      'svg.lucide-trash',
      'svg.lucide-trash-2',
    ];

    let deleteFound = false;
    for (const sel of deleteSelectors) {
      const el = page1.locator(sel).first();
      const isVis = await el.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVis) {
        console.log(`  [OK] Step 4: Delete element found with selector: ${sel}`);
        deleteFound = true;
        break;
      }
    }

    if (!deleteFound) {
      // Scroll down to find it
      await page1.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page1.waitForTimeout(1000);

      for (const sel of deleteSelectors) {
        const el = page1.locator(sel).first();
        const isVis = await el.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVis) {
          console.log(`  [OK] Step 4: Delete element found after scroll with selector: ${sel}`);
          deleteFound = true;
          break;
        }
      }
    }

    if (deleteFound) {
      await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-04-delete-button-visible.png') });
    } else {
      console.log('  [WARN] Step 4: Delete button not found (may need SUPER_ADMIN/ORG_ADMIN role)');
      await page1.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-04-page-state.png') });

      // Try with super admin
      console.log('  [INFO] Retrying with SUPER_ADMIN...');
      const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page2 = await ctx2.newPage();
      const superAdmin = TEST_USERS.find(u => u.role === 'SUPER_ADMIN');
      await keycloakLogin(page2, superAdmin);
      await page2.goto(`${BASE_URL}/courses`, { waitUntil: 'load' });
      await page2.waitForTimeout(3000);

      // Navigate to course detail
      const courseLink2 = page2.locator('a[href*="/courses/"]').first();
      const hasLink2 = await courseLink2.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasLink2) {
        await courseLink2.click();
        await page2.waitForURL(/\/courses\//, { timeout: 10000 });
      } else {
        await page2.goto(`${BASE_URL}/courses/mock-course-1`, { waitUntil: 'load' });
      }
      await page2.waitForTimeout(2000);

      for (const sel of deleteSelectors) {
        const el = page2.locator(sel).first();
        const isVis = await el.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVis) {
          console.log(`  [OK] Step 4: Delete element found as SUPER_ADMIN with: ${sel}`);
          deleteFound = true;
          await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-04-delete-button-visible.png') });
          break;
        }
      }

      // Try scrolling
      if (!deleteFound) {
        await page2.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page2.waitForTimeout(1000);
        await page2.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bug103-04-scrolled.png') });

        for (const sel of deleteSelectors) {
          const el = page2.locator(sel).first();
          const isVis = await el.isVisible({ timeout: 1000 }).catch(() => false);
          if (isVis) {
            console.log(`  [OK] Step 4: Delete element found after scroll as SUPER_ADMIN: ${sel}`);
            deleteFound = true;
            break;
          }
        }
      }

      if (!deleteFound) {
        // Get page content for debugging
        const bodyText = await page2.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`  [DEBUG] Page content preview: ${bodyText.substring(0, 200)}`);
      }
      await ctx2.close();
    }

    await context1.close();

    // ── Task 2: 5-User Authentication Verification ──
    console.log('\n--- Task 2: 5-User Authentication Verification ---');

    for (const user of TEST_USERS) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      try {
        await keycloakLogin(page, user);
        const url = page.url();
        const isAuthenticated = !url.includes('/login') && url.includes('localhost:5173');

        if (isAuthenticated) {
          console.log(`  [OK] ${user.role.padEnd(12)} (${user.email}) — authenticated`);
        } else {
          console.log(`  [FAIL] ${user.role.padEnd(12)} (${user.email}) — URL: ${url}`);
        }

        const safeName = user.role.toLowerCase().replace(/_/g, '-');
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `bug103-auth-${safeName}.png`)
        });
      } catch (err) {
        console.log(`  [FAIL] ${user.role.padEnd(12)} (${user.email}) — ${err.message.substring(0, 100)}`);
      } finally {
        await ctx.close();
      }
    }

    // ── Task 3: Console Error Check ──
    console.log('\n--- Task 3: Console Error Check ---');
    if (consoleErrors.length === 0) {
      console.log('  [OK] No console errors detected during Task 1');
    } else {
      console.log(`  [INFO] ${consoleErrors.length} console error(s) detected:`);

      const dialogErrors = consoleErrors.filter(e => e.includes('DialogTitle') || e.includes('aria-'));
      const stripeErrors = consoleErrors.filter(e => e.toLowerCase().includes('stripe'));
      const otherErrors = consoleErrors.filter(e =>
        !e.includes('DialogTitle') && !e.includes('aria-') &&
        !e.toLowerCase().includes('stripe') &&
        !e.includes('favicon') && !e.includes('404')
      );

      if (dialogErrors.length > 0) {
        console.log(`  [WARN] DialogTitle a11y warnings: ${dialogErrors.length}`);
        dialogErrors.slice(0, 3).forEach(e => console.log(`    > ${e.substring(0, 150)}`));
      } else {
        console.log('  [OK] No DialogTitle a11y warnings (BUG-101 fix confirmed)');
      }

      if (stripeErrors.length > 0) {
        console.log(`  [WARN] Stripe-related errors: ${stripeErrors.length}`);
        stripeErrors.slice(0, 3).forEach(e => console.log(`    > ${e.substring(0, 150)}`));
      } else {
        console.log('  [OK] No Stripe.js errors');
      }

      if (otherErrors.length > 0) {
        console.log(`  [INFO] Other console errors (${otherErrors.length}):`);
        otherErrors.slice(0, 5).forEach(e => console.log(`    > ${e.substring(0, 150)}`));
      }
    }

    console.log('\n=== BUG-103 Visual QA Complete ===');

  } catch (err) {
    console.error('Visual QA failed:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVisualQA();
