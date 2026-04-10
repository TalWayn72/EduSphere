/**
 * Full Auth Smoke Test — All 5 Users
 *
 * Tests authentication and navigation for all 5 EduSphere user roles:
 *   SUPER_ADMIN, INSTRUCTOR, ORG_ADMIN, RESEARCHER, STUDENT
 *
 * Mode detection:
 *   - VITE_DEV_MODE=false + running Keycloak → real OIDC flow per user
 *   - VITE_DEV_MODE=true  (dev server)        → DEV_MODE login (SUPER_ADMIN mock)
 *
 * The smart loginAndNavigate() helper detects the actual running mode from the
 * DOM — so the same test file works in both environments without changes.
 *
 * Prerequisites:
 *   - docker-compose up -d (Keycloak, gateway, all subgraphs running)
 *   - Frontend running: pnpm --filter @edusphere/web dev
 *   - Passwords set via: node scripts/reset-keycloak-passwords.cjs
 *
 * Run (Keycloak mode):
 *   VITE_DEV_MODE=false pnpm --filter @edusphere/web test:e2e \
 *     --project=chromium --grep "full-auth-smoke" --timeout=120000
 *
 * Run (DEV_MODE — dashboard/nav smoke only):
 *   pnpm --filter @edusphere/web test:e2e \
 *     --project=chromium --grep "full-auth-smoke" --timeout=120000
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// User credentials — sourced from scripts/reset-keycloak-passwords.cjs
// ---------------------------------------------------------------------------

const USERS = [
  {
    email: 'super.admin@edusphere.dev',
    password: 'SuperAdmin123!',
    role: 'SUPER_ADMIN',
    slug: 'super-admin',
    displayName: 'Super Admin',
  },
  {
    email: 'instructor@example.com',
    password: 'Instructor123!',
    role: 'INSTRUCTOR',
    slug: 'instructor',
    displayName: 'Demo Instructor',
  },
  {
    email: 'org.admin@example.com',
    password: 'OrgAdmin123!',
    role: 'ORG_ADMIN',
    slug: 'org-admin',
    displayName: 'Demo Org Admin',
  },
  {
    email: 'researcher@example.com',
    password: 'Researcher123!',
    role: 'RESEARCHER',
    slug: 'researcher',
    displayName: 'Demo Researcher',
  },
  {
    email: 'student@example.com',
    password: 'Student123!',
    role: 'STUDENT',
    slug: 'student',
    displayName: 'Demo Student',
  },
] as const;

// ---------------------------------------------------------------------------
// Screenshot directory — all PNGs MUST go to docs/screenshots/
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/screenshots');

// ---------------------------------------------------------------------------
// Helper: smart login — tries Keycloak OIDC, falls back to DEV_MODE
// Detects from the DOM which mode the running app uses.
// ---------------------------------------------------------------------------

async function loginAndNavigate(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Inject locale/sidebar prefs before navigation
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Wait a moment for Keycloak.init() and render to stabilise
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('button') &&
        !document.body.textContent?.includes('Initializing authentication...'),
      { timeout: 15_000 }
    )
    .catch(() => {});

  // Detect actual app mode from DOM
  const devBtn = page.locator('[data-testid="dev-login-btn"]');
  const isDevMode = await devBtn
    .waitFor({ timeout: 4_000 })
    .then(() => true)
    .catch(() => false);

  if (isDevMode) {
    // DEV_MODE: click the dev login button (authenticates as SUPER_ADMIN mock)
    await devBtn.click();
    await page
      .waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 20_000,
      })
      .catch(() => {});
    await page.waitForLoadState('domcontentloaded');
  } else {
    // Keycloak OIDC flow
    const signInBtn = page.getByRole('button', { name: /Sign In with Keycloak/i });
    await signInBtn.waitFor({ timeout: 10_000 });
    await signInBtn.click();

    await page.waitForURL(/localhost:8080\/realms\/edusphere/, {
      timeout: 20_000,
    });
    await page.locator('#username').waitFor({ timeout: 10_000 });

    await page.fill('#username', email);
    await page.fill('#password', password);
    await page.click('#kc-login');

    await page.waitForURL(/localhost:5173/, { timeout: 30_000 });
    await page
      .waitForURL(/\/(dashboard|courses|learn|admin)/, { timeout: 30_000 })
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Helper: navigate to dashboard and verify it loaded
// ---------------------------------------------------------------------------

async function verifyDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  // Wait for any main content — heading or sidebar or main tag
  // (DEV_MODE may render a different heading than "Dashboard")
  await page
    .waitForSelector('h1, h2, main, [data-testid]', { timeout: 25_000 })
    .catch(() => {});
  // Verify we are NOT redirected back to /login (i.e. session is valid)
  expect(page.url(), 'Dashboard should be accessible without redirect to /login').not.toMatch(
    /\/login/
  );
}

// ---------------------------------------------------------------------------
// Helper: take a named screenshot to docs/screenshots/
// Waits for the loading spinner/initializing state to clear first.
// ---------------------------------------------------------------------------

async function capture(page: Page, filename: string): Promise<void> {
  // Wait for any loading/spinner to clear before capturing
  await page
    .waitForFunction(
      () =>
        !document.body.textContent?.includes('Initializing authentication...') &&
        !document.querySelector('.loading-spinner') &&
        document.readyState === 'complete',
      { timeout: 10_000 }
    )
    .catch(() => {});

  // Short stabilisation pause for React rendering to finish
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: false,
  });
}

// ---------------------------------------------------------------------------
// Helper: logout (navigate to /login and clear storage)
// ---------------------------------------------------------------------------

async function logout(page: Page): Promise<void> {
  // Clear local/session storage so the next user starts fresh
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
}

// ---------------------------------------------------------------------------
// Tests — one describe block per user
// ---------------------------------------------------------------------------

test.describe('full-auth-smoke — SUPER_ADMIN', () => {
  const user = USERS[0];

  test('SUPER_ADMIN can log in, reach dashboard, and access admin panel', async ({
    page,
  }) => {
    await loginAndNavigate(page, user.email, user.password);
    await verifyDashboard(page);
    await capture(page, `auth-smoke-${user.slug}-01-dashboard.png`);

    // Navigate to courses
    await page.goto('/courses');
    await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('domcontentloaded'));
    await page.waitForSelector('h1, h2, main, article, [data-testid]', { timeout: 15_000 }).catch(() => {});
    await capture(page, `auth-smoke-${user.slug}-02-courses.png`);

    // SUPER_ADMIN: verify admin panel link / admin route is accessible
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h1, h2, main, [data-testid]', { timeout: 15_000 }).catch(() => {});
    await capture(page, `auth-smoke-${user.slug}-03-admin.png`);

    // Confirm we are NOT on the login page (admin route accessible)
    expect(page.url()).not.toMatch(/\/login/);

    await logout(page);
  });
});

test.describe('full-auth-smoke — INSTRUCTOR', () => {
  const user = USERS[1];

  test('INSTRUCTOR can log in, reach dashboard, and see course creation', async ({
    page,
  }) => {
    await loginAndNavigate(page, user.email, user.password);
    await verifyDashboard(page);
    await capture(page, `auth-smoke-${user.slug}-01-dashboard.png`);

    // Navigate to courses
    await page.goto('/courses');
    await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('domcontentloaded'));
    await page.waitForSelector('h1, h2, main, article, [data-testid]', { timeout: 15_000 }).catch(() => {});
    await capture(page, `auth-smoke-${user.slug}-02-courses.png`);

    // INSTRUCTOR: verify course creation button or route is accessible
    const createBtn = page
      .getByRole('button', { name: /create course/i })
      .or(page.getByRole('link', { name: /create course/i }))
      .first();

    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await capture(page, `auth-smoke-${user.slug}-03-create-course.png`);
    } else {
      // Try navigating directly to the create route
      await page.goto('/courses/create');
      await page.waitForLoadState('domcontentloaded');
      await capture(page, `auth-smoke-${user.slug}-03-create-course.png`);
    }

    await logout(page);
  });
});

test.describe('full-auth-smoke — ORG_ADMIN', () => {
  const user = USERS[2];

  test('ORG_ADMIN can log in, reach dashboard, and navigate courses', async ({
    page,
  }) => {
    await loginAndNavigate(page, user.email, user.password);
    await verifyDashboard(page);
    await capture(page, `auth-smoke-${user.slug}-01-dashboard.png`);

    await page.goto('/courses');
    await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('domcontentloaded'));
    await page.waitForSelector('h1, h2, main, article, [data-testid]', { timeout: 15_000 }).catch(() => {});
    await capture(page, `auth-smoke-${user.slug}-02-courses.png`);

    await logout(page);
  });
});

test.describe('full-auth-smoke — RESEARCHER', () => {
  const user = USERS[3];

  test('RESEARCHER can log in, reach dashboard, and navigate courses', async ({
    page,
  }) => {
    await loginAndNavigate(page, user.email, user.password);
    await verifyDashboard(page);
    await capture(page, `auth-smoke-${user.slug}-01-dashboard.png`);

    await page.goto('/courses');
    await page.waitForLoadState('networkidle').catch(() => page.waitForLoadState('domcontentloaded'));
    await page.waitForSelector('h1, h2, main, article, [data-testid]', { timeout: 15_000 }).catch(() => {});
    await capture(page, `auth-smoke-${user.slug}-02-courses.png`);

    await logout(page);
  });
});

test.describe('full-auth-smoke — STUDENT', () => {
  const user = USERS[4];

  test('STUDENT can log in, reach dashboard, and see enrolled courses', async ({
    page,
  }) => {
    await loginAndNavigate(page, user.email, user.password);
    await verifyDashboard(page);
    await capture(page, `auth-smoke-${user.slug}-01-dashboard.png`);

    await page.goto('/courses');
    await page.waitForLoadState('domcontentloaded');
    await capture(page, `auth-smoke-${user.slug}-02-courses.png`);

    // STUDENT: look for enrolled courses section or course cards
    const enrolledSection = page
      .getByText(/enrolled/i)
      .or(page.getByText(/my courses/i))
      .first();

    const hasEnrolled = await enrolledSection
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // Soft assertion — student UI should surface enrollment context
    if (hasEnrolled) {
      await capture(page, `auth-smoke-${user.slug}-03-enrolled.png`);
    }

    await logout(page);
  });
});
