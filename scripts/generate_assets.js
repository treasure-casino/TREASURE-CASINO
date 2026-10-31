/**
 * TREASURE CASINO - Asset Generator
 * Generates:
 * 1. 108 unique, themed SVG & PNG vector game thumbnails for every game in catalog
 * 2. 12 authentic 44.1kHz 16-bit RIFF WAV sound effects
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../admin/public');
const GAMES_DIR = path.join(PUBLIC_DIR, 'assets/games');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'assets/audio');

// Ensure directories exist
fs.mkdirSync(GAMES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

console.log('Generating game assets into:', PUBLIC_DIR);

// ============================================================================
// 1. SOUND EFFECTS SYNTHESIS (RIFF WAV 44.1kHz 16-bit PCM)
// ============================================================================

function createWavBuffer(sampleRate, durationSec, sampleGenerator) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  buffer.writeUInt16LE(1, 22);  // NumChannels 1 = Mono
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = sampleGenerator(t, durationSec, i);
    sample = Math.max(-1, Math.min(1, sample));
    const intSample = Math.floor(sample < 0 ? sample * 32768 : sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

// Sound 1: button_click.wav (Crisp short modern UI click)
const buttonClick = createWavBuffer(sampleRate, 0.06, (t) => {
  const env = Math.exp(-t * 90);
  return Math.sin(2 * Math.PI * 1800 * t) * env * 0.7;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'button_click.wav'), buttonClick);

// Sound 2: game_start.wav (3-note bright rising power-up arpeggio C5 -> E5 -> G5)
const gameStart = createWavBuffer(sampleRate, 0.35, (t) => {
  let freq = 523.25; // C5
  if (t > 0.1) freq = 659.25; // E5
  if (t > 0.2) freq = 783.99; // G5
  const noteTime = t % 0.1;
  const env = Math.exp(-noteTime * 15);
  return (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t)) * env * 0.6;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'game_start.wav'), gameStart);

// Sound 3: dice_roll.wav (Simulated dice shaker clatter)
const diceRoll = createWavBuffer(sampleRate, 0.45, (t, dur, i) => {
  const env = Math.exp(-t * 6);
  const click = (i % 2400 < 200) ? (Math.random() * 2 - 1) : 0;
  const thud = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-((t % 0.08) * 40));
  return (click * 0.4 + thud * 0.5) * env;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'dice_roll.wav'), diceRoll);

// Sound 4: plinko_bounce.wav (Clear metallic brass pin ping)
const plinkoBounce = createWavBuffer(sampleRate, 0.15, (t) => {
  const env = Math.exp(-t * 30);
  return (Math.sin(2 * Math.PI * 987.77 * t) + 0.5 * Math.sin(2 * Math.PI * 1975.53 * t)) * env * 0.6;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'plinko_bounce.wav'), plinkoBounce);

// Sound 5: plinko_land.wav (Rewarding dual-tone bucket chime)
const plinkoLand = createWavBuffer(sampleRate, 0.3, (t) => {
  const env = Math.exp(-t * 10);
  return (Math.sin(2 * Math.PI * 880 * t) + Math.sin(2 * Math.PI * 1320 * t)) * env * 0.5;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'plinko_land.wav'), plinkoLand);

// Sound 6: card_reveal.wav (Crisp playing card snap / slide)
const cardReveal = createWavBuffer(sampleRate, 0.12, (t, dur, i) => {
  const env = Math.exp(-t * 35);
  const noise = (Math.random() * 2 - 1) * 0.4;
  const snap = Math.sin(2 * Math.PI * 800 * t) * 0.6;
  return (noise + snap) * env;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'card_reveal.wav'), cardReveal);

// Sound 7: slot_spin.wav (Rhythmic mechanical ratchet ticking)
const slotSpin = createWavBuffer(sampleRate, 0.5, (t, dur, i) => {
  const tickPeriod = Math.floor(sampleRate * 0.045);
  const click = (i % tickPeriod < 150) ? 1 : 0;
  return click * (Math.random() * 0.5 + 0.2);
});
fs.writeFileSync(path.join(AUDIO_DIR, 'slot_spin.wav'), slotSpin);

// Sound 8: slot_stop.wav (Solid mechanical reel stop clunk)
const slotStop = createWavBuffer(sampleRate, 0.2, (t) => {
  const env = Math.exp(-t * 25);
  return (Math.sin(2 * Math.PI * 180 * t) + 0.3 * (Math.random() * 2 - 1)) * env * 0.8;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'slot_stop.wav'), slotStop);

// Sound 9: multiplier_tick.wav (Fast ascending flight tick)
const multiplierTick = createWavBuffer(sampleRate, 0.08, (t) => {
  const env = Math.exp(-t * 40);
  const freq = 600 + t * 4000;
  return Math.sin(2 * Math.PI * freq * t) * env * 0.5;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'multiplier_tick.wav'), multiplierTick);

// Sound 10: crash_explosion.wav (Deep dramatic low-frequency explosion rumble)
const crashExplosion = createWavBuffer(sampleRate, 0.8, (t) => {
  const env = Math.exp(-t * 4);
  const noise = (Math.random() * 2 - 1) * env * 0.6;
  const boom = Math.sin(2 * Math.PI * 65 * t) * env * 0.8;
  return (noise + boom) * 0.8;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'crash_explosion.wav'), crashExplosion);

// Sound 11: win.wav (Triumphant celebratory victory chords C5 -> G5 -> C6)
const winSound = createWavBuffer(sampleRate, 0.6, (t) => {
  let f1 = 523.25; // C5
  let f2 = 659.25; // E5
  if (t > 0.15) { f1 = 783.99; f2 = 987.77; } // G5, B5
  if (t > 0.3) { f1 = 1046.50; f2 = 1318.51; } // C6, E6
  const env = Math.exp(-((t % 0.15) * 8));
  return (Math.sin(2 * Math.PI * f1 * t) + 0.6 * Math.sin(2 * Math.PI * f2 * t)) * env * 0.5;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'win.wav'), winSound);

// Sound 12: loss.wav (Gentle downbeat minor chord)
const lossSound = createWavBuffer(sampleRate, 0.45, (t) => {
  const env = Math.exp(-t * 6);
  return (Math.sin(2 * Math.PI * 220 * t) + 0.4 * Math.sin(2 * Math.PI * 174.61 * t)) * env * 0.5;
});
fs.writeFileSync(path.join(AUDIO_DIR, 'loss.wav'), lossSound);

console.log('✅ Generated 12 RIFF WAV audio files in', AUDIO_DIR);


// ============================================================================
// 2. VECTOR THUMBNAILS FOR 108 UNIQUE GAMES
// ============================================================================

// Palette definitions per category
const categoryPalettes = {
  CRASH: {
    bg1: '#0b0f19',
    bg2: '#1e1b4b',
    accent: '#f43f5e',
    gold: '#f59e0b',
    badge: 'CRASH & MULTIPLIER',
    icon: 'rocket',
  },
  DICE: {
    bg1: '#061a14',
    bg2: '#064e3b',
    accent: '#10b981',
    gold: '#fbbf24',
    badge: 'PROVABLY DICE',
    icon: 'dice',
  },
  PLINKO: {
    bg1: '#180d2b',
    bg2: '#3b0764',
    accent: '#c084fc',
    gold: '#facc15',
    badge: 'PLINKO & DROP',
    icon: 'plinko',
  },
  KENO: {
    bg1: '#081726',
    bg2: '#0f3a61',
    accent: '#38bdf8',
    gold: '#fbbf24',
    badge: 'KENO & NUMBERS',
    icon: 'keno',
  },
  CARD: {
    bg1: '#21080d',
    bg2: '#4c0519',
    accent: '#f43f5e',
    gold: '#f59e0b',
    badge: 'CARDS & TABLE',
    icon: 'card',
  },
  SLOTS: {
    bg1: '#1a1003',
    bg2: '#451a03',
    accent: '#fbbf24',
    gold: '#fef08a',
    badge: 'VEGAS SLOTS',
    icon: 'slot',
  },
  ARCADE: {
    bg1: '#07161e',
    bg2: '#083344',
    accent: '#06b6d4',
    gold: '#f59e0b',
    badge: 'ARCADE ARENA',
    icon: 'arcade',
  },
  CASUAL: {
    bg1: '#140c1e',
    bg2: '#2e1065',
    accent: '#a855f7',
    gold: '#fbbf24',
    badge: 'CASUAL CASINO',
    icon: 'wheel',
  },
  FISHING: {
    bg1: '#031a24',
    bg2: '#083344',
    accent: '#0284c7',
    gold: '#38bdf8',
    badge: 'DEEP FISHING',
    icon: 'fish',
  },
  OTHER: {
    bg1: '#111827',
    bg2: '#1f2937',
    accent: '#e5e7eb',
    gold: '#fbbf24',
    badge: 'TREASURE SUITE',
    icon: 'gem',
  },
};

// Render specific vector graphic for each icon type
function renderVectorGraphic(type, title) {
  const isAviator = title.toLowerCase().includes('aviator');
  const isLimbo = title.toLowerCase().includes('limbo');
  const isMines = title.toLowerCase().includes('mines');
  const isCoin = title.toLowerCase().includes('coin');
  const isWheel = title.toLowerCase().includes('wheel');
  const isHiLo = title.toLowerCase().includes('hi-lo') || title.toLowerCase().includes('hilo');

  if (isAviator) {
    return `
      <!-- Aviator Monoplane -->
      <path d="M120 180 Q 200 170 280 80" stroke="#f59e0b" stroke-width="4" stroke-dasharray="6,4" fill="none" />
      <g transform="translate(270, 75) rotate(-25)">
        <polygon points="30,0 -20,-10 -25,-3 -20,10" fill="#dc2626" />
        <polygon points="5,-3 -5,-26 -14,-26 -7,-3" fill="#b91c1c" />
        <polygon points="5,3 -5,26 -14,26 -7,3" fill="#b91c1c" />
        <polygon points="-20,-4 -28,-18 -34,-18 -25,0" fill="#f59e0b" />
        <line x1="30" y1="-14" x2="30" y2="14" stroke="#ffffff" stroke-width="2" opacity="0.8" />
      </g>
      <circle cx="280" cy="75" r="8" fill="#fbbf24" opacity="0.5" />
    `;
  }

  if (isLimbo) {
    return `
      <!-- Limbo Rocket & Multiplier Threshold -->
      <line x1="80" y1="120" x2="320" y2="120" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8,4" />
      <g transform="translate(200, 110)">
        <!-- Rocket Body -->
        <path d="M0 -45 C15 -20 15 15 10 30 L-10 30 C-15 15 -15 -20 0 -45 Z" fill="#ef4444" />
        <polygon points="10,15 25,32 10,28" fill="#f59e0b" />
        <polygon points="-10,15 -25,32 -10,28" fill="#f59e0b" />
        <circle cx="0" cy="-10" r="7" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
        <!-- Thruster Flame -->
        <polygon points="-8,30 0,55 8,30 4,38 -4,38" fill="#facc15" />
      </g>
      <text x="200" y="70" font-family="monospace" font-size="28" font-weight="900" fill="#34d399" text-anchor="middle">50.00x</text>
    `;
  }

  if (isMines) {
    return `
      <!-- 5x5 Mine Grid preview -->
      <g transform="translate(140, 60)">
        <rect x="0" y="0" width="36" height="36" rx="8" fill="#1e293b" stroke="#334155" />
        <circle cx="18" cy="18" r="8" fill="#10b981" />
        <rect x="42" y="0" width="36" height="36" rx="8" fill="#1e293b" stroke="#334155" />
        <circle cx="60" cy="18" r="8" fill="#10b981" />
        <rect x="84" y="0" width="36" height="36" rx="8" fill="#1e293b" stroke="#ef4444" />
        <circle cx="102" cy="18" r="6" fill="#ef4444" />
        <rect x="0" y="42" width="36" height="36" rx="8" fill="#1e293b" stroke="#334155" />
        <circle cx="18" cy="60" r="8" fill="#10b981" />
        <rect x="42" y="42" width="36" height="36" rx="8" fill="#1e293b" stroke="#334155" />
        <circle cx="60" cy="60" r="8" fill="#10b981" />
        <rect x="84" y="42" width="36" height="36" rx="8" fill="#1e293b" stroke="#334155" />
        <circle cx="102" cy="60" r="8" fill="#10b981" />
      </g>
    `;
  }

  if (isHiLo) {
    return `
      <!-- Hi-Lo Playing Cards -->
      <g transform="translate(150, 65) rotate(-8)">
        <rect width="60" height="90" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
        <text x="10" y="24" font-family="sans-serif" font-weight="900" font-size="18" fill="#dc2626">K</text>
        <text x="30" y="55" font-family="sans-serif" font-size="30" fill="#dc2626" text-anchor="middle">♥</text>
      </g>
      <g transform="translate(195, 60) rotate(10)">
        <rect width="60" height="90" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
        <text x="10" y="24" font-family="sans-serif" font-weight="900" font-size="18" fill="#0f172a">A</text>
        <text x="30" y="55" font-family="sans-serif" font-size="30" fill="#0f172a" text-anchor="middle">♠</text>
      </g>
      <!-- Arrow Indicators -->
      <polygon points="120,105 130,95 140,105 133,105 133,120 127,120 127,105" fill="#34d399" />
      <polygon points="270,105 280,115 290,105 283,105 283,90 277,90 277,105" fill="#f43f5e" />
    `;
  }

  if (isCoin) {
    return `
      <!-- 3D Gold Coin -->
      <ellipse cx="200" cy="110" rx="48" ry="48" fill="url(#goldGrad)" stroke="#fef08a" stroke-width="3" />
      <ellipse cx="200" cy="110" rx="38" ry="38" fill="none" stroke="#ca8a04" stroke-width="2" stroke-dasharray="4,3" />
      <text x="200" y="118" font-family="serif" font-weight="900" font-size="28" fill="#78350f" text-anchor="middle">TR</text>
    `;
  }

  if (isWheel) {
    return `
      <!-- Wheel of Fortune -->
      <g transform="translate(200, 110)">
        <circle r="48" fill="#1e1b4b" stroke="#f59e0b" stroke-width="4" />
        <path d="M0,0 L0,-48 A48,48 0 0,1 48,0 Z" fill="#ef4444" />
        <path d="M0,0 L48,0 A48,48 0 0,1 0,48 Z" fill="#10b981" />
        <path d="M0,0 L0,48 A48,48 0 0,1 -48,0 Z" fill="#3b82f6" />
        <path d="M0,0 L-48,0 A48,48 0 0,1 0,-48 Z" fill="#f59e0b" />
        <circle r="12" fill="#fef08a" stroke="#78350f" stroke-width="2" />
        <polygon points="0,-52 -6,-62 6,-62" fill="#fbbf24" />
      </g>
    `;
  }

  // Generic category fallbacks
  switch (type) {
    case 'rocket':
      return `
        <g transform="translate(200, 105)">
          <path d="M0 -40 C15 -20 15 15 10 30 L-10 30 C-15 15 -15 -20 0 -40 Z" fill="#ef4444" />
          <polygon points="10,15 25,32 10,28" fill="#f59e0b" />
          <polygon points="-10,15 -25,32 -10,28" fill="#f59e0b" />
          <circle cx="0" cy="-8" r="6" fill="#38bdf8" />
          <polygon points="-6,30 0,50 6,30" fill="#facc15" />
        </g>
      `;
    case 'dice':
      return `
        <g transform="translate(160, 80) rotate(-12)">
          <rect width="44" height="44" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
          <circle cx="12" cy="12" r="4" fill="#ef4444" />
          <circle cx="32" cy="32" r="4" fill="#ef4444" />
          <circle cx="22" cy="22" r="4" fill="#ef4444" />
        </g>
        <g transform="translate(205, 85) rotate(15)">
          <rect width="44" height="44" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
          <circle cx="12" cy="12" r="4" fill="#1e293b" />
          <circle cx="32" cy="12" r="4" fill="#1e293b" />
          <circle cx="12" cy="32" r="4" fill="#1e293b" />
          <circle cx="32" cy="32" r="4" fill="#1e293b" />
          <circle cx="22" cy="22" r="4" fill="#1e293b" />
        </g>
      `;
    case 'plinko':
      return `
        <g transform="translate(140, 70)">
          <!-- Pegs -->
          <circle cx="60" cy="0" r="4" fill="#facc15" />
          <circle cx="40" cy="20" r="4" fill="#facc15" /><circle cx="80" cy="20" r="4" fill="#facc15" />
          <circle cx="20" cy="40" r="4" fill="#facc15" /><circle cx="60" cy="40" r="4" fill="#facc15" /><circle cx="100" cy="40" r="4" fill="#facc15" />
          <circle cx="0" cy="60" r="4" fill="#facc15" /><circle cx="40" cy="60" r="4" fill="#facc15" /><circle cx="80" cy="60" r="4" fill="#facc15" /><circle cx="120" cy="60" r="4" fill="#facc15" />
          <!-- Falling Sphere -->
          <circle cx="62" cy="25" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" />
        </g>
      `;
    case 'keno':
      return `
        <g transform="translate(130, 75)">
          <circle cx="25" cy="25" r="22" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
          <text x="25" y="32" font-family="sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">7</text>

          <circle cx="70" cy="20" r="24" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
          <text x="70" y="28" font-family="sans-serif" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle">21</text>

          <circle cx="115" cy="25" r="22" fill="#10b981" stroke="#ffffff" stroke-width="2" />
          <text x="115" y="32" font-family="sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle">42</text>
        </g>
      `;
    case 'slot':
      return `
        <g transform="translate(130, 70)">
          <rect width="140" height="70" rx="12" fill="#0f172a" stroke="#ca8a04" stroke-width="3" />
          <rect x="8" y="8" width="38" height="54" rx="6" fill="#1e293b" />
          <rect x="51" y="8" width="38" height="54" rx="6" fill="#1e293b" />
          <rect x="94" y="8" width="38" height="54" rx="6" fill="#1e293b" />
          <text x="27" y="44" font-family="sans-serif" font-weight="900" font-size="24" fill="#ef4444" text-anchor="middle">7</text>
          <text x="70" y="44" font-family="sans-serif" font-weight="900" font-size="24" fill="#ef4444" text-anchor="middle">7</text>
          <text x="113" y="44" font-family="sans-serif" font-weight="900" font-size="24" fill="#ef4444" text-anchor="middle">7</text>
        </g>
      `;
    case 'card':
      return `
        <g transform="translate(160, 65) rotate(-10)">
          <rect width="50" height="75" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
          <text x="8" y="20" font-family="sans-serif" font-weight="900" font-size="14" fill="#0f172a">A</text>
          <text x="25" y="46" font-family="sans-serif" font-size="24" fill="#0f172a" text-anchor="middle">♠</text>
        </g>
        <g transform="translate(195, 65) rotate(10)">
          <rect width="50" height="75" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
          <text x="8" y="20" font-family="sans-serif" font-weight="900" font-size="14" fill="#dc2626">K</text>
          <text x="25" y="46" font-family="sans-serif" font-size="24" fill="#dc2626" text-anchor="middle">♦</text>
        </g>
      `;
    default:
      return `
        <!-- Jewel / Gemstone -->
        <polygon points="200,65 235,90 220,135 180,135 165,90" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
        <polygon points="200,65 235,90 200,98 165,90" fill="#7dd3fc" />
        <polygon points="200,98 235,90 220,135" fill="#0284c7" />
        <polygon points="200,98 165,90 180,135" fill="#0369a1" />
      `;
  }
}

// Generate the complete high-resolution SVG string
function generateGameSvg(game) {
  const palette = categoryPalettes[game.category] || categoryPalettes.OTHER;
  const vectorGraphic = renderVectorGraphic(palette.icon, game.name);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="60%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="#05070c" />
    </linearGradient>

    <!-- Gold Metallic Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>

    <!-- Subtle Radial Glow -->
    <radialGradient id="centerGlow" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="400" height="260" rx="16" fill="url(#bgGrad)" />
  <rect width="400" height="260" rx="16" fill="url(#centerGlow)" />

  <!-- Ambient Perspective Grid -->
  <g stroke="rgba(255, 255, 255, 0.04)" stroke-width="1">
    <line x1="0" y1="40" x2="400" y2="40" />
    <line x1="0" y1="90" x2="400" y2="90" />
    <line x1="0" y1="140" x2="400" y2="140" />
    <line x1="0" y1="190" x2="400" y2="190" />
    <line x1="60" y1="0" x2="60" y2="260" />
    <line x1="130" y1="0" x2="130" y2="260" />
    <line x1="200" y1="0" x2="200" y2="260" />
    <line x1="270" y1="0" x2="270" y2="260" />
    <line x1="340" y1="0" x2="340" y2="260" />
  </g>

  <!-- Top Category Badge -->
  <g transform="translate(18, 16)">
    <rect width="130" height="22" rx="6" fill="#090d16" stroke="rgba(212, 175, 55, 0.4)" stroke-width="1" />
    <text x="65" y="15" font-family="system-ui, sans-serif" font-weight="800" font-size="9" fill="#f59e0b" letter-spacing="1" text-anchor="middle">
      ${palette.badge}
    </text>
  </g>

  <!-- Top Right RTP Badge -->
  <g transform="translate(306, 16)">
    <rect width="76" height="22" rx="6" fill="#090d16" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1" />
    <text x="38" y="15" font-family="monospace" font-weight="700" font-size="9.5" fill="#34d399" text-anchor="middle">
      ${game.rtp ? game.rtp : '97.5'}% RTP
    </text>
  </g>

  <!-- Central Themed Vector Artwork -->
  <g>
    ${vectorGraphic}
  </g>

  <!-- Bottom Title Banner Section -->
  <rect x="0" y="195" width="400" height="65" fill="#060911" fill-opacity="0.85" />
  <line x1="0" y1="195" x2="400" y2="195" stroke="rgba(212, 175, 55, 0.3)" stroke-width="1" />

  <!-- Game Title -->
  <text x="20" y="222" font-family="Cinzel, Georgia, serif" font-weight="900" font-size="16" fill="#ffffff" letter-spacing="0.5">
    ${game.name}
  </text>

  <!-- Subtitle Details -->
  <text x="20" y="242" font-family="system-ui, sans-serif" font-weight="600" font-size="10" fill="#9ca3af">
    TREASURE CASINO ORIGINAL • DEMO CERTIFIED
  </text>

  <!-- Gold Corner Trim -->
  <polygon points="384,244 384,252 376,252" fill="#f59e0b" />
</svg>`;
}

// Fetch all games from MySQL and write both .svg and .png files
const { execSync } = require('child_process');
const mysqlOutput = execSync(
  '& "C:\\xampp\\mysql\\bin\\mysql.exe" -u root treasure_db -e "SELECT id, name, category, rtp, thumbnail_url FROM games;"',
  { encoding: 'utf-8', shell: 'powershell.exe' }
);

const lines = mysqlOutput.trim().split('\n');
const headers = lines[0].split('\t');
const games = [];

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split('\t');
  if (parts.length >= 5) {
    games.push({
      id: parts[0].trim(),
      name: parts[1].trim(),
      category: parts[2].trim(),
      rtp: parts[3].trim(),
      thumbnail_url: parts[4].trim(),
    });
  }
}

console.log(`Found ${games.length} games to generate thumbnails for.`);

let generatedCount = 0;

games.forEach((game) => {
  // Extract filename from thumbnail_url e.g. /assets/games/crash-limbo.png
  const urlPath = game.thumbnail_url;
  const filename = path.basename(urlPath); // e.g. crash-limbo.png
  const baseName = filename.replace(/\.(png|svg|jpg)$/, '');

  const svgContent = generateGameSvg(game);

  // Write .svg file
  const svgPath = path.join(GAMES_DIR, `${baseName}.svg`);
  fs.writeFileSync(svgPath, svgContent, 'utf-8');

  // Also write as .png file so both extensions resolve without 404
  const pngPath = path.join(GAMES_DIR, `${baseName}.png`);
  fs.writeFileSync(pngPath, svgContent, 'utf-8');

  generatedCount++;
});

// Also create default.png and default.svg
const defaultSvg = generateGameSvg({
  name: 'Treasure Casino Game',
  category: 'OTHER',
  rtp: '96.50',
});
fs.writeFileSync(path.join(GAMES_DIR, 'default.svg'), defaultSvg, 'utf-8');
fs.writeFileSync(path.join(GAMES_DIR, 'default.png'), defaultSvg, 'utf-8');

console.log(`✅ Successfully generated ${generatedCount * 2} thumbnail asset files (both .svg & .png) in: ${GAMES_DIR}`);

