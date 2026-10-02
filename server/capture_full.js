const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,1200']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.click('button.btn-light');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
  await page.click('a[href="/verify"]');
  await new Promise(r => setTimeout(r, 800));
  await page.click('.verify-page-wrapper button.hover-shadow');
  await new Promise(r => setTimeout(r, 1500));
  const outPath = path.resolve(__dirname, '..', 'docs', 'screenshots', '06_integrity_verifier_full.png');
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log('Full page screenshot saved to:', outPath);
})();
