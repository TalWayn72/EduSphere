const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Try 5174 first, fall back to 5173
  let BASE = 'http://localhost:5174';
  try {
    const resp = await page.goto(BASE, { timeout: 5000 });
    if (!resp || resp.status() >= 400) throw new Error('bad status');
  } catch {
    console.log('Port 5174 not available, falling back to 5173');
    BASE = 'http://localhost:5173';
  }

  const SCREENSHOT_DIR = 'docs/screenshots';

  // Set Hebrew locale
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });

  const results = [];

  // Test pages
  const pages = [
    { name: 'landing', url: '/' },
    { name: 'login', url: '/login' },
    { name: 'features', url: '/features' },
    { name: 'about', url: '/about' },
    { name: 'pricing', url: '/pricing' },
    { name: 'faq', url: '/faq' },
    { name: 'terms', url: '/terms' },
    { name: 'privacy', url: '/privacy' },
    { name: 'accessibility', url: '/accessibility' },
    { name: 'careers', url: '/careers' },
    { name: 'solutions', url: '/solutions' },
    { name: 'blog', url: '/blog' },
  ];

  for (const p of pages) {
    try {
      await page.goto(`${BASE}${p.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Check dir and lang attributes
      const htmlDir = await page.getAttribute('html', 'dir');
      const htmlLang = await page.getAttribute('html', 'lang');

      // Get visible text and check for English-only content
      const bodyText = await page.evaluate(() => document.body.innerText);

      // Count Hebrew characters vs Latin characters
      const hebrewChars = (bodyText.match(/[\u0590-\u05FF]/g) || []).length;
      const latinChars = (bodyText.match(/[a-zA-Z]/g) || []).length;
      const hebrewRatio = hebrewChars / (hebrewChars + latinChars + 1);

      // Check for common hardcoded English strings that should be translated
      const englishStrings = [
        'Sign In', 'Log In', 'Features', 'Pricing', 'About',
        'Request Demo', 'Start Free', 'Learn More',
        'Dashboard', 'Settings', 'Profile',
        'No credit card', 'Get Started'
      ];

      const foundEnglish = englishStrings.filter(s => bodyText.includes(s));

      const status = hebrewRatio > 0.3 ? 'PASS' : (hebrewRatio > 0.1 ? 'PARTIAL' : 'FAIL');

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/bug097-r8-${p.name}.png`,
        fullPage: false
      });

      results.push({
        page: p.name,
        url: p.url,
        dir: htmlDir,
        lang: htmlLang,
        hebrewChars,
        latinChars,
        hebrewRatio: (hebrewRatio * 100).toFixed(1) + '%',
        foundEnglish: foundEnglish.length > 0 ? foundEnglish.join(', ') : 'none',
        status
      });

      console.log(`${status} | ${p.name.padEnd(15)} | dir=${htmlDir} lang=${htmlLang} | hebrew=${(hebrewRatio*100).toFixed(1).padStart(5)}% (${hebrewChars}h/${latinChars}l) | english=[${foundEnglish.join(', ')}]`);
    } catch (err) {
      results.push({ page: p.name, status: 'ERROR', error: err.message });
      console.log(`ERROR | ${p.name.padEnd(15)} | ${err.message}`);
    }
  }

  console.log('\n=== SUMMARY ===');
  const pass = results.filter(r => r.status === 'PASS').length;
  const partial = results.filter(r => r.status === 'PARTIAL').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const error = results.filter(r => r.status === 'ERROR').length;
  console.log(`PASS: ${pass} | PARTIAL: ${partial} | FAIL: ${fail} | ERROR: ${error}`);
  console.log(`Total pages tested: ${results.length}`);

  // Print detailed table for failures
  const failures = results.filter(r => r.status === 'FAIL' || r.status === 'PARTIAL');
  if (failures.length > 0) {
    console.log('\n=== PAGES NEEDING ATTENTION ===');
    for (const f of failures) {
      console.log(`  ${f.page}: ${f.hebrewRatio} hebrew, english=[${f.foundEnglish}]`);
    }
  }

  await browser.close();
  process.exit(fail + error > 0 ? 1 : 0);
})();
