// BUG-039 visual verification script
// Uses student@example.com login via Keycloak since VITE_DEV_MODE=false
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Step 1: Navigate to courses — should redirect to Keycloak login
  await page.goto('http://localhost:5175/courses');
  await page.waitForLoadState('domcontentloaded');
  const currentUrl = page.url();
  console.log('Current URL after /courses redirect:', currentUrl);

  // Step 2: Fill in Keycloak login form
  if (currentUrl.includes('localhost:8080')) {
    await page.fill('#username', 'student@example.com');
    await page.fill('#password', 'Student123!');
    await page.click('[type="submit"]');
    await page.waitForURL('http://localhost:5175/**', { timeout: 15000 });
    console.log('✅ Keycloak login OK, redirected to:', page.url());
  } else {
    console.log('Already on app (unexpected), continuing...');
  }

  // Step 3: Navigate to /courses — gateway is running, should see courses, NO banner
  await page.goto('http://localhost:5175/courses');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const banner1 = page.locator('[data-testid="offline-banner"]');
  const hasBannerUp = (await banner1.count()) > 0;
  console.log('Gateway UP — offline-banner visible:', hasBannerUp, '(expected: false)', hasBannerUp ? '❌ FAIL' : '✅ OK');
  await page.screenshot({ path: 'scan-courses-bug039-gateway-up.png' });
  console.log('Screenshot: scan-courses-bug039-gateway-up.png');

  // Step 4: Block GraphQL — should show clean banner
  await page.route('**/graphql', route => route.abort('failed'));
  await page.goto('http://localhost:5175/courses');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  const banner2 = page.locator('[data-testid="offline-banner"]');
  const hasBannerDown = (await banner2.count()) > 0;
  console.log('Gateway BLOCKED — offline-banner visible:', hasBannerDown, '(expected: true)', hasBannerDown ? '✅ OK' : '❌ FAIL (DEV_MODE may show mock data only)');

  if (hasBannerDown) {
    const bannerText = await banner2.textContent();
    console.log('Banner text:', JSON.stringify(bannerText));
    const hasRawUrql = bannerText.includes('[GraphQL]') || bannerText.includes('[Network]') || bannerText.includes('Unexpected error');
    const hasCleanMsg = bannerText.includes('Server unavailable') || bannerText.includes('שרת לא נגיש') || bannerText.includes('unavailable');
    const hasRetry = (await page.locator('[data-testid="offline-banner-retry"]').count()) > 0;
    console.log('Banner clean (no raw urql strings):', !hasRawUrql, hasRawUrql ? '❌ FAIL' : '✅ OK');
    console.log('Banner has clean message:', hasCleanMsg, hasCleanMsg ? '✅ OK' : '❌ FAIL');
    console.log('Retry button present:', hasRetry, hasRetry ? '✅ OK' : '❌ FAIL');
  } else {
    console.log('NOTE: No banner shown — likely showing MOCK_COURSES_FALLBACK (only shown for students in DEV_MODE)');
    // Check if mock courses are shown (page still functional)
    const cards = await page.locator('h3').count();
    console.log('Course cards visible:', cards, cards > 0 ? '✅ Page functional' : '⚠️  No cards');
  }
  await page.screenshot({ path: 'scan-courses-bug039-offline-banner.png' });
  console.log('Screenshot: scan-courses-bug039-offline-banner.png');

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
