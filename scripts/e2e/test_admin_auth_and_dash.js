const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('================================================================');
  console.log('🛡️ TESTING ADMIN AUTH & DASHBOARD APIS (PORTS 5173 & 5174)');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon.ico')) consoleErrors.push(t);
    }
  });

  page.on('requestfailed', (req) => {
    if (!req.url().includes('favicon.ico')) {
      failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    }
  });

  try {
    console.log('\n--- 1. TESTING ADMIN LOGIN AT http://localhost:5173/login ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 25000 });

    // Type credentials
    await page.type('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'admin@treasure.com');
    await page.type('input[type="password"]', 'Admin123!');

    // Submit form
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    const currentUrl = page.url();
    console.log('   Navigated to after login:', currentUrl);

    // Verify Dashboard Stats loaded
    const dashboardKpi = await page.evaluate(() => {
      const kpis = Array.from(document.querySelectorAll('.font-mono')).map((el) => el.innerText.trim());
      const hasHeading = document.body.innerText.includes('Dashboard') || document.body.innerText.includes('DASHBOARD');
      return { hasHeading, kpis: kpis.slice(0, 4) };
    });
    console.log('   Dashboard KPI Cards loaded from Port 5000:', dashboardKpi);

    // Navigate to Vortex Monitor
    console.log('\n--- 2. NAVIGATING TO VORTEX ADMIN MONITOR (/games/vortex) ---');
    await page.goto('http://localhost:5173/games/vortex', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1500));

    const vortexAdminInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText;
      const rows = document.querySelectorAll('tbody tr').length;
      return { h1, rows };
    });
    console.log('   Vortex Admin Monitor Status:', vortexAdminInfo);

    console.log('\n================================================================');
    console.log('🎉 ADMIN AUTH & DASHBOARD VERIFICATION SUMMARY:');
    console.log(`  • Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) consoleErrors.forEach((e) => console.log('    ❌ ' + e));
    console.log(`  • Failed Requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) failedRequests.forEach((r) => console.log('    ❌ ' + r));
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await browser.close();
  }
})();

