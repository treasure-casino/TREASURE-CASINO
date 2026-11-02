const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c\\treasure_hotline_screenshots';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  await page.goto('http://localhost:5173/play/game-hotline-01', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Take 1 spin so history ribbon shows a result
  const spinBtn = await page.$('button ::-p-text(SPIN)');
  if (spinBtn) {
    await spinBtn.click();
    await new Promise(r => setTimeout(r, 3500));
  }

  const outPath = path.join(SCREENSHOT_DIR, '05-hotline-fixed-gameplay.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Screenshot saved to', outPath);

  await browser.close();
})();
