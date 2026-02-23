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

test('01 - Homepage loads and redirects correctly', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/01-homepage.png`, fullPage: false });
  console.log('URL after navigation:', page.url());
  console.log('Title:', await page.title());
  const body = await page.locator('body').innerText();
  console.log('Content:', body.substring(0, 600));
});

test('02 - Login page', async ({ page }) => {
  await page.goto('http://localhost:5174/login');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/02-login.png`, fullPage: false });
  console.log('Login URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Login page content:', bodyText.substring(0, 800));
});

test('03 - Dashboard page', async ({ page }) => {
  await page.goto('http://localhost:5174/dashboard');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/03-dashboard.png`, fullPage: true });
  console.log('Dashboard URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Dashboard content:', bodyText.substring(0, 1000));
});

test('04 - Courses page', async ({ page }) => {
  await page.goto('http://localhost:5174/courses');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/04-courses.png`, fullPage: true });
  console.log('Courses URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Courses content:', bodyText.substring(0, 800));
});

test('05 - Content Viewer page', async ({ page }) => {
  await page.goto('http://localhost:5174/learn/content-1');
  await waitForAppReady(page, 20000);
  await page.screenshot({ path: `${SCREENSHOTS}/05-content-viewer.png`, fullPage: true });
  console.log('ContentViewer URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('ContentViewer content:', bodyText.substring(0, 1000));
});

test('06 - Knowledge Graph page', async ({ page }) => {
  await page.goto('http://localhost:5174/graph');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/06-knowledge-graph.png`, fullPage: true });
  console.log('Graph URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Graph content:', bodyText.substring(0, 800));
});

test('07 - Agents page', async ({ page }) => {
  await page.goto('http://localhost:5174/agents');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/07-agents.png`, fullPage: true });
  console.log('Agents URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Agents content:', bodyText.substring(0, 800));
});

test('08 - Annotations page', async ({ page }) => {
  await page.goto('http://localhost:5174/annotations');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/08-annotations.png`, fullPage: true });
  console.log('Annotations URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Annotations content:', bodyText.substring(0, 800));
});

test('09 - Collaboration page', async ({ page }) => {
  await page.goto('http://localhost:5174/collaboration');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/09-collaboration.png`, fullPage: true });
  console.log('Collaboration URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Collaboration content:', bodyText.substring(0, 800));
});

test('10 - Search page', async ({ page }) => {
  await page.goto('http://localhost:5174/search');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/10-search.png`, fullPage: true });
  console.log('Search URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Search content:', bodyText.substring(0, 800));
});

test('11 - Profile page', async ({ page }) => {
  await page.goto('http://localhost:5174/profile');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/11-profile.png`, fullPage: true });
  console.log('Profile URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('Profile content:', bodyText.substring(0, 800));
});

test('12 - Courses New page', async ({ page }) => {
  await page.goto('http://localhost:5174/courses/new');
  await waitForAppReady(page);
  await page.screenshot({ path: `${SCREENSHOTS}/12-course-create.png`, fullPage: true });
  console.log('CourseCreate URL:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('CourseCreate content:', bodyText.substring(0, 800));
});

test('13 - Keycloak login flow as super admin', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await waitForAppReady(page, 8000);

  const currentUrl = page.url();
  console.log('After homepage redirect URL:', currentUrl);
  await page.screenshot({ path: `${SCREENSHOTS}/13a-before-login.png`, fullPage: false });

  if (currentUrl.includes('localhost:8080')) {
    console.log('Redirected to Keycloak login page');
    await page.fill('#username', 'super.admin@edusphere.dev').catch(() => {});
    await page.fill('#password', 'SuperAdmin123!').catch(() => {});
    await page.screenshot({ path: `${SCREENSHOTS}/13b-login-filled.png`, fullPage: false });
    await page.click('input[type="submit"]').catch(() => page.click('button[type="submit"]').catch(() => {}));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/13c-after-login.png`, fullPage: true });
    console.log('After login URL:', page.url());
    const body = await page.locator('body').innerText();
    console.log('After login content:', body.substring(0, 1000));
  } else {
    console.log('No Keycloak redirect - checking for login UI on page');
    const body = await page.locator('body').innerText();
    console.log('Page content:', body.substring(0, 600));
  }
});
