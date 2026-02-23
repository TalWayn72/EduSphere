import { test } from '@playwright/test';
import { mkdirSync } from 'fs';

const SCREENSHOTS = 'test-results/screenshots';

test.beforeAll(() => {
  mkdirSync(SCREENSHOTS, { recursive: true });
});

async function waitForAppReady(page: any, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return !text.includes('Initializing authentication');
    },
    { timeout }
  ).catch(() => {});
  await page.waitForTimeout(1000);
}

test('Super Admin Full Login Flow', async ({ page }) => {
  // Step 1: Go to login page
  await page.goto('http://localhost:5174/login');
  await waitForAppReady(page);
  console.log('Step 1 - Login page URL:', page.url());
  await page.screenshot({ path: `${SCREENSHOTS}/sa-01-login-page.png`, fullPage: false });
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
    await page.screenshot({ path: `${SCREENSHOTS}/sa-02-after-signin-click.png`, fullPage: false });
    
    const afterClickBody = await page.locator('body').innerText();
    console.log('After click content:', afterClickBody.substring(0, 400));

    // Step 3: If we're on Keycloak login page
    if (page.url().includes('localhost:8080')) {
      console.log('On Keycloak login page!');
      
      // Fill credentials
      await page.fill('#username', 'super.admin@edusphere.dev').catch(() => 
        page.fill('[name="username"]', 'super.admin@edusphere.dev').catch(() => {})
      );
      await page.waitForTimeout(500);
      await page.fill('#password', 'SuperAdmin123!').catch(() =>
        page.fill('[name="password"]', 'SuperAdmin123!').catch(() => {})
      );
      await page.screenshot({ path: `${SCREENSHOTS}/sa-03-keycloak-filled.png`, fullPage: false });
      
      // Submit
      await page.click('#kc-login, input[type="submit"], button[type="submit"]').catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(4000);
      
      console.log('After Keycloak submit URL:', page.url());
      await page.screenshot({ path: `${SCREENSHOTS}/sa-04-after-keycloak-submit.png`, fullPage: true });
      const postLoginBody = await page.locator('body').innerText();
      console.log('After Keycloak login content:', postLoginBody.substring(0, 1000));
    }
  }
});
