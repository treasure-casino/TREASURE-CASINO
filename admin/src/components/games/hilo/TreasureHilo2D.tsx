import React, { useState, useEffect, useRef } from 'react';
import {
  HiloCard,
  HiloConfig,
  HiloRoundState,
  HiloHistoryItem,
  HiloPrediction,
  DEFAULT_HILO_CONFIG,
} from '../../../types/hilo';
import { hiloApi } from '../../../services/hiloApi';
import { getDemoBalance, setLocalDemoBalance } from '../../../utils/demoWallet';
import {
  Coins,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowUp,
  ArrowDown,
  Equal,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
} from 'lucide-react';

// ── Web Audio Synthesizer for Physical Sound Effects ──
class HiloAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Card slide from shoe
  playCardSlide() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
      filter.Q.setValueAtTime(2.5, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch {}
  }

  // Card flip snap
  playCardFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // Correct guess win chime
  playWinChime(streak = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 523.25 + streak * 45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.14);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // Push tone
  playPushTone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  // Loss tone
  playLossTone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // Big cashout fanfare
  playCollectFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.28);
      });
    } catch {}
  }
}

const audio = new HiloAudio();
const QUICK_CHIPS = [10, 50, 100, 500, 1000];

// ── 3D Flippable Playing Card Component ──
interface FlippableCardProps {
  card: HiloCard | null;
  isFaceDown: boolean;
  isGlowing?: boolean;
  glowColor?: 'gold' | 'red' | 'cyan';
  label?: string;
}

const isRedSuit = (suit?: string): boolean => {
  if (!suit) return false;
  return suit === '♥' || suit === '♦' || suit === 'H' || suit === 'D';
};

const FlippableCard: React.FC<FlippableCardProps> = ({
  card,
  isFaceDown,
  isGlowing,
  glowColor = 'gold',
  label,
}) => {
  const isRed = isRedSuit(card?.suit);

  const glowClass = isGlowing
    ? glowColor === 'gold'
      ? 'ring-2 sm:ring-4 ring-gold shadow-[0_0_30px_rgba(234,179,8,0.6)]'
      : glowColor === 'red'
      ? 'ring-2 sm:ring-4 ring-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)]'
      : 'ring-2 sm:ring-4 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]'
    : 'shadow-2xl';

  // Force Unicode text-presentation selector (\uFE0E) to prevent OS emoji substitution on Android / iOS
  const suitSymbol = card?.suit ? `${card.suit}\uFE0E` : '';
  const isFaceCard = card?.rank === 'A' || card?.rank === 'K' || card?.rank === 'Q' || card?.rank === 'J';

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      {label && (
        <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-gray-400 font-mono">
          {label}
        </span>
      )}
      <div
        className={`relative w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-48 lg:w-36 lg:h-52 perspective-1000 select-none ${glowClass} rounded-xl transition-all duration-300`}
        style={{
          aspectRatio: '2.5 / 3.5',
          minWidth: '88px',
          minHeight: '130px',
        }}
      >
        <div
          className="w-full h-full relative transition-transform duration-500 ease-out"
          style={{
            transform: isFaceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
          }}
        >
          {/* Card Front (Face-Up) */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-gray-100 rounded-xl border border-gray-300/90 shadow-2xl flex flex-col justify-between p-2 sm:p-2.5 overflow-hidden"
            style={{
              transform: 'rotateY(0deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {card ? (
              <>
                {/* Top-Left Rank & Suit Index */}
                <div
                  className={`flex flex-col items-start leading-none font-black z-10 ${
                    isRed ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  <span className="text-base sm:text-lg md:text-xl font-bold font-sans tracking-tight">
                    {card.rank}
                  </span>
                  <span className="text-xs sm:text-sm font-sans mt-0.5 font-bold">
                    {suitSymbol}
                  </span>
                </div>

                {/* Center Graphic: Face card portrait or prominent suit emblem */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
                  {isFaceCard ? (
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`text-3xl sm:text-4xl md:text-5xl font-black font-cinzel leading-none ${
                          isRed ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {card.rank}
                      </span>
                      <span
                        className={`text-lg sm:text-xl md:text-2xl mt-0.5 leading-none font-bold ${
                          isRed ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {suitSymbol}
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`text-4xl sm:text-5xl md:text-6xl leading-none font-bold drop-shadow-sm ${
                        isRed ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {suitSymbol}
                    </span>
                  )}

                  {/* Subtle Background Watermark */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl md:text-7xl opacity-5 pointer-events-none font-bold ${
                      isRed ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {suitSymbol}
                  </div>
                </div>

                {/* Bottom-Right Inverted Rank & Suit Index */}
                <div
                  className={`flex flex-col items-end leading-none font-black self-end rotate-180 z-10 ${
                    isRed ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  <span className="text-base sm:text-lg md:text-xl font-bold font-sans tracking-tight">
                    {card.rank}
                  </span>
                  <span className="text-xs sm:text-sm font-sans mt-0.5 font-bold">
                    {suitSymbol}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-300">
                <HelpCircle className="w-8 h-8 opacity-40 text-gray-400" />
              </div>
            )}
          </div>

          {/* Card Back (Face-Down) */}
          <div
            className="absolute inset-0 rounded-xl border-2 border-amber-500/80 shadow-2xl p-1 sm:p-1.5 overflow-hidden"
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            }}
          >
            <div className="w-full h-full rounded-lg border border-gold/40 flex flex-col items-center justify-center p-1.5 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:6px_6px]">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gold/70 flex items-center justify-center bg-dark-900/90 shadow-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-gold animate-spin" />
              </div>
              <span className="text-[7.5px] sm:text-[9px] font-cinzel font-black text-gold tracking-widest mt-1.5">
                TREASURE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TreasureHilo2D: React.FC = () => {
  // Game Setup
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [config, setConfig] = useState<HiloConfig>(DEFAULT_HILO_CONFIG);
  const [muted, setMuted] = useState<boolean>(false);

  // Active Round State
  const [roundState, setRoundState] = useState<HiloRoundState | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [baseCardDisplay, setBaseCardDisplay] = useState<HiloCard | null>(null);
  const [isBaseFaceDown, setIsBaseFaceDown] = useState<boolean>(true);
  const [revealedCardDisplay, setRevealedCardDisplay] = useState<HiloCard | null>(null);
  const [isRevealFaceDown, setIsRevealFaceDown] = useState<boolean>(true);
  const [lastOutcome, setLastOutcome] = useState<'WIN' | 'LOSS' | 'PUSH' | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HiloHistoryItem[]>([]);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // Sync Audio Mute
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.muted = next;
  };

  // Sync demo balance event
  useEffect(() => {
    const handleBalance = () => setBalance(getDemoBalance());
    window.addEventListener('demo_balance_updated', handleBalance);
    return () => window.removeEventListener('demo_balance_updated', handleBalance);
  }, []);

  // Fetch initial config & history
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [loadedConfig, loadedHistory] = await Promise.all([
          hiloApi.getConfig().catch(() => null),
          hiloApi.getHistory(15).catch(() => []),
        ]);
        if (!isMounted) return;
        if (loadedConfig?.config) setConfig(loadedConfig.config);
        if (loadedHistory) setHistory(loadedHistory);
      } catch (err) {
        console.warn('Hilo initialization error:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Action: Start New Round ──
  const handleStartRound = async () => {
    if (isProcessing) return;
    if (balance < betAmount) {
      setError(`Insufficient demo balance. Required: ₹${betAmount}`);
      return;
    }

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setLastOutcome(null);
      setRevealedCardDisplay(null);
      setIsRevealFaceDown(true);
      setIsBaseFaceDown(true);
      audio.playCardSlide();

      const data = await hiloApi.startRound(betAmount);
      setRoundState(data);
      setBaseCardDisplay(data.currentCard);
      setIsBaseFaceDown(false);
      audio.playCardFlip();
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setBannerMessage(data.message);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to start Hilo round');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Action: Make Prediction (Higher, Lower, Same) ──
  const handlePredict = async (prediction: HiloPrediction) => {
    if (!roundState || isProcessing || roundState.status !== 'ACTIVE') return;

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    const currentBase = baseCardDisplay || roundState.currentCard;

    try {
      setIsProcessing(true);
      setError(null);
      setIsRevealFaceDown(true);

      audio.playCardSlide();

      const data = await hiloApi.predict(roundState.roundId, prediction);

      // Lock current base card on Card 1 and set upcoming revealed card on Card 2
      setBaseCardDisplay(currentBase);
      setRevealedCardDisplay(data.revealedCard);

      // Trigger card flip animation
      setTimeout(() => {
        setIsRevealFaceDown(false);
        audio.playCardFlip();
        setLastOutcome(data.stepOutcome);

        // Sound effect based on step result
        if (data.stepOutcome === 'WIN') {
          audio.playWinChime(data.streak);
        } else if (data.stepOutcome === 'PUSH') {
          audio.playPushTone();
        } else {
          audio.playLossTone();
        }

        setRoundState(data);
        setBalance(data.balance);
        setLocalDemoBalance(data.balance);
        setBannerMessage(data.message);

        // Update history if settled
        if (data.status !== 'ACTIVE') {
          hiloApi.getHistory(15).then((h) => setHistory(h)).catch(() => {});
        } else {
          // If round remains active (win/push in streak), let player view showdown result,
          // then smoothly shift revealed card to become the new base card for next guess
          transitionTimerRef.current = setTimeout(() => {
            setBaseCardDisplay(data.currentCard);
            setIsRevealFaceDown(true);
            setRevealedCardDisplay(null);
            transitionTimerRef.current = null;
          }, 850);
        }
      }, 250);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Prediction failed');
    } finally {
      setTimeout(() => setIsProcessing(false), 550);
    }
  };

  // ── Action: Collect Winnings ──
  const handleCollect = async () => {
    if (!roundState || isProcessing || roundState.status !== 'ACTIVE' || roundState.streak === 0) return;

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const res = await hiloApi.collect(roundState.roundId);

      audio.playCollectFanfare();
      setBalance(res.balance);
      setLocalDemoBalance(res.balance);
      setBannerMessage(`💰 Collected ₹${res.payout.toFixed(2)} (${res.multiplier.toFixed(2)}x)!`);

      setRoundState((prev) => (prev ? { ...prev, status: 'WON', balance: res.balance } : null));
      hiloApi.getHistory(15).then((h) => setHistory(h)).catch(() => {});
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to collect winnings');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Bet Adjustments
  const handleQuickBet = (amt: number) => {
    if (roundState && roundState.status === 'ACTIVE') return;
    setBetAmount(amt);
  };
  const handleHalf = () => {
    if (roundState && roundState.status === 'ACTIVE') return;
    setBetAmount((prev) => Math.max(config.minBet, Math.floor(prev / 2)));
  };
  const handleDouble = () => {
    if (roundState && roundState.status === 'ACTIVE') return;
    setBetAmount((prev) => Math.min(config.maxBet, prev * 2));
  };
  const handleMax = () => {
    if (roundState && roundState.status === 'ACTIVE') return;
    setBetAmount(Math.min(config.maxBet, Math.max(config.minBet, Math.floor(balance))));
  };

  const isRoundActive = Boolean(roundState && roundState.status === 'ACTIVE');
  const currentCard = roundState?.currentCard || null;
  const nextMults = roundState?.nextMultipliers;

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-0 p-1.5 sm:p-4 md:p-6 text-white select-none">
      {/* ── Top Header Bar ── */}
      <div className="w-full max-w-5xl hidden sm:flex items-center justify-between bg-dark-900/90 border border-purple-500/30 rounded-2xl p-3 sm:p-4 mb-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-600 to-indigo-800 rounded-xl shadow-lg border border-purple-400/40">
            <Trophy className="w-5 h-5 text-gold animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-cinzel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow">
              TREASURE HILO
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 font-mono">
              Higher • Lower • Same • 96% RTP
            </p>
          </div>
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Balance Pill */}
          <div className="flex items-center gap-2 bg-dark-950/80 border border-gold/40 px-3 py-1.5 rounded-full shadow-inner">
            <Coins className="w-4 h-4 text-gold animate-spin-slow" />
            <span className="font-mono text-xs sm:text-sm font-bold text-gold">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl transition text-gray-300 hover:text-white"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Rules Modal Button */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl transition text-gray-300 hover:text-white"
            title="How to Play"
          >
            <Info className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* ── Main Arena: Table & HUD ── */}
      <div className="w-full max-w-5xl grid grid-cols-1 landscape:grid-cols-12 md:grid-cols-12 lg:grid-cols-12 gap-2 sm:gap-4">
        {/* Left Side (4 Cols): Betting & Actions HUD */}
        <div className="order-2 landscape:order-1 md:order-1 lg:order-1 landscape:col-span-5 md:col-span-5 lg:col-span-4 flex flex-col gap-2 sm:gap-3 bg-dark-900/90 backdrop-blur border border-dark-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-2xl">
          {/* Current Bet Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-gray-400">
              <span>BET AMOUNT</span>
              <span className="text-[11px] font-mono text-purple-400">
                Min: ₹{config.minBet} • Max: ₹{config.maxBet}
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-gold font-bold font-mono text-sm">₹</span>
              <input
                type="number"
                disabled={isRoundActive}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl pl-8 pr-16 py-2.5 text-sm sm:text-base font-mono font-bold text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-60"
              />
              <div className="absolute right-1 flex gap-1">
                <button
                  type="button"
                  disabled={isRoundActive}
                  onClick={handleHalf}
                  className="px-2 py-1 text-[11px] font-bold bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition disabled:opacity-40"
                >
                  ½
                </button>
                <button
                  type="button"
                  disabled={isRoundActive}
                  onClick={handleDouble}
                  className="px-2 py-1 text-[11px] font-bold bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition disabled:opacity-40"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  disabled={isRoundActive}
                  onClick={() => handleQuickBet(chip)}
                  className={`py-1 text-[11px] font-mono font-bold rounded-lg border transition ${
                    betAmount === chip
                      ? 'bg-purple-600 border-purple-400 text-white shadow'
                      : 'bg-dark-950/60 border-dark-800 hover:border-purple-500/50 text-gray-300'
                  } disabled:opacity-40`}
                >
                  ₹{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Current Potential Multiplier & Payout Card */}
          <div className="bg-dark-950/80 border border-dark-800 rounded-2xl p-3 shadow-inner space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold border-b border-dark-800 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Flame className={`w-3.5 h-3.5 ${isRoundActive && (roundState?.streak ?? 0) > 0 ? 'text-amber-400 animate-bounce' : 'text-gray-500'}`} />
                <span>STREAK: {roundState?.streak ?? 0}</span>
              </span>
              <span className="font-mono text-purple-400 font-bold">
                {roundState?.accumulatedMultiplier ? `${roundState.accumulatedMultiplier.toFixed(2)}x` : '1.00x'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Potential Win</span>
                <span className="text-base sm:text-lg font-black font-mono text-gold drop-shadow">
                  ₹{(roundState?.potentialPayout ?? betAmount).toFixed(2)}
                </span>
              </div>
              {isRoundActive && (roundState?.streak ?? 0) > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">Profit</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    +₹{Math.max(0, (roundState?.potentialPayout ?? 0) - (roundState?.betAmount ?? betAmount)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── PREDICTION ACTIONS (HIGHER, LOWER, SAME) ── */}
          {isRoundActive && roundState ? (
            <div className="space-y-2 pt-1">
              {/* HIGHER Button */}
              <button
                type="button"
                disabled={isProcessing || !roundState.canHigher}
                onClick={() => handlePredict('HIGHER')}
                className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition shadow-lg ${
                  roundState.canHigher && !isProcessing
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/20 active:scale-98'
                    : 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200 animate-bounce" />
                  <span>HIGHER ▲</span>
                </div>
                {nextMults?.higherMultiplier ? (
                  <div className="text-right font-mono">
                    <span className="text-[11px] sm:text-xs bg-emerald-950/80 border border-emerald-400/40 px-2 py-0.5 rounded-full text-emerald-300">
                      {nextMults.higherMultiplier.toFixed(2)}x
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-200/80 block mt-0.5">
                      {nextMults.higherWinChance}% Chance
                    </span>
                  </div>
                ) : (
                  <span className="text-xs italic text-gray-400">N/A (Ace)</span>
                )}
              </button>

              {/* LOWER Button */}
              <button
                type="button"
                disabled={isProcessing || !roundState.canLower}
                onClick={() => handlePredict('LOWER')}
                className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition shadow-lg ${
                  roundState.canLower && !isProcessing
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-500/20 active:scale-98'
                    : 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-200 animate-bounce" />
                  <span>LOWER ▼</span>
                </div>
                {nextMults?.lowerMultiplier ? (
                  <div className="text-right font-mono">
                    <span className="text-[11px] sm:text-xs bg-rose-950/80 border border-rose-400/40 px-2 py-0.5 rounded-full text-rose-300">
                      {nextMults.lowerMultiplier.toFixed(2)}x
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-rose-200/80 block mt-0.5">
                      {nextMults.lowerWinChance}% Chance
                    </span>
                  </div>
                ) : (
                  <span className="text-xs italic text-gray-400">N/A (2)</span>
                )}
              </button>

              {/* SAME Button (Optional third prediction) */}
              {config.allowSame && (
                <button
                  type="button"
                  disabled={isProcessing || !roundState.canSame}
                  onClick={() => handlePredict('SAME')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-500/20 active:scale-98 transition disabled:opacity-40"
                >
                  <div className="flex items-center gap-2">
                    <Equal className="w-4 h-4 text-purple-200" />
                    <span>SAME =</span>
                  </div>
                  {nextMults?.sameMultiplier && (
                    <div className="text-right font-mono">
                      <span className="text-xs bg-purple-950/80 border border-purple-400/40 px-2 py-0.5 rounded-full text-purple-300">
                        {nextMults.sameMultiplier.toFixed(2)}x
                      </span>
                      <span className="text-[10px] text-purple-200/80 block mt-0.5">
                        {nextMults.sameWinChance}% Chance
                      </span>
                    </div>
                  )}
                </button>
              )}

              {/* COLLECT CASH OUT BUTTON */}
              <button
                type="button"
                disabled={isProcessing || !roundState.canCollect}
                onClick={handleCollect}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide uppercase transition shadow-xl flex items-center justify-center gap-2 ${
                  roundState.canCollect && !isProcessing
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-gold/30 animate-pulse active:scale-98'
                    : 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                }`}
              >
                <Coins className="w-4 h-4 text-black" />
                <span>
                  COLLECT ₹{(roundState.potentialPayout ?? 0).toFixed(2)} ({(roundState.accumulatedMultiplier ?? 1).toFixed(2)}x)
                </span>
              </button>
            </div>
          ) : (
            /* START GAME / NEW ROUND BUTTON */
            <div className="pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleStartRound}
                className="w-full py-4 rounded-2xl font-black text-base tracking-wider uppercase bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white shadow-xl shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START ROUND (₹{betAmount})</span>
              </button>
            </div>
          )}

          {/* Feedback & Error Alerts */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2.5 rounded-xl text-xs font-mono">
              <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Side (8 Cols): Felt Gaming Arena */}
        <div className="order-1 landscape:order-2 md:order-2 lg:order-2 landscape:col-span-7 md:col-span-7 lg:col-span-8 flex flex-col items-center justify-between bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 border border-purple-500/20 rounded-2xl sm:rounded-3xl p-2 sm:p-6 shadow-2xl relative overflow-hidden min-h-[220px] sm:min-h-[400px]">
          {/* Table Background Accent Felt Border */}
          <div className="absolute inset-2 sm:inset-4 rounded-2xl border-2 border-gold/20 pointer-events-none bg-[radial-gradient(#a855f7_0.7px,transparent_0.7px)] [background-size:16px_16px] opacity-20" />

          {/* Banner Notification Bar */}
          <div className="w-full z-10">
            {bannerMessage ? (
              <div
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold font-mono text-center shadow-lg transition backdrop-blur-md ${
                  lastOutcome === 'WIN'
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                    : lastOutcome === 'LOSS'
                    ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                    : lastOutcome === 'PUSH'
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                    : 'bg-dark-900/90 border border-dark-700 text-gray-200'
                }`}
              >
                {bannerMessage}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-gray-500 font-mono italic">
                Predict whether the next card will be higher, lower, or equal!
              </div>
            )}
          </div>

          {/* ── CARD ARENA ── */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-10 my-2 sm:my-4 z-10 w-full max-w-lg">
            {/* Card 1: Current Base Card */}
            <div className="flex flex-col items-center">
              <FlippableCard
                card={baseCardDisplay}
                isFaceDown={isBaseFaceDown}
                isGlowing={isRoundActive}
                glowColor="gold"
                label="Base Card"
              />
              {baseCardDisplay && !isBaseFaceDown && (
                <div className="mt-2 text-[11px] sm:text-xs font-mono font-bold text-gray-300 bg-dark-950/80 px-2.5 py-1 rounded-lg border border-dark-800 shadow">
                  Rank: <span className="text-gold">{baseCardDisplay.rank}</span> ({baseCardDisplay.value})
                </div>
              )}
            </div>

            {/* Center VS Indicator */}
            <div className="flex flex-col items-center justify-center gap-1 sm:gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border border-purple-500/40 bg-dark-900/90 shadow-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-gray-400">
                NEXT
              </span>
            </div>

            {/* Card 2: Next Revealed Card */}
            <div className="flex flex-col items-center">
              <FlippableCard
                card={revealedCardDisplay}
                isFaceDown={isRevealFaceDown}
                isGlowing={lastOutcome !== null}
                glowColor={lastOutcome === 'WIN' ? 'gold' : lastOutcome === 'LOSS' ? 'red' : 'cyan'}
                label="Revealed Card"
              />
              {revealedCardDisplay && !isRevealFaceDown && (
                <div className="mt-2 text-[11px] sm:text-xs font-mono font-bold text-gray-300 bg-dark-950/80 px-2.5 py-1 rounded-lg border border-dark-800 shadow">
                  Rank: <span className="text-gold">{revealedCardDisplay.rank}</span> ({revealedCardDisplay.value})
                </div>
              )}
            </div>
          </div>

          {/* ── ROUND CARD STREAK JOURNEY BAR ── */}
          <div className="w-full z-10 bg-dark-950/70 border border-dark-800/80 rounded-2xl p-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-1.5 px-1">
              <span>ROUND CARD SEQUENCE</span>
              <span>Cards: {roundState?.history?.length ?? 0}</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {roundState?.history && roundState.history.length > 0 ? (
                roundState.history.map((step, idx) => {
                  const isRed = step.card.suit === '♥' || step.card.suit === '♦';
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-xs shrink-0 shadow-sm ${
                        step.outcome === 'WIN'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : step.outcome === 'PUSH'
                          ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                          : step.outcome === 'LOSS'
                          ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                          : 'bg-dark-900 border-dark-700 text-gray-300'
                      }`}
                    >
                      <span className={`font-bold ${isRed ? 'text-red-400' : 'text-gray-200'}`}>
                        {step.card.rank}{step.card.suit}
                      </span>
                      {step.prediction && (
                        <span className="text-[10px] text-gray-400">
                          {step.prediction === 'HIGHER' ? '▲' : step.prediction === 'LOWER' ? '▼' : '='}
                        </span>
                      )}
                      {step.multiplierApplied && step.multiplierApplied > 0 && (
                        <span className="text-[10px] text-gold font-bold">
                          {step.multiplierApplied.toFixed(2)}x
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 italic py-1 px-2">
                  Cards drawn in this round will appear here sequentially.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Round History Table ── */}
      <div className="w-full max-w-5xl mt-6 bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-gray-300 border-b border-dark-800 pb-2 mb-3">
          <span className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>RECENT HILO ROUNDS</span>
          </span>
          <span className="text-xs font-mono text-gray-500">Live Session History</span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-dark-800/80">
                  <th className="pb-2">Round ID</th>
                  <th className="pb-2">Bet</th>
                  <th className="pb-2">Streak</th>
                  <th className="pb-2">Multiplier</th>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/50">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-dark-800/30 transition">
                    <td className="py-2 text-gray-400">{item.id.slice(0, 8)}...</td>
                    <td className="py-2 text-gray-200">₹{item.betAmount.toFixed(2)}</td>
                    <td className="py-2 text-purple-300 font-bold">{item.streak} Cards</td>
                    <td className="py-2 text-gold font-bold">{item.multiplier.toFixed(2)}x</td>
                    <td className="py-2 text-emerald-400 font-bold">₹{item.payout.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'WON'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : item.status === 'LOST'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-gray-500 italic">
            No completed rounds recorded in current session.
          </div>
        )}
      </div>

      {/* ── Rules Modal ── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <h2 className="text-lg font-cinzel font-black text-gold">TREASURE HILO RULES</h2>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-gray-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-2.5 text-gray-300 leading-relaxed">
              <p>
                • <strong>Card Hierarchy</strong>: 2 is lowest (2), 3–10 face value, J (11), Q (12), K (13), and Ace is highest (14).
              </p>
              <p>
                • <strong>Predictions</strong>:
                <br />- <strong>HIGHER</strong>: Next card must be strictly higher rank.
                <br />- <strong>LOWER</strong>: Next card must be strictly lower rank.
                <br />- <strong>SAME</strong>: Next card must be identical rank (pays huge multiplier ~12.5x).
              </p>
              <p>
                • <strong>PUSH Rule</strong>: Equal rank on HIGHER or LOWER predictions results in a PUSH. Your streak and potential winnings are fully preserved!
              </p>
              <p>
                • <strong>COLLECT</strong>: Lock in your accumulated winnings at any point during an active round!
              </p>
              <p>
                • <strong>Demo Wallet</strong>: All transactions operate in simulated demo mode.
              </p>
            </div>
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition text-xs"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
