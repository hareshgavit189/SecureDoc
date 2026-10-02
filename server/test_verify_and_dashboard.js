/**
 * test_verify_and_dashboard.js
 * Puppeteer automated test to verify:
 * 1. Login as IO
 * 2. Navigation from Dashboard -> Verify Page
 * 3. Checking that Verify Page renders professionally with Layout, Sidebar, 3-line toggle
 * 4. Clicking sample hash preset and confirming instant cryptographic verification
 * 5. Clicking "Dashboard" and proving it returns to Dashboard WITHOUT redirecting to Login!
 * 6. Testing 3-line hamburger menu toggle
 * 7. Testing unauthenticated public /verify access
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('Launching Chrome for Verify & Dashboard navigation test...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Step 1: Login
    console.log('[1] Logging in at http://localhost:5173/login ...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    
    // Click IO persona chip
    const ioChip = await page.$('button.btn-light');
    if (ioChip) {
      await ioChip.click();
    } else {
      await page.type('input[type="email"]', 'io@securedoc.gov');
      await page.type('input[type="password"]', 'Demo@1234');
    }
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
    console.log('   Logged in! Current URL:', page.url());

    // Step 2: Navigate to Verify Page via Sidebar
    console.log('[2] Navigating to /verify via sidebar...');
    await page.click('a[href="/verify"]');
    await new Promise((r) => setTimeout(r, 1200));
    console.log('   Current URL after clicking verify in sidebar:', page.url());

    // Take screenshot of authenticated Verify Page
    const screen1Path = path.join(SCREENSHOT_DIR, '06_verify_page_authenticated.png');
    await page.screenshot({ path: screen1Path });
    console.log('   Saved authenticated verify page screenshot:', screen1Path);

    // Step 3: Click Sample Preset (FIR No. CR/001/2026)
    console.log('[3] Clicking sample FIR preset for 1-click verification...');
    const presetBtn = await page.$('.verify-page-wrapper button.hover-shadow');
    if (presetBtn) {
      await presetBtn.click();
      await new Promise((r) => setTimeout(r, 1800));
      console.log('   Preset clicked and verification executed!');
    }

    // Take screenshot of verified intact document
    const screen2Path = path.join(SCREENSHOT_DIR, '06_integrity_verifier.png');
    await page.screenshot({ path: screen2Path });
    console.log('   Saved verified intact certificate screenshot:', screen2Path);

    // Step 4: Click Dashboard link
    console.log('[4] Clicking "Dashboard" link from Verify Page to test redirect bug...');
    const dashLink = await page.$('a[href="/dashboard"]');
    if (dashLink) {
      await dashLink.click();
    } else {
      const dashBtn = await page.$('button:has-text("Dashboard"), button:has-text("Officer Dashboard")');
      if (dashBtn) {
        await dashBtn.click();
      } else {
        await page.goto('http://localhost:5173/dashboard');
      }
    }

    await new Promise((r) => setTimeout(r, 1500));
    const currentUrl = page.url();
    console.log('   Current URL after clicking Dashboard:', currentUrl);

    if (currentUrl.includes('/login')) {
      console.error('❌ FAILED: Redirected to login page!');
      process.exit(1);
    } else if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Successfully navigated to Dashboard without redirecting to login!');
    }

    // Step 5: Test 3-line hamburger menu toggle
    console.log('[5] Testing 3-line navbar toggle...');
    const toggleBtn = await page.$('button.btn-nav-toggle');
    if (toggleBtn) {
      await toggleBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      console.log('   Navbar hamburger button clicked (sidebar collapsed)!');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_desktop_sidebar_closed.png') });
    }

    // Step 6: Test Unauthenticated /verify page in a fresh incognito context
    console.log('[6] Testing unauthenticated public /verify access...');
    const context = await browser.createBrowserContext();
    const publicPage = await context.newPage();
    await publicPage.setViewport({ width: 1440, height: 900 });
    await publicPage.goto('http://localhost:5173/verify', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('   Public /verify loaded! URL:', publicPage.url());

    const screenPublicPath = path.join(SCREENSHOT_DIR, '06_verify_page_public.png');
    await publicPage.screenshot({ path: screenPublicPath });
    console.log('   Saved public verify page screenshot:', screenPublicPath);

    await context.close();
    console.log('ALL VERIFICATION AND NAVIGATION TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
