import React, { useState, useEffect, useRef } from 'react';
import {
  KenoConfig,
  KenoHistoryItem,
  KenoRoundResult,
  DEFAULT_KENO_CONFIG,
} from '../../../types/keno';
import { kenoApi } from '../../../services/kenoApi';
import { getDemoBalance, setLocalDemoBalance } from '../../../utils/demoWallet';
import {
  Coins,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Trophy,
  Dices,
  Trash2,
  CheckCircle2,
  Zap,
} from 'lucide-react';

// Web Audio Sound Synthesizer for instant physical ball sounds & winning fanfares
class KenoAudio {
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

  playChip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  // Ball drawn ping
  playDrawBall() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(250, now + 0.06);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  // Number match hit chime (ascending bright tone)
  playMatchHit(matchIndex = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 587.33 + matchIndex * 70; // High D tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // Win Fanfare
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
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

const audio = new KenoAudio();
const QUICK_CHIPS = [10, 50, 100, 500, 1000];
const ALL_NUMBERS = Array.from({ length: 80 }, (_, i) => i + 1);

export const TreasureKeno2D: React.FC = () => {
  // Game Setup
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([7, 14, 21, 28, 35]);
  const [config, setConfig] = useState<KenoConfig>(DEFAULT_KENO_CONFIG);

  // Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnSoFar, setDrawnSoFar] = useState<number[]>([]);
  const [currentRound, setCurrentRound] = useState<KenoRoundResult | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<KenoHistoryItem[]>([]);
  const [muted, setMuted] = useState<boolean>(false);

  // Auto Play
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoRoundsLeft, setAutoRoundsLeft] = useState<number>(0);
  const [stopOnProfit, setStopOnProfit] = useState<string>('');
  const [stopOnLoss, setStopOnLoss] = useState<string>('');
  const autoPlayStartBalanceRef = useRef<number>(balance);
  const isAutoPlayingRef = useRef<boolean>(false);
  const autoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drawTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Sync Audio Mute
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.muted = next;
  };

  const clearAllDrawTimers = () => {
    drawTimersRef.current.forEach((t) => clearTimeout(t));
    drawTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearAllDrawTimers();
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    };
  }, []);

  // Fetch initial config and history
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [loadedConfig, loadedHistory] = await Promise.all([
          kenoApi.getConfig().catch(() => null),
          kenoApi.getHistory(10).catch(() => []),
        ]);
        if (!isMounted) return;
        if (loadedConfig) setConfig(loadedConfig);
        if (loadedHistory) setHistory(loadedHistory);
      } catch (err) {
        console.warn('Keno load error:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync demo balance event
  useEffect(() => {
    const handleBalance = () => setBalance(getDemoBalance());
    window.addEventListener('demo_balance_updated', handleBalance);
    return () => window.removeEventListener('demo_balance_updated', handleBalance);
  }, []);

  // Spot selection toggle
  const toggleNumber = (num: number) => {
    if (isDrawing || isAutoPlaying) return;
    setError(null);
    audio.playChip();

    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      } else {
        if (prev.length >= 10) {
          setError('Maximum 10 spots allowed. Remove a number to select another.');
          return prev;
        }
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  // Quick Pick
  const handleQuickPick = (count = selectedNumbers.length || 5) => {
    if (isDrawing || isAutoPlaying) return;
    setError(null);
    audio.playChip();

    const pool = [...ALL_NUMBERS];
    const picked: number[] = [];
    const targetCount = Math.max(1, Math.min(10, count));

    for (let i = 0; i < targetCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setSelectedNumbers(picked.sort((a, b) => a - b));
  };

  // Clear selections
  const handleClear = () => {
    if (isDrawing || isAutoPlaying) return;
    audio.playChip();
    setSelectedNumbers([]);
    setCurrentRound(null);
    setDrawnSoFar([]);
    setBannerMessage(null);
    setError(null);
  };

  // ── Action: Draw Round ──
  const handleDraw = async () => {
    if (isDrawing) return;
    if (selectedNumbers.length < 1) {
      setError('Please select at least 1 number to play');
      return;
    }
    if (balance < betAmount) {
      setError(`Insufficient demo balance. Required: ₹${betAmount}`);
      return;
    }

    setError(null);
    setBannerMessage(null);
    clearAllDrawTimers();
    setIsDrawing(true);
    setDrawnSoFar([]);

    try {
      const data = await kenoApi.draw({
        betAmount,
        selectedNumbers,
      });

      // Deduct balance locally
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);

      const drawnNumbers = data.drawnNumbers;
      let matchHitsCount = 0;

      // Sequential Draw Animation: 20 balls revealed every 85ms
      drawnNumbers.forEach((ballNum, index) => {
        const timer = setTimeout(() => {
          setDrawnSoFar((prev) => [...prev, ballNum]);

          // Check if this ball hit a selected spot
          if (data.selectedNumbers.includes(ballNum)) {
            matchHitsCount += 1;
            audio.playMatchHit(matchHitsCount);
          } else {
            audio.playDrawBall();
          }

          // If last ball drawn -> finalize round visual & outcome
          if (index === drawnNumbers.length - 1) {
            setTimeout(() => {
              setCurrentRound(data);
              setIsDrawing(false);

              if (data.isWin) {
                audio.playWin();
                setBannerMessage(
                  `★ WINNER! +₹${(data.payout - data.betAmount).toFixed(2)} (${data.matchCount} Hits • ${data.multiplier}x) ★`
                );
              } else if (data.payout > 0) {
                audio.playChip();
                setBannerMessage(`Returned ₹${data.payout.toFixed(2)} (${data.matchCount} Hits • ${data.multiplier}x)`);
              } else {
                setBannerMessage(`${data.matchCount} of ${data.selectedNumbers.length} Hits — No Payout`);
              }

              // Update history
              setHistory((prev) => [
                {
                  id: data.roundId,
                  betAmount: data.betAmount,
                  payout: data.payout,
                  multiplier: data.multiplier,
                  selectedNumbers: data.selectedNumbers,
                  drawnNumbers: data.drawnNumbers,
                  matches: data.matches,
                  matchCount: data.matchCount,
                  createdAt: new Date().toISOString(),
                },
                ...prev.slice(0, 14),
              ]);
            }, 300);
          }
        }, index * 85);

        drawTimersRef.current.push(timer);
      });
    } catch (err: any) {
      setIsDrawing(false);
      setError(err?.userFacingMessage || err?.message || 'Failed to complete Keno draw');
      if (isAutoPlayingRef.current) stopAutoPlay();
    }
  };

  // ── Auto Play Loop ──
  const startAutoPlay = (roundsCount = 50) => {
    if (selectedNumbers.length < 1) {
      setError('Please select at least 1 number before starting Auto Play');
      return;
    }
    if (balance < betAmount) {
      setError('Insufficient demo balance for Auto Play');
      return;
    }
    setError(null);
    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;
    setAutoRoundsLeft(roundsCount);
    autoPlayStartBalanceRef.current = balance;

    runAutoPlayStep(roundsCount);
  };

  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
    setAutoRoundsLeft(0);
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }
  };

  const runAutoPlayStep = async (remaining: number) => {
    if (!isAutoPlayingRef.current) return;

    const currentBal = getDemoBalance();
    const netProfit = currentBal - autoPlayStartBalanceRef.current;

    if (stopOnProfit && parseFloat(stopOnProfit) > 0 && netProfit >= parseFloat(stopOnProfit)) {
      setBannerMessage(`Auto Play stopped: Target profit ₹${stopOnProfit} reached!`);
      stopAutoPlay();
      return;
    }

    if (stopOnLoss && parseFloat(stopOnLoss) > 0 && -netProfit >= parseFloat(stopOnLoss)) {
      setBannerMessage(`Auto Play stopped: Stop loss ₹${stopOnLoss} reached!`);
      stopAutoPlay();
      return;
    }

    if (remaining <= 0) {
      stopAutoPlay();
      return;
    }

    await handleDraw();
    setAutoRoundsLeft(remaining - 1);

    // Wait for the 20-ball draw sequence to complete before triggering next round
    autoTimeoutRef.current = setTimeout(() => {
      runAutoPlayStep(remaining - 1);
    }, 20 * 85 + 750);
  };

  // Payout table for current spots count
  const spotsCount = selectedNumbers.length;
  const currentPayTable = config?.payoutTable?.[spotsCount] || {};
  const currentMatchesCount = currentRound ? currentRound.matchCount : drawnSoFar.filter((n) => selectedNumbers.includes(n)).length;

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none text-white p-2 sm:p-4">
      {/* ── Top Bar: Branding, Spot Counter, Audio Toggle ── */}
      <div className="w-full flex items-center justify-between bg-dark-900/85 backdrop-blur border border-dark-800 rounded-2xl px-4 py-2.5 mb-3 shadow-lg">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold animate-pulse" />
            <span className="font-cinzel text-sm sm:text-base font-black tracking-wider text-white">
              TREASURE KENO
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
              1–80 BOARD • 20 DRAWS
            </span>
          </div>
        </div>

        {/* Center: Live Round History Badges */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-md">
          {history.slice(0, 6).map((h) => (
            <div
              key={h.id}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                h.multiplier >= 10
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                  : h.multiplier > 1.0
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-dark-800 text-gray-400 border-dark-700'
              }`}
            >
              {h.matchCount} Hits ({h.multiplier}x)
            </div>
          ))}
        </div>

        {/* Right: Sound & Demo Balance */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-dark-800/90 border border-dark-700 flex items-center gap-1.5 font-mono text-xs">
            <Coins className="w-3.5 h-3.5 text-gold" />
            <span className="text-gray-400">DEMO:</span>
            <span className="text-gold font-bold">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-dark-700 transition"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-gold" />}
          </button>
        </div>
      </div>

      {/* ── Main Arena: Board & Controls Grid ── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side (4 Cols): Betting & Payout Table HUD */}
        <div className="lg:col-span-4 flex flex-col gap-3 bg-dark-900/90 backdrop-blur border border-dark-800 rounded-3xl p-4 sm:p-5 shadow-2xl">
          {/* Bet Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
              <span>BET AMOUNT</span>
              <span className="font-mono text-gold">Min: ₹{config?.minBet ?? 10} • Max: ₹{config?.maxBet ?? 5000}</span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-gold font-bold text-sm">₹</span>
              <input
                type="number"
                min={config?.minBet ?? 10}
                max={config?.maxBet ?? 5000}
                value={betAmount}
                disabled={isDrawing || isAutoPlaying}
                onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-dark-950 border border-dark-700 focus:border-gold/60 rounded-xl pl-7 pr-24 py-2.5 text-sm font-mono font-bold text-white focus:outline-none transition"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  disabled={isDrawing || isAutoPlaying}
                  onClick={() => setBetAmount((b) => Math.max(10, Math.floor(b / 2)))}
                  className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-[10px] font-bold text-gray-300 hover:text-white transition"
                >
                  ½
                </button>
                <button
                  disabled={isDrawing || isAutoPlaying}
                  onClick={() => setBetAmount((b) => Math.min(config?.maxBet ?? 5000, b * 2))}
                  className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-[10px] font-bold text-gray-300 hover:text-white transition"
                >
                  2×
                </button>
                <button
                  disabled={isDrawing || isAutoPlaying}
                  onClick={() => setBetAmount(config?.maxBet ?? 5000)}
                  className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-[10px] font-bold text-gold transition"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  disabled={isDrawing || isAutoPlaying}
                  onClick={() => setBetAmount(chip)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-extrabold border transition ${
                    betAmount === chip
                      ? 'bg-amber-500/20 text-gold border-gold/60 shadow-sm'
                      : 'bg-dark-800 hover:bg-dark-750 text-gray-300 border-dark-700'
                  }`}
                >
                  ₹{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Pick & Clear Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
              <span>SELECTED SPOTS</span>
              <span className="text-[10px] font-mono text-purple-300 font-bold">
                {selectedNumbers.length} / 10 CHOSEN
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={isDrawing || isAutoPlaying}
                onClick={() => handleQuickPick(5)}
                className="py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-200 border border-dark-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Dices className="w-3.5 h-3.5 text-purple-400" />
                <span>PICK 5</span>
              </button>
              <button
                disabled={isDrawing || isAutoPlaying}
                onClick={() => handleQuickPick(10)}
                className="py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-200 border border-dark-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>PICK 10</span>
              </button>
              <button
                disabled={isDrawing || isAutoPlaying || selectedNumbers.length === 0}
                onClick={handleClear}
                className="py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-rose-300 hover:text-rose-200 border border-dark-700 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>CLEAR</span>
              </button>
            </div>
          </div>

          {/* Interactive Dynamic Payout Table */}
          <div className="bg-dark-950/80 border border-dark-800 rounded-2xl p-3 shadow-inner space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 border-b border-dark-800 pb-1.5">
              <span>PAYOUT TABLE ({spotsCount} SPOTS)</span>
              <span>MULTIPLIER</span>
            </div>

            {spotsCount > 0 ? (
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {Object.entries(currentPayTable).map(([hits, mult]) => {
                  const hitsNum = Number(hits);
                  const isCurrentHitTier = currentMatchesCount === hitsNum && (isDrawing || currentRound !== null);

                  return (
                    <div
                      key={hits}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                        isCurrentHitTier
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md scale-102'
                          : 'bg-dark-900/60 text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3 h-3 ${isCurrentHitTier ? 'text-black' : 'text-purple-400'}`} />
                        <span>{hitsNum} Hits</span>
                      </span>
                      <span className={isCurrentHitTier ? 'text-black font-black' : 'text-gold'}>
                        {mult}x (₹{(betAmount * mult).toFixed(2)})
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-gray-500 italic">
                Select 1 to 10 numbers to view payouts
              </div>
            )}
          </div>

          {/* PLAY / DRAW ACTION BUTTON */}
          <div className="pt-1 space-y-2">
            {!isAutoPlaying ? (
              <button
                onClick={handleDraw}
                disabled={isDrawing || selectedNumbers.length === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-cinzel font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/40 transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>PLAY DRAW (₹{betAmount})</span>
              </button>
            ) : (
              <button
                onClick={stopAutoPlay}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-950/50 transition active:scale-95 flex items-center justify-center gap-2 animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>STOP AUTO PLAY ({autoRoundsLeft} LEFT)</span>
              </button>
            )}

            {/* Auto Play Controls */}
            <div className="pt-2 border-t border-dark-800">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2">
                <span>AUTO PLAY CONTROLS</span>
                {isAutoPlaying && (
                  <span className="text-[10px] font-mono text-emerald-400 animate-pulse">ACTIVE</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[10, 25, 50, 100].map((count) => (
                  <button
                    key={count}
                    disabled={isDrawing || isAutoPlaying || selectedNumbers.length === 0}
                    onClick={() => startAutoPlay(count)}
                    className="py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-[11px] font-mono font-bold text-gray-300 hover:text-white border border-dark-700 transition disabled:opacity-40"
                  >
                    {count}x
                  </button>
                ))}
              </div>

              {/* Stop on Profit / Loss Inputs */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-gray-400">Stop Profit (₹)</span>
                  <input
                    type="number"
                    placeholder="None"
                    disabled={isAutoPlaying}
                    value={stopOnProfit}
                    onChange={(e) => setStopOnProfit(e.target.value)}
                    className="w-full mt-1 bg-dark-950 border border-dark-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <span className="text-gray-400">Stop Loss (₹)</span>
                  <input
                    type="number"
                    placeholder="None"
                    disabled={isAutoPlaying}
                    value={stopOnLoss}
                    onChange={(e) => setStopOnLoss(e.target.value)}
                    className="w-full mt-1 bg-dark-950 border border-dark-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Banner Messages */}
          {bannerMessage && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-gold/40 text-center text-xs font-mono font-bold text-gold animate-in fade-in">
              {bannerMessage}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-600/60 text-center text-xs font-semibold text-rose-300 animate-in fade-in">
              {error}
            </div>
          )}
        </div>

        {/* Right Side (8 Cols): 1–80 Keno Board & Drawn Tray */}
        <div className="lg:col-span-8 flex flex-col gap-3 bg-dark-950 rounded-3xl border-4 border-[#251d14] shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3 sm:p-5">
          {/* Top Drawn Tray (20 Drawn Ball Indicators) */}
          <div className="w-full bg-dark-900/90 border border-dark-800 rounded-2xl p-2.5 sm:p-3 shadow-inner">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span>DRAWN NUMBERS ({drawnSoFar.length} / 20)</span>
              </span>
              <span className="font-mono text-gold">
                {currentMatchesCount} MATCH{currentMatchesCount === 1 ? '' : 'ES'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 min-h-[38px] px-1">
              {drawnSoFar.length > 0 ? (
                drawnSoFar.map((ballNum, idx) => {
                  const isHit = selectedNumbers.includes(ballNum);
                  return (
                    <div
                      key={`drawn-${idx}-${ballNum}`}
                      className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-black text-xs shadow-lg transition-transform animate-in zoom-in-75 duration-200 ${
                        isHit
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black border-2 border-yellow-100 shadow-yellow-500/50 scale-110'
                          : 'bg-dark-800 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {ballNum}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 italic py-1 px-2 font-mono">
                  Drawn numbers will appear here during the round...
                </div>
              )}
            </div>
          </div>

          {/* 1–80 Keno Interactive Tile Grid (10 Columns x 8 Rows) */}
          <div className="w-full grid grid-cols-10 gap-1 sm:gap-1.5 p-1 sm:p-2 bg-dark-900/60 rounded-2xl border border-dark-800/80">
            {ALL_NUMBERS.map((num) => {
              const isSelected = selectedNumbers.includes(num);
              const isDrawn = drawnSoFar.includes(num);
              const isHit = isSelected && isDrawn;

              return (
                <button
                  key={num}
                  disabled={isDrawing}
                  onClick={() => toggleNumber(num)}
                  className={`aspect-square rounded-xl sm:rounded-2xl font-mono font-black text-xs sm:text-sm flex items-center justify-center transition-all duration-200 relative select-none ${
                    isHit
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black border-2 border-yellow-200 shadow-[0_0_18px_rgba(234,179,8,0.8)] scale-105 z-10 animate-bounce'
                      : isSelected
                      ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-600 text-white border-2 border-amber-400/90 shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-102'
                      : isDrawn
                      ? 'bg-dark-800/90 text-cyan-300 border border-cyan-500/60 shadow-inner'
                      : 'bg-dark-900 hover:bg-dark-800 text-gray-300 hover:text-white border border-dark-800 hover:border-gold/50'
                  }`}
                >
                  <span>{num}</span>
                  {isHit && (
                    <Sparkles className="w-2.5 h-2.5 text-black absolute top-1 right-1 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Grid Legend & Status Bar */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-2 pt-1 font-semibold">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-600 border border-amber-400 inline-block" />
                <span>Selected</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 border border-yellow-200 inline-block" />
                <span className="text-gold font-bold">Winning Hit</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-dark-800 border border-cyan-500 inline-block" />
                <span>Drawn</span>
              </span>
            </div>

            <div className="font-mono text-gray-400">
              {currentRound && currentRound.payout > 0 ? (
                <span className="text-emerald-400 font-bold">
                  Payout: ₹{currentRound.payout.toFixed(2)}
                </span>
              ) : (
                <span>Pick 1 to 10 Numbers</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasureKeno2D;

