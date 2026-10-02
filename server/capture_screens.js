/**
 * capture_screens.js
 * Launches Chrome in headless mode, tests the complete interactive UI flow:
 * - Login as Investigating Officer (IO)
 * - Dashboard with Chart.js analytics & statutory alerts
 * - Cases & Documents dossier via sidebar navigation
 * - Case Detail view with files & custody
 * - Women Safety Division Module (POCSO 60-day deadlines & NDSO)
 * - Document Integrity Verifier (Section 63 BSA)
 * - Audit Trail with Merkle chain verification
 * Saves full-resolution screenshots for visual validation.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

async function saveScreenshot(page, filename) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  const buf = await page.screenshot();
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      fs.writeFileSync(filePath, buf);
      console.log(`   📸 Saved: ${filename}`);
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise(r => setTimeout(r, 600));
    }
  }
}

async function runVisualCheck() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('🚀 Launching Chrome Headless at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,860'],
    defaultViewport: { width: 1366, height: 860 },
  });

  const page = await browser.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('React DevTools') && !text.includes('React Router Future Flag')) {
      console.log('   [BROWSER CONSOLE]', text);
    }
  });

  try {
    // 1. Visit Login Page
    console.log('[1] Navigating to http://localhost:5173/login ...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await saveScreenshot(page, '01_login_page.png');

    // 2. Perform Login as IO
    console.log('[2] Filling credentials and signing in...');
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'io@securedoc.gov');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');

    // Wait for React Router navigation to /dashboard
    console.log('   Waiting for SPA navigation to /dashboard ...');
    await page.waitForFunction(
      () => window.location.pathname.includes('/dashboard'),
      { timeout: 8000 }
    );
    console.log('   ✅ Successfully reached Dashboard! URL:', page.url());

    // Allow charts & dashboard data to render
    await new Promise((r) => setTimeout(r, 2000));
    await saveScreenshot(page, '02_dashboard_live.png');

    // 2b. Test 3-Lines Navigation Bar Toggle (Close sidebar on desktop)
    console.log('[2b] Clicking 3-lines navigation toggle to close sidebar on desktop...');
    await page.click('button.btn-nav-toggle');
    await new Promise((r) => setTimeout(r, 600));
    await saveScreenshot(page, '10_desktop_sidebar_closed.png');

    // Reopen sidebar with 3 lines
    console.log('     Clicking 3-lines navigation toggle to reopen sidebar on desktop...');
    await page.click('button.btn-nav-toggle');
    await new Promise((r) => setTimeout(r, 600));

    // 3. Navigate to Cases Page via Sidebar
    console.log('[3] Navigating to Cases dossier via sidebar...');
    await page.click('a[href="/cases"]');
    await new Promise((r) => setTimeout(r, 1500));
    await saveScreenshot(page, '03_cases_roster.png');

    // 3b. View Case Detail
    console.log('[3b] Opening Case Detail dossier...');
    const viewBtn = await page.$('table tbody tr:first-child button.btn-primary');
    if (viewBtn) {
      await viewBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
      await saveScreenshot(page, '07_case_details_dossier.png');
    }

    // 4. Navigate to Women Safety & Deadlines Page via Sidebar
    console.log('[4] Navigating to Women Safety & Statutory Deadlines via sidebar...');
    await page.click('a[href="/deadlines"]');
    await new Promise((r) => setTimeout(r, 1500));
    await saveScreenshot(page, '04_women_safety_deadlines.png');

    // 5. Navigate to Audit Log via Sidebar
    console.log('[5] Navigating to Immutable Audit Trail via sidebar...');
    await page.click('a[href="/audit"]');
    await new Promise((r) => setTimeout(r, 1500));

    // Trigger Chain Verification to showcase the cryptographic validation banner
    const verifyChainBtn = await page.$('button.btn-primary');
    if (verifyChainBtn) {
      console.log('   Triggering Merkle Chain cryptographic verification...');
      await verifyChainBtn.click();
      await new Promise((r) => setTimeout(r, 1200));
    }
    await saveScreenshot(page, '05_audit_trail.png');

    // 6. Test Public Verification Screen
    console.log('[6] Navigating to Tamper-Evident Verification Page via sidebar...');
    await page.click('a[href="/verify"]');
    await new Promise((r) => setTimeout(r, 800));

    // Input verified document SHA-256 hash
    const testHash = '43ee4e4bdba0cc8a6d860068f824041cbea8631761ffba8575b7049dabfdc350';
    await page.type('input[type="text"]', testHash);
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));
    await saveScreenshot(page, '06_integrity_verifier.png');

    // 7. Test Mobile Responsiveness
    console.log('[7] Testing Mobile Responsiveness (Viewport: 390x844)...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    // Click IO persona chip on mobile
    const ioChip = await page.$('button.btn-light');
    if (ioChip) {
      await ioChip.click();
    } else {
      await page.type('input[type="email"]', 'io@securedoc.gov');
      await page.type('input[type="password"]', 'Demo@1234');
    }
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1500));
    await saveScreenshot(page, '08_mobile_dashboard.png');

    // Click mobile hamburger menu to show responsive navigation drawer
    const hamburgerBtn = await page.$('button[aria-label="Toggle Sidebar Menu"]');
    if (hamburgerBtn) {
      console.log('   Opening mobile navigation drawer...');
      await hamburgerBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      await saveScreenshot(page, '09_mobile_drawer_open.png');
    }

    console.log('\n🎉 ALL SCREEN CAPTURES COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during visual screen check:', err);
  } finally {
    await browser.close();
  }
}

runVisualCheck();
