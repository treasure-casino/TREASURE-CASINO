const puppeteer = require('./node_modules/puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));

  await page.goto('http://localhost:5173/play/game-hotline-01', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const inspection = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const spinBtn = buttons.find(b => b.innerText.trim() === 'SPIN' || b.innerText.trim() === 'FREE SPIN');
    if (!spinBtn) return { error: 'No exact SPIN button found' };

    const rect = spinBtn.getBoundingClientRect();
    const style = window.getComputedStyle(spinBtn);

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(cx, cy);

    return {
      text: spinBtn.innerText.trim(),
      disabled: spinBtn.disabled,
      rect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
      centerPoint: { cx, cy },
      topElementTag: topElement?.tagName,
      topElementClass: topElement?.className,
      isTopElementSelfOrDescendant: spinBtn.contains(topElement) || topElement === spinBtn,
      windowScrollY: window.scrollY,
      windowInnerHeight: window.innerHeight,
    };
  });

  console.log('EXACT SPIN BUTTON INSPECTION:', JSON.stringify(inspection, null, 2));

  // Now click the exact Spin button using evaluate or scrollIntoView
  console.log('\n--- Clicking the exact SPIN button ---');
  let spinResult = await page.evaluate(async () => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const spinBtn = buttons.find(b => b.innerText.trim() === 'SPIN');
    if (!spinBtn) return { error: 'Button not found' };

    const disabledBefore = spinBtn.disabled;
    spinBtn.click();
    return { clicked: true, disabledBefore };
  });

  console.log('Click invocation result:', spinResult);
  await new Promise(r => setTimeout(r, 1500));

  const statusAfter = await page.evaluate(() => {
    const statusEl = document.querySelector('.animate-pulse');
    const allText = document.body.innerText;
    return {
      statusElText: statusEl?.innerText,
      hasAccelerating: allText.includes('ACCELERATING'),
      hasWinner: allText.includes('WINNER') || allText.includes('NO WIN'),
      hasError: allText.includes('ERROR'),
      bodySnippet: allText.slice(0, 300)
    };
  });

  console.log('Status after click:', statusAfter);

  await browser.close();
})();
