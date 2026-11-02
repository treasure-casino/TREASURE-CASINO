import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  HelpCircle,
  Zap,
  RotateCcw,
  Square,
  Play,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  Shield,
  Coins,
  ChevronRight,
} from 'lucide-react';
import {
  chickenRunApi,
  ChickenDifficulty,
  ChickenRunConfig,
  ChickenRunHistoryItem,
  TileDetail,
} from '../../../services/api/chickenRunApi';

// ─── AUDIO ENGINE (Web Audio API Synthesizer) ───────────────────────────────────
class ChickenAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmInterval: number | null = null;

  constructor() {
    // Initialized lazily on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isBgmPlaying) {
      this.stopBgm();
    }
  }

  playHop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    // Cheerful upward bounce frequency sweep
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playSafeCoin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [659.25, 880, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.18, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    });
  }

  playCashout() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.22, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.38);
    });
  }

  playBust() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  startBgm() {
    if (this.isMuted || this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
    let noteIdx = 0;

    this.bgmInterval = window.setInterval(() => {
      if (!this.isBgmPlaying || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[noteIdx % notes.length], now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      noteIdx++;
    }, 320);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  isBgmActive(): boolean {
    return this.isBgmPlaying;
  }
}

const audio = new ChickenAudioEngine();

// ─── REALISTIC 3D ANIMATED CHICKEN CHARACTER ─────────────────────────────────
const Realistic3DChicken: React.FC<{
  isJumping: boolean;
  isBusted: boolean;
  isVictory: boolean;
  scale?: number;
}> = ({ isJumping, isBusted, isVictory, scale = 1 }) => {
  return (
    <div
      style={{
        transform: `scale(${scale}) ${
          isJumping ? 'translateY(-28px) scaleY(1.05) rotate(-3deg)' : ''
        } ${isBusted ? 'rotate(16deg) translateY(4px) scale(0.92)' : ''} ${
          isVictory ? 'scale(1.12) translateY(-6px)' : ''
        }`,
        transition: 'transform 0.22s cubic-bezier(0.25, 1.25, 0.5, 1)',
      }}
      className="relative flex items-center justify-center select-none pointer-events-none filter drop-shadow-[0_10px_16px_rgba(0,0,0,0.65)]"
    >
      <svg
        width="88"
        height="98"
        viewBox="0 0 120 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isBusted ? 'animate-shake' : isVictory ? 'animate-bounce' : ''}
      >
        <defs>
          {/* Volumetric Body Radial Gradient (Keylight top-left) */}
          <radialGradient id="realBodyShade" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          {/* Realistic Neck Hackle Feathers Gradient */}
          <linearGradient id="realHackleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Deep Iridescent Sickle Tail Feathers */}
          <linearGradient id="realTailGrad1" x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="45%" stopColor="#047857" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          <linearGradient id="realTailGrad2" x1="0" y1="1" x2="0.8" y2="0">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#1e3a8a" />
            <stop offset="85%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Fleshy 3D Comb & Wattle Gradient with Subsurface Glow */}
          <radialGradient id="realCombFlesh" cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="40%" stopColor="#dc2626" />
            <stop offset="80%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Realistic Translucent Horn Beak Gradient */}
          <linearGradient id="realBeakGrad" x1="0" y1="0" x2="1" y2="0.8">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Scaled Reptilian Leg Scutes Gradient */}
          <linearGradient id="realLegGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="80%" stopColor="#a16207" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>

          {/* 3D Glassy Avian Eye Radial Gradient */}
          <radialGradient id="realEyeIris" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="80%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#431407" />
          </radialGradient>

          {/* Wing Tier Shading */}
          <linearGradient id="realWingTier1" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#fcd34d" />
            <stop offset="85%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id="realWingTier2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          {/* Ambient Occlusion Drop Shadow */}
          <radialGradient id="realContactShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.7)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0.35)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Golden Aura Glow for Victory */}
          <filter id="goldenAura" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── GROUND CONTACT AMBIENT OCCLUSION SHADOW ── */}
        <ellipse
          cx="58"
          cy="122"
          rx={isJumping ? '16' : '36'}
          ry={isJumping ? '5' : '10'}
          fill="url(#realContactShadow)"
          className="transition-all duration-200"
          opacity={isJumping ? 0.35 : 0.85}
        />

        {/* ── TIERED ARCHING SICKLE TAIL FEATHERS ── */}
        <g id="tailFeathers">
          {/* Main Primary Sickle (Tall arch) */}
          <path
            d="M32 78 C12 65, -2 40, 8 20 C18 18, 28 32, 38 60 Z"
            fill="url(#realTailGrad1)"
            stroke="#064e3b"
            strokeWidth="1.2"
          />
          {/* Secondary Sickle (Medium arch) */}
          <path
            d="M30 82 C8 74, -4 54, 4 38 C14 36, 26 50, 36 68 Z"
            fill="url(#realTailGrad2)"
            stroke="#0f172a"
            strokeWidth="1.2"
          />
          {/* Lesser Sickle Coverts */}
          <path
            d="M32 86 C16 82, 6 70, 14 56 C22 55, 30 65, 36 76 Z"
            fill="url(#realHackleGrad)"
            stroke="#78350f"
            strokeWidth="1"
          />
        </g>

        {/* ── REALISTIC MUSCULAR LEGS & FEET WITH DETAILED TALONS ── */}
        <g id="realisticLegs">
          {/* Left Leg (Background) */}
          <g opacity="0.85">
            {/* Muscular Thigh */}
            <path d="M44 86 C40 92, 42 100, 46 104 L50 102 C48 96, 48 90, 44 86 Z" fill="#92400e" />
            {/* Scaled Shank (Tarsus) */}
            <path d="M46 102 L44 116 L48 116 L49 102 Z" fill="url(#realLegGrad)" stroke="#78350f" strokeWidth="0.8" />
            {/* Toes & Dark Talons */}
            <path
              d="M44 116 L38 122 L39 123 L44 117 L48 123 L49 122 L46 116 Z"
              fill="url(#realLegGrad)"
              stroke="#451a03"
              strokeWidth="0.8"
            />
          </g>

          {/* Right Leg (Foreground - Detailed) */}
          <g>
            {/* Thigh with plumage fringe */}
            <path d="M60 84 C56 92, 58 102, 63 106 L68 104 C66 98, 66 90, 60 84 Z" fill="url(#realHackleGrad)" />
            {/* Scaled Shank (Tarsus) with Scute Ridges */}
            <path d="M63 104 L60 119 L65 119 L67 104 Z" fill="url(#realLegGrad)" stroke="#78350f" strokeWidth="1" />
            {/* Horizontal scale ridges on bone */}
            <line x1="62" y1="108" x2="66" y2="108" stroke="#713f12" strokeWidth="1" strokeLinecap="round" />
            <line x1="61" y1="112" x2="65" y2="112" stroke="#713f12" strokeWidth="1" strokeLinecap="round" />
            <line x1="60" y1="116" x2="64" y2="116" stroke="#713f12" strokeWidth="1" strokeLinecap="round" />
            {/* Rear Hallux & Spur */}
            <path d="M64 115 L69 117 L68 119 L64 118 Z" fill="#ca8a04" stroke="#451a03" strokeWidth="0.8" />
            {/* 3 Forward-facing Toes with Knuckles */}
            <path
              d="M59 119 L50 124 L52 125 L61 120 L66 125 L68 124 L63 119 Z"
              fill="url(#realLegGrad)"
              stroke="#451a03"
              strokeWidth="1"
            />
            {/* Curved Dark Keratin Talons */}
            <path d="M50 124 L46 125 L49 126 Z" fill="#18181b" />
            <path d="M66 125 L70 126 L67 127 Z" fill="#18181b" />
          </g>
        </g>

        {/* ── REALISTIC VOLUMETRIC TORSO & BREAST ── */}
        <g id="bodyPlumage">
          {/* Main Ellipsoidal Muscular Torso */}
          <path
            d="M36 80 C30 64, 42 46, 64 48 C88 50, 96 70, 88 88 C80 102, 46 100, 36 80 Z"
            fill="url(#realBodyShade)"
            stroke="#92400e"
            strokeWidth="1.5"
          />

          {/* Layered Underbelly Shadow (Ambient Occlusion) */}
          <path
            d="M44 86 C54 96, 76 96, 84 88 C76 98, 52 100, 44 86 Z"
            fill="rgba(69, 26, 3, 0.45)"
          />

          {/* Contoured Breast Feather Highlights */}
          <path
            d="M66 54 C78 56, 88 66, 86 78 C78 84, 68 76, 66 54 Z"
            fill="#fef08a"
            opacity="0.4"
          />
        </g>

        {/* ── MULTI-TIER WING WITH SCAPULARS & FLIGHT FEATHERS ── */}
        <g
          id="realisticWing"
          style={{
            transformOrigin: '48px 64px',
            transform: isJumping
              ? 'rotate(-28deg) scaleY(1.15)'
              : isVictory
              ? 'rotate(-18deg) scaleY(1.08)'
              : 'rotate(0deg)',
            transition: 'transform 0.18s ease-out',
          }}
        >
          {/* Primary Long Flight Quills (Bottom layer) */}
          <path
            d="M42 66 C32 72, 28 86, 36 94 C46 96, 56 86, 58 74 Z"
            fill="url(#realWingTier2)"
            stroke="#78350f"
            strokeWidth="1.5"
          />
          {/* Feather quill spines */}
          <path d="M46 72 L34 90 M50 72 L42 92 M54 72 L50 90" stroke="#713f12" strokeWidth="0.9" opacity="0.7" />

          {/* Secondary Greater Coverts (Middle layer) */}
          <path
            d="M46 62 C38 66, 36 78, 44 84 C54 86, 64 78, 66 68 Z"
            fill="url(#realWingTier1)"
            stroke="#b45309"
            strokeWidth="1.2"
          />

          {/* Scapular Shoulder Plumage (Top layer) */}
          <path
            d="M52 56 C44 58, 42 68, 50 74 C58 76, 68 70, 70 62 Z"
            fill="#fffbeb"
            stroke="#ca8a04"
            strokeWidth="1"
          />
        </g>

        {/* ── REALISTIC S-CURVE NECK WITH HACKLE PLUMAGE ── */}
        <g id="neckHackles">
          {/* Pointed Hackle Feathers draped down neck */}
          <path
            d="M60 48 L56 34 C58 26, 70 24, 76 30 L84 46 C78 52, 68 52, 60 48 Z"
            fill="url(#realHackleGrad)"
            stroke="#92400e"
            strokeWidth="1.2"
          />
          {/* Layered hackle tips */}
          <path d="M62 44 L58 54 L66 48 L68 56 L74 48 L78 54 L80 44" fill="#fef08a" opacity="0.6" />
        </g>

        {/* ── SCULPTED HEAD, BEAK, COMB & DUAL WATTLES ── */}
        <g id="headAndCrest">
          {/* Anatomical Head Base */}
          <ellipse cx="76" cy="30" rx="14" ry="15" fill="url(#realBodyShade)" stroke="#b45309" strokeWidth="1.2" />

          {/* Fleshy Serrated Comb (5 Organic Peaks with Keylight specular highlight) */}
          <path
            d="M64 24 C62 12, 68 8, 72 16 C76 6, 84 4, 86 14 C90 6, 96 8, 96 18 C100 12, 106 14, 102 24 C98 28, 78 28, 64 24 Z"
            fill="url(#realCombFlesh)"
            stroke="#7f1d1d"
            strokeWidth="1.5"
          />
          {/* Comb fleshy highlight dot */}
          <circle cx="76" cy="14" r="2" fill="#fca5a5" opacity="0.6" />
          <circle cx="86" cy="12" r="2.2" fill="#fca5a5" opacity="0.6" />

          {/* White/Cream Earlobes */}
          <ellipse cx="72" cy="36" rx="4.5" ry="5.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />

          {/* Dual Pendulous Fleshy Wattles under Beak */}
          <path
            d="M84 42 C82 54, 88 56, 92 48 C94 44, 90 40, 84 42 Z"
            fill="url(#realCombFlesh)"
            stroke="#7f1d1d"
            strokeWidth="1.2"
          />

          {/* Realistic Amber Horn Beak (Curved culmen & nares nostril) */}
          <path
            d="M88 28 L104 35 C102 38, 96 40, 88 41 Z"
            fill="url(#realBeakGrad)"
            stroke="#78350f"
            strokeWidth="1.3"
          />
          {/* Beak mouth line division */}
          <line x1="88" y1="35" x2="102" y2="35.5" stroke="#451a03" strokeWidth="1" />
          {/* Nostril slit (Nares) */}
          <ellipse cx="91" cy="32" rx="1.5" ry="0.8" fill="#451a03" />

          {/* Realistic Glassy Avian Eye */}
          {isBusted ? (
            /* Dizzy Stunned Crossed Eye */
            <g stroke="#991b1b" strokeWidth="2.8" strokeLinecap="round">
              <line x1="72" y1="24" x2="80" y2="32" />
              <line x1="80" y1="24" x2="72" y2="32" />
            </g>
          ) : (
            <g id="realisticEye">
              {/* Eye ring (Periorbital skin) */}
              <circle cx="76" cy="28" r="6" fill="#7f1d1d" opacity="0.75" />
              {/* Amber-Orange Iris */}
              <circle cx="76" cy="28" r="5" fill="url(#realEyeIris)" stroke="#431407" strokeWidth="0.8" />
              {/* Deep Pupil */}
              <circle cx="77.2" cy="28" r="2.8" fill="#09090b" />
              {/* Glassy Specular Corneal Reflections */}
              <circle cx="78.5" cy="26.5" r="1.3" fill="#ffffff" />
              <circle cx="76" cy="29.2" r="0.6" fill="#ffffff" opacity="0.8" />
              {/* Upper eyelid crease */}
              <path d="M71 25 C74 22, 79 22, 82 25" stroke="#451a03" strokeWidth="1" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* ── VICTORY SPARKLING GOLDEN CROWN ── */}
        {isVictory && (
          <g filter="url(#goldenAura)">
            <polygon points="68,10 74,-2 82,8 90,-2 96,10" fill="#fde047" stroke="#ca8a04" strokeWidth="1.8" />
            <circle cx="74" cy="-2" r="2" fill="#ffffff" />
            <circle cx="90" cy="-2" r="2" fill="#ffffff" />
            <circle cx="82" cy="8" r="1.5" fill="#f59e0b" />
          </g>
        )}
      </svg>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export const TreasureChickenRun2D: React.FC = () => {
  // Config & State
  const [gameConfig, setGameConfig] = useState<ChickenRunConfig | null>(null);
  const [difficulty, setDifficulty] = useState<ChickenDifficulty>('MEDIUM');
  const [betAmount, setBetAmount] = useState<number>(50);
  const [balance, setBalance] = useState<number>(10000);

  // Active round state
  const [roundId, setRoundId] = useState<string | null>(null);
  const [roundStatus, setRoundStatus] = useState<'IDLE' | 'ACTIVE' | 'BUSTED' | 'CASHED_OUT'>('IDLE');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [potentialPayout, setPotentialPayout] = useState<number>(0);
  const [tiles, setTiles] = useState<TileDetail[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('SELECT DIFFICULTY & BET, THEN PRESS START RUN');

  // Animation triggers
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isBusted, setIsBusted] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  // Features
  const [turboMode, setTurboMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);
  const [showPaytable, setShowPaytable] = useState<boolean>(false);

  // Auto Play
  const [isAutoPlayActive, setIsAutoPlayActive] = useState<boolean>(false);
  const [autoTargetStep, setAutoTargetStep] = useState<number>(5);
  const [autoRoundsRemaining, setAutoRoundsRemaining] = useState<number>(0);

  // History
  const [recentHistory, setRecentHistory] = useState<ChickenRunHistoryItem[]>([]);

  // Refs for race-free loops
  const autoPlayStopRequestedRef = useRef<boolean>(false);
  const isActionPendingRef = useRef<boolean>(false);
  const activeRoundIdRef = useRef<string | null>(null);
  const currentStepRef = useRef<number>(0);
  const runwayContainerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize ref
  useEffect(() => {
    activeRoundIdRef.current = roundId;
    currentStepRef.current = currentStep;
  }, [roundId, currentStep]);

  // Demo balance helper
  const getDemoBalance = (): number => {
    const saved = localStorage.getItem('treasure_casino_demo_balance');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0) return val;
    }
    return 10000.0;
  };

  const setLocalDemoBalance = (newBal: number) => {
    localStorage.setItem('treasure_casino_demo_balance', newBal.toFixed(2));
    window.dispatchEvent(new Event('demo_balance_updated'));
  };

  // Sync balance with storage and wallet events
  useEffect(() => {
    const updateBal = () => setBalance(getDemoBalance());
    updateBal();
    window.addEventListener('demo_balance_updated', updateBal);
    window.addEventListener('storage', updateBal);
    return () => {
      window.removeEventListener('demo_balance_updated', updateBal);
      window.removeEventListener('storage', updateBal);
    };
  }, []);

  // Fetch initial config & history
  useEffect(() => {
    chickenRunApi
      .getConfig()
      .then((cfg) => {
        setGameConfig(cfg);
        if (cfg.difficulties && cfg.difficulties[difficulty]) {
          const defaultTiles = cfg.difficulties[difficulty].multipliers.map((m, idx) => ({
            step: idx + 1,
            multiplier: m,
          }));
          setTiles(defaultTiles);
        }
      })
      .catch((err) => console.warn('[CHICKEN RUN] Failed to load config:', err.message));

    chickenRunApi
      .getHistory()
      .then((hist) => setRecentHistory(hist))
      .catch(() => {});
  }, []);

  // Update tile preview when difficulty changes (when IDLE)
  useEffect(() => {
    if (gameConfig && roundStatus === 'IDLE') {
      const diffConfig = gameConfig.difficulties[difficulty];
      if (diffConfig) {
        const preview = diffConfig.multipliers.map((m, idx) => ({
          step: idx + 1,
          multiplier: m,
        }));
        setTiles(preview);
      }
    }
  }, [difficulty, gameConfig, roundStatus]);

  // Auto-scroll runway to keep the chicken in view
  useEffect(() => {
    if (runwayContainerRef.current) {
      const activeTileEl = runwayContainerRef.current.querySelector(`[data-tile-index="${currentStep}"]`);
      if (activeTileEl) {
        activeTileEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentStep]);

  // Audio toggles
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.setMuted(nextMuted);
    if (nextMuted && isBgmOn) {
      audio.stopBgm();
      setIsBgmOn(false);
    }
  };

  const toggleBgm = () => {
    audio.playClick();
    if (isBgmOn) {
      audio.stopBgm();
      setIsBgmOn(false);
    } else {
      audio.startBgm();
      setIsBgmOn(true);
    }
  };

  // ─── START RUN ────────────────────────────────────────────────────────────────
  const handleStartRun = async () => {
    if (isActionPendingRef.current) return;
    audio.playClick();

    const currentBal = getDemoBalance();
    if (currentBal < betAmount) {
      setStatusMessage('INSUFFICIENT DEMO BALANCE TO PLACE BET');
      audio.playBust();
      return;
    }

    try {
      isActionPendingRef.current = true;
      setIsActionPending(true);
      setIsBusted(false);
      setIsVictory(false);
      setIsJumping(false);
      setStatusMessage('CHICKEN POSITIONING AT START LINE...');

      const startRes = await chickenRunApi.start(betAmount, difficulty);

      setRoundId(startRes.roundId);
      setCurrentStep(0);
      setCurrentMultiplier(1.0);
      setPotentialPayout(0);
      setTiles(startRes.tiles);
      setRoundStatus('ACTIVE');
      setBalance(startRes.balance);
      setLocalDemoBalance(startRes.balance);
      setStatusMessage('ROUND STARTED! TAP "HOP FORWARD" TO JUMP TO TILE 1');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start round';
      setStatusMessage(`ERROR: ${msg.toUpperCase()}`);
      audio.playBust();
    } finally {
      isActionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  // ─── STEP FORWARD ─────────────────────────────────────────────────────────────
  const handleStepForward = useCallback(async (): Promise<{ outcome: 'SAFE' | 'BUST'; isMax: boolean } | null> => {
    const rId = activeRoundIdRef.current;
    if (!rId || isActionPendingRef.current) return null;

    try {
      isActionPendingRef.current = true;
      setIsActionPending(true);

      // Trigger hop sound and jump animation
      audio.playHop();
      setIsJumping(true);
      const hopDelay = turboMode ? 150 : 280;

      const stepRes = await chickenRunApi.step(rId);

      // Settle jump landing
      await new Promise((r) => setTimeout(r, hopDelay));
      setIsJumping(false);

      if (stepRes.outcome === 'BUST') {
        audio.playBust();
        setIsBusted(true);
        setRoundStatus('BUSTED');
        setStatusMessage(stepRes.message || 'CHICKEN BUSTED! BETTER LUCK NEXT TIME.');
        setTiles(stepRes.tiles);
        setPotentialPayout(0);
        setCurrentMultiplier(0);
        setBalance(stepRes.balance);
        setLocalDemoBalance(stepRes.balance);

        // Append to history
        setRecentHistory((prev) => [
          {
            id: `temp_${Date.now()}`,
            status: 'LOST',
            betAmount,
            payout: 0,
            multiplier: 0,
            createdAt: new Date().toISOString(),
            details: { difficulty, bustedAtStep: stepRes.bustedStep },
          },
          ...prev.slice(0, 19),
        ]);

        return { outcome: 'BUST', isMax: false };
      }

      // SAFE HOP!
      audio.playSafeCoin();
      setCurrentStep(stepRes.currentStep);
      setCurrentMultiplier(stepRes.currentMultiplier);
      setPotentialPayout(stepRes.potentialPayout || stepRes.payout);
      setTiles(stepRes.tiles);

      if (stepRes.isMaxStepReached || stepRes.status === 'CASHED_OUT') {
        // Mega Golden Finish
        audio.playCashout();
        setIsVictory(true);
        setRoundStatus('CASHED_OUT');
        setStatusMessage(stepRes.message || '🎉 MEGA GOLDEN FINISH REACHED!');
        setBalance(stepRes.balance);
        setLocalDemoBalance(stepRes.balance);

        setRecentHistory((prev) => [
          {
            id: `temp_${Date.now()}`,
            status: 'WON',
            betAmount,
            payout: stepRes.payout,
            multiplier: stepRes.currentMultiplier,
            createdAt: new Date().toISOString(),
            details: { difficulty, completedSteps: stepRes.currentStep, maxStepReached: true },
          },
          ...prev.slice(0, 19),
        ]);

        return { outcome: 'SAFE', isMax: true };
      }

      setStatusMessage(stepRes.message || `TILE ${stepRes.currentStep} SAFE! MULTIPLIER ${stepRes.currentMultiplier}x`);
      return { outcome: 'SAFE', isMax: false };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to step';
      setStatusMessage(`ERROR: ${msg.toUpperCase()}`);
      audio.playBust();
      return null;
    } finally {
      setIsJumping(false);
      isActionPendingRef.current = false;
      setIsActionPending(false);
    }
  }, [betAmount, difficulty, turboMode]);

  // ─── CASH OUT ─────────────────────────────────────────────────────────────────
  const handleCashout = useCallback(async () => {
    const rId = activeRoundIdRef.current;
    if (!rId || isActionPendingRef.current || currentStepRef.current < 1) return;

    try {
      isActionPendingRef.current = true;
      setIsActionPending(true);
      audio.playCashout();
      setIsVictory(true);

      const cashoutRes = await chickenRunApi.cashout(rId);

      setRoundStatus('CASHED_OUT');
      setBalance(cashoutRes.balance);
      setLocalDemoBalance(cashoutRes.balance);
      setStatusMessage(cashoutRes.message || `🎉 CASHED OUT ₹${cashoutRes.payout.toFixed(2)} (${cashoutRes.multiplier}x)!`);

      setRecentHistory((prev) => [
        {
          id: `temp_${Date.now()}`,
          status: 'WON',
          betAmount,
          payout: cashoutRes.payout,
          multiplier: cashoutRes.multiplier,
          createdAt: new Date().toISOString(),
          details: { difficulty, completedSteps: cashoutRes.currentStep },
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Cashout failed';
      setStatusMessage(`ERROR: ${msg.toUpperCase()}`);
    } finally {
      isActionPendingRef.current = false;
      setIsActionPending(false);
    }
  }, [betAmount, difficulty]);

  // ─── AUTO PLAY LOOP ───────────────────────────────────────────────────────────
  const startAutoPlay = async (roundsCount: number = 10) => {
    audio.playClick();
    autoPlayStopRequestedRef.current = false;
    setIsAutoPlayActive(true);
    setAutoRoundsRemaining(roundsCount);

    for (let r = 0; r < roundsCount; r++) {
      if (autoPlayStopRequestedRef.current) break;
      setAutoRoundsRemaining(roundsCount - r);

      // Start round if IDLE or previous round finished
      const currentBal = getDemoBalance();
      if (currentBal < betAmount) {
        setStatusMessage('INSUFFICIENT BALANCE — AUTO PLAY STOPPED');
        break;
      }

      await handleStartRun();
      await new Promise((resolve) => setTimeout(resolve, turboMode ? 200 : 400));

      // Step until autoTargetStep or Bust/Max
      let shouldContinueStepping = true;
      while (shouldContinueStepping) {
        if (autoPlayStopRequestedRef.current) break;

        const res = await handleStepForward();
        if (!res || res.outcome === 'BUST' || res.isMax) {
          shouldContinueStepping = false;
          break;
        }

        // Check if reached target step
        if (currentStepRef.current >= autoTargetStep) {
          await new Promise((resolve) => setTimeout(resolve, turboMode ? 150 : 250));
          await handleCashout();
          shouldContinueStepping = false;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, turboMode ? 250 : 500));
      }

      await new Promise((resolve) => setTimeout(resolve, turboMode ? 350 : 700));
    }

    setIsAutoPlayActive(false);
    setAutoRoundsRemaining(0);
    autoPlayStopRequestedRef.current = false;
    setStatusMessage('AUTO PLAY FINISHED');
  };

  const stopAutoPlay = () => {
    autoPlayStopRequestedRef.current = true;
    setIsAutoPlayActive(false);
    setAutoRoundsRemaining(0);
    setStatusMessage('AUTO PLAY STOPPED BY USER');
  };

  const diffConfig = gameConfig?.difficulties[difficulty] || {
    label: 'Road',
    color: '#10b981',
    winRatePercent: '84%',
    volatility: 'MEDIUM',
    description: '',
    multipliers: [],
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-b from-[#0a1a12] via-[#08140e] to-[#040806] border-2 border-emerald-600/40 shadow-[0_0_60px_rgba(16,185,129,0.25)] text-white select-none">
      {/* ─── RETRO CARTOON HEADER ─────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/60 bg-black/50 backdrop-blur-md">
        {/* Logo & Game Title */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-[0_0_20px_rgba(251,191,36,0.5)] border border-yellow-200">
            <div className="w-full h-full rounded-2xl bg-[#0d2818] flex items-center justify-center overflow-hidden">
              <Realistic3DChicken isJumping={false} isBusted={false} isVictory={false} scale={0.7} />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-yellow-300 via-amber-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(251,191,36,0.4)]">
              TREASURE CHICKEN RUN
            </h1>
            <span className="text-[10px] sm:text-xs text-emerald-300 font-mono tracking-widest flex items-center space-x-1">
              <span>24 STEP ROAD</span>
              <span>•</span>
              <span>96.0% RTP</span>
              <span>•</span>
              <span className="text-yellow-400">UP TO 100,000X</span>
            </span>
          </div>
        </div>

        {/* Header Controls: Sound, Info, BGM */}
        <div className="flex items-center space-x-2">
          {/* BGM Toggle */}
          <button
            onClick={toggleBgm}
            title="Toggle Cartoon Music"
            className={`p-2 rounded-xl border transition-all text-xs flex items-center space-x-1 ${
              isBgmOn
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Paytable & Rules */}
          <button
            data-testid="chicken-paytable-button"
            onClick={() => setShowPaytable(!showPaytable)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-400/50 hover:bg-white/10 text-emerald-300 transition-all text-xs flex items-center space-x-1.5"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline font-mono">Paytable</span>
          </button>

          {/* Audio Mute */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-400/50 hover:bg-white/10 text-emerald-300 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── STATUS & HUD BANNER ───────────────────────────────────────────── */}
      <div className="relative px-6 py-2.5 bg-gradient-to-r from-emerald-950/60 via-green-950/40 to-emerald-950/60 border-b border-emerald-900/40 flex flex-wrap items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
          <span className="font-mono font-bold tracking-wide text-yellow-200">{statusMessage}</span>
        </div>

        <div className="flex items-center space-x-5">
          <span className="text-gray-400">
            DEMO BALANCE:{' '}
            <strong className="text-emerald-400 font-mono text-sm">₹{balance.toFixed(2)}</strong>
          </span>
          {potentialPayout > 0 && (
            <span className="text-yellow-300 animate-bounce">
              WIN POTENTIAL:{' '}
              <strong className="text-yellow-400 font-mono text-sm">
                ₹{potentialPayout.toFixed(2)} ({currentMultiplier}x)
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* ─── CENTRAL ROAD & CHICKEN ARENA ───────────────────────────────────── */}
      <div className="relative p-4 sm:p-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Background grass pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Difficulty Banner Selector */}
        <div className="w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl bg-black/60 border border-emerald-900/60 backdrop-blur-md">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {(['EASY', 'MEDIUM', 'HARD', 'HARDCORE'] as ChickenDifficulty[]).map((d) => {
              const cfg = gameConfig?.difficulties[d];
              const isSelected = difficulty === d;
              return (
                <button
                  key={d}
                  disabled={roundStatus === 'ACTIVE'}
                  onClick={() => {
                    audio.playClick();
                    setDifficulty(d);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? d === 'EASY'
                        ? 'bg-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.7)]'
                        : d === 'MEDIUM'
                        ? 'bg-blue-600 text-white shadow-[0_0_14px_rgba(59,130,246,0.7)]'
                        : d === 'HARD'
                        ? 'bg-amber-600 text-white shadow-[0_0_14px_rgba(245,158,11,0.7)]'
                        : 'bg-red-600 text-white shadow-[0_0_14px_rgba(239,68,68,0.8)]'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {d === 'HARDCORE' ? (
                    <Flame className="w-3.5 h-3.5 text-red-300 animate-pulse" />
                  ) : (
                    <Shield className="w-3.5 h-3.5" />
                  )}
                  <span>{d}</span>
                  {cfg && <span className="text-[10px] opacity-80">({cfg.winRatePercent})</span>}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center text-[11px] font-mono text-gray-400 pr-2">
            <span>{diffConfig.description}</span>
          </div>
        </div>

        {/* 24-Step Path Runway Scrollable Track */}
        <div
          ref={runwayContainerRef}
          className="relative w-full max-w-4xl p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#0c2e1c] via-[#092014] to-[#040e08] border-2 border-emerald-600/50 shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.3)] overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-700"
        >
          {/* Runway Header Milestone Bar */}
          <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-emerald-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                STEP {currentStep} OF {gameConfig?.totalTiles || 24}
              </span>
            </span>
            <span className="text-yellow-400 font-bold flex items-center space-x-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>FINISH GOAL: {tiles[tiles.length - 1]?.multiplier || '100'}x MULTIPLIER</span>
            </span>
          </div>

          {/* Stepping Path Tiles Row */}
          <div className="flex items-end space-x-2.5 sm:space-x-3.5 min-w-max pb-2 pt-16 px-4">
            {/* START PAD */}
            <div
              data-tile-index="0"
              className={`relative flex flex-col items-center justify-center w-20 h-28 rounded-2xl border-2 transition-all duration-300 ${
                currentStep === 0
                  ? 'border-yellow-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'border-emerald-800/60 bg-black/40 text-gray-500'
              }`}
            >
              {currentStep === 0 && (
                <div className="absolute -top-16 z-20">
                  <Realistic3DChicken isJumping={isJumping} isBusted={isBusted} isVictory={isVictory} scale={1.05} />
                </div>
              )}
              <span className="text-[10px] font-mono font-bold uppercase text-yellow-300">START</span>
              <span className="text-xs font-mono font-black text-gray-300">BASE</span>
              <span className="text-[9px] text-gray-400">1.00x</span>
            </div>

            {/* TILES 1 to 24 */}
            {tiles.map((tile, idx) => {
              const stepNumber = idx + 1;
              const isChickenHere = currentStep === stepNumber;
              const isPassed = currentStep >= stepNumber;
              const isNext = currentStep + 1 === stepNumber && roundStatus === 'ACTIVE';
              const isFinal = stepNumber === tiles.length;

              return (
                <div
                  key={`tile-${stepNumber}`}
                  data-tile-index={stepNumber}
                  className={`relative flex flex-col items-center justify-between w-20 h-28 p-2 rounded-2xl border-2 transition-all duration-300 ${
                    isChickenHere
                      ? 'border-yellow-400 bg-gradient-to-b from-amber-500/30 to-emerald-900/60 shadow-[0_0_25px_rgba(251,191,36,0.8)] scale-105 z-10'
                      : isPassed
                      ? 'border-emerald-500/80 bg-emerald-950/60 text-emerald-200'
                      : isNext
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-pulse'
                      : 'border-emerald-900/50 bg-black/40 text-gray-500'
                  }`}
                >
                  {/* Chicken positioned on active tile */}
                  {isChickenHere && (
                    <div className="absolute -top-16 z-20">
                      <Realistic3DChicken isJumping={isJumping} isBusted={isBusted} isVictory={isVictory} scale={1.05} />
                    </div>
                  )}

                  {/* Tile Number Header */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-mono font-bold text-gray-400">#{stepNumber}</span>
                    {isFinal ? (
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    ) : isPassed ? (
                      <Coins className="w-3 h-3 text-emerald-400" />
                    ) : null}
                  </div>

                  {/* Icon Indicator */}
                  <div className="flex items-center justify-center my-1">
                    {isFinal ? (
                      <div className="text-xl animate-bounce">🏆</div>
                    ) : isPassed ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-300">
                        ✓
                      </div>
                    ) : isNext ? (
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-xs font-bold text-cyan-300 animate-spin">
                        ★
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-black/40 border border-emerald-900/40 flex items-center justify-center text-[10px] text-gray-500">
                        {stepNumber}
                      </div>
                    )}
                  </div>

                  {/* Multiplier Label */}
                  <div className="text-center w-full">
                    <span
                      className={`text-xs font-mono font-black ${
                        isChickenHere
                          ? 'text-yellow-300 text-sm'
                          : isPassed
                          ? 'text-emerald-300'
                          : isNext
                          ? 'text-cyan-300'
                          : isFinal
                          ? 'text-yellow-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {tile.multiplier}x
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── CONTROLS CONSOLE ──────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 bg-black/70 border-t border-emerald-900/60 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Bet Adjustments */}
        <div className="flex flex-col space-y-1.5 w-full md:w-auto">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-mono tracking-widest text-gray-400">
              DEMO BET AMOUNT (₹)
            </label>
            <span className="text-[10px] font-mono text-emerald-400">
              POTENTIAL PAYOUT:{' '}
              <strong className="text-white">
                ₹{((roundStatus === 'ACTIVE' ? currentMultiplier : tiles[0]?.multiplier || 1.14) * betAmount).toFixed(
                  2
                )}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              disabled={roundStatus === 'ACTIVE' || isAutoPlayActive}
              onClick={() => setBetAmount(10)}
              className="px-2 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 disabled:opacity-40"
            >
              MIN
            </button>
            {[10, 50, 100, 250, 500].map((preset) => (
              <button
                key={preset}
                disabled={roundStatus === 'ACTIVE' || isAutoPlayActive}
                onClick={() => setBetAmount(preset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 ${
                  betAmount === preset
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                ₹{preset}
              </button>
            ))}
            <button
              disabled={roundStatus === 'ACTIVE' || isAutoPlayActive}
              onClick={() => setBetAmount((b) => Math.max(10, Math.floor(b / 2)))}
              className="px-2 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
            >
              /2
            </button>
            <button
              disabled={roundStatus === 'ACTIVE' || isAutoPlayActive}
              onClick={() => setBetAmount((b) => Math.min(5000, b * 2))}
              className="px-2 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
            >
              2X
            </button>
            <button
              disabled={roundStatus === 'ACTIVE' || isAutoPlayActive}
              onClick={() => setBetAmount(5000)}
              className="px-2 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Feature Switches: Turbo Mode & Auto Target Step */}
        <div className="flex items-center space-x-3">
          {/* Turbo Mode Switch */}
          <button
            onClick={() => {
              audio.playClick();
              setTurboMode(!turboMode);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border flex items-center space-x-1.5 ${
              turboMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>TURBO {turboMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Auto Step Cashout Selector */}
          <div className="flex items-center space-x-1 bg-black/50 border border-emerald-900/60 rounded-xl px-2 py-1">
            <span className="text-[10px] font-mono text-gray-400">TARGET:</span>
            <select
              disabled={roundStatus === 'ACTIVE' || isAutoPlayActive}
              value={autoTargetStep}
              onChange={(e) => setAutoTargetStep(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-mono font-bold text-yellow-300 outline-none cursor-pointer disabled:opacity-40"
            >
              {[2, 3, 4, 5, 7, 10, 15, 20, 24].map((step) => (
                <option key={step} value={step} className="bg-gray-900 text-white">
                  STEP {step} ({tiles[step - 1]?.multiplier || ''}x)
                </option>
              ))}
            </select>
          </div>
        </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
            {/* Auto Play Start / Stop */}
            {isAutoPlayActive ? (
              <button
                onClick={stopAutoPlay}
                className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase bg-red-600 hover:bg-red-500 border border-red-400 text-white shadow-[0_0_15px_rgba(255,0,0,0.5)] flex items-center space-x-1.5 animate-pulse active:scale-95 transition-transform"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>STOP AUTO ({autoRoundsRemaining})</span>
              </button>
            ) : (
              roundStatus === 'IDLE' && (
                <button
                  disabled={isActionPending}
                  onClick={() => startAutoPlay(10)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-white/5 border border-white/10 hover:border-emerald-400 hover:bg-white/10 text-gray-300 transition-all flex items-center space-x-1"
                >
                  <span>AUTO (10)</span>
                </button>
              )
            )}

            {/* Active Round: STEP or CASHOUT Buttons (Reduced 35-40% with subtle gold styling) */}
            {roundStatus === 'ACTIVE' ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
                {/* COMPACT HOP FORWARD BUTTON */}
                <button
                  data-testid="chicken-step-button"
                  disabled={isActionPending}
                  onClick={handleStepForward}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase text-stone-900 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 border border-yellow-300/80 shadow-[0_0_12px_rgba(251,191,36,0.35)] active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  title="Hop chicken forward one tile"
                >
                  <ArrowRight className="w-4 h-4 text-stone-900" />
                  <span>HOP FORWARD</span>
                </button>

                {/* COMPACT CASH OUT BUTTON */}
                <button
                  data-testid="chicken-cashout-button"
                  disabled={isActionPending || currentStep < 1}
                  onClick={handleCashout}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase transition-all flex items-center space-x-1.5 active:scale-95 ${
                    currentStep >= 1
                      ? 'text-stone-950 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 hover:from-yellow-200 hover:to-amber-300 border border-yellow-200/90 shadow-[0_0_15px_rgba(251,191,36,0.45)] animate-pulse hover:scale-105'
                      : 'bg-stone-800/80 text-stone-500 border border-stone-700/50 opacity-40 cursor-not-allowed shadow-none'
                  }`}
                  title={currentStep >= 1 ? `Cash out ₹${potentialPayout.toFixed(2)}` : 'Hop at least 1 tile to cash out'}
                >
                  <Coins className="w-4 h-4 text-stone-950" />
                  <span>CASH OUT (₹{potentialPayout.toFixed(2)})</span>
                </button>
              </div>
            ) : (
              /* COMPACT START RUN BUTTON */
              <button
                data-testid="chicken-start-button"
                disabled={isActionPending || isAutoPlayActive || balance < betAmount}
                onClick={handleStartRun}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase text-stone-950 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 border border-yellow-200/90 shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                <span>START RUN (₹{betAmount})</span>
              </button>
            )}
          </div>
      </div>

      {/* ─── RECENT ROUNDS HISTORY TICKER ─────────────────────────────────── */}
      <div className="px-6 py-2 bg-black/80 border-t border-emerald-950 flex items-center space-x-2 overflow-x-auto text-[11px] font-mono">
        <span className="text-gray-500 font-bold uppercase shrink-0">RECENT RUNS:</span>
        {recentHistory.length === 0 ? (
          <span className="text-gray-600">No round history yet</span>
        ) : (
          recentHistory.map((item, idx) => {
            const isWin = item.status === 'WON';
            return (
              <span
                key={item.id || idx}
                className={`px-2 py-0.5 rounded-lg border shrink-0 ${
                  isWin
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-red-500/20 border-red-500 text-red-300'
                }`}
              >
                {isWin ? `${item.multiplier}x (₹${item.payout.toFixed(0)})` : `BUST @ #${item.details?.bustedAtStep || '?'}`}
              </span>
            );
          })
        )}
      </div>

      {/* ─── PAYTABLE & RULES MODAL ───────────────────────────────────────── */}
      {showPaytable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0d2818] to-[#040e08] border-2 border-emerald-500 rounded-3xl p-6 shadow-[0_0_60px_rgba(16,185,129,0.7)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-black tracking-wide text-white font-mono uppercase">
                  TREASURE CHICKEN RUN — RULES & PAYTABLE
                </h3>
              </div>
              <button
                onClick={() => setShowPaytable(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono text-gray-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/40">
                <h4 className="font-bold text-emerald-300 uppercase mb-1">🎮 How to Play</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-300">
                  <li>Select your demo bet and choose one of 4 difficulties (EASY, MEDIUM, HARD, HARDCORE).</li>
                  <li>Press <strong>START RUN</strong> to deduct your bet and begin the journey.</li>
                  <li>Press <strong>HOP FORWARD</strong> to jump one tile across the road.</li>
                  <li>Every successful step increases your current cashout multiplier.</li>
                  <li>If the chicken hits a hazard, the round ends and the bet is lost.</li>
                  <li>Press <strong>CASH OUT</strong> at any step to secure your winnings immediately!</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/40">
                <h4 className="font-bold text-emerald-300 uppercase mb-2">⚖️ Difficulty & Math Statistics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40">
                    <span className="text-emerald-400 font-bold block">EASY</span>
                    <span className="text-gray-400 block">Win Rate: 92.0%</span>
                    <span className="text-yellow-400 block">Max: ~7.10x</span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-500/40">
                    <span className="text-blue-400 font-bold block">MEDIUM</span>
                    <span className="text-gray-400 block">Win Rate: 84.0%</span>
                    <span className="text-yellow-400 block">Max: ~62.0x</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40">
                    <span className="text-amber-400 font-bold block">HARD</span>
                    <span className="text-gray-400 block">Win Rate: 72.0%</span>
                    <span className="text-yellow-400 block">Max: ~2,550x</span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/40">
                    <span className="text-red-400 font-bold block">HARDCORE</span>
                    <span className="text-gray-400 block">Win Rate: 56.0%</span>
                    <span className="text-yellow-400 block">Max: 100,000x</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/40">
                <h4 className="font-bold text-yellow-300 uppercase mb-2">
                  📈 Multiplier Ladder ({difficulty})
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 text-center text-[10px]">
                  {tiles.map((t) => (
                    <div
                      key={t.step}
                      className="p-1 rounded bg-white/5 border border-emerald-900/30 flex flex-col items-center"
                    >
                      <span className="text-gray-400">Step {t.step}</span>
                      <span className="text-emerald-300 font-bold">{t.multiplier}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowPaytable(false)}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              >
                CLOSE PAYTABLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
