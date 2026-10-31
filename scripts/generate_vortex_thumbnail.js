const puppeteer = require('./e2e/node_modules/puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_PATH = path.resolve(__dirname, '../admin/public/assets/games/treasure-vortex-3d.png');

(async () => {
  console.log('Generating Treasure Vortex 3D thumbnail...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 420 });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 640px;
            height: 420px;
            background: radial-gradient(circle at center, #2e1065 0%, #0f172a 70%, #030712 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            position: relative;
            overflow: hidden;
          }
          .ring {
            position: absolute;
            border-radius: 50%;
            border: 2px dashed rgba(245, 158, 11, 0.4);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
          }
          .ring-1 { width: 340px; height: 340px; border-color: rgba(245, 158, 11, 0.5); }
          .ring-2 { width: 260px; height: 260px; border-color: rgba(56, 189, 248, 0.5); }
          .ring-3 { width: 180px; height: 180px; border-color: rgba(168, 85, 247, 0.6); }
          .ring-4 { width: 110px; height: 110px; border-color: rgba(244, 63, 94, 0.7); }
          .core {
            position: absolute;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: radial-gradient(circle, #fbbf24 0%, #a855f7 60%, transparent 100%);
            box-shadow: 0 0 35px #a855f7, 0 0 60px #fbbf24;
          }
          .badge {
            position: absolute;
            top: 20px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(245, 158, 11, 0.5);
            padding: 5px 16px;
            border-radius: 20px;
            color: #fbbf24;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .title {
            position: absolute;
            bottom: 24px;
            text-align: center;
          }
          .title h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 3px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9), 0 0 20px #a855f7;
          }
          .title p {
            color: #38bdf8;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1.5px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="badge">3D CONCENTRIC VORTEX</div>
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
        <div class="ring ring-4"></div>
        <div class="core"></div>
        <div class="title">
          <h1>TREASURE VORTEX</h1>
          <p>4 CONCENTRIC MULTIPLIER RINGS • UP TO 50X</p>
        </div>
      </body>
    </html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: OUTPUT_PATH, type: 'png' });
  await browser.close();
  console.log('✅ Generated thumbnail at:', OUTPUT_PATH);
})();

