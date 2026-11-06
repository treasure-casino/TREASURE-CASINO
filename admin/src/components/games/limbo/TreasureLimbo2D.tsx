import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Zap,
  Target,
  Trophy,
  AlertCircle,
  Play,
  Square,
  RotateCcw,
  Info,
  Sliders,
  TrendingUp,
  Volume2,
  VolumeX,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { limboApi } from '../../../services/limboApi';
import { LimboHistoryItem, LimboRollResult } from '../../../types/limbo';
import {
  getDemoBalance,
  setLocalDemoBalance,
  getDemoToken,
} from '../../../utils/demoWallet';
import { soundManager } from '../../../utils/soundManager';

interface AutoSettings {
  totalRounds: number;
  roundsRemaining: number;
  onWinReset: boolean;
  onWinIncreaseBy: number;
  onLossReset: boolean;
  onLossIncreaseBy: number;
  stopOnProfit: number;
  stopOnLoss: number;
}

export const TreasureLimbo2D: React.FC = () => {
  // Gameplay State
  const [betAmount, setBetAmount] = useState<number>(50);
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0);
  const [currentDisplayMultiplier, setCurrentDisplayMultiplier] = useState<number>(2.0);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<LimboRollResult | null>(null);
  const [history, setHistory] = useState<LimboHistoryItem[]>([]);
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tabs: Manual vs Auto
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoSettings, setAutoSettings] = useState<AutoSettings>({
    totalRounds: 10,
    roundsRemaining: 10,
    onWinReset: true,
    onWinIncreaseBy: 0,
    onLossReset: false,
    onLossIncreaseBy: 100, // Default Martingale
    stopOnProfit: 0,
    stopOnLoss: 0,
  });

  // References for atomic sequential execution
  const isRollingRef = useRef<boolean>(false);
  const isAutoPlayingRef = useRef<boolean>(false);
  const autoInitialBalanceRef = useRef<number>(balance);
  const baseBetRef = useRef<number>(50);
  const animFrameRef = useRef<number | null>(null);

  // Dynamic calculations
  const rtp = 0.96;
  const rawWinChance = (rtp / targetMultiplier) * 100;
  const winChance = Math.min(99, Math.max(0.01, Number(rawWinChance.toFixed(2))));
  const potentialPayout = Number((betAmount * targetMultiplier).toFixed(2));
  const potentialProfit = Number((potentialPayout - betAmount).toFixed(2));

  // Sync balance with external events
  useEffect(() => {
    const handleBalance = () => setBalance(getDemoBalance());
    window.addEventListener('demo_balance_updated', handleBalance);
    return () => window.removeEventListener('demo_balance_updated', handleBalance);
  }, []);

  // Fetch initial history
  useEffect(() => {
    limboApi
      .getHistory(20)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setHistory(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch initial Limbo history', err);
      });
  }, []);

  /**
   * Smoothly animates the multiplier readout from 1.00x up to the final rolled multiplier.
   */
  const animateMultiplierRoll = (finalMult: number, onComplete: () => void) => {
    const duration = 650; // ms
    const startTime = performance.now();
    const startMult = 1.0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quad ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startMult + (finalMult - startMult) * ease;

      setCurrentDisplayMultiplier(Number(current.toFixed(2)));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setCurrentDisplayMultiplier(finalMult);
        onComplete();
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  /**
   * Executes a single roll request to backend sequentially.
   */
  const executeRoll = async (
    customBet?: number,
    customTarget?: number,
    roundNumber?: number
  ): Promise<LimboRollResult | null> => {
    if (isRollingRef.current) {
      console.warn('[Limbo] Prevented duplicate simultaneous roll attempt');
      return null;
    }

    const betToPlace = customBet !== undefined ? customBet : betAmount;
    const targetToPlace = customTarget !== undefined ? customTarget : targetMultiplier;

    setErrorMessage(null);

    if (betToPlace <= 0) {
      setErrorMessage('Please enter a valid bet amount.');
      return null;
    }

    const currentBal = getDemoBalance();
    if (currentBal < betToPlace) {
      const msg = `Insufficient balance. Available: ₹${currentBal.toFixed(2)}, Required: ₹${betToPlace.toFixed(2)}`;
      setErrorMessage(msg);
      soundManager.play('loss');
      return null;
    }

    isRollingRef.current = true;
    setIsRolling(true);
    soundManager.play('multiplierTick');

    const idempotencyKey = `limbo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await limboApi.roll(betToPlace, targetToPlace, idempotencyKey);

      if (!res.success || !res.data) {
        throw new Error('Roll execution failed');
      }

      const outcome = res.data;

      // Update local wallet balance immediately
      setLocalDemoBalance(outcome.balance);
      setBalance(outcome.balance);

      // Animate the multiplier counter
      await new Promise<void>((resolve) => {
        animateMultiplierRoll(outcome.resultMultiplier, resolve);
      });

      // Play outcome audio
      if (outcome.isWin) {
        soundManager.play('win');
      } else {
        soundManager.play('loss');
      }

      setLastResult(outcome);

      // Prepend to history
      setHistory((prev) => [
        {
          id: outcome.roundId,
          roundId: outcome.roundId,
          betAmount: outcome.betAmount,
          multiplier: outcome.resultMultiplier,
          resultMultiplier: outcome.resultMultiplier,
          targetMultiplier: outcome.targetMultiplier,
          isWin: outcome.isWin,
          payout: outcome.payout,
          winChance: outcome.winChance,
          timestamp: outcome.timestamp,
        },
        ...prev.slice(0, 19),
      ]);

      isRollingRef.current = false;
      setIsRolling(false);
      return outcome;
    } catch (err: any) {
      isRollingRef.current = false;
      setIsRolling(false);
      const userMsg =
        err.userFacingMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Error executing roll';

      // Log development diagnostics safely
      if (import.meta.env.DEV || process.env.NODE_ENV !== 'production') {
        console.error('[Limbo Roll Error]', {
          roundNumber: roundNumber ?? 'manual',
          url: '/api/limbo/roll',
          status: err.response?.status,
          error: userMsg,
          stack: err.stack,
        });
      }

      setErrorMessage(userMsg);
      soundManager.play('loss');
      return null;
    }
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      isAutoPlayingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Handle Manual Play
  const handlePlayManual = () => {
    if (!isRollingRef.current) {
      executeRoll();
    }
  };

  // Keyboard shortcut: Spacebar to play in manual mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeTab === 'MANUAL' && !isRollingRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT') return;
        e.preventDefault();
        handlePlayManual();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handlePlayManual]);

  // Sequential Auto Play Runner Loop
  const startAutoPlay = () => {
    if (isAutoPlayingRef.current || isRollingRef.current) return;

    if (betAmount <= 0) {
      setErrorMessage('Please enter a valid bet amount.');
      return;
    }

    const currentBal = getDemoBalance();
    if (currentBal < betAmount) {
      setErrorMessage(
        `Insufficient balance. Available: ₹${currentBal.toFixed(2)}, Required: ₹${betAmount.toFixed(2)}`
      );
      return;
    }

    baseBetRef.current = betAmount;
    autoInitialBalanceRef.current = currentBal;
    isAutoPlayingRef.current = true;
    setIsAutoPlaying(true);
    setErrorMessage(null);

    runAutoPlaySequence();
  };

  const stopAutoPlay = (reason?: string) => {
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    if (reason) {
      setErrorMessage(reason);
    }
  };

  const runAutoPlaySequence = async () => {
    let remaining = autoSettings.totalRounds === 0 ? Infinity : autoSettings.totalRounds;
    let currentBet = betAmount;
    let roundIndex = 0;

    setAutoSettings((prev) => ({
      ...prev,
      roundsRemaining: remaining === Infinity ? 999999 : remaining,
    }));

    while (isAutoPlayingRef.current && remaining > 0) {
      roundIndex++;

      // 1. Balance verification
      const liveBal = getDemoBalance();
      if (liveBal < currentBet) {
        stopAutoPlay(
          `Auto Play stopped: Insufficient balance (Available: ₹${liveBal.toFixed(2)}, Required: ₹${currentBet.toFixed(2)})`
        );
        break;
      }

      // 2. Stop on profit check
      if (autoSettings.stopOnProfit > 0) {
        const profit = liveBal - autoInitialBalanceRef.current;
        if (profit >= autoSettings.stopOnProfit) {
          stopAutoPlay(
            `Auto Play stopped: Stop on Profit limit reached (+₹${profit.toFixed(2)})`
          );
          break;
        }
      }

      // 3. Stop on loss check
      if (autoSettings.stopOnLoss > 0) {
        const loss = autoInitialBalanceRef.current - liveBal;
        if (loss >= autoSettings.stopOnLoss) {
          stopAutoPlay(
            `Auto Play stopped: Stop on Loss limit reached (-₹${loss.toFixed(2)})`
          );
          break;
        }
      }

      // 4. Execute single round sequentially and wait for completion
      const outcome = await executeRoll(currentBet, targetMultiplier, roundIndex);
      if (!outcome) {
        // Round failed or was interrupted -> stop auto play gracefully
        stopAutoPlay();
        break;
      }

      // 5. Decrement rounds
      remaining--;
      setAutoSettings((prev) => ({
        ...prev,
        roundsRemaining: remaining === Infinity ? 999999 : remaining,
      }));

      if (!isAutoPlayingRef.current || remaining <= 0) {
        if (remaining <= 0) {
          stopAutoPlay('Auto Play completed all planned rounds.');
        }
        break;
      }

      // 6. Calculate next bet (Martingale / reset)
      if (outcome.isWin) {
        if (autoSettings.onWinReset) {
          currentBet = baseBetRef.current;
        } else if (autoSettings.onWinIncreaseBy > 0) {
          currentBet = Math.min(
            5000,
            Number((currentBet * (1 + autoSettings.onWinIncreaseBy / 100)).toFixed(2))
          );
        }
      } else {
        if (autoSettings.onLossReset) {
          currentBet = baseBetRef.current;
        } else if (autoSettings.onLossIncreaseBy > 0) {
          currentBet = Math.min(
            5000,
            Number((currentBet * (1 + autoSettings.onLossIncreaseBy / 100)).toFixed(2))
          );
        }
      }
      setBetAmount(currentBet);

      // 7. Clean sequential pause between rounds (500ms) with cancellation check
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!isAutoPlayingRef.current) break;
    }
  };

  // Target Multiplier Helper
  const handleTargetChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.min(10000, Math.max(1.01, Number(val.toFixed(2))));
    setTargetMultiplier(clamped);
    if (!isRolling) {
      setCurrentDisplayMultiplier(clamped);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 font-sans select-none text-white">
      {/* Top Bar: Game Title & Previous History Pills */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0d0d17]/80 backdrop-blur-md border border-purple-900/40 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-amber-400 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#0a0a12] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-cinzel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-200 to-amber-300">
                TREASURE LIMBO
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-purple-950/80 border border-purple-500/40 text-purple-300 uppercase tracking-wide">
                2D PROVABLY FAIR
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              RTP 96.0% • MAX MULTIPLIER 10,000x • INSTANT CASHOUT
            </p>
          </div>
        </div>

        {/* History Pills */}
        <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400 mr-2 flex-shrink-0">
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>RECENT:</span>
          </div>
          {history.length === 0 ? (
            <span className="text-xs text-gray-500 font-mono italic">No rounds yet</span>
          ) : (
            history.slice(0, 10).map((item, idx) => (
              <span
                key={item.id || idx}
                id={`limbo-history-pill-${idx}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all flex-shrink-0 ${
                  item.isWin
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                }`}
                title={`Target: ${item.targetMultiplier}x | Bet: ₹${item.betAmount} | Payout: ₹${item.payout}`}
              >
                {item.resultMultiplier.toFixed(2)}x
              </span>
            ))
          )}
        </div>
      </div>

      {/* Main Game Layout: Arena Cockpit + Control Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left / Top: Interactive Rolling Arena Cockpit */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-gradient-to-b from-[#0e0e1a] via-[#090913] to-[#06060c] border border-purple-900/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 relative overflow-hidden shadow-2xl min-h-[300px] sm:min-h-[460px]">
          {/* Ambient Neon Glow Backdrops */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-10 right-10 w-48 h-48 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />

          {/* Top HUD inside arena: Target & Win Probability */}
          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-3 border-b border-purple-900/30 pb-3 sm:pb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs uppercase font-mono font-bold tracking-wider text-purple-300">
                TARGET
              </span>
              <span
                id="limbo-target-badge"
                className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-purple-900/50 border border-purple-500/50 text-amber-300"
              >
                {targetMultiplier.toFixed(2)}x
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs uppercase font-mono font-bold tracking-wider text-gray-400">
                WIN CHANCE
              </span>
              <span
                id="limbo-win-chance-badge"
                className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-dark-900/80 border border-purple-500/30 text-emerald-400"
              >
                {winChance.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Central Multiplier Display */}
          <div className="relative z-10 my-auto py-6 sm:py-12 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
            <div className="relative flex items-center justify-center">
              {/* Outer Ring Ambient Pulse */}
              <div
                className={`absolute w-48 sm:w-80 h-48 sm:h-80 rounded-full blur-2xl transition-all duration-300 pointer-events-none ${
                  lastResult?.isWin && !isRolling
                    ? 'bg-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.3)]'
                    : lastResult && !lastResult.isWin && !isRolling
                    ? 'bg-rose-500/15 shadow-[0_0_60px_rgba(244,63,94,0.2)]'
                    : 'bg-purple-600/10'
                }`}
              />

              {/* Large Neon Multiplier Readout */}
              <div
                id="limbo-multiplier-display"
                className={`relative text-5xl sm:text-7xl md:text-9xl font-black font-mono tracking-tight transition-all duration-150 ${
                  isRolling
                    ? 'text-purple-300 scale-105 filter drop-shadow-[0_0_35px_rgba(168,85,247,0.7)] animate-pulse'
                    : lastResult?.isWin
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 filter drop-shadow-[0_0_40px_rgba(16,185,129,0.8)] scale-105'
                    : lastResult && !lastResult.isWin
                    ? 'text-rose-500 filter drop-shadow-[0_0_35px_rgba(244,63,94,0.7)]'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-100 to-amber-200 filter drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                }`}
              >
                {currentDisplayMultiplier.toFixed(2)}
                <span className="text-2xl sm:text-5xl ml-1 text-amber-400">x</span>
              </div>
            </div>

            {/* Win / Loss Result Banner */}
            <div className="h-10 flex items-center justify-center">
              {isRolling ? (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-purple-300 animate-pulse">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                  <span>CALCULATING OUTCOME...</span>
                </div>
              ) : lastResult?.isWin ? (
                <div
                  id="limbo-win-banner"
                  className="flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce"
                >
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-black font-mono">
                    TARGET HIT! WON ₹{lastResult.payout.toFixed(2)} (+₹
                    {lastResult.netProfit.toFixed(2)})
                  </span>
                </div>
              ) : lastResult && !lastResult.isWin ? (
                <div
                  id="limbo-loss-banner"
                  className="flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-rose-950/80 border border-rose-500/70 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                >
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                  <span className="text-xs sm:text-sm font-bold font-mono">
                    CRASHED BELOW TARGET {targetMultiplier.toFixed(2)}x (-₹
                    {lastResult.betAmount.toFixed(2)})
                  </span>
                </div>
              ) : (
                <div className="text-xs font-mono text-gray-500">
                  PRESS ROLL OR HIT SPACEBAR TO PLAY
                </div>
              )}
            </div>
          </div>

          {/* Interactive Target Slider & Quick Multipliers */}
          <div className="relative z-10 space-y-3 pt-4 border-t border-purple-900/30">
            {/* Quick Multiplier Chips */}
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-mono font-bold text-gray-400 mr-1 flex-shrink-0">
                PRESETS:
              </span>
              {[1.5, 2.0, 3.0, 5.0, 10.0, 50.0, 100.0].map((preset) => (
                <button
                  key={preset}
                  id={`limbo-preset-${preset.toFixed(1).replace('.', '_')}x`}
                  disabled={isRolling}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    handleTargetChange(preset);
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all shrink-0 ${
                    targetMultiplier === preset
                      ? 'bg-gradient-to-r from-purple-600 to-amber-500 text-white border-gold shadow-md'
                      : 'bg-dark-900/90 hover:bg-purple-950/60 border-purple-900/40 text-gray-300 hover:text-white'
                  }`}
                >
                  {preset.toFixed(1)}x
                </button>
              ))}
            </div>

            {/* Slider bar */}
            <div className="space-y-1">
              <input
                id="limbo-target-slider"
                type="range"
                min="1.01"
                max="100.0"
                step="0.05"
                value={Math.min(100.0, targetMultiplier)}
                disabled={isRolling}
                onChange={(e) => handleTargetChange(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-2 bg-dark-900 rounded-lg appearance-none border border-purple-900/40"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>1.01x (95.05%)</span>
                <span>2.00x (48.0%)</span>
                <span>10.00x (9.6%)</span>
                <span>100.00x (0.96%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right / Bottom: Betting & Automation Controls Console */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-dark-900/90 border border-purple-900/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
          {/* Navigation Tab: MANUAL vs AUTO */}
          <div className="grid grid-cols-2 p-1 bg-dark-950/90 border border-purple-900/30 rounded-2xl">
            <button
              id="limbo-tab-manual"
              onClick={() => {
                soundManager.play('buttonClick');
                if (isAutoPlaying) stopAutoPlay();
                setActiveTab('MANUAL');
              }}
              className={`py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                activeTab === 'MANUAL'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              MANUAL
            </button>
            <button
              id="limbo-tab-auto"
              onClick={() => {
                soundManager.play('buttonClick');
                setActiveTab('AUTO');
              }}
              className={`py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                activeTab === 'AUTO'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              AUTO PLAY
            </button>
          </div>

          {/* Bet Amount Input Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-gray-400">BET AMOUNT</span>
              <span className="text-amber-400">PROFIT ON WIN: ₹{potentialProfit.toFixed(2)}</span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-gold font-bold text-sm">₹</span>
              <input
                id="limbo-bet-input"
                type="number"
                min="10"
                max="5000"
                step="10"
                disabled={isRolling || isAutoPlaying}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-dark-950 border border-purple-900/50 focus:border-purple-500 rounded-2xl pl-8 pr-28 py-3 text-white font-mono font-bold text-base focus:outline-none transition"
              />

              {/* Increments / Multipliers Buttons inside input */}
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  id="limbo-bet-half"
                  disabled={isRolling || isAutoPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setBetAmount((prev) => Math.max(10, Math.floor(prev / 2)));
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-dark-800 hover:bg-dark-700 text-gray-300 border border-purple-900/40"
                >
                  ½
                </button>
                <button
                  id="limbo-bet-double"
                  disabled={isRolling || isAutoPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setBetAmount((prev) => Math.min(5000, prev * 2));
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-dark-800 hover:bg-dark-700 text-gray-300 border border-purple-900/40"
                >
                  2X
                </button>
                <button
                  id="limbo-bet-max"
                  disabled={isRolling || isAutoPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setBetAmount(Math.min(5000, balance));
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-dark-800 hover:bg-dark-700 text-amber-300 border border-purple-900/40"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Quick Chip Chips */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[10, 50, 100, 500, 1000].map((chip) => (
                <button
                  key={chip}
                  id={`limbo-chip-${chip}`}
                  disabled={isRolling || isAutoPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setBetAmount(chip);
                  }}
                  className="py-1.5 rounded-xl text-xs font-mono font-bold bg-dark-950/80 hover:bg-purple-950/60 border border-purple-900/30 text-gray-300 hover:text-amber-300 transition"
                >
                  ₹{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Target Multiplier Numeric Box & Step Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-gray-400">TARGET MULTIPLIER</span>
              <span className="text-emerald-400">CHANCE: {winChance.toFixed(2)}%</span>
            </div>

            <div className="relative flex items-center">
              <input
                id="limbo-target-input"
                type="number"
                min="1.01"
                max="10000"
                step="0.10"
                disabled={isRolling || isAutoPlaying}
                value={targetMultiplier}
                onChange={(e) => handleTargetChange(parseFloat(e.target.value) || 1.01)}
                className="w-full bg-dark-950 border border-purple-900/50 focus:border-purple-500 rounded-2xl px-4 py-3 text-amber-300 font-mono font-black text-base focus:outline-none transition"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  id="limbo-target-minus"
                  disabled={isRolling || isAutoPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    handleTargetChange(targetMultiplier - 0.5);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-dark-800 hover:bg-dark-700 text-gray-300 border border-purple-900/40"
                >
                  −
                </button>
                <button
                  id="limbo-target-plus"
                  disabled={isRolling || isAutoPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    handleTargetChange(targetMultiplier + 0.5);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-dark-800 hover:bg-dark-700 text-gray-300 border border-purple-900/40"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Auto Play Configuration Panel */}
          {activeTab === 'AUTO' && (
            <div className="space-y-3 p-3.5 bg-dark-950/80 border border-purple-900/40 rounded-2xl text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">NUMBER OF ROUNDS:</span>
                <div className="flex gap-1">
                  {[10, 25, 50, 100].map((r) => (
                    <button
                      key={r}
                      id={`limbo-auto-rounds-${r}`}
                      disabled={isAutoPlaying}
                      onClick={() => {
                        soundManager.play('buttonClick');
                        setAutoSettings((prev) => ({
                          ...prev,
                          totalRounds: r,
                          roundsRemaining: r,
                        }));
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        autoSettings.totalRounds === r
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-dark-900 text-gray-400 border-purple-950'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-purple-950">
                <span className="text-gray-400">ON LOSS (MARTINGALE):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={isAutoPlaying}
                    onClick={() =>
                      setAutoSettings((prev) => ({
                        ...prev,
                        onLossReset: true,
                        onLossIncreaseBy: 0,
                      }))
                    }
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      autoSettings.onLossReset
                        ? 'bg-purple-600 text-white'
                        : 'bg-dark-900 text-gray-400'
                    }`}
                  >
                    RESET
                  </button>
                  <button
                    disabled={isAutoPlaying}
                    onClick={() =>
                      setAutoSettings((prev) => ({
                        ...prev,
                        onLossReset: false,
                        onLossIncreaseBy: 100,
                      }))
                    }
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      !autoSettings.onLossReset
                        ? 'bg-purple-600 text-white'
                        : 'bg-dark-900 text-gray-400'
                    }`}
                  >
                    +100%
                  </button>
                </div>
              </div>

              {isAutoPlaying && (
                <div className="text-[11px] font-bold text-amber-300 text-center animate-pulse pt-1">
                  AUTO PLAYING: ROUND {autoSettings.totalRounds - autoSettings.roundsRemaining + 1} /{' '}
                  {autoSettings.totalRounds}
                </div>
              )}
            </div>
          )}

          {/* Error Message Toast */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button: ROLL or START/STOP AUTO */}
          <div>
            {activeTab === 'MANUAL' ? (
              <button
                id="limbo-roll-button"
                disabled={isRolling}
                onClick={handlePlayManual}
                className={`w-full py-4 rounded-2xl font-black font-cinzel text-base tracking-widest uppercase transition-all duration-300 shadow-xl flex items-center justify-center gap-3 ${
                  isRolling
                    ? 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                    : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white border border-gold/50 shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isRolling ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin text-purple-300" />
                    <span>ROLLING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current text-amber-300" />
                    <span>ROLL (SPACEBAR)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                id="limbo-auto-button"
                onClick={isAutoPlaying ? () => stopAutoPlay() : startAutoPlay}
                className={`w-full py-4 rounded-2xl font-black font-cinzel text-base tracking-widest uppercase transition-all duration-300 shadow-xl flex items-center justify-center gap-3 ${
                  isAutoPlaying
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white border border-gold/50 shadow-purple-600/30'
                }`}
              >
                {isAutoPlaying ? (
                  <>
                    <Square className="w-5 h-5 fill-current text-white" />
                    <span>STOP AUTO PLAY</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current text-amber-300" />
                    <span>START AUTO PLAY</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
