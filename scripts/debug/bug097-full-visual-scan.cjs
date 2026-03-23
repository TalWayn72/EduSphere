/**
 * BUG-097 Visual QA — Full Hebrew Translation Scan
 * Navigates every major page, checks RTL/lang, finds untranslated English words.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5174';
const KC = 'http://localhost:8080';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

const PAGES = [
  { name: 'dashboard', path: '/' },
  { name: 'courses', path: '/courses' },
  { name: 'courses-discovery', path: '/courses/discovery' },
  { name: 'social', path: '/social' },
  { name: 'gamification', path: '/gamification' },
  { name: 'progress', path: '/progress' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'settings', path: '/settings' },
  { name: 'knowledge-graph', path: '/knowledge-graph' },
  { name: 'discussions', path: '/discussions' },
  { name: 'peer-matching', path: '/peer-matching' },
  { name: 'certificates', path: '/certificates' },
  { name: 'skill-tree', path: '/skill-tree' },
  { name: 'checkout', path: '/checkout' },
  { name: 'onboarding', path: '/onboarding' },
];

// Common English UI words that should be translated
const ENGLISH_WORDS = [
  'Save', 'Cancel', 'Edit', 'Delete', 'Submit', 'Loading',
  'Search', 'Back', 'Close', 'Create', 'New', 'Draft',
  'Publish', 'Overview', 'Settings', 'Dashboard', 'Courses',
  'Profile', 'Logout', 'Login', 'Sign', 'Welcome', 'Home',
  'Next', 'Previous', 'Continue', 'Start', 'Finish', 'Complete',
  'Error', 'Success', 'Warning', 'Info', 'Help', 'About',
  'Filter', 'Sort', 'View', 'Download', 'Upload', 'Share',
  'Notifications', 'Messages', 'Activity', 'Progress',
  'Leaderboard', 'Achievements', 'Badges', 'Points',
  'Discussions', 'Comments', 'Reply', 'Post',
];

async function login(page) {
  console.log('[LOGIN] Navigating to app to trigger Keycloak redirect...');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Check if we're on Keycloak login page
  const url = page.url();
  if (url.includes('8080') || url.includes('keycloak')) {
    console.log('[LOGIN] On Keycloak login page, filling credentials...');
    await page.fill('#username', 'student@example.com');
    await page.fill('#password', 'Student123!');
    await page.click('#kc-login');
    await page.waitForTimeout(3000);
    console.log('[LOGIN] Login submitted, current URL:', page.url());
  } else {
    console.log('[LOGIN] Not redirected to Keycloak. URL:', url);
    // Try clicking a login button if visible
    const loginBtn = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Sign"), a:has-text("Sign")').first();
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(3000);
      if (page.url().includes('8080')) {
        await page.fill('#username', 'student@example.com');
        await page.fill('#password', 'Student123!');
        await page.click('#kc-login');
        await page.waitForTimeout(3000);
      }
    }
  }
}

async function setHebrewLocale(page) {
  await page.evaluate(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });
}

async function checkPage(page, pageInfo) {
  const fullUrl = BASE + pageInfo.path;
  console.log(`\n[SCAN] Navigating to ${pageInfo.name} (${fullUrl})...`);

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (e2) {
      console.log(`[SCAN] Failed to load ${pageInfo.name}: ${e2.message}`);
      return { page: pageInfo.name, rtl: 'N/A', lang: 'N/A', englishWords: ['PAGE_LOAD_FAILED'], status: 'SKIP' };
    }
  }

  await page.waitForTimeout(2000);

  // Check if redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('8080') || currentUrl.includes('keycloak')) {
    console.log(`[SCAN] ${pageInfo.name} redirected to login`);
    return { page: pageInfo.name, rtl: 'N/A', lang: 'N/A', englishWords: ['REDIRECT_TO_LOGIN'], status: 'SKIP' };
  }

  // Take screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `bug097-scan-${pageInfo.name}-he.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[SCAN] Screenshot saved: ${screenshotPath}`);

  // Check RTL and lang
  const { dir, lang } = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
  }));

  const isRtl = dir === 'rtl';
  const isHe = lang === 'he';

  // Get visible text content
  const visibleText = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t) texts.push(t);
    }
    return texts.join(' ');
  });

  // Find English words (case-insensitive word boundary match)
  const foundEnglish = [];
  for (const word of ENGLISH_WORDS) {
    // Match as whole word (surrounded by spaces, punctuation, or string boundaries)
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(visibleText)) {
      foundEnglish.push(word);
    }
  }

  const status = (isRtl && isHe && foundEnglish.length === 0) ? 'PASS' :
                 (foundEnglish.length > 5) ? 'FAIL' :
                 (foundEnglish.length > 0) ? 'WARN' :
                 (!isRtl || !isHe) ? 'FAIL' : 'PASS';

  console.log(`[SCAN] ${pageInfo.name}: RTL=${isRtl}, lang=${lang}, English words: [${foundEnglish.join(', ')}] => ${status}`);

  return {
    page: pageInfo.name,
    rtl: isRtl ? 'YES' : 'NO',
    lang: lang || 'none',
    englishWords: foundEnglish,
    status
  };
}

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('=== BUG-097 Full Hebrew Visual Scan ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'he-IL',
  });
  const page = await context.newPage();

  // Set Hebrew locale before anything
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await setHebrewLocale(page);

  // Login
  await login(page);

  // Re-set locale after login (in case it was cleared)
  await setHebrewLocale(page);
  await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Scan all pages
  const results = [];
  for (const pageInfo of PAGES) {
    // Re-set locale before each page
    await setHebrewLocale(page);
    const result = await checkPage(page, pageInfo);
    results.push(result);
  }

  await browser.close();

  // Print summary table
  console.log('\n\n========================================');
  console.log('  BUG-097 HEBREW SCAN RESULTS SUMMARY');
  console.log('========================================\n');

  const colPage = 22;
  const colRtl = 6;
  const colLang = 6;
  const colWords = 50;
  const colStatus = 8;

  const header = [
    'Page'.padEnd(colPage),
    'RTL'.padEnd(colRtl),
    'Lang'.padEnd(colLang),
    'English Words Found'.padEnd(colWords),
    'Status'.padEnd(colStatus),
  ].join(' | ');

  const separator = '-'.repeat(header.length);

  console.log(header);
  console.log(separator);

  let passCount = 0, failCount = 0, warnCount = 0, skipCount = 0;

  for (const r of results) {
    const wordsStr = r.englishWords.length > 0 ? r.englishWords.join(', ') : '(none)';
    const truncWords = wordsStr.length > colWords ? wordsStr.substring(0, colWords - 3) + '...' : wordsStr;
    const row = [
      r.page.padEnd(colPage),
      r.rtl.padEnd(colRtl),
      r.lang.padEnd(colLang),
      truncWords.padEnd(colWords),
      r.status.padEnd(colStatus),
    ].join(' | ');
    console.log(row);

    if (r.status === 'PASS') passCount++;
    else if (r.status === 'FAIL') failCount++;
    else if (r.status === 'WARN') warnCount++;
    else skipCount++;
  }

  console.log(separator);
  console.log(`\nTotals: ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL, ${skipCount} SKIP`);
  console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}/bug097-scan-*-he.png`);

  // Detailed findings for WARN/FAIL pages
  const issues = results.filter(r => r.status === 'WARN' || r.status === 'FAIL');
  if (issues.length > 0) {
    console.log('\n\n========================================');
    console.log('  DETAILED FINDINGS (WARN + FAIL)');
    console.log('========================================\n');
    for (const r of issues) {
      console.log(`--- ${r.page} [${r.status}] ---`);
      console.log(`  RTL: ${r.rtl}, Lang: ${r.lang}`);
      console.log(`  English words: ${r.englishWords.join(', ')}`);
      console.log();
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
})();
