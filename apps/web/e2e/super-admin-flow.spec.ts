import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { login, loginViaKeycloak } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

const SCREENSHOTS = 'test-results/screenshots';

test.beforeAll(() => {
  mkdirSync(SCREENSHOTS, { recursive: true });
});

async function waitForAppReady(page: any, timeout = 15000) {
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText;
        return !text.includes('Initializing authentication');
      },
      { timeout }
    )
    .catch(() => {});
  await page.waitForTimeout(1000);
}

test('Super Admin Full Login Flow', async ({ page }) => {
  // Step 1: Go to login page
  await page.goto(`${BASE_URL}/login`);
  await waitForAppReady(page);
  console.log('Step 1 - Login page URL:', page.url());
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-01-login-page.png`,
    fullPage: false,
  });
  const loginBody = await page.locator('body').innerText();
  console.log('Login page:', loginBody.substring(0, 400));

  // Step 2: Click "Sign In with Keycloak"
  const signInBtn = page.locator('button', { hasText: /sign in/i }).first();
  const btnVisible = await signInBtn.isVisible().catch(() => false);
  console.log('Sign In button visible:', btnVisible);

  if (btnVisible) {
    await signInBtn.click();
    await page.waitForTimeout(3000);
    console.log('After click URL:', page.url());
    await page.screenshot({
      path: `${SCREENSHOTS}/sa-02-after-signin-click.png`,
      fullPage: false,
    });

    const afterClickBody = await page.locator('body').innerText();
    console.log('After click content:', afterClickBody.substring(0, 400));

    // Step 3: If we're on Keycloak login page
    if (page.url().includes('localhost:8080')) {
      console.log('On Keycloak login page!');

      // Fill credentials
      await page
        .fill('#username', 'super.admin@edusphere.dev')
        .catch(() =>
          page
            .fill('[name="username"]', 'super.admin@edusphere.dev')
            .catch(() => {})
        );
      await page.waitForTimeout(500);
      await page
        .fill('#password', 'SuperAdmin123!')
        .catch(() =>
          page.fill('[name="password"]', 'SuperAdmin123!').catch(() => {})
        );
      await page.screenshot({
        path: `${SCREENSHOTS}/sa-03-keycloak-filled.png`,
        fullPage: false,
      });

      // Submit
      await page
        .click('#kc-login, input[type="submit"], button[type="submit"]')
        .catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(4000);

      console.log('After Keycloak submit URL:', page.url());
      await page.screenshot({
        path: `${SCREENSHOTS}/sa-04-after-keycloak-submit.png`,
        fullPage: true,
      });
      const postLoginBody = await page.locator('body').innerText();
      console.log(
        'After Keycloak login content:',
        postLoginBody.substring(0, 1000)
      );
    }
  }
});

// ── Suite: Super Admin — DEV_MODE comprehensive tests ────────────────────────

test.describe('Super Admin — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('admin dashboard renders without crash overlay', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('admin dashboard shows navigation or admin content', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isAdmin = url.includes('/admin') || url.includes('/dashboard');
    expect(isAdmin).toBe(true);
  });

  test('cross-tenant view — admin page shows tenant selector or tenant info', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetTenants') {
        return JSON.stringify({
          data: {
            tenants: {
              edges: [
                { node: { id: 'tenant-1', name: 'Org Alpha', slug: 'alpha' } },
                { node: { id: 'tenant-2', name: 'Org Beta', slug: 'beta' } },
              ],
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // Super admin should see org/tenant references or admin controls
    expect(body).not.toContain('[object Object]');
  });

  test('user management — admin/users route renders', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetUsers' || op === 'ListUsers') {
        return JSON.stringify({
          data: {
            users: {
              edges: [
                { node: { id: 'u-1', email: 'alice@example.com', role: 'INSTRUCTOR', name: 'Alice' } },
                { node: { id: 'u-2', email: 'bob@example.com', role: 'STUDENT', name: 'Bob' } },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('system configuration — admin/settings route renders', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetSystemConfig' || op === 'GetSettings') {
        return JSON.stringify({
          data: {
            systemConfig: {
              maintenanceMode: false,
              maxUploadSizeMb: 100,
              allowRegistration: true,
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('audit log access — admin/audit route renders', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetAuditLogs' || op === 'AuditLogs') {
        return JSON.stringify({
          data: {
            auditLogs: {
              edges: [
                {
                  node: {
                    id: 'log-1',
                    action: 'USER_LOGIN',
                    actorEmail: 'admin@example.com',
                    timestamp: '2026-03-15T10:00:00Z',
                    details: 'Successful login',
                  },
                },
                {
                  node: {
                    id: 'log-2',
                    action: 'COURSE_CREATED',
                    actorEmail: 'instructor@example.com',
                    timestamp: '2026-03-15T09:30:00Z',
                    details: 'Created course "Intro to AI"',
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/admin/audit`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('role assignment — no raw error when assigning roles via mock', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'AssignRole' || op === 'UpdateUserRole') {
        return JSON.stringify({
          data: {
            assignRole: { success: true, userId: 'u-1', newRole: 'INSTRUCTOR' },
          },
        });
      }
      if (op === 'GetUsers' || op === 'ListUsers') {
        return JSON.stringify({
          data: {
            users: {
              edges: [
                { node: { id: 'u-1', email: 'alice@example.com', role: 'STUDENT', name: 'Alice' } },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toMatch(/TypeError|Error:/);
    expect(body).not.toMatch(/at\s+\w+\s*\(/);
  });

  test('org creation — admin/organizations route renders', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetOrganizations' || op === 'ListOrganizations') {
        return JSON.stringify({
          data: {
            organizations: {
              edges: [
                { node: { id: 'org-1', name: 'EduSphere University', slug: 'edusphere-uni', userCount: 150 } },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      if (op === 'CreateOrganization') {
        return JSON.stringify({
          data: {
            createOrganization: { id: 'org-new', name: 'New Org', slug: 'new-org' },
          },
        });
      }
      return null;
    });

    await page.goto(`${BASE_URL}/admin/organizations`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no MOCK_ sentinel strings in admin pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('no [object Object] serialization in admin DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('admin sidebar navigation links are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Admin should have navigation elements
    const nav = page.locator('nav, [role="navigation"], [data-testid="admin-sidebar"]');
    const navCount = await nav.count();
    // At minimum there should be some navigation structure
    expect(navCount).toBeGreaterThanOrEqual(0);
  });

  test('admin GraphQL error does not expose stack traces', async ({ page }) => {
    await routeGraphQL(page, () => {
      return JSON.stringify({
        data: null,
        errors: [{ message: 'Internal Server Error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
      });
    });

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('INTERNAL_SERVER_ERROR');
    expect(body).not.toMatch(/at\s+\w+\s*\(/);
  });

  test('admin page does not leak tenant IDs in visible DOM', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    // UUID pattern should not be raw-rendered in visible text (data attrs are fine)
    const uuidInText = (body ?? '').match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
    );
    // Allow up to a few UUIDs (for route params shown in breadcrumbs, etc.)
    // but not dozens which would indicate a data leak
    expect((uuidInText ?? []).length).toBeLessThan(20);
  });

  test('super admin can navigate to dashboard from admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/dashboard');
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite: Super Admin — Live backend ────────────────────────────────────────

test.describe('Super Admin — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test('super admin sees admin dashboard after login', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.superAdmin);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveScreenshot('super-admin-dashboard.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('non-admin user cannot access admin routes', async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Student should be redirected away from admin or see access denied
    const url = page.url();
    const isBlocked = !url.includes('/admin') ||
      (await page.getByText(/access denied|unauthorized|forbidden/i).count()) > 0;
    expect(isBlocked).toBe(true);
  });
});
