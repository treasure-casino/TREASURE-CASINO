/**
 * TREASURE CASINO — Wheel Games Logo Generator
 * Generates transparent SVG vector logos for all Wheel Games.
 */

const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '../admin/public/assets/games/logos');
if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

const WHEEL_LOGOS = [
  {
    filename: 'fortune-wheel',
    title: 'FORTUNE WHEEL',
    subtitle: 'NEON ARCADE 100x MULTIPLIER',
    primaryColor: '#06B6D4',
    secondaryColor: '#EC4899',
    accentColor: '#FDE047',
    bgGradientStart: '#0F172A',
    bgGradientEnd: '#020617',
    iconSvg: `<circle cx="150" cy="72" r="36" fill="url(#neonWheelGrad)" stroke="#06B6D4" stroke-width="4"/><circle cx="150" cy="72" r="16" fill="#0F172A" stroke="#EC4899" stroke-width="3"/><polygon points="150,30 144,42 156,42" fill="#FDE047"/><line x1="150" y1="36" x2="150" y2="108" stroke="#06B6D4" stroke-width="2"/><line x1="114" y1="72" x2="186" y2="72" stroke="#06B6D4" stroke-width="2"/>`,
    badgeText: 'NEON 100x'
  },
  {
    filename: 'mega-wheel',
    title: 'MEGA WHEEL',
    subtitle: 'STUDIO VIP 250x JACKPOT',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    accentColor: '#FEF08A',
    bgGradientStart: '#451A03',
    bgGradientEnd: '#000000',
    iconSvg: `<circle cx="150" cy="72" r="38" fill="url(#goldStudioGrad)" stroke="#FEF08A" stroke-width="4"/><polygon points="150,28 143,40 157,40" fill="#EF4444"/><text x="150" y="80" font-size="20" font-weight="900" fill="#000" text-anchor="middle" font-family="Arial Black">250x</text>`,
    badgeText: 'STUDIO VIP'
  },
  {
    filename: 'lucky-wheel',
    title: 'LUCKY CARNIVAL',
    subtitle: '12-WEDGE CARNIVAL 77x',
    primaryColor: '#EF4444',
    secondaryColor: '#F59E0B',
    accentColor: '#86EFAC',
    bgGradientStart: '#7F1D1D',
    bgGradientEnd: '#1C1917',
    iconSvg: `<circle cx="150" cy="72" r="36" fill="url(#carnivalGrad)" stroke="#F59E0B" stroke-width="4"/><polygon points="150,30 144,42 156,42" fill="#86EFAC"/><circle cx="150" cy="72" r="12" fill="#7F1D1D" stroke="#FFF" stroke-width="2"/><text x="150" y="77" font-size="12" font-weight="900" fill="#FFF" text-anchor="middle" font-family="Arial Black">77x</text>`,
    badgeText: 'CARNIVAL'
  }
];

function generateSvg(item) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160" width="300" height="160">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${item.bgGradientStart}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${item.bgGradientEnd}" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="neonWheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06B6D4"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <linearGradient id="goldStudioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="carnivalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
  </defs>

  <rect x="5" y="5" width="290" height="150" rx="20" fill="url(#bgGrad)" stroke="${item.primaryColor}" stroke-width="2.5" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.6))"/>
  
  <g transform="translate(0, 0)">
    ${item.iconSvg}
  </g>

  <rect x="100" y="112" width="100" height="16" rx="8" fill="${item.primaryColor}" opacity="0.2"/>
  <text x="150" y="124" font-size="9" font-weight="900" fill="${item.accentColor}" text-anchor="middle" font-family="'Cinzel', Georgia, serif" letter-spacing="2">
    ${item.badgeText}
  </text>

  <text x="150" y="142" font-size="13" font-weight="900" fill="#FFFFFF" text-anchor="middle" font-family="'Cinzel', Georgia, serif" letter-spacing="1.5">
    ${item.title}
  </text>
</svg>`;
}

WHEEL_LOGOS.forEach(item => {
  const filePath = path.join(LOGOS_DIR, `${item.filename}.svg`);
  fs.writeFileSync(filePath, generateSvg(item), 'utf8');
  console.log(`Generated: ${filePath}`);
});
console.log('Wheel game logos generated successfully!');

