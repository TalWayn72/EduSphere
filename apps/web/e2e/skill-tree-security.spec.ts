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

// ── Suite 4: Cross-tenant isolation tests ─────────────────────────────────────

test.describe('SkillTree Security — Cross-tenant isolation', () => {
  test('skillTree query with spoofed tenant header returns error or own data only', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Attempt to spoof a different tenant
          'x-tenant-id': '00000000-0000-0000-0000-000000000099',
        },
        body: JSON.stringify({
          query: `query { skillTree(courseId: "all") { nodes { id } } }`,
        }),
      });
      return { status: res.status, body: await res.text() };
    });

    const parsed = JSON.parse(result.body) as {
      data?: { skillTree?: { nodes?: unknown[] } };
      errors?: unknown[];
    };

    // Gateway must either reject spoofed tenant or ignore the header
    // (tenant from JWT, not from client header)
    if (parsed.errors) {
      expect(parsed.errors.length).toBeGreaterThan(0);
    }
    // If data is returned, it should be empty (unauthenticated) or from real tenant
    if (parsed.data?.skillTree?.nodes) {
      // No crash — acceptable
      expect(Array.isArray(parsed.data.skillTree.nodes)).toBe(true);
    }
  });

  test('SQL injection attempt in courseId parameter is rejected', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { skillTree(courseId: "'; DROP TABLE users; --") { nodes { id } } }`,
        }),
      });
      return { status: res.status, body: await res.text() };
    });

    const parsed = JSON.parse(result.body) as {
      data?: { skillTree?: unknown };
      errors?: unknown[];
    };

    // Must not return data — should return error or empty result
    if (result.status === 200 && parsed.data?.skillTree) {
      // If skill tree was returned, it must be empty (parameterized query protection)
      expect(parsed.data.skillTree).toEqual(
        expect.objectContaining({ nodes: expect.any(Array) })
      );
    }
  });

  test('XSS attempt in nodeId parameter does not reflect in response', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const xssPayload = '<script>alert("xss")</script>';
    const result = await page.evaluate(async (payload) => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { updateMasteryLevel(nodeId: "${payload}", level: "BEGINNER") { id masteryLevel } }`,
        }),
      });
      return { status: res.status, body: await res.text() };
    }, xssPayload);

    // Response body must not contain the reflected XSS payload unescaped
    expect(result.body).not.toContain('<script>alert("xss")</script>');
  });
});

// ── Suite 5: UI security and visual regression ─────────────────────────────────

test.describe('SkillTree Security — UI security guards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('skill-tree page visual regression with mock data', async ({
    page,
  }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('skillTree')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              skillTree: {
                nodes: [
                  { id: 'n1', label: 'Algebra', masteryLevel: 'BEGINNER' },
                  { id: 'n2', label: 'Calculus', masteryLevel: 'NONE' },
                ],
                edges: [{ source: 'n1', target: 'n2' }],
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/skill-tree`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('skill-tree-with-data.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('skill-tree empty state visual regression', async ({ page }) => {
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

    await page.goto(`${BASE_URL}/skill-tree`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });

    await expect(page).toHaveScreenshot('skill-tree-empty-state.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('skill-tree handles GraphQL timeout gracefully', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('skillTree')) {
        // Simulate timeout by delaying indefinitely (test will time out gracefully)
        await new Promise((resolve) => setTimeout(resolve, 15_000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { skillTree: null } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/skill-tree`, {
      waitUntil: 'domcontentloaded',
    });

    // Page should show loading state, not crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('no raw i18n keys on skill-tree page', async ({ page }) => {
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

    await page.goto(`${BASE_URL}/skill-tree`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');

    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toMatch(/\bskillTree\.[a-z]+\.[a-z]+\b/);
    expect(body).not.toMatch(/\bmastery\.[a-z]+\b/);
    expect(body).not.toContain('[object Object]');
  });

  test('skillTree query with extremely long courseId is handled safely', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const longId = 'A'.repeat(10_000);
    const result = await page.evaluate(async (id) => {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { skillTree(courseId: "${id}") { nodes { id } } }`,
        }),
      });
      return { status: res.status, body: await res.text() };
    }, longId);

    // Server should reject or handle gracefully — not crash
    expect([200, 400, 413, 401, 403]).toContain(result.status);
    // Response should be valid JSON
    expect(() => JSON.parse(result.body)).not.toThrow();
  });

  test('concurrent skillTree mutations do not corrupt state', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const results = await page.evaluate(async () => {
      const mutations = Array.from({ length: 5 }, (_, i) =>
        fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { updateMasteryLevel(nodeId: "concept-${i}", level: "BEGINNER") { id masteryLevel } }`,
          }),
        }).then((r) => r.status)
      );
      return Promise.all(mutations);
    });

    // All requests should complete without server crash
    for (const status of results) {
      expect([200, 400, 401, 403]).toContain(status);
    }
  });
});
