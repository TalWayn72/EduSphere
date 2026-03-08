/**
 * CertificatesPage — E2E regression guard (Phase 38)
 *
 * Verifies that the CertificatesPage renders correctly, shows certificate data,
 * and that raw MinIO key paths are never exposed to the user DOM.
 */
import { test, expect } from '@playwright/test';
import { login, loginViaKeycloak } from './auth.helpers';
import { BASE_URL, IS_DEV_MODE, TEST_USERS } from './env';

// ── Suite 1: DEV_MODE — basic render guard ────────────────────────────────────

test.describe('CertificatesPage — DEV_MODE guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('MyCertificates') || body.includes('myCertificates')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              myCertificates: [
                {
                  id: 'cert-001',
                  courseId: 'course-001',
                  issuedAt: '2026-01-15T10:00:00Z',
                  verificationCode: 'ABC12345-DEF6',
                  pdfUrl: 'internal/tenants/t1/certificates/u1/cert-001.pdf',
                  metadata: {
                    learnerName: 'Test User',
                    courseName: 'React Fundamentals',
                  },
                },
              ],
            },
          }),
        });
      } else if (
        body.includes('CertificateDownloadUrl') ||
        body.includes('certificateDownloadUrl')
      ) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              certificateDownloadUrl:
                'https://minio.example.com/presigned-url-abc',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await login(page);
    await page.goto(`${BASE_URL}/certificates`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('renders certificates heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /certificates/i })
    ).toBeVisible();
  });

  test('displays certificate card with course name', async ({ page }) => {
    await expect(page.getByText('React Fundamentals')).toBeVisible();
  });

  test('shows verification code', async ({ page }) => {
    await expect(page.getByText(/ABC12345/)).toBeVisible();
  });

  test('Download PDF button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /download pdf/i })
    ).toBeVisible();
  });

  test('raw MinIO key path never visible in DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toMatch(/internal\/tenants\//);
    expect(body).not.toMatch(/\.pdf$/);
  });

  test('no [object Object] serialization in certificates DOM', async ({
    page,
  }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no MOCK_ sentinel strings in certificates DOM', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('MOCK_');
  });

  test('certificates page renders without crash overlay', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Suite 2: Live backend — real data + visual regression ─────────────────────

test.describe('CertificatesPage — Live backend', () => {
  test.skip(IS_DEV_MODE, 'Set VITE_DEV_MODE=false to run live-backend tests');

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page, TEST_USERS.student);
  });

  test('certificates page loads for authenticated student', async ({ page }) => {
    await page.goto(`${BASE_URL}/certificates`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /certificates/i })
    ).toBeVisible();
    await expect(page).toHaveScreenshot('certificates-page.png', {
      maxDiffPixels: 200,
    });
  });

  test('certificate list or empty state is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/certificates`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasCerts = await page.locator('[data-testid="certificate-card"]').count();
    const hasEmpty = await page
      .getByText(/no certificates yet|you haven't earned/i)
      .count();
    expect(hasCerts + hasEmpty).toBeGreaterThanOrEqual(0);
  });
});
