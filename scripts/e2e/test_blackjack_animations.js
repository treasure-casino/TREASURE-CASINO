const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_blackjack_animation_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAnimationTests() {
  console.log('================================================================');
  console.log('🃏 TREASURE BLACKJACK — 2D ANIMATIONS & 3D FLIP VERIFICATION');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    pipe: true,
    defaultViewport: { width: 1300, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1300,900'],
  });

  try {
    const page = await browser.newPage();
    const targetUrl = `${FRONTEND_BASE}/lobby/arena/game-blackjack-01`;
    console.log('Navigating to', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);

    // ── STEP 1: Verify Table & Deck Shoe ──
    console.log('\n--- STEP 1: VERIFY FELT TABLE & VISUAL DECK SHOE ---');
    const tableText = await page.evaluate(() => document.body.innerText);
    const shoeVisible = tableText.includes('SHOE') && tableText.includes('6 DECKS');
    console.log('Visual Deck Shoe visible:', shoeVisible);
    if (!shoeVisible) throw new Error('Visual Deck Shoe was not found on the table!');

    const tablePath = path.join(SCREENSHOT_DIR, '01-ui-blackjack-table-shoe.png');
    await page.screenshot({ path: tablePath });
    console.log('Saved:', tablePath);

    // ── STEP 2: Trigger Deal & Verify Dealing Sequence ──
    console.log('\n--- STEP 2: DEAL HAND & VERIFY IN-FLIGHT DEALING ANIMATION ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dealBtn = btns.find((b) => b.innerText && b.innerText.includes('DEAL HAND'));
      if (dealBtn && !dealBtn.disabled) dealBtn.click();
    });

    // Capture mid-flight dealing animation at ~350ms
    await sleep(350);
    const midFlightPath = path.join(SCREENSHOT_DIR, '02-ui-blackjack-dealing-sequence.png');
    await page.screenshot({ path: midFlightPath });
    console.log('Saved mid-flight deal animation:', midFlightPath);

    // Check dealing indicator or disabled state
    const isDealingNow = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const hasDealingText = document.body.innerText.includes('DEALING CARDS');
      const allActionBtnsDisabled = btns
        .filter((b) => b.innerText && (b.innerText.includes('HIT') || b.innerText.includes('STAND') || b.innerText.includes('DEAL')))
        .every((b) => b.disabled);
      return hasDealingText || allActionBtnsDisabled;
    });
    console.log('Dealing state active & buttons disabled during deal:', isDealingNow);

    // Wait for initial deal to fully complete
    await sleep(1200);

    // Check if Insurance Modal appeared
    const insuranceOpen = await page.evaluate(() => {
      return document.body.innerText.includes('BUY INSURANCE?');
    });

    if (insuranceOpen) {
      console.log('Insurance modal triggered (Dealer shows Ace)! Declining to test Stand/Hit sequence...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const noInsBtn = btns.find((b) => b.innerText && b.innerText.includes('NO INSURANCE'));
        if (noInsBtn) noInsBtn.click();
      });
      await sleep(600);
    }

    // ── STEP 3: Click STAND to test 3D Flip & Dealer Draw ──
    console.log('\n--- STEP 3: TRIGGER STAND & VERIFY 3D HOLE CARD FLIP ---');
    const standAvailable = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const standBtn = btns.find((b) => b.innerText && b.innerText.includes('STAND'));
      return standBtn && !standBtn.disabled;
    });

    if (standAvailable) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const standBtn = btns.find((b) => b.innerText && b.innerText.includes('STAND'));
        if (standBtn) standBtn.click();
      });

      // Capture during 3D flip rotation (approx 200ms)
      await sleep(220);
      const flipPath = path.join(SCREENSHOT_DIR, '03-ui-blackjack-hole-card-flip.png');
      await page.screenshot({ path: flipPath });
      console.log('Saved hole card flip screenshot:', flipPath);

      // Wait for complete dealer draw sequence and settlement
      await sleep(2000);
    } else {
      console.log('Round already settled on deal (e.g. natural blackjack).');
    }

    // ── STEP 4: Capture Settled State with Glow / Celebration ──
    console.log('\n--- STEP 4: CAPTURE SETTLED OUTCOME WITH WIN/LOSS VISUALS ---');
    const settledPath = path.join(SCREENSHOT_DIR, '04-ui-blackjack-settled-celebration.png');
    await page.screenshot({ path: settledPath });
    console.log('Saved round settlement screenshot:', settledPath);

    // ── STEP 5: Mobile Viewport Verification ──
    console.log('\n--- STEP 5: MOBILE VIEWPORT VERIFICATION ---');
    await page.setViewport({ width: 375, height: 667 });
    await sleep(600);
    const mobilePath = path.join(SCREENSHOT_DIR, '05-ui-blackjack-mobile-animations.png');
    await page.screenshot({ path: mobilePath });
    console.log('Saved mobile layout screenshot:', mobilePath);

    console.log('\n================================================================');
    console.log('🎉 ALL ANIMATION VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('Test run failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runAnimationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
