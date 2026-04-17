/**
 * BUG-097 — Detail check: what English text is on dashboard and progress pages
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';
const ENGLISH_WORDS = [
  'Save',
  'Cancel',
  'Edit',
  'Delete',
  'Submit',
  'Loading',
  'Search',
  'Back',
  'Close',
  'Create',
  'New',
  'Draft',
  'Publish',
  'Overview',
  'Settings',
  'Sign',
  'Start',
  'Complete',
  'About',
  'View',
  'Download',
  'Upload',
  'Activity',
  'Progress',
];

async function findEnglishText(page) {
  return page.evaluate((words) => {
    const results = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden')
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (!t) continue;
      for (const w of words) {
        const regex = new RegExp('\\b' + w + '\\b', 'i');
        if (regex.test(t)) {
          const el = node.parentElement;
          const tag = el.tagName;
          const cls =
            el.className && typeof el.className === 'string'
              ? el.className.substring(0, 80)
              : '';
          const id = el.id || '';
          results.push({ text: t.substring(0, 150), word: w, tag, cls, id });
        }
      }
    }
    return results;
  }, ENGLISH_WORDS);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'he-IL',
  });
  const page = await ctx.newPage();

  // Set locale
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });
  await page
    .reload({ waitUntil: 'networkidle', timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(3000);

  // Check dashboard
  console.log('=== DASHBOARD (/) - English text details ===\n');
  const dashResults = await findEnglishText(page);
  for (const r of dashResults) {
    console.log(`  [${r.word}] <${r.tag} class="${r.cls}" id="${r.id}">`);
    console.log(`    "${r.text}"`);
  }
  console.log(`\n  Total matches: ${dashResults.length}\n`);

  // Check progress
  await page.evaluate(() => {
    localStorage.setItem('edusphere_locale', 'he');
    localStorage.setItem('i18nextLng', 'he');
  });
  await page
    .goto(BASE + '/progress', { waitUntil: 'networkidle', timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  console.log('=== PROGRESS (/progress) - English text details ===\n');
  const progResults = await findEnglishText(page);
  for (const r of progResults) {
    console.log(`  [${r.word}] <${r.tag} class="${r.cls}" id="${r.id}">`);
    console.log(`    "${r.text}"`);
  }
  console.log(`\n  Total matches: ${progResults.length}\n`);

  // Also check: are dashboard and progress showing the same page (fallback/404)?
  const dashUrl = await page.evaluate(() => window.location.href);
  console.log(`Current URL after /progress nav: ${dashUrl}`);

  await browser.close();
})();
