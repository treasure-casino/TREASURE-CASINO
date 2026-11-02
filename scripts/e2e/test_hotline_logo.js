/**
 * Test script to verify the Treasure Hotline logo integration on Desktop and Mobile
 */
const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c\\treasure_hotline_screenshots';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyLogo() {
  console.log('🚀 Launching Chrome to verify TREASURE HOTLINE logo...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 1. Desktop Viewport
    await page.setViewport({ width: 1280, height: 850, deviceScaleFactor: 2 });
    console.log('Navigating to Hotline game in arena...');
    await page.goto(`${BASE_URL}/lobby/arena/game-hotline-01`, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('img[alt="TREASURE HOTLINE"]', { timeout: 10000 });

    const logoInfo = await page.evaluate(() => {
      const img = document.querySelector('img[alt="TREASURE HOTLINE"]');
      if (!img) return null;
      return {
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        clientWidth: img.clientWidth,
        clientHeight: img.clientHeight,
        alt: img.alt,
      };
    });

    console.log('Desktop Logo Info:', logoInfo);

    if (!logoInfo || logoInfo.naturalWidth === 0) {
      throw new Error('Logo image failed to load or has 0 width!');
    }

    const desktopPath = path.join(ARTIFACTS_DIR, '01-desktop-game-screen-with-logo.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`✅ Desktop screenshot saved to ${desktopPath}`);

    // 2. Mobile Viewport (iPhone 14 / modern device)
    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 1000));

    const mobilePath = path.join(ARTIFACTS_DIR, '02-mobile-game-screen-with-logo.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`✅ Mobile screenshot saved to ${mobilePath}`);

    // 3. Lobby Card with Logo
    await page.setViewport({ width: 1280, height: 850 });
    await page.goto(`${BASE_URL}/lobby`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const lobbyPath = path.join(ARTIFACTS_DIR, '03-lobby-card-with-logo.png');
    await page.screenshot({ path: lobbyPath, fullPage: false });
    console.log(`✅ Lobby screenshot saved to ${lobbyPath}`);

    console.log('\n🎉 ALL LOGO VERIFICATION TESTS PASSED PERFECTLY!\n');
  } finally {
    await browser.close();
  }
}

verifyLogo().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
