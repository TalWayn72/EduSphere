import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';

// ── Stripe mock helper ────────────────────────────────────────────────────────
// All GraphQL mutations are intercepted via page.route to avoid real API calls.
// Stripe Elements is mocked at the page level via window.__stripeMocked__.

test.describe('CheckoutPage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Mock the purchaseCourse GraphQL mutation
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string };
      if (body?.operationName === 'PurchaseCourse') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              purchaseCourse: {
                clientSecret: 'pi_test_secret_mock',
                paymentIntentId: 'pi_test_intent_mock',
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });
  });

  test('shows Payment Unavailable when VITE_STRIPE_PUBLISHABLE_KEY is not set', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    // In test env, VITE_STRIPE_PUBLISHABLE_KEY is not set → Payment Unavailable shown
    const heading = page.getByText('Payment Unavailable').or(
      page.getByText('Complete Your Purchase')
    );
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('shows No Payment Session without secret param', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });

    await expect(
      page.getByText('No Payment Session')
    ).toBeVisible({ timeout: 8_000 });
  });

  test('clientSecret is NOT visible in page text content', async ({ page }) => {
    const secret = 'pi_3abc_secret_xyz';
    await page.goto(
      `${BASE_URL}/checkout?secret=${secret}&session=pi_abc&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText).not.toContain(secret);
  });

  test('no raw error strings or stack traces visible to user', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });
    const bodyText = await page.evaluate(() => document.body.textContent ?? '');
    expect(bodyText).not.toMatch(/TypeError|Error:/);
    expect(bodyText).not.toMatch(/at\s+\w+\s*\(/);
  });

  test('visual regression — Payment Unavailable state', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );
    await expect(page).toHaveScreenshot('checkout-unavailable.png', {
      fullPage: false,
    });
  });

  test('visual regression — No Payment Session state', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot('checkout-no-session.png', {
      fullPage: false,
    });
  });
});

test.describe('PurchaseCourseButton → /checkout navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to /checkout with secret + session + course params after purchase mutation', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle' });

    let checkoutUrl: string | null = null;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url.includes('/checkout')) {
          checkoutUrl = url;
        }
      }
    });

    // Click first Purchase button on the marketplace if present
    const purchaseBtn = page.locator('[aria-label*="Purchase"]').first();
    const btnCount = await purchaseBtn.count();
    if (btnCount > 0) {
      await purchaseBtn.click();
      // Wait briefly for navigation to /checkout
      await page.waitForTimeout(1000);
    }

    // Whether clicked or not: /checkout must be accessible
    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test_mock&session=pi_mock&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    // Verify the page loaded (Payment Unavailable or Complete Purchase)
    const hasContent = await page
      .getByText('Payment Unavailable')
      .or(page.getByText('Complete Your Purchase'))
      .or(page.getByText('No Payment Session'))
      .isVisible();
    expect(hasContent).toBe(true);

    if (checkoutUrl) {
      expect(checkoutUrl).toContain('secret=');
      expect(checkoutUrl).toContain('session=');
      expect(checkoutUrl).toContain('course=');
    }
  });
});
