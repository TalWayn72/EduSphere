const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to /solutions/universities...');
  await page.goto('http://localhost:5173/solutions/universities', { waitUntil: 'networkidle' });
  await page.waitForSelector('footer', { timeout: 15000 });

  const footerLinks = await page.$$eval('footer a', links =>
    links.map(l => ({
      text: (l.textContent || '').trim(),
      attrHref: l.getAttribute('href'),
    }))
  );
  console.log('2. Footer links found:', footerLinks.length);

  const features = footerLinks.find(l => l.text === 'Features');
  const pricing = footerLinks.find(l => l.text === 'Pricing');
  const about = footerLinks.find(l => l.text === 'About');
  const privacy = footerLinks.find(l => l.text === 'Privacy');
  console.log('3. Features:', JSON.stringify(features));
  console.log('   Pricing:', JSON.stringify(pricing));
  console.log('   About:', JSON.stringify(about));
  console.log('   Privacy:', JSON.stringify(privacy));

  // Test SPA navigation with About
  console.log('4. Click About...');
  await page.click('text=About');
  await page.waitForURL('**/about', { timeout: 5000 }).catch(() => {});
  console.log('   URL:', page.url(), page.url().includes('/about') ? '✓' : '✗');

  // Test Features hash link — navigate back first
  console.log('5. Back to /solutions/universities...');
  await page.goto('http://localhost:5173/solutions/universities', { waitUntil: 'networkidle' });
  await page.waitForSelector('footer', { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  console.log('6. Click Features...');
  await page.click('footer >> text=Features');
  await page.waitForTimeout(2000);
  console.log('   URL:', page.url());
  const featuresNavOk = page.url().includes('#features');
  console.log('   Features nav:', featuresNavOk ? '✓' : '✗');

  // Screenshot
  await page.goto('http://localhost:5173/solutions/universities', { waitUntil: 'networkidle' });
  await page.waitForSelector('footer', { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/bug082-footer-fixed.png' });
  console.log('7. Screenshot saved');

  await browser.close();
  console.log('\n=== Visual test complete ===');
})().catch(e => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
