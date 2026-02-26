import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const SCREENSHOTS = 'test-results/screenshots';

test.beforeAll(() => {
  mkdirSync(SCREENSHOTS, { recursive: true });
});

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5174';

async function loginAsSuperAdmin(page: any) {
  if (process.env.VITE_DEV_MODE !== 'false') {
    // DEV_MODE: auto-authenticated — navigate directly, no Keycloak login needed
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    return;
  }
  await page.goto(`${BASE_URL}/login`);
  // Wait for Keycloak init
  await page
    .waitForFunction(
      () => !document.body.innerText.includes('Initializing authentication'),
      { timeout: 15000 }
    )
    .catch(() => {});
  await page.waitForTimeout(500);

  const signInBtn = page.locator('button', { hasText: /sign in/i }).first();
  const btnVisible = await signInBtn
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (btnVisible) {
    await signInBtn.click();
    await page.waitForTimeout(2000);
    if (page.url().includes('localhost:8080')) {
      await page.fill('#username', 'super.admin@edusphere.dev').catch(() => {});
      await page.fill('#password', 'Admin1234').catch(() => {});
      await page
        .click('#kc-login')
        .catch(() => page.click('input[type="submit"]').catch(() => {}));
      await page.waitForURL(`${BASE_URL}/**`).catch(() => {});
      await page.waitForTimeout(2000);
    }
  }
}

test('SA-01 Content Viewer (Default landing)', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-01-content-viewer.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const navItems = await page.locator('nav a, nav button').allInnerTexts();
  console.log('Navigation items:', navItems);
  const h1 = await page
    .locator('h1, h2')
    .first()
    .innerText()
    .catch(() => 'no heading');
  console.log('Main heading:', h1);
});

test('SA-02 Dashboard', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-02-dashboard.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Dashboard content:', body.substring(0, 1200));
});

test('SA-03 Courses List', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/courses');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-03-courses.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Courses content:', body.substring(0, 1200));
});

test('SA-04 Course Create (Admin feature)', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/courses/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-04-course-create.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Course Create content:', body.substring(0, 1200));
});

test('SA-05 Knowledge Graph', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/graph');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-05-knowledge-graph.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Graph content:', body.substring(0, 1200));
});

test('SA-06 Annotations', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/annotations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-06-annotations.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Annotations content:', body.substring(0, 1200));
});

test('SA-07 Agents', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/agents');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-07-agents.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Agents content:', body.substring(0, 1200));
});

test('SA-08 Collaboration', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/collaboration');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-08-collaboration.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Collaboration content:', body.substring(0, 1200));
});

test('SA-09 Search', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/search');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-09-search.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Search content:', body.substring(0, 1200));
});

test('SA-10 Profile', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/profile');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOTS}/sa-10-profile.png`,
    fullPage: true,
  });
  console.log('URL:', page.url());
  const body = await page.locator('body').innerText();
  console.log('Profile content:', body.substring(0, 1200));
});

test('SA-11 User Menu - Check admin options', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('http://localhost:5174/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on user avatar/menu
  const userMenu = page
    .locator(
      '[aria-label*="user" i], [aria-label*="account" i], button:has-text("SA"), .avatar, .user-menu'
    )
    .first();
  const menuVisible = await userMenu.isVisible().catch(() => false);
  console.log('User menu visible:', menuVisible);

  if (menuVisible) {
    await userMenu.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `${SCREENSHOTS}/sa-11-user-menu.png`,
      fullPage: false,
    });
    const menuText = await page.locator('body').innerText();
    console.log('After menu click:', menuText.substring(0, 500));
  } else {
    await page.screenshot({
      path: `${SCREENSHOTS}/sa-11-dashboard-no-menu.png`,
      fullPage: false,
    });
    console.log('User menu button not found, checking all clickable elements');
    const btns = await page.locator('button').allInnerTexts();
    console.log('Buttons:', btns.join(' | '));
  }
});
