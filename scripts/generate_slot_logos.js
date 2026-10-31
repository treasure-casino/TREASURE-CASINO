/**
 * ============================================================================
 * TREASURE CASINO — Slot Game Logo & Asset Generator
 * ============================================================================
 * Generates high-definition, transparent SVG vector logos and PNGs
 * for all individual slot games.
 */

const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '../admin/public/assets/games/logos');
if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

const LOGOS = [
  {
    filename: 'fortune-tiger',
    title: 'FORTUNE TIGER',
    subtitle: 'IMPERIAL RESPIN & 10x MULTIPLIER',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    accentColor: '#FDE047',
    bgGradientStart: '#7F1D1D',
    bgGradientEnd: '#450A0A',
    iconSvg: `<path d="M150,45 C130,20 170,20 150,45 Z" fill="#F59E0B"/><circle cx="150" cy="75" r="38" fill="url(#tigerGrad)" stroke="#FDE047" stroke-width="3"/><path d="M135,70 Q150,85 165,70" stroke="#000" stroke-width="3" fill="none"/><circle cx="140" cy="65" r="4" fill="#000"/><circle cx="160" cy="65" r="4" fill="#000"/><path d="M130,50 L140,58 M170,50 L160,58 M145,45 L150,55 L155,45" stroke="#7F1D1D" stroke-width="3"/>`,
    badgeText: 'GOLDEN TIGER'
  },
  {
    filename: 'fortune-tiger-2',
    title: 'FORTUNE TIGER II',
    subtitle: 'EMERALD DYNASTY & WILD MATRIX',
    primaryColor: '#10B981',
    secondaryColor: '#F59E0B',
    accentColor: '#6EE7B7',
    bgGradientStart: '#064E3B',
    bgGradientEnd: '#022C22',
    iconSvg: `<circle cx="150" cy="75" r="38" fill="url(#jadeGrad)" stroke="#10B981" stroke-width="4"/><path d="M130,50 L140,60 M170,50 L160,60 M145,45 L150,58 L155,45" stroke="#F59E0B" stroke-width="3"/><circle cx="140" cy="68" r="5" fill="#FDE047"/><circle cx="160" cy="68" r="5" fill="#FDE047"/><path d="M136,82 Q150,95 164,82" stroke="#064E3B" stroke-width="3" fill="none"/>`,
    badgeText: 'JADE EMPEROR'
  },
  {
    filename: 'fortune-ox',
    title: 'FORTUNE OX',
    subtitle: 'GOLDEN HORNS & CELESTIAL WEALTH',
    primaryColor: '#A855F7',
    secondaryColor: '#EAB308',
    accentColor: '#FDE047',
    bgGradientStart: '#3B0764',
    bgGradientEnd: '#1E1B4B',
    iconSvg: `<path d="M120,40 Q150,60 135,80 M180,40 Q150,60 165,80" stroke="#FDE047" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="150" cy="80" r="34" fill="url(#oxGrad)" stroke="#EAB308" stroke-width="3"/><circle cx="140" cy="75" r="4" fill="#000"/><circle cx="160" cy="75" r="4" fill="#000"/><ellipse cx="150" cy="90" rx="14" ry="8" fill="#FDE047" stroke="#3B0764"/>`,
    badgeText: 'GOLDEN OX'
  },
  {
    filename: 'fortune-gems',
    title: 'FORTUNE GEMS',
    subtitle: 'ANCIENT TEMPLE & 4TH MULTIPLIER REEL',
    primaryColor: '#06B6D4',
    secondaryColor: '#EAB308',
    accentColor: '#67E8F9',
    bgGradientStart: '#164E63',
    bgGradientEnd: '#083344',
    iconSvg: `<polygon points="150,40 185,65 170,105 130,105 115,65" fill="url(#cyanGemGrad)" stroke="#FDE047" stroke-width="3"/><polygon points="150,40 165,65 150,90 135,65" fill="#A5F3FC" opacity="0.8"/><circle cx="150" cy="65" r="12" fill="#EAB308"/>`,
    badgeText: 'TEMPLE GEMS'
  },
  {
    filename: 'fortune-gems-2',
    title: 'FORTUNE GEMS II',
    subtitle: 'MYSTIC CRYSTAL CAVERN 50x',
    primaryColor: '#C084FC',
    secondaryColor: '#38BDF8',
    accentColor: '#E879F9',
    bgGradientStart: '#4C1D95',
    bgGradientEnd: '#1E1B4B',
    iconSvg: `<polygon points="150,35 180,55 170,100 130,100 120,55" fill="url(#amethystGrad)" stroke="#E879F9" stroke-width="3"/><polygon points="135,50 150,35 165,50 150,100" fill="#F3E8FF" opacity="0.6"/>`,
    badgeText: 'CRYSTAL CAVERN'
  },
  {
    filename: 'fortune-gems-3',
    title: 'FORTUNE GEMS III',
    subtitle: 'STARBURST GALAXY JEWELS 100x',
    primaryColor: '#F43F5E',
    secondaryColor: '#818CF8',
    accentColor: '#FDA4AF',
    bgGradientStart: '#881337',
    bgGradientEnd: '#312E81',
    iconSvg: `<polygon points="150,30 190,70 150,110 110,70" fill="url(#rubyGrad)" stroke="#FDA4AF" stroke-width="4"/><circle cx="150" cy="70" r="16" fill="#FDE047"/><path d="M125,70 L175,70 M150,45 L150,95" stroke="#FFF" stroke-width="2"/>`,
    badgeText: 'COSMIC GEMS'
  },
  {
    filename: 'fortune-gems-500',
    title: 'FORTUNE GEMS 500x',
    subtitle: 'HIGH-ROLLER ROYAL VAULT',
    primaryColor: '#EAB308',
    secondaryColor: '#D97706',
    accentColor: '#FEF08A',
    bgGradientStart: '#713F12',
    bgGradientEnd: '#1C1917',
    iconSvg: `<circle cx="150" cy="70" r="42" fill="url(#vaultGrad)" stroke="#FEF08A" stroke-width="4"/><polygon points="150,45 170,65 160,95 140,95 130,65" fill="#38BDF8"/><text x="150" y="78" font-size="20" font-weight="900" fill="#FFF" text-anchor="middle" font-family="Arial Black">500x</text>`,
    badgeText: 'MEGA VAULT'
  },
  {
    filename: 'fortune-gems-1000',
    title: 'FORTUNE GEMS 1000x',
    subtitle: 'SOVEREIGN JACKPOT EDITION',
    primaryColor: '#F59E0B',
    secondaryColor: '#8B5CF6',
    accentColor: '#FDE047',
    bgGradientStart: '#4C1D95',
    bgGradientEnd: '#000000',
    iconSvg: `<path d="M120,55 L135,40 L150,55 L165,40 L180,55 L175,85 L125,85 Z" fill="url(#goldCrown)" stroke="#FFF" stroke-width="2"/><text x="150" y="105" font-size="18" font-weight="900" fill="#FDE047" text-anchor="middle" font-family="Arial Black">1000x</text>`,
    badgeText: 'CROWN EDITION'
  },
  {
    filename: 'money-tree',
    title: 'MONEY TREE',
    subtitle: 'ENCHANTED GOLDEN SHOWER',
    primaryColor: '#22C55E',
    secondaryColor: '#EAB308',
    accentColor: '#86EFAC',
    bgGradientStart: '#14532D',
    bgGradientEnd: '#052E16',
    iconSvg: `<path d="M145,85 L155,85 L153,60 L147,60 Z" fill="#78350F"/><circle cx="150" cy="50" r="28" fill="url(#treeGrad)" stroke="#86EFAC" stroke-width="2"/><circle cx="140" cy="45" r="7" fill="#FDE047"/><circle cx="160" cy="45" r="7" fill="#FDE047"/><circle cx="150" cy="60" r="7" fill="#FDE047"/>`,
    badgeText: 'WEALTH TREE'
  },
  {
    filename: 'piggy-bank',
    title: 'PIGGY BANK',
    subtitle: 'COIN BURST & HAMMER SMASH',
    primaryColor: '#EC4899',
    secondaryColor: '#EAB308',
    accentColor: '#F472B6',
    bgGradientStart: '#831843',
    bgGradientEnd: '#500724',
    iconSvg: `<ellipse cx="150" cy="72" rx="36" ry="28" fill="url(#pigGrad)" stroke="#F472B6" stroke-width="3"/><circle cx="130" cy="65" r="4" fill="#000"/><ellipse cx="120" cy="74" rx="8" ry="6" fill="#FBCFE8"/><path d="M145,44 L155,44" stroke="#FDE047" stroke-width="4"/><circle cx="170" cy="60" r="6" fill="#FDE047"/>`,
    badgeText: 'SMASH WIN'
  },
  {
    filename: 'coin-up',
    title: 'COIN UP',
    subtitle: 'MULTIPLIER TOWER CLIMB',
    primaryColor: '#EAB308',
    secondaryColor: '#3B82F6',
    accentColor: '#FDE047',
    bgGradientStart: '#1E3A8A',
    bgGradientEnd: '#0F172A',
    iconSvg: `<circle cx="150" cy="72" r="34" fill="url(#goldCoinGrad)" stroke="#FDE047" stroke-width="3"/><path d="M150,50 L165,65 L155,65 L155,85 L145,85 L145,65 L135,65 Z" fill="#1E3A8A"/>`,
    badgeText: 'TOWER CLIMB'
  },
  {
    filename: 'coin-up-2',
    title: 'COIN UP II',
    subtitle: 'CYBER CRYPTO HOLD & WIN',
    primaryColor: '#06B6D4',
    secondaryColor: '#8B5CF6',
    accentColor: '#67E8F9',
    bgGradientStart: '#0F172A',
    bgGradientEnd: '#020617',
    iconSvg: `<circle cx="150" cy="72" r="34" fill="url(#cyberCoin)" stroke="#06B6D4" stroke-width="3"/><text x="150" y="80" font-size="28" font-weight="900" fill="#06B6D4" text-anchor="middle" font-family="Arial Black">₿</text>`,
    badgeText: 'CYBER MINT'
  },
  {
    filename: 'coin-strike',
    title: 'COIN STRIKE',
    subtitle: 'LIGHTNING GOLD COLLECTOR',
    primaryColor: '#F59E0B',
    secondaryColor: '#38BDF8',
    accentColor: '#FDE047',
    bgGradientStart: '#1E293B',
    bgGradientEnd: '#0B0F19',
    iconSvg: `<circle cx="150" cy="72" r="34" fill="url(#goldCoinGrad)" stroke="#38BDF8" stroke-width="3"/><polygon points="152,42 140,68 152,68 144,92 164,62 152,62" fill="#38BDF8" stroke="#FFF" stroke-width="1.5"/>`,
    badgeText: 'THUNDER COINS'
  },
  {
    filename: 'coin-strike-2',
    title: 'COIN STRIKE II',
    subtitle: 'PLASMA STORM DUAL STRIKE',
    primaryColor: '#A855F7',
    secondaryColor: '#06B6D4',
    accentColor: '#C084FC',
    bgGradientStart: '#2E1065',
    bgGradientEnd: '#0A051B',
    iconSvg: `<circle cx="150" cy="72" r="34" fill="url(#plasmaGrad)" stroke="#A855F7" stroke-width="3"/><polygon points="146,40 134,66 146,66 138,90 158,60 146,60" fill="#A855F7"/><polygon points="158,45 148,70 158,70 150,92 170,64 158,64" fill="#06B6D4"/>`,
    badgeText: 'PLASMA SURGE'
  },
  {
    filename: '3-coin-treasures',
    title: '3 COIN TREASURES',
    subtitle: 'TRIPLE POT WEALTH FRENZY',
    primaryColor: '#F59E0B',
    secondaryColor: '#10B981',
    accentColor: '#EF4444',
    bgGradientStart: '#450A0A',
    bgGradientEnd: '#1C1917',
    iconSvg: `<circle cx="130" cy="75" r="18" fill="#EF4444" stroke="#FDE047" stroke-width="2"/><circle cx="150" cy="60" r="18" fill="#F59E0B" stroke="#FFF" stroke-width="2"/><circle cx="170" cy="75" r="18" fill="#10B981" stroke="#FDE047" stroke-width="2"/>`,
    badgeText: 'TRIPLE POT'
  },
  {
    filename: 'lucky-jaguar',
    title: 'LUCKY JAGUAR',
    subtitle: 'AMAZON PREDATOR CLAW WILDS',
    primaryColor: '#EAB308',
    secondaryColor: '#15803D',
    accentColor: '#FACC15',
    bgGradientStart: '#14532D',
    bgGradientEnd: '#052E16',
    iconSvg: `<circle cx="150" cy="72" r="36" fill="url(#jaguarGrad)" stroke="#EAB308" stroke-width="3"/><circle cx="140" cy="68" r="4" fill="#10B981"/><circle cx="160" cy="68" r="4" fill="#10B981"/><path d="M125,50 L135,58 M175,50 L165,58" stroke="#000" stroke-width="3"/><path d="M142,84 Q150,92 158,84" stroke="#000" stroke-width="3"/>`,
    badgeText: 'JUNGLE WILDS'
  },
  {
    filename: 'lucky-jaguar-500',
    title: 'LUCKY JAGUAR 500x',
    subtitle: 'SOLAR ECLIPSE 500x FURY',
    primaryColor: '#F97316',
    secondaryColor: '#EAB308',
    accentColor: '#FDE047',
    bgGradientStart: '#7C2D12',
    bgGradientEnd: '#1C1917',
    iconSvg: `<circle cx="150" cy="70" r="40" fill="url(#sunJaguar)" stroke="#FDE047" stroke-width="3"/><text x="150" y="80" font-size="22" font-weight="900" fill="#000" text-anchor="middle" font-family="Arial Black">500x</text>`,
    badgeText: 'SOLAR FURY'
  },
  {
    filename: 'ice-fishing',
    title: 'ICE FISHING',
    subtitle: 'FROZEN WILDS & BIG CATCH',
    primaryColor: '#38BDF8',
    secondaryColor: '#0284C7',
    accentColor: '#BAE6FD',
    bgGradientStart: '#0C4A6E',
    bgGradientEnd: '#082F49',
    iconSvg: `<polygon points="120,70 170,55 180,70 170,85" fill="#38BDF8" stroke="#BAE6FD" stroke-width="2"/><circle cx="135" cy="68" r="3" fill="#FFF"/><polygon points="175,70 190,55 190,85" fill="#0284C7"/>`,
    badgeText: 'FROZEN CATCH'
  },
  {
    filename: 'crazy-hunter',
    title: 'CRAZY HUNTER',
    subtitle: 'STEAMPUNK TARGET BOUNTIES',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    accentColor: '#FBBF24',
    bgGradientStart: '#451A03',
    bgGradientEnd: '#1C1917',
    iconSvg: `<circle cx="150" cy="72" r="34" fill="none" stroke="#FBBF24" stroke-width="4"/><circle cx="150" cy="72" r="18" fill="none" stroke="#D97706" stroke-width="2"/><line x1="150" y1="34" x2="150" y2="110" stroke="#FBBF24" stroke-width="2"/><line x1="112" y1="72" x2="188" y2="72" stroke="#FBBF24" stroke-width="2"/>`,
    badgeText: 'TARGET LOCK'
  },
  {
    filename: 'crazy-hunter-2',
    title: 'CRAZY HUNTER II',
    subtitle: 'VOLCANIC SEA MONSTER BOUNTY',
    primaryColor: '#DC2626',
    secondaryColor: '#EA580C',
    accentColor: '#FCA5A5',
    bgGradientStart: '#7F1D1D',
    bgGradientEnd: '#1C1917',
    iconSvg: `<circle cx="150" cy="72" r="34" fill="none" stroke="#DC2626" stroke-width="4"/><polygon points="150,45 160,65 185,65 165,80 175,100 150,85 125,100 135,80 115,65 140,65" fill="#EA580C"/>`,
    badgeText: 'MAGMA HUNT'
  },
  {
    filename: 'rollx',
    title: 'ROLL X',
    subtitle: 'HIGH-TECH DICE REEL MODIFIERS',
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    accentColor: '#C4B5FD',
    bgGradientStart: '#2E1065',
    bgGradientEnd: '#090514',
    iconSvg: `<rect x="125" y="47" width="50" height="50" rx="10" fill="url(#diceGrad)" stroke="#C4B5FD" stroke-width="3"/><circle cx="138" cy="60" r="4" fill="#FFF"/><circle cx="162" cy="60" r="4" fill="#FFF"/><circle cx="150" cy="72" r="4" fill="#FFF"/><circle cx="138" cy="84" r="4" fill="#FFF"/><circle cx="162" cy="84" r="4" fill="#FFF"/>`,
    badgeText: 'DICE MODIFIER'
  },
  {
    filename: 'vortex',
    title: 'VORTEX',
    subtitle: 'INTERSTELLAR COSMIC SURGE',
    primaryColor: '#6366F1',
    secondaryColor: '#A855F7',
    accentColor: '#A5B4FC',
    bgGradientStart: '#1E1B4B',
    bgGradientEnd: '#020617',
    iconSvg: `<circle cx="150" cy="72" r="36" fill="url(#vortexGrad)" stroke="#A5B4FC" stroke-width="2"/><ellipse cx="150" cy="72" rx="30" ry="12" fill="none" stroke="#6366F1" stroke-width="3" transform="rotate(30 150 72)"/><ellipse cx="150" cy="72" rx="30" ry="12" fill="none" stroke="#A855F7" stroke-width="3" transform="rotate(-30 150 72)"/>`,
    badgeText: 'COSMIC SURGE'
  },
  {
    filename: 'classic-slots',
    title: 'CLASSIC SLOTS',
    subtitle: 'AUTHENTIC VEGAS TRIPLE LINE',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    accentColor: '#FDE047',
    bgGradientStart: '#451A03',
    bgGradientEnd: '#1C1917',
    iconSvg: `<rect x="118" y="45" width="64" height="54" rx="8" fill="#1E293B" stroke="#FDE047" stroke-width="3"/><text x="132" y="82" font-size="28" font-weight="900" fill="#EF4444" font-family="Arial Black">7</text><text x="154" y="82" font-size="28" font-weight="900" fill="#F59E0B" font-family="Arial Black">7</text>`,
    badgeText: 'VEGAS VINTAGE'
  },
  {
    filename: 'treasure-fortune',
    title: 'TREASURE FORTUNE',
    subtitle: 'PIRATE GALLEON DOUBLOONS',
    primaryColor: '#EAB308',
    secondaryColor: '#B45309',
    accentColor: '#FEF08A',
    bgGradientStart: '#451A03',
    bgGradientEnd: '#0F172A',
    iconSvg: `<path d="M125,75 Q150,60 175,75 L170,95 L130,95 Z" fill="#78350F" stroke="#EAB308" stroke-width="3"/><path d="M125,75 Q150,55 175,75" fill="#B45309"/><circle cx="150" cy="80" r="5" fill="#EAB308"/>`,
    badgeText: 'PIRATE CHEST'
  },
  {
    filename: 'golden-pharaoh',
    title: 'GOLDEN PHARAOH 777',
    subtitle: 'ANCIENT EGYPTIAN PYRAMID JACKPOT',
    primaryColor: '#F59E0B',
    secondaryColor: '#06B6D4',
    accentColor: '#FDE047',
    bgGradientStart: '#713F12',
    bgGradientEnd: '#172554',
    iconSvg: `<polygon points="150,38 190,95 110,95" fill="url(#pharaohGrad)" stroke="#06B6D4" stroke-width="3"/><circle cx="150" cy="72" r="12" fill="#06B6D4"/><path d="M140,72 Q150,60 160,72 Q150,84 140,72" fill="#FFF"/>`,
    badgeText: 'PHARAOH 777'
  },
  {
    filename: 'fruit-slots',
    title: 'FRUIT SLOTS',
    subtitle: 'JUICY RETRO NEON FRENZY',
    primaryColor: '#EC4899',
    secondaryColor: '#84CC16',
    accentColor: '#F472B6',
    bgGradientStart: '#701A75',
    bgGradientEnd: '#1A2E05',
    iconSvg: `<circle cx="140" cy="78" r="14" fill="#EF4444"/><circle cx="160" cy="78" r="14" fill="#EF4444"/><path d="M140,65 Q150,45 160,45" stroke="#15803D" stroke-width="3" fill="none"/><path d="M160,65 Q150,45 160,45" stroke="#15803D" stroke-width="3" fill="none"/>`,
    badgeText: 'RETRO JUICY'
  },
  {
    filename: 'treasure-slots',
    title: 'TREASURE SLOTS',
    subtitle: 'AZTEC GOLDEN IDOL SURGE',
    primaryColor: '#F59E0B',
    secondaryColor: '#10B981',
    accentColor: '#FDE047',
    bgGradientStart: '#451A03',
    bgGradientEnd: '#064E3B',
    iconSvg: `<rect x="125" y="45" width="50" height="54" rx="12" fill="url(#aztecGrad)" stroke="#10B981" stroke-width="3"/><rect x="135" y="60" width="8" height="6" fill="#000"/><rect x="157" y="60" width="8" height="6" fill="#000"/><rect x="140" y="78" width="20" height="8" rx="3" fill="#000"/>`,
    badgeText: 'AZTEC IDOL'
  },
  {
    filename: 'neon-slots',
    title: 'NEON SLOTS',
    subtitle: '80s SYNTHWAVE RETRO GLOW',
    primaryColor: '#EC4899',
    secondaryColor: '#06B6D4',
    accentColor: '#F472B6',
    bgGradientStart: '#581C87',
    bgGradientEnd: '#090514',
    iconSvg: `<polygon points="150,38 185,95 115,95" fill="none" stroke="#EC4899" stroke-width="4"/><circle cx="150" cy="72" r="16" fill="none" stroke="#06B6D4" stroke-width="3"/><path d="M110,105 L190,105" stroke="#06B6D4" stroke-width="2"/>`,
    badgeText: 'SYNTH GLOW'
  },
  {
    filename: 'lucky-sevens',
    title: 'LUCKY SEVENS',
    subtitle: 'BLAZING INFERNO 777 FRENZY',
    primaryColor: '#EF4444',
    secondaryColor: '#F97316',
    accentColor: '#FDE047',
    bgGradientStart: '#7F1D1D',
    bgGradientEnd: '#1C1917',
    iconSvg: `<text x="135" y="85" font-size="42" font-weight="900" fill="#EF4444" stroke="#FDE047" stroke-width="2" font-family="Arial Black">7</text><text x="160" y="85" font-size="42" font-weight="900" fill="#F97316" stroke="#FDE047" stroke-width="2" font-family="Arial Black">7</text>`,
    badgeText: 'HOT 777'
  },
  {
    filename: 'safari-stampede',
    title: 'SAFARI STAMPEDE',
    subtitle: 'AFRICAN SAVANNA 100x MULTIPLIER',
    primaryColor: '#EA580C',
    secondaryColor: '#D97706',
    accentColor: '#FDE047',
    bgGradientStart: '#7C2D12',
    bgGradientEnd: '#1C1917',
    iconSvg: `<path d="M125,85 Q135,55 150,55 Q165,55 175,85" fill="#D97706" stroke="#FDE047" stroke-width="3"/><circle cx="140" cy="65" r="4" fill="#000"/><circle cx="160" cy="65" r="4" fill="#000"/><path d="M120,60 Q130,50 140,55 M180,60 Q170,50 160,55" stroke="#FDE047" stroke-width="4" fill="none"/>`,
    badgeText: 'SAVANNA 100x'
  },
  {
    filename: 'cyberpunk-reels',
    title: 'CYBERPUNK 2077',
    subtitle: 'NEO-TOKYO GLITCH OVERDRIVE',
    primaryColor: '#22D3EE',
    secondaryColor: '#E11D48',
    accentColor: '#FDE047',
    bgGradientStart: '#0F172A',
    bgGradientEnd: '#020617',
    iconSvg: `<polygon points="120,50 180,50 170,95 130,95" fill="#0F172A" stroke="#22D3EE" stroke-width="3"/><text x="150" y="80" font-size="20" font-weight="900" fill="#E11D48" text-anchor="middle" font-family="Courier New">2077</text><line x1="115" y1="65" x2="185" y2="65" stroke="#FDE047" stroke-width="2"/>`,
    badgeText: 'NEO-TOKYO'
  },
  {
    filename: 'diamond-deluxe',
    title: 'DIAMOND DELUXE',
    subtitle: '5-REEL MONTE CARLO ROYALE',
    primaryColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    accentColor: '#F8FAFC',
    bgGradientStart: '#0369A1',
    bgGradientEnd: '#082F49',
    iconSvg: `<polygon points="150,38 185,65 150,105 115,65" fill="url(#diamondRoyale)" stroke="#F8FAFC" stroke-width="3"/><polygon points="150,38 165,65 150,85 135,65" fill="#E0F2FE"/>`,
    badgeText: '5-REEL ROYALE'
  }
];

function generateSvgContent(def) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${def.bgGradientStart}" />
      <stop offset="100%" stop-color="${def.bgGradientEnd}" />
    </linearGradient>
    <linearGradient id="tigerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="jadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6EE7B7" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="oxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#7E22CE" />
    </linearGradient>
    <linearGradient id="cyanGemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9" />
      <stop offset="100%" stop-color="#0E7490" />
    </linearGradient>
    <linearGradient id="amethystGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E879F9" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>
    <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDA4AF" />
      <stop offset="100%" stop-color="#BE123C" />
    </linearGradient>
    <linearGradient id="vaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="100%" stop-color="#854D0E" />
    </linearGradient>
    <linearGradient id="goldCrown" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="treeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#86EFAC" />
      <stop offset="100%" stop-color="#15803D" />
    </linearGradient>
    <linearGradient id="pigGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBCFE8" />
      <stop offset="100%" stop-color="#BE185D" />
    </linearGradient>
    <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="cyberCoin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A5F3FC" />
      <stop offset="100%" stop-color="#0891B2" />
    </linearGradient>
    <linearGradient id="plasmaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#6B21A8" />
    </linearGradient>
    <linearGradient id="jaguarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#A16207" />
    </linearGradient>
    <linearGradient id="sunJaguar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FED7AA" />
      <stop offset="100%" stop-color="#C2410C" />
    </linearGradient>
    <linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C4B5FD" />
      <stop offset="100%" stop-color="#5B21B6" />
    </linearGradient>
    <linearGradient id="vortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A5B4FC" />
      <stop offset="100%" stop-color="#312E81" />
    </linearGradient>
    <linearGradient id="pharaohGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#854D0E" />
    </linearGradient>
    <linearGradient id="aztecGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="diamondRoyale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2FE" />
      <stop offset="100%" stop-color="#0369A1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Frame Background with Rich Metallic Borders -->
  <rect x="6" y="6" width="288" height="188" rx="22" fill="url(#bgGrad)" stroke="${def.primaryColor}" stroke-width="3" filter="url(#glow)" />
  <rect x="12" y="12" width="276" height="176" rx="18" fill="none" stroke="${def.accentColor}" stroke-width="1" stroke-dasharray="6,4" opacity="0.6" />

  <!-- Thematic Emblem / Icon Art -->
  <g transform="translate(0, 0)">
    ${def.iconSvg}
  </g>

  <!-- Badge / Tier Pill -->
  ${def.badgeText ? `
  <rect x="90" y="116" width="120" height="18" rx="9" fill="${def.secondaryColor}" opacity="0.9" />
  <text x="150" y="129" font-size="9" font-weight="900" fill="#FFFFFF" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" letter-spacing="1.5">
    ${def.badgeText}
  </text>` : ''}

  <!-- Main Game Title with 3D Shadow -->
  <text x="152" y="157" font-size="20" font-weight="900" fill="#000000" text-anchor="middle" font-family="'Cinzel', 'Arial Black', Georgia, serif" letter-spacing="1" opacity="0.8">
    ${def.title}
  </text>
  <text x="150" y="155" font-size="20" font-weight="900" fill="${def.accentColor}" text-anchor="middle" font-family="'Cinzel', 'Arial Black', Georgia, serif" letter-spacing="1">
    ${def.title}
  </text>

  <!-- Subtitle / Feature Mechanics Line -->
  <text x="150" y="174" font-size="7.5" font-weight="800" fill="${def.primaryColor}" text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" letter-spacing="1.2">
    ${def.subtitle}
  </text>
</svg>`;
}

LOGOS.forEach(def => {
  const svgContent = generateSvgContent(def);
  const svgPath = path.join(LOGOS_DIR, `${def.filename}.svg`);
  fs.writeFileSync(svgPath, svgContent, 'utf8');
});

console.log(`Successfully generated ${LOGOS.length} unique slot game vector logos in ${LOGOS_DIR}`);
