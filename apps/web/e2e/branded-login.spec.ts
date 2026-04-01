/**
 * branded-login.spec.ts — Branded Login Page E2E Tests
 *
 * Route: /org/:slug/login (public — no authentication required)
 *
 * Covers the BrandedLoginPage component:
 *   - Renders org branding (logo, name, welcome message, colors)
 *   - SSO button rendering when ssoProviders are present
 *   - "Org not found" state when slug is invalid
 *   - Visual regression screenshots
 *
 * All GraphQL calls are intercepted via page.route() — no live backend needed.
 *
 * Run:
 *   pnpm --filter @edusphere/web exec playwright test e2e/branded-login.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { routeGraphQL } from './graphql-mock.helpers';

const BRANDED_LOGIN_ROUTE = '/org/acme-corp/login';

const MOCK_BRANDED_LOGIN_DATA = {
  orgName: 'AcmeCorp',
  logoUrl: 'https://via.placeholder.com/200x60?text=AcmeCorp',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  welcomeMessage: 'Welcome to the AcmeCorp Learning Platform!',
  ssoProviders: [] as Array<{
    id: string;
    name: string;
    type: string;
    iconUrl: string | null;
  }>,
};

const MOCK_BRANDED_LOGIN_DATA_WITH_SSO = {
  ...MOCK_BRANDED_LOGIN_DATA,
  ssoProviders: [
    {
      id: 'google',
      name: 'Google',
      type: 'oidc',
      iconUrl: 'https://via.placeholder.com/16?text=G',
    },
    { id: 'azure-ad', name: 'Azure AD', type: 'saml', iconUrl: null },
  ],
};

async function mockBrandedLoginSuccess(
  page: import('@playwright/test').Page,
  data = MOCK_BRANDED_LOGIN_DATA
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (
      op === 'BrandedLoginData' ||
      op.toLowerCase().includes('brandedlogin')
    ) {
      return JSON.stringify({ data: { brandedLoginData: data } });
    }
    return null;
  });
}

async function mockBrandedLoginNotFound(
  page: import('@playwright/test').Page
): Promise<void> {
  await routeGraphQL(page, (op) => {
    if (
      op === 'BrandedLoginData' ||
      op.toLowerCase().includes('brandedlogin')
    ) {
      return JSON.stringify({ data: { brandedLoginData: null } });
    }
    return null;
  });
}

test.describe('Branded Login Page — /org/:slug/login', () => {
  test('renders org name and welcome message', async ({ page }) => {
    await mockBrandedLoginSuccess(page);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    await expect(page.getByText('AcmeCorp')).toBeVisible();
    await expect(
      page.getByText('Welcome to the AcmeCorp Learning Platform!')
    ).toBeVisible();
  });

  test('renders org logo', async ({ page }) => {
    await mockBrandedLoginSuccess(page);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    const logo = page.getByTestId('branded-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', /placeholder/);
  });

  test('renders Sign In button', async ({ page }) => {
    await mockBrandedLoginSuccess(page);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    const signInBtn = page.getByTestId('branded-login-btn');
    await expect(signInBtn).toBeVisible();
    await expect(signInBtn).toBeEnabled();
  });

  test('shows org not found for invalid slug', async ({ page }) => {
    await mockBrandedLoginNotFound(page);
    await page.goto(`${BASE_URL}/org/nonexistent/login`);
    await expect(page.getByText('Organization not found')).toBeVisible();
  });

  test('renders SSO buttons when providers are configured', async ({
    page,
  }) => {
    await mockBrandedLoginSuccess(page, MOCK_BRANDED_LOGIN_DATA_WITH_SSO);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    await expect(page.getByTestId('sso-btn-google')).toBeVisible();
    await expect(page.getByTestId('sso-btn-azure-ad')).toBeVisible();
  });

  test('does not render SSO section when no providers', async ({ page }) => {
    await mockBrandedLoginSuccess(page);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    await expect(page.getByTestId('branded-login-btn')).toBeVisible();
    // No SSO divider should appear
    await expect(page.getByText('or continue with')).not.toBeVisible();
  });

  test('visual regression — branded login page', async ({ page }) => {
    await mockBrandedLoginSuccess(page);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    await expect(page.getByTestId('branded-login-page')).toBeVisible();
    await expect(page).toHaveScreenshot('branded-login-page.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('visual regression — branded login with SSO', async ({ page }) => {
    await mockBrandedLoginSuccess(page, MOCK_BRANDED_LOGIN_DATA_WITH_SSO);
    await page.goto(`${BASE_URL}${BRANDED_LOGIN_ROUTE}`);
    await expect(page.getByTestId('branded-login-page')).toBeVisible();
    await expect(page).toHaveScreenshot('branded-login-with-sso.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
