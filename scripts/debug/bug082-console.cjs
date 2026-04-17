const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const errors = [];
  p.on('console', (msg) => errors.push(msg.type() + ': ' + msg.text()));
  p.on('pageerror', (err) => errors.push('PAGE_ERROR: ' + err.message));

  await p.goto('http://localhost:5173/', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await p.waitForTimeout(8000);

  const bodyHTML = await p.evaluate(() =>
    document.body.innerHTML.substring(0, 1000)
  );
  console.log('Body HTML:', bodyHTML);
  console.log('\nConsole messages:', errors.length);
  errors.slice(0, 10).forEach((e) => console.log(' -', e.substring(0, 300)));

  await p.screenshot({ path: 'docs/screenshots/bug082-debug.png' });
  console.log('\nScreenshot saved');
  await b.close();
})().catch((e) => console.error('ERR:', e.message));
