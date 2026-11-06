import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  HelpCircle,
  X,
  Zap,
  Play,
  Square,
  ChevronRight,
  Trophy,
  Flame,
  Radio,
  Sliders,
  Award,
  Music,
} from 'lucide-react';
import { hotlineApi } from '../../../services/hotlineApi';
import {
  HotlineSlotSpinResult,
  WinningLineResult,
  SlotSymbolDef,
  PaylineDef,
  RiskLevel,
  HotlineConfig,
  HotlineHistoryItem,
} from '../../../types/hotline';
import { getDemoBalance, setLocalDemoBalance, fetchServerDemoBalance } from '../../../utils/demoWallet';

export interface AutoSpinState {
  isAutoSpinRunning: boolean;
  isStopRequested: boolean;
  remainingSpins: number;
  currentSpinInProgress: boolean;
}

// ─── AUDIO SYNTHESIZER (80s RETRO SYNTHWAVE & BGM) ───────────────────────────
class HotlineAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted = false;
  public isBgmActive = false;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmTimer: any = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playSpin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  playReelStop(index: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 220 + index * 45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  playExpandWild() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(300, now);
      osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
      osc2.frequency.setValueAtTime(450, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.4);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch {}
  }

  playWin(mult: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = mult >= 20 ? [440, 554, 659, 880, 1108] : [440, 554, 659];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch {}
  }

  playFreeSpinsFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.14, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
      });
    } catch {}
  }

  toggleBgm(): boolean {
    this.initCtx();
    if (!this.ctx) return false;

    if (this.isBgmActive) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  private startBgm() {
    if (!this.ctx || this.isMuted) return;
    this.isBgmActive = true;
    let step = 0;
    const notes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];

    this.bgmTimer = setInterval(() => {
      if (!this.isBgmActive || this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(notes[step % notes.length], now);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
        step++;
      } catch {}
    }, 220);
  }

  private stopBgm() {
    this.isBgmActive = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

const audio = new HotlineAudioEngine();

// ─── 8 ORIGINAL 1980S RETRO NEON SYMBOLS ─────────────────────────────────────
const Neon7Symbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(255,0,128,0.8)]">
    <defs>
      <linearGradient id="neon7Grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff0055" />
        <stop offset="50%" stopColor="#ff00aa" />
        <stop offset="100%" stopColor="#ff7700" />
      </linearGradient>
    </defs>
    <path
      d="M22 24 L78 24 L52 82 L38 82 L60 38 L22 38 Z"
      fill="none"
      stroke="#ff00aa"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="drop-shadow(0 0 6px #ff007f)"
    />
    <path
      d="M22 24 L78 24 L52 82 L38 82 L60 38 L22 38 Z"
      fill="url(#neon7Grad)"
      stroke="#fff"
      strokeWidth="1.5"
    />
    <circle cx="74" cy="28" r="3" fill="#fff" className="animate-ping" />
  </svg>
);

const HotlinePhoneSymbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(255,30,86,0.8)]">
    <defs>
      <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff1744" />
        <stop offset="100%" stopColor="#b71c1c" />
      </linearGradient>
    </defs>
    <rect x="36" y="10" width="4" height="20" rx="2" fill="#ffd700" />
    <circle cx="38" cy="9" r="3" fill="#ff1744" />
    <rect x="30" y="26" width="40" height="60" rx="8" fill="url(#phoneGrad)" stroke="#ff4081" strokeWidth="2" />
    <rect x="36" y="32" width="28" height="18" rx="3" fill="#00e5ff" fillOpacity="0.8" />
    <text x="50" y="44" fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
      HOTLINE
    </text>
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (
        <rect
          key={`${r}-${c}`}
          x={38 + c * 8}
          y={55 + r * 8}
          width="6"
          height="5"
          rx="1"
          fill="#ffd700"
        />
      ))
    )}
  </svg>
);

const SportsCarSymbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
    <defs>
      <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="50%">
        <stop offset="0%" stopColor="#00f0ff" />
        <stop offset="100%" stopColor="#7928ca" />
      </linearGradient>
    </defs>
    <path
      d="M10 65 L22 65 L28 55 L58 48 L76 56 L88 60 L92 68 L10 68 Z"
      fill="url(#carGrad)"
      stroke="#00f0ff"
      strokeWidth="2"
    />
    <polygon points="34,54 54,50 56,55 30,57" fill="#111" stroke="#00f0ff" strokeWidth="1" />
    <circle cx="26" cy="68" r="8" fill="#111" stroke="#ff007f" strokeWidth="3" />
    <circle cx="26" cy="68" r="3" fill="#ffd700" />
    <circle cx="74" cy="68" r="8" fill="#111" stroke="#ff007f" strokeWidth="3" />
    <circle cx="74" cy="68" r="3" fill="#ffd700" />
    <polygon points="90,62 100,58 100,68 90,65" fill="#00f0ff" fillOpacity="0.4" />
  </svg>
);

const PalmTreeSymbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(255,136,0,0.8)]">
    <defs>
      <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff007f" />
        <stop offset="100%" stopColor="#ffb300" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="28" fill="url(#sunGrad)" />
    <line x1="24" y1="48" x2="76" y2="48" stroke="#120428" strokeWidth="2.5" />
    <line x1="26" y1="56" x2="74" y2="56" stroke="#120428" strokeWidth="3.5" />
    <line x1="30" y1="64" x2="70" y2="64" stroke="#120428" strokeWidth="4.5" />
    <path d="M46 78 Q48 55 52 42" stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M52 42 Q30 36 24 50" stroke="#00ffcc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M52 42 Q40 26 34 34" stroke="#00ffcc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M52 42 Q60 25 68 32" stroke="#00ffcc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M52 42 Q74 38 78 50" stroke="#00ffcc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
  </svg>
);

const CassetteSymbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(186,104,200,0.8)]">
    <defs>
      <linearGradient id="cassetteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7b1fa2" />
        <stop offset="100%" stopColor="#311b92" />
      </linearGradient>
    </defs>
    <rect x="15" y="24" width="70" height="52" rx="6" fill="url(#cassetteGrad)" stroke="#e040fb" strokeWidth="2" />
    <rect x="22" y="32" width="56" height="36" rx="3" fill="#00e5ff" fillOpacity="0.9" />
    <text x="50" y="42" fill="#000" fontSize="7" fontWeight="bold" textAnchor="middle">
      HOTLINE '86
    </text>
    <rect x="28" y="46" width="44" height="16" rx="3" fill="#111" />
    <circle cx="38" cy="54" r="5" fill="#fff" />
    <circle cx="38" cy="54" r="2" fill="#111" />
    <circle cx="62" cy="54" r="5" fill="#fff" />
    <circle cx="62" cy="54" r="2" fill="#111" />
  </svg>
);

const StarSymbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(255,215,0,0.8)]">
    <defs>
      <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="40%" stopColor="#ffd700" />
        <stop offset="100%" stopColor="#ff8800" />
      </linearGradient>
    </defs>
    <path
      d="M50 12 L58 38 L86 42 L64 60 L72 88 L50 72 L28 88 L36 60 L14 42 L42 38 Z"
      fill="url(#starGrad)"
      stroke="#ffd700"
      strokeWidth="2"
    />
    <circle cx="50" cy="50" r="4" fill="#fff" />
  </svg>
);

const WildSymbol: React.FC<{ isExpanded?: boolean }> = ({ isExpanded }) => (
  <div
    className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${
      isExpanded
        ? 'bg-gradient-to-b from-cyan-500/30 via-fuchsia-500/40 to-cyan-500/30 border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.9)] animate-pulse'
        : ''
    }`}
  >
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(0,255,255,0.9)]">
      <defs>
        <linearGradient id="wildGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="50%" stopColor="#ff00aa" />
          <stop offset="100%" stopColor="#ffd700" />
        </linearGradient>
      </defs>
      <polygon points="12,25 24,50 18,52 26,75 14,50 20,48" fill="#ffd700" />
      <polygon points="88,25 76,50 82,52 74,75 86,50 80,48" fill="#ffd700" />
      <polygon points="26,20 74,20 80,60 50,85 20,60" fill="#0d0422" stroke="url(#wildGrad)" strokeWidth="3" />
      <text
        x="50"
        y="56"
        fill="url(#wildGrad)"
        fontSize="22"
        fontWeight="900"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing="1"
        stroke="#00f0ff"
        strokeWidth="0.8"
      >
        WILD
      </text>
    </svg>
    {isExpanded && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black tracking-widest text-cyan-200 bg-black/70 px-2 py-0.5 rounded border border-cyan-400 animate-bounce">
          EXPANDED
        </span>
      </div>
    )}
  </div>
);

const ScatterSymbol: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(255,0,128,0.9)]">
    <defs>
      <linearGradient id="scatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff00aa" />
        <stop offset="100%" stopColor="#ffd700" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="38" fill="#1b0836" stroke="url(#scatGrad)" strokeWidth="3.5" />
    <circle cx="50" cy="50" r="30" fill="none" stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M38 60 Q44 46 50 38" stroke="#ff00aa" strokeWidth="3" fill="none" />
    <path d="M50 38 Q36 32 32 42" stroke="#ff00aa" strokeWidth="2.5" fill="none" />
    <path d="M50 38 Q64 32 68 42" stroke="#ff00aa" strokeWidth="2.5" fill="none" />
    <rect x="18" y="58" width="64" height="18" rx="4" fill="#ffd700" stroke="#ff00aa" strokeWidth="1.5" />
    <text x="50" y="71" fill="#000" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
      SCATTER
    </text>
  </svg>
);

export const renderSymbolIcon = (symbolId: number, isExpanded = false) => {
  switch (symbolId) {
    case 0:
      return <WildSymbol isExpanded={isExpanded} />;
    case 1:
      return <Neon7Symbol />;
    case 2:
      return <HotlinePhoneSymbol />;
    case 3:
      return <SportsCarSymbol />;
    case 4:
      return <PalmTreeSymbol />;
    case 5:
      return <CassetteSymbol />;
    case 6:
      return <StarSymbol />;
    case 7:
      return <ScatterSymbol />;
    default:
      return <StarSymbol />;
  }
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export const TreasureHotline2D: React.FC = () => {
  // Demo Wallet & Betting State
  const [balance, setBalance] = useState<number>(() => getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('LOW');
  const [bonusBetActive, setBonusBetActive] = useState<boolean>(false);

  // Free Spins Mode State (PRD §4 & §9)
  const [isFreeSpinsMode, setIsFreeSpinsMode] = useState<boolean>(false);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState<number>(0);
  const [freeSpinsTotalAwarded, setFreeSpinsTotalAwarded] = useState<number>(0);
  const [freeSpinsWonAccumulator, setFreeSpinsWonAccumulator] = useState<number>(0);
  const [showFreeSpinsModal, setShowFreeSpinsModal] = useState<boolean>(false);
  const [showFreeSpinsSummary, setShowFreeSpinsSummary] = useState<boolean>(false);

  // Playback & Controls
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [autoSpinState, setAutoSpinState] = useState<AutoSpinState>({
    isAutoSpinRunning: false,
    isStopRequested: false,
    remainingSpins: 0,
    currentSpinInProgress: false,
  });
  const [turboMode, setTurboMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);
  const [showPaytable, setShowPaytable] = useState<boolean>(false);
  const [gameConfig, setGameConfig] = useState<HotlineConfig | null>(null);

  // Grid State (3 rows x 5 columns)
  const [displayedGrid, setDisplayedGrid] = useState<number[][]>([
    [1, 2, 0, 4, 5],
    [3, 0, 1, 6, 2],
    [5, 4, 3, 0, 7],
  ]);

  // Expanding reels active on display
  const [activeExpandedReels, setActiveExpandedReels] = useState<number[]>([]);

  // Spin Results
  const [lastSpinResult, setLastSpinResult] = useState<HotlineSlotSpinResult | null>(null);
  const [winningLines, setWinningLines] = useState<WinningLineResult[]>([]);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number>(-1);
  const [statusMessage, setStatusMessage] = useState<string>('PRESS SPIN TO START THE HOTLINE');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);

  // History Ribbon State
  const [recentHistory, setRecentHistory] = useState<HotlineHistoryItem[]>([]);

  // Authoritative State Refs to prevent race conditions and stale closures
  const isFreeSpinsModeRef = useRef<boolean>(false);
  const freeSpinsRemainingRef = useRef<number>(0);
  const autoSpinRef = useRef<AutoSpinState>({
    isAutoSpinRunning: false,
    isStopRequested: false,
    remainingSpins: 0,
    currentSpinInProgress: false,
  });
  const isSpinningRef = useRef<boolean>(false);
  const lastSpinResultRef = useRef<HotlineSlotSpinResult | null>(null);

  // Animation Timers & Stop References
  const spinIntervalRefs = useRef<(number | null)[]>([null, null, null, null, null]);
  const reelStopTimeoutRefs = useRef<(number | null)[]>([null, null, null, null, null]);
  const settlementTimeoutRef = useRef<number | null>(null);
  const nextSpinTimeoutRef = useRef<number | null>(null);

  // Execution function ref to break cyclic callback dependencies
  const executeSpinStepRef = useRef<() => void>(() => {});

  // Computed total bet
  const effectiveTotalBet = isFreeSpinsMode
    ? 0
    : bonusBetActive
    ? +(betAmount * 1.5).toFixed(2)
    : betAmount;

  // Clear all rolling intervals & stop timeouts
  const clearReelTimers = useCallback(() => {
    spinIntervalRefs.current.forEach((id, idx) => {
      if (id !== null) {
        clearInterval(id);
        spinIntervalRefs.current[idx] = null;
      }
    });
    reelStopTimeoutRefs.current.forEach((id, idx) => {
      if (id !== null) {
        clearTimeout(id);
        reelStopTimeoutRefs.current[idx] = null;
      }
    });
    if (settlementTimeoutRef.current !== null) {
      clearTimeout(settlementTimeoutRef.current);
      settlementTimeoutRef.current = null;
    }
  }, []);

  // Clear queued next spin timer
  const clearNextSpinTimer = useCallback(() => {
    if (nextSpinTimeoutRef.current !== null) {
      clearTimeout(nextSpinTimeoutRef.current);
      nextSpinTimeoutRef.current = null;
    }
  }, []);

  // Sync wallet & config on mount, and cleanup on unmount
  useEffect(() => {
    // Reset all spin & auto-spin flags upon mount
    autoSpinRef.current.isStopRequested = false;
    autoSpinRef.current.isAutoSpinRunning = false;
    autoSpinRef.current.remainingSpins = 0;
    autoSpinRef.current.currentSpinInProgress = false;
    isSpinningRef.current = false;

    const b = getDemoBalance();
    if (typeof b === 'number' && !isNaN(b)) setBalance(b);

    // Sync with server demo balance
    fetchServerDemoBalance()
      .then((serverBal) => {
        if (typeof serverBal === 'number' && !isNaN(serverBal)) {
          setBalance(serverBal);
        }
      })
      .catch(() => {});

    // Load recent spin history
    hotlineApi
      .getHistory(12)
      .then((history) => {
        if (Array.isArray(history)) {
          setRecentHistory(history);
        }
      })
      .catch((err) => {
        console.warn('Failed to load hotline history:', err);
      });

    const onBalanceUpdate = (e: any) => {
      if (typeof e.detail?.balance === 'number') {
        setBalance(e.detail.balance);
      }
    };
    window.addEventListener('demo_balance_updated', onBalanceUpdate);

    hotlineApi
      .getConfig()
      .then((cfg) => {
        setGameConfig(cfg);
        if (cfg.isEnabled === false) {
          setStatusMessage('GAME CURRENTLY DISABLED');
        }
      })
      .catch((err) => {
        console.error('Failed to load hotline config', err);
      });

    return () => {
      window.removeEventListener('demo_balance_updated', onBalanceUpdate);
      clearReelTimers();
      clearNextSpinTimer();
      autoSpinRef.current.isStopRequested = false;
      autoSpinRef.current.isAutoSpinRunning = false;
      autoSpinRef.current.currentSpinInProgress = false;
      isSpinningRef.current = false;
    };
  }, [clearReelTimers, clearNextSpinTimer]);

  // Cycle through winning paylines
  useEffect(() => {
    if (winningLines.length === 0) {
      setHighlightedLineIndex(-1);
      return;
    }

    setHighlightedLineIndex(0);
    const interval = setInterval(() => {
      setHighlightedLineIndex((prev) => (prev + 1) % winningLines.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [winningLines]);

  // Handle Mute Toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audio.isMuted = next;
  };

  // Handle BGM Toggle
  const toggleBgm = () => {
    const active = audio.toggleBgm();
    setIsBgmOn(active);
  };

  // ─── STOP AUTO SPIN ────────────────────────────────────────────────────────
  const stopAutoSpin = useCallback(() => {
    // 1. Instantly clear any queued next spin timer
    clearNextSpinTimer();

    // 2. Set authoritative ref flags synchronously
    autoSpinRef.current.isStopRequested = true;
    autoSpinRef.current.isAutoSpinRunning = false;
    autoSpinRef.current.remainingSpins = 0;

    // 3. Update React UI state immediately
    setAutoSpinState({
      isAutoSpinRunning: false,
      isStopRequested: true,
      remainingSpins: 0,
      currentSpinInProgress: autoSpinRef.current.currentSpinInProgress,
    });

    if (autoSpinRef.current.currentSpinInProgress) {
      setStatusMessage('AUTO SPIN STOPPING (FINISHING CURRENT SPIN)...');
    } else {
      setStatusMessage('AUTO SPIN STOPPED');
    }
  }, [clearNextSpinTimer]);

  // ─── START AUTO SPIN ───────────────────────────────────────────────────────
  const startAutoSpin = useCallback(
    (count: number) => {
      // Prevent multiple Auto Spin loops from running simultaneously
      if (
        autoSpinRef.current.isAutoSpinRunning ||
        autoSpinRef.current.currentSpinInProgress ||
        isSpinningRef.current
      ) {
        console.warn('Auto Spin or Spin already in progress. Ignoring duplicate start request.');
        return;
      }

      // Check game availability
      if (gameConfig && gameConfig.isEnabled === false) {
        setStatusMessage('GAME IS CURRENTLY DISABLED');
        return;
      }

      // Pre-check balance
      const currentBal = getDemoBalance();
      if (!isFreeSpinsMode && effectiveTotalBet > currentBal) {
        setStatusMessage('INSUFFICIENT DEMO BALANCE');
        return;
      }

      clearNextSpinTimer();

      const nextState: AutoSpinState = {
        isAutoSpinRunning: true,
        isStopRequested: false,
        remainingSpins: count,
        currentSpinInProgress: false,
      };
      autoSpinRef.current = nextState;
      setAutoSpinState(nextState);

      // Trigger first spin
      executeSpinStepRef.current();
    },
    [isFreeSpinsMode, effectiveTotalBet, gameConfig, clearNextSpinTimer]
  );

  // ─── IMMEDIATE STOP (STOP BUTTON CLICKED) ──────────────────────────────────
  const handleImmediateStop = useCallback(() => {
    // If auto spin is active or requested, stop it immediately
    if (autoSpinRef.current.isAutoSpinRunning) {
      stopAutoSpin();
    }

    if (!isSpinningRef.current || !lastSpinResultRef.current) return;

    // Clear all pending reel animation intervals and queued sequential stops
    clearReelTimers();

    // Immediately display the authoritative backend grid
    const result = lastSpinResultRef.current;
    setDisplayedGrid(result.rawGrid);

    audio.playReelStop(4);
    handleSpinSettlement(result);
  }, [stopAutoSpin, clearReelTimers]);

  // ─── EXECUTE SINGLE SPIN STEP ──────────────────────────────────────────────
  const executeSpin = useCallback(async () => {
    // Concurrency protection: prevent duplicate or overlapping spins
    if (isSpinningRef.current) {
      return;
    }

    // Only abort if AUTO SPIN is currently active AND a stop was requested
    if (autoSpinRef.current.isAutoSpinRunning && autoSpinRef.current.isStopRequested) {
      autoSpinRef.current.isAutoSpinRunning = false;
      autoSpinRef.current.isStopRequested = false;
      autoSpinRef.current.remainingSpins = 0;
      autoSpinRef.current.currentSpinInProgress = false;
      setAutoSpinState({
        isAutoSpinRunning: false,
        isStopRequested: false,
        remainingSpins: 0,
        currentSpinInProgress: false,
      });
      return;
    }

    // If running a manual spin, clear autoSpin flags so they can never block manual play
    if (!autoSpinRef.current.isAutoSpinRunning) {
      autoSpinRef.current.isStopRequested = false;
      autoSpinRef.current.currentSpinInProgress = false;
    }

    // Check game enabled
    if (gameConfig && gameConfig.isEnabled === false) {
      setStatusMessage('GAME IS CURRENTLY DISABLED');
      if (autoSpinRef.current.isAutoSpinRunning) stopAutoSpin();
      return;
    }

    // Free spin status check with ref priority
    const isFreeSpinActive = isFreeSpinsModeRef.current || isFreeSpinsMode;
    const currentSpinBet = isFreeSpinActive ? 0 : effectiveTotalBet;

    // Check demo balance
    const currentBal = getDemoBalance();
    if (!isFreeSpinActive && currentSpinBet > currentBal) {
      setStatusMessage('INSUFFICIENT DEMO BALANCE');
      if (autoSpinRef.current.isAutoSpinRunning) stopAutoSpin();
      return;
    }

    // Lock spin state in both ref and React state
    isSpinningRef.current = true;
    setIsSpinning(true);
    if (autoSpinRef.current.isAutoSpinRunning) {
      autoSpinRef.current.currentSpinInProgress = true;
      setAutoSpinState((prev) => ({ ...prev, currentSpinInProgress: true }));
    }

    setWinningLines([]);
    setHighlightedLineIndex(-1);
    setActiveExpandedReels([]);
    setPayoutAmount(0);
    setStatusMessage(
      isFreeSpinActive
        ? `FREE SPIN ${freeSpinsTotalAwarded - freeSpinsRemaining + 1} OF ${freeSpinsTotalAwarded}!`
        : autoSpinRef.current.isAutoSpinRunning
        ? `AUTO SPIN IN PROGRESS (${autoSpinRef.current.remainingSpins} REMAINING)...`
        : 'HOTLINE REELS ACCELERATING...'
    );

    // Optimistic balance debit (₹0 for free spins)
    if (!isFreeSpinActive && currentSpinBet > 0) {
      const newBal = +(currentBal - currentSpinBet).toFixed(2);
      setBalance(newBal);
      setLocalDemoBalance(newBal);
    }

    try {
      audio.playSpin();
    } catch {}

    clearReelTimers();

    // Start reel rolling animations
    const reelCycleTime = turboMode ? 40 : 65;
    for (let c = 0; c < 5; c++) {
      spinIntervalRefs.current[c] = window.setInterval(() => {
        setDisplayedGrid((prev) => {
          const next = prev.map((r) => [...r]);
          next[2][c] = next[1][c];
          next[1][c] = next[0][c];
          next[0][c] = Math.floor(Math.random() * 8);
          return next;
        });
      }, reelCycleTime);
    }

    try {
      // Call Backend Slot API with idempotency token
      const idempotencyKey = `spin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const result = await hotlineApi.spin({
        betAmount,
        riskLevel,
        bonusBetActive,
        isFreeSpin: isFreeSpinActive,
        idempotencyKey,
      });

      lastSpinResultRef.current = result;
      setLastSpinResult(result);

      // Stop reels sequentially with tracked timeouts
      const baseDelay = turboMode ? 200 : 550;
      const stepDelay = turboMode ? 100 : 220;

      for (let c = 0; c < 5; c++) {
        reelStopTimeoutRefs.current[c] = window.setTimeout(() => {
          if (spinIntervalRefs.current[c] !== null) {
            clearInterval(spinIntervalRefs.current[c]!);
            spinIntervalRefs.current[c] = null;
          }

          setDisplayedGrid((prev) => {
            const next = prev.map((r) => [...r]);
            next[0][c] = result.rawGrid[0][c];
            next[1][c] = result.rawGrid[1][c];
            next[2][c] = result.rawGrid[2][c];
            return next;
          });

          audio.playReelStop(c);

          if (c === 4) {
            handleSpinSettlement(result);
          }
        }, baseDelay + c * stepDelay);
      }
    } catch (err: any) {
      clearReelTimers();
      isSpinningRef.current = false;
      setIsSpinning(false);
      autoSpinRef.current.currentSpinInProgress = false;
      if (autoSpinRef.current.isAutoSpinRunning) {
        stopAutoSpin();
      }
      // Restore verified server balance if network/backend error occurred
      fetchServerDemoBalance()
        .then((bal) => setBalance(bal))
        .catch(() => {});
      const errMsg = err?.response?.data?.message || err?.message || 'SPIN FAILED';
      setStatusMessage(`ERROR: ${errMsg}`);
    }
  }, [
    effectiveTotalBet,
    isFreeSpinsMode,
    gameConfig,
    turboMode,
    betAmount,
    riskLevel,
    bonusBetActive,
    freeSpinsTotalAwarded,
    freeSpinsRemaining,
    clearReelTimers,
    stopAutoSpin,
  ]);

  // ─── MANUAL SPIN (USER CLICKS SPIN BUTTON) ─────────────────────────────────
  const handleManualSpin = useCallback(() => {
    if (isSpinningRef.current) return;

    // Reset any lingering auto-spin flags
    autoSpinRef.current.isStopRequested = false;
    autoSpinRef.current.isAutoSpinRunning = false;
    autoSpinRef.current.remainingSpins = 0;
    autoSpinRef.current.currentSpinInProgress = false;
    setAutoSpinState({
      isAutoSpinRunning: false,
      isStopRequested: false,
      remainingSpins: 0,
      currentSpinInProgress: false,
    });

    executeSpin();
  }, [executeSpin]);

  // Keep executeSpinStepRef up-to-date
  useEffect(() => {
    executeSpinStepRef.current = executeSpin;
  }, [executeSpin]);

  // ─── SETTLEMENT & EXPANDING WILD ANIMATION ──────────────────────────────────
  const handleSpinSettlement = useCallback(
    (result: HotlineSlotSpinResult) => {
      if (result.expandedReels && result.expandedReels.length > 0) {
        setStatusMessage('⚡ EXPANDING WILD TRIGGERED! ⚡');
        audio.playExpandWild();

        settlementTimeoutRef.current = window.setTimeout(() => {
          setActiveExpandedReels(result.expandedReels);
          setDisplayedGrid(result.expandedGrid);
          finalizeWinningResults(result);
        }, turboMode ? 250 : 500);
      } else {
        finalizeWinningResults(result);
      }
    },
    [turboMode]
  );

  const finalizeWinningResults = useCallback(
    (result: HotlineSlotSpinResult) => {
      isSpinningRef.current = false;
      setIsSpinning(false);
      setBalance(result.balanceAfter);
      setLocalDemoBalance(result.balanceAfter);

      // Prepend to recent history ribbon
      const newHistoryItem: HotlineHistoryItem = {
        id: result.roundId || `spin_${Date.now()}`,
        status: result.isWin ? 'WON' : 'LOST',
        betAmount: result.effectiveBet || result.totalBet || result.betAmount || effectiveTotalBet,
        payout: result.totalPayout,
        multiplier: result.totalMultiplier,
        isWin: result.isWin,
        rawGrid: result.rawGrid,
        expandedGrid: result.expandedGrid,
        winningLines: result.winningLines,
        scatterCount: result.scatterCount,
        isBigWin: result.isBigWin,
        isMegaWin: result.isMegaWin,
        riskLevel: riskLevel,
        bonusBetActive: bonusBetActive,
        isFreeSpinRound: isFreeSpinsModeRef.current || isFreeSpinsMode,
        freeSpinsAwarded: result.freeSpinsAwarded,
        isFreeSpinsTriggered: result.isFreeSpinsTriggered,
        startedAt: new Date().toISOString(),
      };
      setRecentHistory((prev) => [newHistoryItem, ...prev.slice(0, 11)]);

      if (result.isWin) {
        setWinningLines(result.winningLines);
        setPayoutAmount(result.totalPayout);
        audio.playWin(result.totalMultiplier);

        if (isFreeSpinsMode) {
          setFreeSpinsWonAccumulator((prev) => +(prev + result.totalPayout).toFixed(2));
        }

        if (result.isMegaWin) {
          setStatusMessage(`🔥 MEGA WIN! ₹${result.totalPayout.toFixed(2)} (${result.totalMultiplier}x)`);
        } else if (result.isBigWin) {
          setStatusMessage(`⭐ BIG WIN! ₹${result.totalPayout.toFixed(2)} (${result.totalMultiplier}x)`);
        } else {
          setStatusMessage(`WINNER! ₹${result.totalPayout.toFixed(2)} (${result.totalMultiplier}x)`);
        }
      } else {
        setStatusMessage('NO WIN — TRY ANOTHER SPIN');
      }

      // Check Free Spins Trigger (PRD §4 & §9)
      if (result.isFreeSpinsTriggered && !isFreeSpinsMode) {
        stopAutoSpin();
        audio.playFreeSpinsFanfare();
        const awarded = result.freeSpinsAwarded || 10;
        setFreeSpinsTotalAwarded(awarded);
        setFreeSpinsRemaining(awarded);
        setFreeSpinsWonAccumulator(0);
        setShowFreeSpinsModal(true);
        return;
      }

      // Check Free Spins Retrigger
      if (result.isRetrigger && isFreeSpinsMode) {
        audio.playFreeSpinsFanfare();
        const added = result.freeSpinsAwarded || 5;
        setStatusMessage(`🎉 RETRIGGER! +${added} FREE SPINS ADDED!`);
        setFreeSpinsRemaining((prev) => prev + added);
        setFreeSpinsTotalAwarded((prev) => prev + added);
      }

      // Free Spins Progression
      if (isFreeSpinsMode) {
        setFreeSpinsRemaining((prev) => {
          const next = prev - 1;
          if (next > 0) {
            clearNextSpinTimer();
            nextSpinTimeoutRef.current = window.setTimeout(() => {
              executeSpinStepRef.current();
            }, turboMode ? 400 : 1200);
          } else {
            setTimeout(() => {
              isFreeSpinsModeRef.current = false;
              setIsFreeSpinsMode(false);
              setShowFreeSpinsSummary(true);
            }, 800);
          }
          return next;
        });
        return;
      }

      // ─── AUTO SPIN PROGRESSION ─────────────────────────────────────────────
      // Mark current spin finished on authoritative ref
      autoSpinRef.current.currentSpinInProgress = false;

      // If Auto Spin is NOT running, this was a manual spin: finish cleanly and preserve win/loss message
      if (!autoSpinRef.current.isAutoSpinRunning) {
        autoSpinRef.current.isStopRequested = false;
        autoSpinRef.current.remainingSpins = 0;
        return;
      }

      // If Auto Spin IS running, but STOP was requested:
      if (autoSpinRef.current.isStopRequested) {
        autoSpinRef.current.isAutoSpinRunning = false;
        autoSpinRef.current.isStopRequested = false;
        autoSpinRef.current.remainingSpins = 0;
        setAutoSpinState({
          isAutoSpinRunning: false,
          isStopRequested: false,
          remainingSpins: 0,
          currentSpinInProgress: false,
        });
        setStatusMessage('AUTO SPIN STOPPED');
        return;
      }

      // 2. Decrement remaining spins
      const nextRemaining = autoSpinRef.current.remainingSpins - 1;
      autoSpinRef.current.remainingSpins = nextRemaining;

      // 3. Completed all spins?
      if (nextRemaining <= 0) {
        autoSpinRef.current.isAutoSpinRunning = false;
        autoSpinRef.current.remainingSpins = 0;
        setAutoSpinState({
          isAutoSpinRunning: false,
          isStopRequested: false,
          remainingSpins: 0,
          currentSpinInProgress: false,
        });
        setStatusMessage('AUTO SPIN COMPLETED');
        return;
      }

      // 4. Update UI with remaining count
      setAutoSpinState({
        isAutoSpinRunning: true,
        isStopRequested: false,
        remainingSpins: nextRemaining,
        currentSpinInProgress: false,
      });

      // 5. Pre-check balance for upcoming spin
      if (effectiveTotalBet > result.balanceAfter) {
        autoSpinRef.current.isAutoSpinRunning = false;
        autoSpinRef.current.remainingSpins = 0;
        setAutoSpinState({
          isAutoSpinRunning: false,
          isStopRequested: false,
          remainingSpins: 0,
          currentSpinInProgress: false,
        });
        setStatusMessage('INSUFFICIENT DEMO BALANCE — AUTO SPIN STOPPED');
        return;
      }

      // 6. Schedule next spin with cancelable timer
      const delay = turboMode ? 350 : 1100;
      clearNextSpinTimer();
      nextSpinTimeoutRef.current = window.setTimeout(() => {
        // Double-check flags right before starting next spin
        if (!autoSpinRef.current.isStopRequested && autoSpinRef.current.isAutoSpinRunning) {
          executeSpinStepRef.current();
        }
      }, delay);
    },
    [
      isFreeSpinsMode,
      turboMode,
      effectiveTotalBet,
      stopAutoSpin,
      clearNextSpinTimer,
    ]
  );

  // Start Free Spins from modal
  const handleStartFreeSpinsSession = () => {
    setShowFreeSpinsModal(false);
    isFreeSpinsModeRef.current = true;
    setIsFreeSpinsMode(true);
    setTimeout(() => {
      executeSpin();
    }, 350);
  };

  const isWinningCell = (row: number, col: number) => {
    if (highlightedLineIndex >= 0 && winningLines[highlightedLineIndex]) {
      return winningLines[highlightedLineIndex].positions.some(([r, c]) => r === row && c === col);
    }
    return winningLines.some((wl) => wl.positions.some(([r, c]) => r === row && c === col));
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-b from-[#16062c] via-[#0d031c] to-[#080212] border-2 border-fuchsia-600/40 shadow-[0_0_60px_rgba(255,0,128,0.25)] text-white select-none">
      {/* ─── RETRO 80S HEADER (WITH CUSTOM OFFICIAL LOGO) ────────────────── */}
      <div className="relative px-3 sm:px-6 py-2.5 sm:py-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-fuchsia-900/50 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          <div className="relative flex items-center">
            <img
              src="/assets/games/hotline/treasure-hotline-logo.jpg"
              alt="TREASURE HOTLINE"
              className="h-10 sm:h-16 md:h-20 w-auto object-contain rounded-xl sm:rounded-2xl shadow-[0_0_25px_rgba(255,0,128,0.5)] border border-yellow-400/40 transition-transform duration-300 hover:scale-[1.02]"
              loading="eager"
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[11px] md:text-xs font-black tracking-widest uppercase bg-gradient-to-r from-yellow-300 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              RETRO 80S 5-REEL VIDEO SLOT
            </span>
            <span className="text-[10px] text-cyan-300 font-mono tracking-wider">
              EXPANDING WILDS • FREE SPINS • 20 PAYLINES
            </span>
          </div>
        </div>

        {/* Header Controls: Risk Level, BGM, Paytable, Mute */}
        <div className="flex items-center space-x-2.5">
          {/* Risk Level Selector (PRD §3) */}
          <div className="flex items-center bg-black/50 border border-fuchsia-800/40 rounded-xl p-1">
            <button
              disabled={isSpinning || isFreeSpinsMode}
              onClick={() => setRiskLevel('LOW')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                riskLevel === 'LOW'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.5)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              LOW RISK
            </button>
            <button
              disabled={isSpinning || isFreeSpinsMode}
              onClick={() => setRiskLevel('HIGH')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                riskLevel === 'HIGH'
                  ? 'bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-400 shadow-[0_0_8px_rgba(255,0,128,0.5)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              HIGH RISK
            </button>
          </div>

          {/* BGM Toggle */}
          <button
            onClick={toggleBgm}
            title="Toggle Retro Synthwave Music"
            className={`p-2 rounded-xl border transition-all text-xs flex items-center space-x-1 ${
              isBgmOn
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Paytable */}
          <button
            onClick={() => setShowPaytable(!showPaytable)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-white/10 text-cyan-300 transition-all text-xs flex items-center space-x-1"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Paytable</span>
          </button>

          {/* Audio Mute */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-fuchsia-400/50 hover:bg-white/10 text-fuchsia-300 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── STATUS & FREE SPINS BANNER ────────────────────────────────────── */}
      <div
        className={`relative px-6 py-2.5 border-b flex flex-wrap items-center justify-between text-xs transition-all duration-300 ${
          isFreeSpinsMode
            ? 'bg-gradient-to-r from-yellow-950/60 via-amber-900/60 to-yellow-950/60 border-yellow-400/80 shadow-[0_0_20px_rgba(255,215,0,0.4)]'
            : 'bg-gradient-to-r from-fuchsia-950/40 via-purple-900/30 to-cyan-950/40 border-fuchsia-800/30'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isFreeSpinsMode ? (
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
              <span className="font-mono font-black text-yellow-300 tracking-wider">
                FREE SPINS ACTIVE: {freeSpinsRemaining} REMAINING (WON: ₹
                {freeSpinsWonAccumulator.toFixed(2)})
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="font-mono font-bold tracking-wide text-yellow-200">
                {statusMessage}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-gray-400">
            DEMO BALANCE:{' '}
            <strong className="text-emerald-400 font-mono text-sm">₹{balance.toFixed(2)}</strong>
          </span>
          {payoutAmount > 0 && (
            <span className="text-yellow-300 animate-bounce">
              WIN:{' '}
              <strong className="text-yellow-400 font-mono text-sm">₹{payoutAmount.toFixed(2)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ─── 5-REEL 2D SLOT ARENA ───────────────────────────────────────────── */}
      <div className="relative p-1.5 sm:p-4 md:p-6 flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ff007f_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Slot Cabinet Frame */}
        <div
          className={`relative w-full max-w-4xl p-3 rounded-2xl bg-gradient-to-b from-purple-900/40 via-fuchsia-950/30 to-black/60 border backdrop-blur-md transition-all duration-500 ${
            isFreeSpinsMode
              ? 'border-yellow-400/80 shadow-[0_0_50px_rgba(255,215,0,0.5)]'
              : 'border-fuchsia-500/40 shadow-[0_0_40px_rgba(255,0,128,0.3)]'
          }`}
        >
          {/* Top Neon Marquee Line */}
          <div
            className={`h-1 w-full mb-3 animate-pulse bg-gradient-to-r ${
              isFreeSpinsMode
                ? 'from-transparent via-yellow-400 to-transparent'
                : 'from-transparent via-cyan-400 to-transparent'
            }`}
          />

          {/* 5-Reel Grid Container */}
          <div className="grid grid-cols-5 gap-1 sm:gap-3 bg-black/70 p-1 sm:p-3 rounded-xl border border-fuchsia-900/80 shadow-inner">
            {[0, 1, 2, 3, 4].map((col) => {
              const isColExpanding = activeExpandedReels.includes(col);

              return (
                <div
                  key={`reel-${col}`}
                  className={`relative flex flex-col gap-1 sm:gap-2 rounded-lg sm:rounded-xl p-0.5 sm:p-1 bg-gradient-to-b from-black/80 to-purple-950/40 border transition-all duration-300 ${
                    isColExpanding
                      ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.8)]'
                      : 'border-fuchsia-900/40'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] text-center text-gray-500 font-mono font-bold tracking-widest uppercase">
                    R{col + 1}
                  </div>

                  {[0, 1, 2].map((row) => {
                    const symbolId = displayedGrid[row][col];
                    const isWinning = isWinningCell(row, col);

                    return (
                      <div
                        key={`cell-${row}-${col}`}
                        className={`relative aspect-square rounded-lg flex items-center justify-center p-0.5 sm:p-2 transition-transform duration-200 ${
                          isWinning
                            ? 'scale-105 bg-fuchsia-500/20 border-2 border-yellow-400 shadow-[0_0_18px_rgba(255,215,0,0.8)] animate-pulse z-10'
                            : 'bg-black/40 border border-white/5 hover:border-white/20'
                        }`}
                      >
                        {renderSymbolIcon(symbolId, isColExpanding)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Winning Payline Details Ribbon */}
          {winningLines.length > 0 && highlightedLineIndex >= 0 && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-900/60 via-purple-900/70 to-cyan-900/60 border border-yellow-400/50 flex items-center justify-between text-xs animate-fadeIn">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-300">
                  PAYLINE {winningLines[highlightedLineIndex].lineId}:{' '}
                  {winningLines[highlightedLineIndex].name}
                </span>
                <span className="text-gray-300">
                  ({winningLines[highlightedLineIndex].count}x{' '}
                  {winningLines[highlightedLineIndex].symbolName})
                </span>
              </div>
              <div className="font-mono font-black text-yellow-400">
                +₹{winningLines[highlightedLineIndex].payout.toFixed(2)} (
                {winningLines[highlightedLineIndex].multiplier}x)
              </div>
            </div>
          )}

          {/* ─── RECENT SPINS HISTORY RIBBON ────────────────────────────────────── */}
          <div className="mt-3 px-3 py-2 rounded-xl bg-black/60 border border-fuchsia-900/50 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono font-bold tracking-widest text-fuchsia-400 uppercase whitespace-nowrap flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-yellow-400" />
              <span>HISTORY:</span>
            </span>
            {recentHistory.length === 0 ? (
              <span className="text-[10px] text-gray-500 font-mono italic">No recent spins recorded</span>
            ) : (
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                {recentHistory.map((item, idx) => {
                  const isWin = (item.payout && item.payout > 0) || (item.multiplier && item.multiplier > 0);
                  const isBig = item.multiplier >= 10 || item.isBigWin || item.isMegaWin;
                  return (
                    <div
                      key={item.id || idx}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all whitespace-nowrap ${
                        isBig
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400 shadow-[0_0_10px_rgba(255,215,0,0.5)]'
                          : isWin
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-white/5 text-gray-400 border-white/5'
                      }`}
                      title={`Bet: ₹${item.betAmount.toFixed(2)} | Payout: ₹${item.payout.toFixed(2)} | Multiplier: ${item.multiplier}x`}
                    >
                      <span>{item.multiplier > 0 ? `${item.multiplier}x` : '0x'}</span>
                      {isWin && (
                        <span className="text-[9px] text-yellow-400 font-normal">
                          (₹{item.payout.toFixed(0)})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONTROLS CONSOLE ──────────────────────────────────────────────── */}
      <div className="p-2.5 sm:p-4 md:p-6 bg-black/60 border-t border-fuchsia-900/50 backdrop-blur-md flex flex-col landscape:flex-row md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Bet Adjustments & Presets */}
        <div className="flex flex-col space-y-1 w-full md:w-auto">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-mono tracking-widest text-gray-400">
              BASE BET (₹)
            </label>
            <span className="text-[10px] font-mono text-cyan-300">
              TOTAL: <strong className="text-white">₹{effectiveTotalBet.toFixed(2)}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar">
            <button
              disabled={isSpinning || isFreeSpinsMode}
              onClick={() => setBetAmount(10)}
              className="px-2 py-1 sm:py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 shrink-0"
            >
              MIN
            </button>
            {[10, 50, 100, 250, 500].map((preset) => (
              <button
                key={preset}
                disabled={isSpinning || isFreeSpinsMode}
                onClick={() => setBetAmount(preset)}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                  betAmount === preset
                    ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(255,0,128,0.7)]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                ₹{preset}
              </button>
            ))}
            <button
              disabled={isSpinning || isFreeSpinsMode}
              onClick={() => setBetAmount((b) => Math.max(10, Math.floor(b / 2)))}
              className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 shrink-0"
            >
              /2
            </button>
            <button
              disabled={isSpinning || isFreeSpinsMode}
              onClick={() => setBetAmount((b) => Math.min(5000, b * 2))}
              className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 shrink-0"
            >
              2X
            </button>
            <button
              disabled={isSpinning || isFreeSpinsMode}
              onClick={() => setBetAmount(5000)}
              className="px-2 py-1 sm:py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 shrink-0"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Feature Switches: Bonus Bet & Turbo Mode */}
        <div className="flex items-center space-x-3">
          {/* Bonus Bet Switch (PRD §4 & §9) */}
          <button
            disabled={isSpinning || isFreeSpinsMode}
            onClick={() => setBonusBetActive(!bonusBetActive)}
            className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border flex items-center space-x-1.5 ${
              bonusBetActive
                ? 'bg-amber-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_14px_rgba(255,215,0,0.5)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-yellow-400" />
            <span>BONUS BET +50%</span>
          </button>

          {/* Turbo Mode Switch */}
          <button
            onClick={() => setTurboMode(!turboMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border flex items-center space-x-1.5 ${
              turboMode
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>TURBO {turboMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Spin / Auto Spin Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {/* Auto Spin */}
          {autoSpinState.isAutoSpinRunning ? (
            <button
              onClick={stopAutoSpin}
              className="px-5 py-3.5 rounded-xl font-bold text-xs bg-red-600/90 hover:bg-red-500 border border-red-400 text-white shadow-[0_0_20px_rgba(255,0,0,0.5)] flex items-center space-x-2 transition-transform active:scale-95 animate-pulse"
              title="Click to stop Auto Spin immediately"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP AUTO ({autoSpinState.remainingSpins})</span>
            </button>
          ) : autoSpinState.isStopRequested && autoSpinState.currentSpinInProgress ? (
            <button
              disabled
              className="px-5 py-3.5 rounded-xl font-bold text-xs bg-amber-600/60 border border-amber-400 text-amber-200 flex items-center space-x-2 opacity-80 cursor-not-allowed"
              title="Auto Spin stopping after current spin settles"
            >
              <Square className="w-4 h-4 animate-spin" />
              <span>STOPPING...</span>
            </button>
          ) : (
            <div className="relative group">
              <button
                disabled={
                  isSpinning ||
                  isFreeSpinsMode ||
                  autoSpinState.isAutoSpinRunning ||
                  autoSpinState.currentSpinInProgress ||
                  (gameConfig !== null && !gameConfig.isEnabled)
                }
                className="px-4 py-3.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:border-purple-400 hover:bg-white/10 text-gray-300 transition-all flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>AUTO</span>
                <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
              {!isSpinning &&
                !isFreeSpinsMode &&
                !autoSpinState.isAutoSpinRunning &&
                !autoSpinState.currentSpinInProgress &&
                (!gameConfig || gameConfig.isEnabled) && (
                  <div className="absolute bottom-full mb-2 left-0 hidden group-hover:flex flex-col bg-black/95 border border-fuchsia-500/40 rounded-xl p-1 shadow-2xl z-50 min-w-[110px]">
                    {[10, 25, 50, 100].map((count) => (
                      <button
                        key={count}
                        onClick={() => startAutoSpin(count)}
                        className="px-4 py-2 hover:bg-fuchsia-600/40 text-xs font-mono font-bold text-left rounded-lg transition-colors text-white"
                      >
                        {count} SPINS
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Primary Action Button */}
          {isSpinning ? (
            <button
              onClick={handleImmediateStop}
              className="px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-[0_0_20px_rgba(255,80,0,0.6)] flex items-center space-x-2 animate-pulse hover:scale-105 active:scale-95"
              title="Stop spin immediately"
            >
              <Square className="w-4 h-4" />
              <span>STOP</span>
            </button>
          ) : (
            <button
              data-testid="hotline-spin-button"
              disabled={
                (!isFreeSpinsMode && balance < effectiveTotalBet) ||
                (gameConfig !== null && !gameConfig.isEnabled) ||
                autoSpinState.isAutoSpinRunning ||
                autoSpinState.currentSpinInProgress
              }
              onClick={handleManualSpin}
              className={`px-10 py-3.5 rounded-2xl font-black text-base tracking-widest uppercase text-black hover:scale-105 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                isFreeSpinsMode
                  ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 shadow-[0_0_30px_rgba(255,215,0,0.9)] animate-pulse'
                  : 'bg-gradient-to-r from-yellow-400 via-fuchsia-500 to-cyan-400 hover:from-yellow-300 hover:to-cyan-300 shadow-[0_0_25px_rgba(255,0,128,0.8)]'
              }`}
            >
              <Play className="w-5 h-5 fill-black" />
              <span>{isFreeSpinsMode ? 'FREE SPIN' : 'SPIN'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── FREE SPINS TRIGGER MODAL ──────────────────────────────────────── */}
      {showFreeSpinsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#2d094e] to-[#120324] border-2 border-yellow-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(255,215,0,0.8)] text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-yellow-400/20 border border-yellow-400 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-yellow-300 animate-spin" />
            </div>
            <h2 className="text-2xl font-black italic tracking-wider text-yellow-300 mb-1">
              CONGRATULATIONS!
            </h2>
            <p className="text-sm font-bold text-fuchsia-300 mb-4">
              YOU TRIGGERED {freeSpinsTotalAwarded} FREE SPINS!
            </p>
            <div className="p-3 mb-5 rounded-xl bg-black/50 border border-yellow-500/30 text-xs text-gray-300 space-y-1">
              <p>• Spins deduct ₹0 from demo balance</p>
              <p>• 2X Boosted Expanding Wild frequency</p>
              <p>• 3+ Scatters retrigger +5 Free Spins</p>
            </div>
            <button
              onClick={handleStartFreeSpinsSession}
              className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-[0_0_25px_rgba(255,215,0,0.8)] hover:scale-105 active:scale-95 transition-all"
            >
              START FREE SPINS
            </button>
          </div>
        </div>
      )}

      {/* ─── FREE SPINS SUMMARY MODAL ──────────────────────────────────────── */}
      {showFreeSpinsSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#2d094e] to-[#120324] border-2 border-fuchsia-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(255,0,128,0.8)] text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-yellow-400 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black italic tracking-wider text-yellow-300 mb-1">
              FREE SPINS COMPLETE!
            </h2>
            <p className="text-xs text-gray-300 mb-3">TOTAL BONUS WIN ACCUMULATED</p>
            <div className="text-3xl font-black font-mono text-emerald-400 mb-5">
              ₹{freeSpinsWonAccumulator.toFixed(2)}
            </div>
            <button
              onClick={() => setShowFreeSpinsSummary(false)}
              className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(255,0,128,0.6)] hover:scale-105 active:scale-95 transition-all"
            >
              COLLECT & CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* ─── PAYTABLE MODAL ────────────────────────────────────────────────── */}
      {showPaytable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1c0834] to-[#0d031c] border-2 border-fuchsia-500/60 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-fuchsia-800/50 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/assets/games/hotline/treasure-hotline-logo.jpg"
                  alt="TREASURE HOTLINE"
                  className="h-10 w-auto object-contain rounded-lg shadow-[0_0_12px_rgba(255,215,0,0.5)] border border-yellow-400/30"
                />
                <h2 className="text-xl font-black italic tracking-wider text-yellow-300">
                  PAYTABLE & FEATURES
                </h2>
              </div>
              <button
                onClick={() => setShowPaytable(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Special Features Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-400/40">
                <h4 className="font-bold text-cyan-300 text-xs flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>EXPANDING WILD</span>
                </h4>
                <p className="text-[11px] text-gray-300 mt-1">
                  Wild symbols expand vertically to cover all 3 rows of any reel where they land!
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-yellow-950/40 border border-yellow-400/40">
                <h4 className="font-bold text-yellow-300 text-xs flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>FREE SPINS BONUS</span>
                </h4>
                <p className="text-[11px] text-gray-300 mt-1">
                  3 Scatters = 10 spins, 4 = 15, 5 = 20. Retrigger +5 spins during bonus!
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-fuchsia-950/40 border border-fuchsia-400/40">
                <h4 className="font-bold text-fuchsia-300 text-xs flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>BONUS BET (+50%)</span>
                </h4>
                <p className="text-[11px] text-gray-300 mt-1">
                  Optional +50% bet boosts Expanding Wild frequency for extra big win potential.
                </p>
              </div>
            </div>

            {/* Symbol Payout Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 0, code: 'WILD', name: 'Wild (Expanding)', p5: '480x / 1050x', p4: '170x / 370x', p3: '32x / 55x' },
                { id: 1, code: 'NEON_7', name: 'Neon 7', p5: '400x / 850x', p4: '140x / 270x', p3: '28x / 40x' },
                { id: 2, code: 'HOTLINE_PHONE', name: 'Hotline Phone', p5: '280x / 550x', p4: '95x / 170x', p3: '19x / 27x' },
                { id: 3, code: 'SPORTS_CAR', name: 'Sports Car', p5: '180x / 320x', p4: '65x / 105x', p3: '14x / 17x' },
                { id: 4, code: 'PALM_TREE', name: 'Palm Tree', p5: '120x / 180x', p4: '42x / 62x', p3: '9x / 11x' },
                { id: 5, code: 'CASSETTE', name: 'Cassette', p5: '75x / 100x', p4: '26x / 35x', p3: '6x / 6x' },
                { id: 6, code: 'STAR', name: 'Star', p5: '45x / 50x', p4: '15x / 17x', p3: '3.5x / 2.5x' },
                { id: 7, code: 'SCATTER', name: 'Scatter (Total Bet)', p5: '75x / 250x', p4: '20x / 60x', p3: '5x / 15x' },
              ].map((sym) => (
                <div
                  key={sym.id}
                  className="p-2 rounded-xl bg-black/50 border border-fuchsia-900/40 flex flex-col items-center text-center"
                >
                  <div className="w-10 h-10 mb-1">{renderSymbolIcon(sym.id)}</div>
                  <span className="font-bold text-[10px] text-fuchsia-300 mb-0.5">{sym.name}</span>
                  <div className="text-[9px] text-gray-400 font-mono space-y-0.5">
                    <div>5: <strong className="text-yellow-300">{sym.p5}</strong></div>
                    <div>4: <strong className="text-yellow-300">{sym.p4}</strong></div>
                    <div>3: <strong className="text-yellow-300">{sym.p3}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-[10px] text-gray-400 font-mono text-center">
              (Payouts shown as LOW RISK / HIGH RISK) • 20 Fixed Paylines • RTP 96.00% • Line Bet = Base Bet / 20
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
