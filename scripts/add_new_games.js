/**
 * TREASURE CASINO - Add 25 Requested New Games
 * Generates custom SVG & PNG thumbnails and seeds them into MySQL database.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../admin/public');
const GAMES_DIR = path.join(PUBLIC_DIR, 'assets/games');
const SQL_PATH = path.resolve(__dirname, '../backend/sql/add_25_new_games.sql');

fs.mkdirSync(GAMES_DIR, { recursive: true });

const newGames = [
  {
    id: 'game-crash-19',
    name: 'Vortex',
    description: 'Cosmic gravitational vortex multiplier. As the event horizon spins faster, multiplier surges exponentially before the singularity collapse.',
    thumbnailUrl: '/assets/games/crash-vortex.png',
    category: 'CRASH',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 97.50,
    minBet: 10.00,
    maxBet: 15000.00,
    sortOrder: 28,
    theme: {
      bg1: '#0d0221',
      bg2: '#240046',
      accent: '#9d4edd',
      gold: '#ff9e00',
      badge: 'VORTEX CRASH',
      symbol: 'VORTEX',
    },
  },
  {
    id: 'game-slot-11',
    name: 'Fortune Gems',
    description: 'Ancient Garuda temple 3x3 gemstone slot with a dedicated 4th multiplier reel up to 15x on every winning line.',
    thumbnailUrl: '/assets/games/slots-fortunegems.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: true,
    rtp: 97.00,
    minBet: 10.00,
    maxBet: 20000.00,
    sortOrder: 110,
    theme: {
      bg1: '#260a03',
      bg2: '#581c0c',
      accent: '#f59e0b',
      gold: '#fef08a',
      badge: 'TEMPLE GEMS',
      symbol: '💎',
    },
  },
  {
    id: 'game-slot-12',
    name: 'Fortune Gems 2',
    description: 'Upgraded Garuda gemstone reels with wild multiplier wheels, lucky scatter relics, and jewel respin features.',
    thumbnailUrl: '/assets/games/slots-fortunegems2.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: true,
    rtp: 97.20,
    minBet: 10.00,
    maxBet: 20000.00,
    sortOrder: 111,
    theme: {
      bg1: '#2e0f05',
      bg2: '#682410',
      accent: '#f59e0b',
      gold: '#fef08a',
      badge: 'WILD MULTIPLIER',
      symbol: '💎²',
    },
  },
  {
    id: 'game-slot-13',
    name: 'Fortune Gems 3',
    description: 'Tri-wheel multiplier cascade with split wild gems, emerald scarabs, and temple jackpot bonuses.',
    thumbnailUrl: '/assets/games/slots-fortunegems3.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: false,
    rtp: 97.40,
    minBet: 10.00,
    maxBet: 25000.00,
    sortOrder: 112,
    theme: {
      bg1: '#1f0d04',
      bg2: '#4f1a07',
      accent: '#10b981',
      gold: '#f59e0b',
      badge: 'TRI-CASCADE',
      symbol: '💎³',
    },
  },
  {
    id: 'game-slot-14',
    name: 'Fortune Gems 1000x',
    description: 'Extreme high-volatility gem vault surging with supercharged 1000x golden multiplier stones and diamond avalanches.',
    thumbnailUrl: '/assets/games/slots-fortunegems1000.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: true,
    rtp: 96.80,
    minBet: 20.00,
    maxBet: 50000.00,
    sortOrder: 113,
    theme: {
      bg1: '#3b0764',
      bg2: '#581c87',
      accent: '#c084fc',
      gold: '#fbbf24',
      badge: '1000X ULTRA',
      symbol: '1000X',
    },
  },
  {
    id: 'game-slot-15',
    name: 'Fortune Gems 500x',
    description: '500x max multiplier special edition with radiant ruby, sapphire, and topaz paylines.',
    thumbnailUrl: '/assets/games/slots-fortunegems500.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: false,
    rtp: 96.90,
    minBet: 15.00,
    maxBet: 30000.00,
    sortOrder: 114,
    theme: {
      bg1: '#311005',
      bg2: '#7c2d12',
      accent: '#ea580c',
      gold: '#fbbf24',
      badge: '500X SURGE',
      symbol: '500X',
    },
  },
  {
    id: 'game-slot-16',
    name: 'Money Coming',
    description: 'High-tempo 3-number reel slot where digits combine directly to form winning multipliers plus 4th special feature reel.',
    thumbnailUrl: '/assets/games/slots-moneycoming.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: true,
    rtp: 98.20,
    minBet: 10.00,
    maxBet: 25000.00,
    sortOrder: 115,
    theme: {
      bg1: '#064e3b',
      bg2: '#047857',
      accent: '#34d399',
      gold: '#fbbf24',
      badge: 'INSTANT CASH REEL',
      symbol: '💵',
    },
  },
  {
    id: 'game-fish-02',
    name: 'Crazy Hunter',
    description: 'Action arcade cannon game targeting deep-sea sea creatures and boss leviathans with explosive multipliers.',
    thumbnailUrl: '/assets/games/fish-crazyhunter.png',
    category: 'FISHING',
    providerId: 'prov-jili',
    isFeatured: true,
    rtp: 96.50,
    minBet: 10.00,
    maxBet: 10000.00,
    sortOrder: 116,
    theme: {
      bg1: '#082f49',
      bg2: '#0369a1',
      accent: '#38bdf8',
      gold: '#facc15',
      badge: 'ARCADE SHOOTER',
      symbol: '🎯',
    },
  },
  {
    id: 'game-fish-03',
    name: 'Crazy Hunter 2',
    description: 'Sequel to Crazy Hunter with laser beam artillery, freeze vortexes, and mythical golden sea dragon bosses.',
    thumbnailUrl: '/assets/games/fish-crazyhunter2.png',
    category: 'FISHING',
    providerId: 'prov-jili',
    isFeatured: false,
    rtp: 96.80,
    minBet: 20.00,
    maxBet: 20000.00,
    sortOrder: 117,
    theme: {
      bg1: '#0c2340',
      bg2: '#0284c7',
      accent: '#06b6d4',
      gold: '#facc15',
      badge: 'BOSS HUNTER',
      symbol: '🐉',
    },
  },
  {
    id: 'game-slot-17',
    name: 'Piggy Bank',
    description: 'Smash golden piggy banks to unlock coin showers, golden hammers, and progressive piggy jackpots.',
    thumbnailUrl: '/assets/games/slots-piggybank.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: false,
    rtp: 96.50,
    minBet: 10.00,
    maxBet: 15000.00,
    sortOrder: 118,
    theme: {
      bg1: '#4a044e',
      bg2: '#86198f',
      accent: '#f472b6',
      gold: '#fbbf24',
      badge: 'COIN SMASH',
      symbol: '🐷',
    },
  },
  {
    id: 'game-slot-18',
    name: 'Money Tree',
    description: 'Shake the golden money tree branches for red envelope drops, jade coin cascades, and wealth multiplier leaves.',
    thumbnailUrl: '/assets/games/slots-moneytree.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 96.70,
    minBet: 10.00,
    maxBet: 12000.00,
    sortOrder: 119,
    theme: {
      bg1: '#14532d',
      bg2: '#166534',
      accent: '#4ade80',
      gold: '#fde047',
      badge: 'TREE OF WEALTH',
      symbol: '🌳',
    },
  },
  {
    id: 'game-slot-19',
    name: 'Coin Up',
    description: 'Hold and Win style coin collection slot. Land gold coins with instant multiplier values to trigger 3 respins.',
    thumbnailUrl: '/assets/games/slots-coinup.png',
    category: 'SLOTS',
    providerId: 'prov-prag',
    isFeatured: true,
    rtp: 96.60,
    minBet: 10.00,
    maxBet: 20000.00,
    sortOrder: 120,
    theme: {
      bg1: '#1e1b4b',
      bg2: '#3730a3',
      accent: '#818cf8',
      gold: '#fbbf24',
      badge: 'HOLD & WIN',
      symbol: '🪙',
    },
  },
  {
    id: 'game-slot-20',
    name: 'Coin Up 2',
    description: 'Multi-row Coin Up edition with lightning multipliers, collect pots, and sticky diamond coin respins.',
    thumbnailUrl: '/assets/games/slots-coinup2.png',
    category: 'SLOTS',
    providerId: 'prov-prag',
    isFeatured: false,
    rtp: 96.90,
    minBet: 15.00,
    maxBet: 25000.00,
    sortOrder: 121,
    theme: {
      bg1: '#172554',
      bg2: '#1e40af',
      accent: '#60a5fa',
      gold: '#fde047',
      badge: 'STICKY RESPINS',
      symbol: '🪙²',
    },
  },
  {
    id: 'game-slot-21',
    name: 'Coin Strike',
    description: 'High-voltage 3x3 fruit & coin slot where lightning strikes collect all active coin values on screen simultaneously.',
    thumbnailUrl: '/assets/games/slots-coinstrike.png',
    category: 'SLOTS',
    providerId: 'prov-prag',
    isFeatured: true,
    rtp: 96.40,
    minBet: 10.00,
    maxBet: 18000.00,
    sortOrder: 122,
    theme: {
      bg1: '#422006',
      bg2: '#713f12',
      accent: '#eab308',
      gold: '#fef08a',
      badge: 'LIGHTNING STRIKE',
      symbol: '⚡',
    },
  },
  {
    id: 'game-slot-22',
    name: 'Coin Strike 2',
    description: 'Double lightning coin strike feature with expanding reels and electrified grand jackpot coins.',
    thumbnailUrl: '/assets/games/slots-coinstrike2.png',
    category: 'SLOTS',
    providerId: 'prov-prag',
    isFeatured: false,
    rtp: 96.70,
    minBet: 20.00,
    maxBet: 30000.00,
    sortOrder: 123,
    theme: {
      bg1: '#361b05',
      bg2: '#854d0e',
      accent: '#facc15',
      gold: '#ffffff',
      badge: 'SUPER STRIKE',
      symbol: '⚡²',
    },
  },
  {
    id: 'game-fish-04',
    name: 'Ice Fishing',
    description: 'Arctic sub-zero angling through frozen lake ice holes. Hook prize trout, golden sturgeon, and glacial sunken treasures.',
    thumbnailUrl: '/assets/games/fish-icefishing.png',
    category: 'FISHING',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 96.20,
    minBet: 5.00,
    maxBet: 10000.00,
    sortOrder: 124,
    theme: {
      bg1: '#082f49',
      bg2: '#0e7490',
      accent: '#67e8f9',
      gold: '#e0f2fe',
      badge: 'ARCTIC ANGLING',
      symbol: '🎣',
    },
  },
  {
    id: 'game-slot-23',
    name: 'Fortune Tiger',
    description: '3-reel golden tiger slot with random Fortune Tiger respin feature and 10x full-screen win multipliers.',
    thumbnailUrl: '/assets/games/slots-fortunetiger.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 96.81,
    minBet: 10.00,
    maxBet: 25000.00,
    sortOrder: 125,
    theme: {
      bg1: '#431407',
      bg2: '#9a3412',
      accent: '#ea580c',
      gold: '#fbbf24',
      badge: '10X TIGER RESPIN',
      symbol: '🐯',
    },
  },
  {
    id: 'game-slot-24',
    name: 'Fortune Tiger 2',
    description: 'Dual tiger golden claws feature with stacked wilds and golden ingot multiplier respin frenzy.',
    thumbnailUrl: '/assets/games/slots-fortunetiger2.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: false,
    rtp: 97.00,
    minBet: 15.00,
    maxBet: 30000.00,
    sortOrder: 126,
    theme: {
      bg1: '#3f1105',
      bg2: '#c2410c',
      accent: '#fb923c',
      gold: '#fde047',
      badge: 'DUAL TIGER RUSH',
      symbol: '🐯²',
    },
  },
  {
    id: 'game-slot-25',
    name: 'Fortune Ox',
    description: 'Year of the Ox 3-reel slot featuring guaranteed winning respins and 10x wild bull horns multiplier.',
    thumbnailUrl: '/assets/games/slots-fortuneox.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 96.75,
    minBet: 10.00,
    maxBet: 25000.00,
    sortOrder: 127,
    theme: {
      bg1: '#450a0a',
      bg2: '#991b1b',
      accent: '#ef4444',
      gold: '#f59e0b',
      badge: 'GOLDEN BULL 10X',
      symbol: '🐂',
    },
  },
  {
    id: 'game-dice-16',
    name: 'RollX',
    description: 'High-velocity kinetic dice roll arcade. Predict the roll speed and face total for compound streak multipliers.',
    thumbnailUrl: '/assets/games/dice-rollx.png',
    category: 'DICE',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 98.00,
    minBet: 10.00,
    maxBet: 20000.00,
    sortOrder: 128,
    theme: {
      bg1: '#111827',
      bg2: '#1e1b4b',
      accent: '#6366f1',
      gold: '#a855f7',
      badge: 'ROLLX SPEED',
      symbol: '🎲',
    },
  },
  {
    id: 'game-slot-26',
    name: '3 Coin TREASUREs',
    description: 'Three oriental wealth pots (Prosperity, Longevity, Fortune) filling with coins to trigger 3 distinct bonus features.',
    thumbnailUrl: '/assets/games/slots-3cointreasures.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 96.50,
    minBet: 10.00,
    maxBet: 20000.00,
    sortOrder: 129,
    theme: {
      bg1: '#2e1065',
      bg2: '#581c87',
      accent: '#a855f7',
      gold: '#facc15',
      badge: 'TRIPLE POTS',
      symbol: '🏺',
    },
  },
  {
    id: 'game-slot-27',
    name: 'Crazy 777',
    description: 'Authentic classic 3x1 single payline slot with 4th special reel for extra multipliers, direct cash payouts, and free respins.',
    thumbnailUrl: '/assets/games/slots-crazy777.png',
    category: 'SLOTS',
    providerId: 'prov-jili',
    isFeatured: true,
    rtp: 97.00,
    minBet: 10.00,
    maxBet: 20000.00,
    sortOrder: 130,
    theme: {
      bg1: '#1c1917',
      bg2: '#44403c',
      accent: '#ef4444',
      gold: '#eab308',
      badge: 'CLASSIC 777 REEL',
      symbol: '777',
    },
  },
  {
    id: 'game-card-19',
    name: 'Pappu',
    description: 'Traditional fast-paced card suit prediction challenge with instant multipliers and double-up streaks.',
    thumbnailUrl: '/assets/games/card-pappu.png',
    category: 'CARD',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 97.50,
    minBet: 10.00,
    maxBet: 15000.00,
    sortOrder: 131,
    theme: {
      bg1: '#311005',
      bg2: '#7f1d1d',
      accent: '#f87171',
      gold: '#fbbf24',
      badge: 'DESI CARD',
      symbol: '🃏',
    },
  },
  {
    id: 'game-slot-28',
    name: 'Lucky Jaguar',
    description: 'Mayan jungle temple exploration slot with prowling golden jaguar wilds and stone relic multipliers.',
    thumbnailUrl: '/assets/games/slots-luckyjaguar.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: false,
    rtp: 96.50,
    minBet: 10.00,
    maxBet: 15000.00,
    sortOrder: 132,
    theme: {
      bg1: '#064e3b',
      bg2: '#14532d',
      accent: '#22c55e',
      gold: '#facc15',
      badge: 'JUNGLE WILDS',
      symbol: '🐆',
    },
  },
  {
    id: 'game-slot-29',
    name: 'Lucky Jaguar 500',
    description: 'High-octane golden jaguar hunt with 500x mystery pounces, cascading reels, and temple bonus spins.',
    thumbnailUrl: '/assets/games/slots-luckyjaguar500.png',
    category: 'SLOTS',
    providerId: 'prov-inhouse',
    isFeatured: true,
    rtp: 96.80,
    minBet: 20.00,
    maxBet: 30000.00,
    sortOrder: 133,
    theme: {
      bg1: '#022c22',
      bg2: '#166534',
      accent: '#4ade80',
      gold: '#fef08a',
      badge: '500X JAGUAR',
      symbol: '🐆⁵⁰⁰',
    },
  },
];

function generateThumbnailSvg(game) {
  const { name, theme, category } = game;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
  <defs>
    <linearGradient id="bgGrad_${game.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}" />
      <stop offset="100%" stop-color="${theme.bg2}" />
    </linearGradient>
    <radialGradient id="glow_${game.id}" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${theme.bg1}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldGrad_${game.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.gold}" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <filter id="shadow_${game.id}">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="400" height="240" fill="url(#bgGrad_${game.id})" />
  <rect width="400" height="240" fill="url(#glow_${game.id})" />

  <!-- Geometric Luxury Border Accent -->
  <rect x="10" y="10" width="380" height="220" rx="14" fill="none" stroke="${theme.gold}" stroke-width="1.5" opacity="0.35" />
  <rect x="15" y="15" width="370" height="210" rx="10" fill="none" stroke="${theme.accent}" stroke-width="0.75" opacity="0.25" />

  <!-- Diagonal Tech Grid Lines -->
  <g stroke="#ffffff" stroke-width="0.7" opacity="0.06">
    <line x1="0" y1="40" x2="400" y2="40" />
    <line x1="0" y1="90" x2="400" y2="90" />
    <line x1="0" y1="140" x2="400" y2="140" />
    <line x1="0" y1="190" x2="400" y2="190" />
  </g>

  <!-- Central Emblem Display -->
  <circle cx="200" cy="95" r="48" fill="${theme.bg1}" stroke="${theme.gold}" stroke-width="2.5" filter="url(#shadow_${game.id})" />
  <circle cx="200" cy="95" r="42" fill="none" stroke="${theme.accent}" stroke-width="1" opacity="0.6" stroke-dasharray="4,2" />

  <!-- Central Symbol -->
  <text x="200" y="108" font-family="'Cinzel', 'Inter', serif, sans-serif" font-size="34" font-weight="900" fill="${theme.gold}" text-anchor="middle" filter="url(#shadow_${game.id})">
    ${theme.symbol}
  </text>

  <!-- Category Badge Pill -->
  <g transform="translate(200, 28)">
    <rect x="-65" y="-10" width="130" height="20" rx="10" fill="#000000" opacity="0.6" stroke="${theme.gold}" stroke-width="1" />
    <text x="0" y="4" font-family="'Inter', sans-serif" font-size="9" font-weight="800" letter-spacing="1.5" fill="${theme.gold}" text-anchor="middle">
      ${theme.badge}
    </text>
  </g>

  <!-- Bottom Brand & Title -->
  <rect x="25" y="160" width="350" height="60" rx="10" fill="#030712" opacity="0.7" stroke="#1f2937" stroke-width="1" />
  <text x="200" y="185" font-family="'Cinzel', 'Georgia', serif" font-size="16" font-weight="900" letter-spacing="1" fill="#ffffff" text-anchor="middle">
    ${name.toUpperCase()}
  </text>
  <text x="200" y="205" font-family="'Inter', sans-serif" font-size="10" font-weight="700" letter-spacing="2" fill="${theme.gold}" text-anchor="middle">
    TREASURE CASINO • RTP ${game.rtp}%
  </text>
</svg>`;
}

async function main() {
  console.log(`Adding ${newGames.length} new games...`);

  // 1. Generate local thumbnails
  for (const g of newGames) {
    const filename = path.basename(g.thumbnailUrl);
    const svgPath = path.join(GAMES_DIR, filename.replace('.png', '.svg'));
    const pngPath = path.join(GAMES_DIR, filename);

    const svgContent = generateThumbnailSvg(g);
    fs.writeFileSync(svgPath, svgContent, 'utf8');
    fs.writeFileSync(pngPath, svgContent, 'utf8'); // Valid SVG stored as .png for direct loading
  }
  console.log(`Generated ${newGames.length} SVG and PNG assets in ${GAMES_DIR}`);

  // 2. Generate SQL migration file
  let sql = `-- TREASURE CASINO - Insert 25 New Requested Games\nUSE \`treasure_db\`;\n\n`;

  for (const g of newGames) {
    const escDesc = g.description.replace(/'/g, "''");
    const escName = g.name.replace(/'/g, "''");
    sql += `INSERT INTO \`games\` (\`id\`, \`name\`, \`description\`, \`thumbnail_url\`, \`category\`, \`provider_id\`, \`is_active\`, \`is_featured\`, \`is_demo\`, \`rtp\`, \`min_bet\`, \`max_bet\`, \`sort_order\`, \`created_at\`, \`updated_at\`)
VALUES ('${g.id}', '${escName}', '${escDesc}', '${g.thumbnailUrl}', '${g.category}', '${g.providerId}', 1, ${g.isFeatured ? 1 : 0}, 1, ${g.rtp}, ${g.minBet}, ${g.maxBet}, ${g.sortOrder}, NOW(), NOW())
ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`description\` = VALUES(\`description\`), \`thumbnail_url\` = VALUES(\`thumbnail_url\`), \`category\` = VALUES(\`category\`), \`is_featured\` = VALUES(\`is_featured\`), \`rtp\` = VALUES(\`rtp\`), \`min_bet\` = VALUES(\`min_bet\`), \`max_bet\` = VALUES(\`max_bet\`), \`sort_order\` = VALUES(\`sort_order\`);\n\n`;
  }

  fs.writeFileSync(SQL_PATH, sql, 'utf8');
  console.log(`Generated SQL migration at: ${SQL_PATH}`);
}

main().catch((err) => {
  console.error('Error adding new games:', err);
  process.exit(1);
});
