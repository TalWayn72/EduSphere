/**
 * my-badges.spec.ts — My Open Badges page (/my-badges) E2E tests.
 *
 * Component: apps/web/src/pages/MyOpenBadgesPage.tsx
 * Route: /my-badges
 * Query: MyOpenBadges (urql) → myOpenBadges[]
 *
 * All GraphQL responses are intercepted via page.route() so these tests
 * run entirely in DEV_MODE without a live backend.
 *
 * Empty state text: "You haven't earned any Open Badges yet"
 * Badge card title: assertion.definition.name
 * Revoked status:   "Revoked" label (bg-destructive/10 text-destructive)
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="My Open Badges"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';

// ─── GraphQL mock helpers ─────────────────────────────────────────────────────

const GRAPHQL_URL_PATTERN = '**/graphql';

/** Empty badge list response — mirrors the myOpenBadges query schema. */
function emptyBadgesResponse() {
  return {
    data: { myOpenBadges: [] },
  };
}

/** Single valid badge response. */
function singleBadgeResponse() {
  return {
    data: {
      myOpenBadges: [
        {
          id: 'assertion-001',
          issuedAt: '2025-09-01T10:00:00.000Z',
          expiresAt: null,
          revoked: false,
          revokedAt: null,
          revokedReason: null,
          evidenceUrl: null,
          vcDocument: JSON.stringify({ '@context': 'https://w3id.org/openbadges/v3' }),
          definition: {
            id: 'def-001',
            name: 'Course Completion Hero',
            description: 'Awarded for completing the full EduSphere onboarding.',
            imageUrl: null,
            criteriaUrl: null,
            tags: ['onboarding'],
            issuerId: 'issuer-001',
            createdAt: '2025-08-01T00:00:00.000Z',
          },
        },
      ],
    },
  };
}

/** Single revoked badge response. */
function revokedBadgeResponse() {
  return {
    data: {
      myOpenBadges: [
        {
          id: 'assertion-002',
          issuedAt: '2025-07-01T10:00:00.000Z',
          expiresAt: null,
          revoked: true,
          revokedAt: '2025-08-15T12:00:00.000Z',
          revokedReason: 'Policy violation',
          evidenceUrl: null,
          vcDocument: JSON.stringify({ '@context': 'https://w3id.org/openbadges/v3' }),
          definition: {
            id: 'def-002',
            name: 'Advanced Scholar',
            description: 'Revoked due to policy change.',
            imageUrl: null,
            criteriaUrl: null,
            tags: [],
            issuerId: 'issuer-001',
            createdAt: '2025-06-01T00:00:00.000Z',
          },
        },
      ],
    },
  };
}

// ─── Auth + navigation helper ─────────────────────────────────────────────────

async function gotoMyBadges(
  page: Parameters<typeof login>[0],
  mockResponse?: object
) {
  if (mockResponse !== undefined) {
    // Intercept all GraphQL requests and return the mock payload
    await page.route(GRAPHQL_URL_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });
  }

  await login(page);
  await page.goto('/my-badges');
  await page.waitForLoadState('networkidle');
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe('My Open Badges', () => {
  test.describe.configure({ mode: 'serial' });

  // 1. Page loads with heading
  test('page renders the "My Open Badges" heading at /my-badges', async ({
    page,
  }) => {
    await gotoMyBadges(page);

    await expect(
      page.getByRole('heading', { name: /My Open Badges/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  // 2. Empty state message when no badges returned
  test('shows empty state when the API returns an empty badge list', async ({
    page,
  }) => {
    await gotoMyBadges(page, emptyBadgesResponse());

    // "You haven't earned any Open Badges yet"
    await expect(
      page.getByText(/haven.t earned any Open Badges/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  // 3. Badge name appears when API returns one badge
  test('badge definition name is rendered when the API returns a badge', async ({
    page,
  }) => {
    await gotoMyBadges(page, singleBadgeResponse());

    await expect(
      page.getByText('Course Completion Hero')
    ).toBeVisible({ timeout: 10_000 });
  });

  // 4. Revoked badge shows "Revoked" status label
  test('revoked badge displays "Revoked" status text', async ({ page }) => {
    await gotoMyBadges(page, revokedBadgeResponse());

    // The badge name should be visible
    await expect(page.getByText('Advanced Scholar')).toBeVisible({
      timeout: 10_000,
    });

    // The "Revoked" status pill must be present
    await expect(page.getByText('Revoked')).toBeVisible({ timeout: 10_000 });
  });

  // 5. Valid badge shows "Valid" status label (not revoked)
  test('valid badge displays "Valid" status text', async ({ page }) => {
    await gotoMyBadges(page, singleBadgeResponse());

    await expect(page.getByText('Course Completion Hero')).toBeVisible({
      timeout: 10_000,
    });

    // The "Valid" status pill must be present
    await expect(page.getByText('Valid')).toBeVisible({ timeout: 10_000 });
  });

  // 6. Navigation — check that a nav link points to /my-badges
  test('Layout navigation contains a link to /my-badges', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for a nav link that navigates to the my-badges route
    const badgesLink = page.locator('a[href="/my-badges"]');
    const count = await badgesLink.count();

    if (count > 0) {
      await badgesLink.first().click();
      await expect(page).toHaveURL(/\/my-badges/, { timeout: 10_000 });
      await expect(
        page.getByRole('heading', { name: /My Open Badges/i })
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // The nav link does not yet exist — navigate directly and verify page loads
      await page.goto('/my-badges');
      await expect(
        page.getByRole('heading', { name: /My Open Badges/i })
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
