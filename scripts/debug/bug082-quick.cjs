const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:5173/solutions/universities', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await p.waitForTimeout(3000);
  const links = await p.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return ['NO FOOTER FOUND'];
    return Array.from(footer.querySelectorAll('a')).map(
      (a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')
    );
  });
  links.forEach((l) => console.log(l));
  console.log('Total:', links.length);

  // Click About to test SPA nav
  await p.click('text=About');
  await p.waitForTimeout(2000);
  console.log('After About click:', p.url());

  await b.close();
})().catch((e) => console.error('ERR:', e.message));
