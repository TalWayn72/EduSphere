/**
 * GraphQL Graceful Degradation E2E Tests
 *
 * Verifies that public pages show friendly content when GraphQL
 * backend is unavailable — never raw error messages or stack traces.
 */
import { test, expect } from '@playwright/test';

// Public routes that previously depended on GraphQL
const PUBLIC_GRAPHQL_ROUTES = [
  '/compliance',
  '/catalog',
  '/instructors',
  '/blog',
];

// Error text that should NEVER be visible to unauthenticated users
const FORBIDDEN_ERROR_TEXT = [
  'Unable to load',
  'ECONNREFUSED',
  'NetworkError',
  'GraphQL error',
  'CombinedError',
  'ApolloError',
  'fetch failed',
  'Cannot read properties',
  'Unhandled Runtime Error',
  'Application error',
];

test.describe('GraphQL Graceful Degradation', () => {
  test.describe('Public routes with GraphQL blocked', () => {
    for (const route of PUBLIC_GRAPHQL_ROUTES) {
      test(`${route} shows content when GraphQL is blocked`, async ({
        page,
      }) => {
        // Block all GraphQL requests
        await page.route('**/graphql', (r) => r.abort('connectionrefused'));

        await page.goto(route, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await page.waitForLoadState('networkidle').catch(() => {});

        const bodyText = await page.locator('body').innerText();

        // Page should have meaningful content (not blank)
        expect(bodyText.trim().length).toBeGreaterThan(20);

        // Should NOT show raw error messages
        for (const forbidden of FORBIDDEN_ERROR_TEXT) {
          expect(
            bodyText,
            `Found forbidden error text "${forbidden}" on ${route}`
          ).not.toContain(forbidden);
        }
      });
    }
  });

  test.describe('Compliance page sections', () => {
    test('/compliance has all anchor sections', async ({ page }) => {
      await page.goto('/compliance', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.waitForLoadState('networkidle').catch(() => {});

      const anchors = [
        'ferpa',
        'wcag',
        'scorm',
        'gdpr',
        'air-gapped',
        'security',
      ];
      for (const id of anchors) {
        const el = page.locator(`#${id}`);
        await expect(
          el,
          `Missing section anchor #${id} on /compliance`
        ).toBeAttached();
      }
    });

    test('/compliance is fully static (no GraphQL dependency)', async ({
      page,
    }) => {
      // Block GraphQL completely
      await page.route('**/graphql', (r) => r.abort('connectionrefused'));

      await page.goto('/compliance', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.waitForLoadState('networkidle').catch(() => {});

      // Should still show all section content
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain('FERPA');
      expect(bodyText).toContain('WCAG');
      expect(bodyText).toContain('SCORM');
      expect(bodyText).toContain('GDPR');
      expect(bodyText).toContain('Air-Gapped');
      expect(bodyText).toContain('Security');
    });
  });

  test.describe('Landing page resilience', () => {
    test('Landing page loads fully without GraphQL', async ({ page }) => {
      await page.route('**/graphql', (r) => r.abort('connectionrefused'));

      await page.goto('/landing', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.waitForLoadState('networkidle').catch(() => {});

      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain('EduSphere');
      expect(bodyText.trim().length).toBeGreaterThan(100);

      // No error messages
      for (const forbidden of FORBIDDEN_ERROR_TEXT) {
        expect(bodyText).not.toContain(forbidden);
      }
    });
  });
});
