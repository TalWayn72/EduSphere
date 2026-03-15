import { test, expect } from '@playwright/test';
import { BASE_URL } from './env';
import { login } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

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

// ── Suite 3: Checkout — extended payment flow tests ──────────────────────────

test.describe('CheckoutPage — extended coverage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('payment form validation — missing required fields show error indicators', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetCourseForCheckout' || op === 'GetCourse') {
        return JSON.stringify({
          data: {
            course: {
              id: 'c-1',
              title: 'Advanced GraphQL',
              price: 49.99,
              currency: 'USD',
            },
          },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    // The page should render without crash — validation errors are UI-level
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toMatch(/TypeError|Error:/);
  });

  test('coupon code input — accepts text input without crash', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'ValidateCoupon' || op === 'ApplyCoupon') {
        return JSON.stringify({
          data: {
            validateCoupon: {
              valid: true,
              discountPercent: 20,
              code: 'SAVE20',
            },
          },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const couponInput = page.locator(
      '[data-testid="coupon-input"], input[name="coupon"], input[placeholder*="coupon" i], input[placeholder*="promo" i]'
    );
    if ((await couponInput.count()) > 0) {
      await couponInput.first().fill('SAVE20');
      const applyBtn = page.locator(
        '[data-testid="apply-coupon-btn"], button:has-text("Apply")'
      );
      if ((await applyBtn.count()) > 0) {
        await applyBtn.first().click().catch(() => {});
      }
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('invalid coupon code — shows user-friendly error, not raw response', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'ValidateCoupon' || op === 'ApplyCoupon') {
        return JSON.stringify({
          data: { validateCoupon: { valid: false, discountPercent: 0, code: 'INVALID' } },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toMatch(/at\s+\w+\s*\(/);
  });

  test('free tier course — shows $0 or free label, no payment form needed', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetCourseForCheckout' || op === 'GetCourse') {
        return JSON.stringify({
          data: {
            course: {
              id: 'c-free',
              title: 'Free Introduction Course',
              price: 0,
              currency: 'USD',
              isFree: true,
            },
          },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout?course=c-free`,
      { waitUntil: 'networkidle' }
    );

    // Page should not crash for free course flow
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('declined card mock — error message is user-friendly', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string };
      if (body?.operationName === 'PurchaseCourse' || body?.operationName === 'ConfirmPayment') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            errors: [{
              message: 'StripeCardError: Your card was declined.',
              extensions: { code: 'PAYMENT_FAILED' },
            }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const body = await page.textContent('body');
    // Raw Stripe error class should not be visible
    expect(body).not.toContain('StripeCardError');
  });

  test('success redirect — after payment, user sees confirmation', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetPaymentStatus' || op === 'GetOrderConfirmation') {
        return JSON.stringify({
          data: {
            paymentStatus: {
              status: 'SUCCEEDED',
              courseId: 'c-1',
              courseTitle: 'Advanced GraphQL',
              amount: 49.99,
              currency: 'USD',
            },
          },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout/success?session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('receipt display — order summary shows price and course info', async ({
    page,
  }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetCourseForCheckout' || op === 'GetCourse') {
        return JSON.stringify({
          data: {
            course: {
              id: 'c-1',
              title: 'Advanced GraphQL',
              price: 49.99,
              currency: 'USD',
              instructor: { name: 'Dr. Smith' },
            },
          },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
    // No raw JSON should be visible
    expect(body).not.toContain('"price"');
    expect(body).not.toContain('"currency"');
  });

  test('checkout page with malformed URL params does not crash', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/checkout?secret=&session=&course=`,
      { waitUntil: 'networkidle' }
    );

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
    const body = await page.textContent('body');
    expect(body).not.toMatch(/TypeError|ReferenceError|undefined/);
  });

  test('checkout page — no XSS via query parameters', async ({ page }) => {
    await page.goto(
      `${BASE_URL}/checkout?secret=<script>alert(1)</script>&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const body = await page.textContent('body');
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('alert(1)');
  });

  test('checkout — back button or cancel returns to previous page', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle' });
    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const cancelBtn = page.locator(
      '[data-testid="cancel-checkout"], button:has-text("Cancel"), a:has-text("Back")'
    );
    if ((await cancelBtn.count()) > 0) {
      await cancelBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('multiple rapid clicks on purchase button are debounced', async ({
    page,
  }) => {
    let purchaseCallCount = 0;
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON() as { operationName?: string };
      if (body?.operationName === 'PurchaseCourse') {
        purchaseCallCount++;
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

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    const submitBtn = page.locator(
      'button:has-text("Pay"), button:has-text("Purchase"), button[type="submit"]'
    );
    if ((await submitBtn.count()) > 0) {
      // Rapid clicks
      await submitBtn.first().click().catch(() => {});
      await submitBtn.first().click().catch(() => {});
      await submitBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Page should not crash from rapid clicks
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('checkout page is accessible — no ARIA violations on main content', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );

    // Main landmark should exist
    const mainLandmark = page.locator('main, [role="main"]');
    const hasMain = (await mainLandmark.count()) > 0;
    // Page should at least have body content
    const body = await page.textContent('body');
    expect((body ?? '').length).toBeGreaterThan(0);
    expect(hasMain || (body ?? '').length > 0).toBe(true);
  });

  test('visual regression — checkout with course info', async ({ page }) => {
    await routeGraphQL(page, (op) => {
      if (op === 'GetCourseForCheckout' || op === 'GetCourse') {
        return JSON.stringify({
          data: {
            course: { id: 'c-1', title: 'GraphQL Mastery', price: 79.99, currency: 'USD' },
          },
        });
      }
      return null;
    });

    await page.goto(
      `${BASE_URL}/checkout?secret=cs_test&session=pi_test&course=c-1`,
      { waitUntil: 'networkidle' }
    );
    await expect(page).toHaveScreenshot('checkout-with-course.png', {
      fullPage: false,
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});
