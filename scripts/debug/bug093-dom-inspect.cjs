/**
 * BUG-093 DOM Inspector: Captures exact button text + block progress during generation.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Force English locale for clear debugging
  await page.addInitScript(() => {
    localStorage.setItem('edusphere_locale', 'en');
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
  });

  // Login via Keycloak (VITE_DEV_MODE=false)
  console.log('[1] Login via Keycloak...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check if already redirected to Keycloak
  let url = page.url();
  if (url.includes('keycloak') || url.includes('/realms/')) {
    console.log('[1] Already at Keycloak:', url);
  } else {
    // Click "Sign In with Keycloak" button
    const signInBtn = page.locator('button').filter({ hasText: /sign in|keycloak|התחבר/i }).first();
    const hasSI = await signInBtn.isVisible({ timeout: 10000 }).catch(() => false);
    if (hasSI) {
      console.log('[1] Clicking Sign In with Keycloak...');
      await signInBtn.click();
      await page.waitForURL(/realms/, { timeout: 20000 });
    }
  }

  // Fill Keycloak form
  await page.locator('#username').waitFor({ timeout: 10000 });
  await page.fill('#username', 'instructor@example.com');
  await page.fill('#password', 'Instructor123!');
  await page.click('#kc-login');
  await page.waitForURL(/localhost:5173/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  console.log('[1] Logged in at:', page.url());

  // Enable AI consent
  console.log('[2] Settings → AI consent...');
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const aiToggle = page.locator('#setting-ai-consent [role="switch"]');
  const toggleVisible = await aiToggle.isVisible({ timeout: 10000 }).catch(() => false);
  if (toggleVisible) {
    const state = await aiToggle.getAttribute('aria-checked');
    if (state === 'false') {
      await aiToggle.click();
      await page.waitForTimeout(2000);
    }
    console.log('[2] AI consent:', await aiToggle.getAttribute('aria-checked'));
  }

  // Navigate to courses/new
  console.log('[3] /courses/new...');
  await page.goto(`${BASE}/courses/new`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Open AI Builder
  console.log('[4] Open AI Builder...');
  const launchBtn = page.locator('button, a').filter({
    hasText: /Launch AI|הפעל.*AI|AI.*Builder|בונה AI|יוצר קורסים/i
  }).first();
  await launchBtn.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('[role="dialog"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  // Fill prompt
  const textarea = modal.locator('textarea').first();
  await textarea.fill('Introduction to basic mathematics for beginners');

  // Find generate button and capture its HTML BEFORE clicking
  const generateBtn = modal.locator('button').filter({
    hasText: /Generate|צור קורס|Generate Course/i
  }).first();
  const btnHtmlBefore = await generateBtn.innerHTML();
  console.log('[5] Button HTML BEFORE click:', btnHtmlBefore);

  // Click generate
  await generateBtn.click();
  console.log('[5] Generate clicked');

  // Wait 2 seconds then inspect DOM
  await page.waitForTimeout(2000);

  // Capture ALL buttons in modal during generation
  const allButtons = modal.locator('button');
  const buttonCount = await allButtons.count();
  console.log('\n=== ALL BUTTONS IN MODAL (during generation) ===');
  console.log('Count:', buttonCount);
  for (let i = 0; i < buttonCount; i++) {
    const btn = allButtons.nth(i);
    const text = await btn.textContent().catch(() => '?');
    const disabled = await btn.isDisabled().catch(() => '?');
    const html = await btn.innerHTML().catch(() => '?');
    console.log(`  [${i}] disabled=${disabled} text="${text}"`);
    console.log(`        html: ${html.slice(0, 300)}`);
  }

  // Check ALL role="status" and aria-live elements
  const statusElements = modal.locator('[role="status"], [aria-live]');
  const statusCount = await statusElements.count();
  console.log('\n=== role="status" / aria-live ELEMENTS ===');
  console.log('Count:', statusCount);
  for (let i = 0; i < statusCount; i++) {
    const el = statusElements.nth(i);
    const text = await el.textContent().catch(() => '?');
    const tag = await el.evaluate(e => e.tagName).catch(() => '?');
    console.log(`  [${i}] <${tag}> "${text}"`);
  }

  // Check spinners
  const spinners = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return [];
    const all = modal.querySelectorAll('*');
    const result = [];
    for (const el of all) {
      const cls = el.className;
      if (typeof cls === 'string' && (cls.includes('animate-spin') || cls.includes('spin'))) {
        result.push({ tag: el.tagName, cls, text: el.textContent?.slice(0, 100) });
      }
    }
    return result;
  });
  console.log('\n=== SPINNERS ===');
  console.log(JSON.stringify(spinners, null, 2));

  // Dump the entire modal HTML (first 3000 chars)
  const modalHtml = await modal.innerHTML();
  console.log('\n=== MODAL HTML (first 3000) ===');
  console.log(modalHtml.slice(0, 3000));

  // Screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug093-dom-inspect.png') });

  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bug093-dom-inspect-7s.png') });

  console.log('\n[DONE]');
  await browser.close();
  process.exit(0);
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
