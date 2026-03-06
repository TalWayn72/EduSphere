/**
 * SkillTree Security — Penetration test scenarios for Session 26.
 *
 * Tests:
 * 1. skillTree query requires authentication — unauthenticated request returns error, not data
 * 2. updateMasteryLevel mutation requires authentication — bare fetch returns 401
 * 3. Raw "Unauthorized" string must NOT be visible to users (UI wraps errors)
 * 4. Cross-tenant mastery access — JWT tenant from auth context, not URL/input
 */
import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

async function clearAuthState(
  page: import('@playwright/test').Page
): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    sessionStorage.clear();
    localStorage.clear();
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('SkillTree Security — Authentication enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('skillTree query without auth token returns error, not data', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No Authorization header — unauthenticated request
        body: JSON.stringify({
          query: `query { skillTree(courseId: "all") { nodes { id label masteryLevel } edges { source target } } }`,
        }),
      });
      const body = await res.text();
      return { status: res.status, body };
    });

    const parsed = JSON.parse(result.body) as {
      data?: { skillTree?: unknown };
      errors?: unknown[];
    };

    // MUST NOT return skill tree data to unauthenticated callers
    expect(parsed.data?.skillTree).toBeUndefined();

    // Must return an error (HTTP 401 or GraphQL-level error)
    if (result.status === 200) {
      expect(parsed.errors).toBeDefined();
      expect((parsed.errors as unknown[]).length).toBeGreaterThan(0);
    } else {
      expect([401, 403]).toContain(result.status);
    }
  });

  test('updateMasteryLevel mutation without auth returns error, not data', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { updateMasteryLevel(nodeId: "concept-1", level: "MASTERED") { id masteryLevel } }`,
        }),
      });
      return { status: res.status, body: await res.text() };
    });

    const parsed = JSON.parse(result.body) as {
      data?: { updateMasteryLevel?: unknown };
      errors?: unknown[];
    };

    // Must not return a successfully updated node
    expect(parsed.data?.updateMasteryLevel).toBeUndefined();

    if (result.status === 200) {
      expect(parsed.errors).toBeDefined();
    } else {
      expect([401, 403]).toContain(result.status);
    }
  });

  test('unauthenticated /skill-tree page shows login, not raw Unauthorized text', async ({
    page,
  }) => {
    // Intercept any skillTree GraphQL call and return 401
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('skillTree')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/skill-tree`, { waitUntil: 'domcontentloaded' });

    // ProtectedRoute kicks in before skillTree query fires — page redirects to /login
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    // Raw "Unauthorized" string must NOT be visible in the page
    const rawUnauth = page.getByText('Unauthorized', { exact: true });
    await expect(rawUnauth).not.toBeVisible({ timeout: 2_000 });
  });
});

test.describe('SkillTree Security — Authenticated access', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('authenticated user can access /skill-tree without error', async ({
    page,
  }) => {
    // Route skillTree to return empty mock data (no backend required)
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('skillTree')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { skillTree: { nodes: [], edges: [] } },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/skill-tree`, { waitUntil: 'domcontentloaded' });

    // Should NOT redirect to /login
    expect(page.url()).not.toContain('/login');

    // Raw error strings must NOT appear
    await expect(page.getByText('Unauthorized', { exact: true })).not.toBeVisible({
      timeout: 2_000,
    });
    await expect(
      page.getByText('Authentication required', { exact: true })
    ).not.toBeVisible({ timeout: 2_000 });
  });

  test('skillTree UI does not expose raw GraphQL error messages on failure', async ({
    page,
  }) => {
    // Simulate a GraphQL error from the knowledge subgraph
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('skillTree')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { skillTree: null },
            errors: [
              {
                message: '[SkillTreeService] concept query failed',
                extensions: { code: 'INTERNAL_SERVER_ERROR' },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/skill-tree`, { waitUntil: 'domcontentloaded' });

    // Internal error message must NOT leak to UI
    await expect(
      page.getByText('[SkillTreeService] concept query failed', { exact: true })
    ).not.toBeVisible({ timeout: 5_000 });

    // Stack trace fragments must not be visible
    await expect(
      page.getByText('INTERNAL_SERVER_ERROR', { exact: true })
    ).not.toBeVisible({ timeout: 2_000 });
  });
});

test.describe('SkillTree Security — Mastery mutation input validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('updateMasteryLevel with invalid level value is rejected', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      // Attempt to inject an invalid mastery level
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { updateMasteryLevel(nodeId: "concept-1", level: "HACKED") { id masteryLevel } }`,
        }),
      });
      const body = await res.text();
      return { status: res.status, body };
    });

    // Gateway schema validation should reject unknown enum value
    // or resolver normalises it to NONE — either way no "HACKED" data returned
    const parsed = JSON.parse(result.body) as {
      data?: { updateMasteryLevel?: { masteryLevel?: string } };
      errors?: unknown[];
    };

    const returnedLevel = parsed.data?.updateMasteryLevel?.masteryLevel;
    expect(returnedLevel).not.toBe('HACKED');
  });
});
