/**
 * Diagnostic: open each game from its lobby card and capture console errors,
 * page exceptions, failed network requests and screenshots.
 * Usage: node diagnose.js [baseUrl]
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:5173';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'screenshots', 'diagnose');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 820 });

  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[console.${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });

  await page.goto(`${BASE}/lobby`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, '00-lobby.png') });
  const titles = await page.$$eval('h3', (els) => els.map((e) => e.textContent.trim()));
  console.log('Lobby card titles:', titles);

  for (const name of ['Treasure Kingdom', 'Sky Rocket', 'Crystal Mines']) {
    logs.length = 0;
    await page.goto(`${BASE}/lobby`, { waitUntil: 'networkidle2' });
    const clicked = await page.evaluate((n) => {
      const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.trim() === n);
      if (!h) return false;
      h.closest('[class*="cursor-pointer"]').click();
      return true;
    }, name);
    await new Promise((r) => setTimeout(r, 4000));
    const info = await page.evaluate(() => ({
      url: location.pathname,
      canvases: [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height} (css ${c.clientWidth}x${c.clientHeight})`),
      bodyText: document.body.innerText.slice(0, 300).replace(/\s+/g, ' '),
    }));
    const file = name.toLowerCase().replace(/\s+/g, '-');
    await page.screenshot({ path: path.join(OUT, `${file}.png`) });
    console.log(`\n=== ${name} === clicked=${clicked}`);
    console.log(JSON.stringify(info, null, 2));
    console.log(logs.length ? logs.join('\n') : '(no console errors / failed requests)');
  }

  await browser.close();
})().catch((e) => { console.error('DIAGNOSE FAILED', e); process.exit(1); });

