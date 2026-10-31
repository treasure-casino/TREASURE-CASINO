import React, { useState, useEffect, useRef } from 'react';
import {
  Dices,
  Sparkles,
  Trophy,
  AlertCircle,
  Play,
  Square,
  History,
  TrendingUp,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { diceApi } from '../../../services/diceApi';
import { DiceHistoryItem, DiceRollResult, DiceMode } from '../../../types/dice';
import {
  getDemoBalance,
  setLocalDemoBalance,
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

export const TreasureDice2D: React.FC = () => {
  // Gameplay State
  const [betAmount, setBetAmount] = useState<number>(50);
  const [target, setTarget] = useState<number>(50.0);
  const [mode, setMode] = useState<DiceMode>('ROLL_UNDER');
  const [displayOutcome, setDisplayOutcome] = useState<number>(50.0);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<DiceRollResult | null>(null);
  const [history, setHistory] = useState<DiceHistoryItem[]>([]);
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
    onLossIncreaseBy: 100, // Martingale
    stopOnProfit: 0,
    stopOnLoss: 0,
  });

  // Atomic references
  const isRollingRef = useRef<boolean>(false);
  const isAutoPlayingRef = useRef<boolean>(false);
  const autoInitialBalanceRef = useRef<number>(balance);
  const baseBetRef = useRef<number>(50);
  const animFrameRef = useRef<number | null>(null);

  // Mathematical computations (96% RTP)
  const rtp = 0.96;
  const winChance = mode === 'ROLL_UNDER' ? target : Number((100.0 - target).toFixed(2));
  const rawMult = (rtp * 100.0) / winChance;
  const multiplier = Number(Math.max(1.01, Math.min(960.0, Math.floor(rawMult * 100) / 100)).toFixed(2));
  const potentialPayout = Number((betAmount * multiplier).toFixed(2));
  const potentialProfit = Number((potentialPayout - betAmount).toFixed(2));

  // Sync balance
  useEffect(() => {
    const handleBalance = () => setBalance(getDemoBalance());
    window.addEventListener('demo_balance_updated', handleBalance);
    return () => window.removeEventListener('demo_balance_updated', handleBalance);
  }, []);

  // Fetch initial history
  useEffect(() => {
    diceApi
      .getHistory(20)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setHistory(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch Dice history', err);
      });
  }, []);

  /**
   * Smoothly animates the dice outcome readout
   */
  const animateDiceRoll = (finalOutcome: number, onComplete: () => void) => {
    const duration = 650; // ms
    const startTime = performance.now();
    const startVal = displayOutcome;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (finalOutcome - startVal) * ease;

      setDisplayOutcome(Number(current.toFixed(2)));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayOutcome(finalOutcome);
        onComplete();
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  /**
   * Executes a single dice roll sequentially
   */
  const executeRoll = async (
    customBet?: number,
    customTarget?: number,
    customMode?: DiceMode,
    roundNumber?: number
  ): Promise<DiceRollResult | null> => {
    if (isRollingRef.current) {
      console.warn('[Dice] Prevented duplicate simultaneous roll');
      return null;
    }

    const betToPlace = customBet !== undefined ? customBet : betAmount;
    const targetToPlace = customTarget !== undefined ? customTarget : target;
    const modeToPlace = customMode !== undefined ? customMode : mode;

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

    const idempotencyKey = `dice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await diceApi.roll(betToPlace, targetToPlace, modeToPlace, idempotencyKey);

      if (!res.success || !res.data) {
        throw new Error('Roll execution failed');
      }

      const outcomeData = res.data;

      // Update wallet balance immediately
      setLocalDemoBalance(outcomeData.balance);
      setBalance(outcomeData.balance);

      // Animate outcome readout
      await new Promise<void>((resolve) => {
        animateDiceRoll(outcomeData.outcome, resolve);
      });

      // Play outcome sound
      if (outcomeData.isWin) {
        soundManager.play('win');
      } else {
        soundManager.play('loss');
      }

      setLastResult(outcomeData);

      // Prepend to history
      setHistory((prev) => [
        {
          id: outcomeData.roundId,
          roundId: outcomeData.roundId,
          betAmount: outcomeData.betAmount,
          multiplier: outcomeData.multiplier,
          outcome: outcomeData.outcome,
          target: outcomeData.target,
          mode: outcomeData.mode,
          isWin: outcomeData.isWin,
          payout: outcomeData.payout,
          winChance: outcomeData.winChance,
          timestamp: outcomeData.timestamp,
        },
        ...prev.slice(0, 19),
      ]);

      isRollingRef.current = false;
      setIsRolling(false);
      return outcomeData;
    } catch (err: any) {
      isRollingRef.current = false;
      setIsRolling(false);
      const userMsg =
        err.userFacingMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Error executing roll';

      if (import.meta.env.DEV || process.env.NODE_ENV !== 'production') {
        console.error('[Dice Roll Error]', {
          roundNumber: roundNumber ?? 'manual',
          url: '/api/dice/roll',
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
        const targetEl = e.target as HTMLElement;
        if (targetEl.tagName === 'INPUT') return;
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
          stopAutoPlay(`Auto Play stopped: Stop on Profit limit reached (+₹${profit.toFixed(2)})`);
          break;
        }
      }

      // 3. Stop on loss check
      if (autoSettings.stopOnLoss > 0) {
        const loss = autoInitialBalanceRef.current - liveBal;
        if (loss >= autoSettings.stopOnLoss) {
          stopAutoPlay(`Auto Play stopped: Stop on Loss limit reached (-₹${loss.toFixed(2)})`);
          break;
        }
      }

      // 4. Execute single round sequentially and wait for completion
      const outcomeData = await executeRoll(currentBet, target, mode, roundIndex);
      if (!outcomeData) {
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

      // 6. Calculate next bet
      if (outcomeData.isWin) {
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

  const handleTargetChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.min(98.0, Math.max(2.0, Number(val.toFixed(2))));
    setTarget(clamped);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 font-sans select-none text-white">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0d0d17]/80 backdrop-blur-md border border-purple-900/40 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-amber-400 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#0a0a12] rounded-[10px] flex items-center justify-center">
              <Dices className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-cinzel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-200 to-amber-300">
                TREASURE DICE
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-purple-950/80 border border-purple-500/40 text-purple-300 uppercase tracking-wide">
                2D PROVABLY FAIR
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              RTP 96.0% • ROLL UNDER / ROLL OVER • INSTANT SETTLEMENT
            </p>
          </div>
        </div>

        {/* Recent History Badges */}
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
                id={`dice-history-pill-${idx}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all flex-shrink-0 ${
                  item.isWin
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                }`}
                title={`${item.mode} ${item.target} | Bet: ₹${item.betAmount} | Payout: ₹${item.payout}`}
              >
                {item.outcome.toFixed(2)}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Arena Cockpit: Dice Board */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-gradient-to-b from-[#0e0e1a] via-[#090913] to-[#06060c] border border-purple-900/40 rounded-3xl p-4 sm:p-8 relative overflow-hidden shadow-2xl min-h-[380px] sm:min-h-[460px]">
          {/* Ambient Lighting */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-10 right-10 w-48 h-48 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />

          {/* Top HUD: Multiplier, Win Chance, Roll Mode */}
          <div className="relative z-10 grid grid-cols-3 gap-2 border-b border-purple-900/30 pb-4 text-center">
            <div className="bg-dark-950/80 p-2.5 rounded-2xl border border-purple-900/40">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block">
                MULTIPLIER
              </span>
              <span
                id="dice-multiplier-badge"
                className="text-base sm:text-lg font-mono font-black text-amber-300"
              >
                {multiplier.toFixed(2)}x
              </span>
            </div>

            <div className="bg-dark-950/80 p-2.5 rounded-2xl border border-purple-900/40">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block">
                WIN CHANCE
              </span>
              <span
                id="dice-win-chance-badge"
                className="text-base sm:text-lg font-mono font-black text-emerald-400"
              >
                {winChance.toFixed(2)}%
              </span>
            </div>

            <div className="bg-dark-950/80 p-2.5 rounded-2xl border border-purple-900/40">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block">
                TARGET ({mode === 'ROLL_UNDER' ? '<' : '>'})
              </span>
              <span
                id="dice-target-badge"
                className="text-base sm:text-lg font-mono font-black text-purple-300"
              >
                {target.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Central Outcome Display with Animated 3D Dice */}
          <div className="relative z-10 my-auto py-8 sm:py-10 flex flex-col items-center justify-center text-center space-y-4">
            {/* Animated Dice Cube Graphic */}
            <div className="relative flex items-center justify-center">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-purple-950 via-[#141226] to-[#251944] border-2 border-purple-500/50 shadow-2xl flex items-center justify-center transition-all duration-300 ${
                  isRolling
                    ? 'animate-spin shadow-[0_0_40px_rgba(168,85,247,0.8)]'
                    : lastResult?.isWin
                    ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-105'
                    : lastResult && !lastResult.isWin
                    ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]'
                    : 'shadow-purple-900/40'
                }`}
              >
                <Dices
                  className={`w-10 h-10 sm:w-12 sm:h-12 ${
                    isRolling
                      ? 'text-amber-300 animate-pulse'
                      : lastResult?.isWin
                      ? 'text-emerald-400'
                      : lastResult && !lastResult.isWin
                      ? 'text-rose-400'
                      : 'text-purple-300'
                  }`}
                />
              </div>
            </div>

            {/* Giant Outcome Readout */}
            <div
              id="dice-outcome-display"
              className={`text-6xl sm:text-8xl font-black font-mono tracking-tight transition-all duration-150 ${
                isRolling
                  ? 'text-purple-300 scale-105 filter drop-shadow-[0_0_35px_rgba(168,85,247,0.7)] animate-pulse'
                  : lastResult?.isWin
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 filter drop-shadow-[0_0_40px_rgba(16,185,129,0.8)]'
                  : lastResult && !lastResult.isWin
                  ? 'text-rose-500 filter drop-shadow-[0_0_35px_rgba(244,63,94,0.7)]'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-100 to-amber-200 filter drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]'
              }`}
            >
              {displayOutcome.toFixed(2)}
            </div>

            {/* Result Flare / Win Banner */}
            <div className="h-10 flex items-center justify-center">
              {isRolling ? (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-purple-300 animate-pulse">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                  <span>ROLLING SECURE RNG OUTCOME...</span>
                </div>
              ) : lastResult?.isWin ? (
                <div
                  id="dice-win-banner"
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-black font-mono">
                    WIN! ROLLED {lastResult.outcome.toFixed(2)} (WON ₹
                    {lastResult.payout.toFixed(2)})
                  </span>
                </div>
              ) : lastResult && !lastResult.isWin ? (
                <div
                  id="dice-loss-banner"
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/70 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs sm:text-sm font-bold font-mono">
                    MISSED! ROLLED {lastResult.outcome.toFixed(2)} (-₹
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

          {/* Interactive Dual-Color Slider with Win/Loss Zone */}
          <div className="relative z-10 space-y-3 pt-4 border-t border-purple-900/30">
            {/* Visual Win / Loss Track */}
            <div className="relative w-full h-4 rounded-full overflow-hidden bg-dark-950 border border-purple-900/50">
              {mode === 'ROLL_UNDER' ? (
                <>
                  {/* Green Win Zone on left */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-600 to-green-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all"
                    style={{ width: `${target}%` }}
                  />
                  {/* Red Loss Zone on right */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-900/70 transition-all"
                    style={{ width: `${100 - target}%` }}
                  />
                </>
              ) : (
                <>
                  {/* Red Loss Zone on left */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-rose-900/70 transition-all"
                    style={{ width: `${target}%` }}
                  />
                  {/* Green Win Zone on right */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-green-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all"
                    style={{ width: `${100 - target}%` }}
                  />
                </>
              )}

              {/* Current Outcome Indicator Marker */}
              {lastResult && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_10px_#fff] transition-all duration-300 pointer-events-none"
                  style={{ left: `${Math.min(99, Math.max(1, displayOutcome))}%` }}
                />
              )}
            </div>

            {/* Slider Input */}
            <input
              id="dice-target-slider"
              type="range"
              min="2"
              max="98"
              step="1"
              value={target}
              disabled={isRolling}
              onChange={(e) => handleTargetChange(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-2 bg-transparent rounded-lg appearance-none"
            />

            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>0 (Min)</span>
              <span>25</span>
              <span>50 (1.92x)</span>
              <span>75</span>
              <span>100 (Max)</span>
            </div>
          </div>
        </div>

        {/* Right Console: Betting, Mode & Auto Play Controls */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-dark-900/90 border border-purple-900/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
          {/* Navigation Tab: MANUAL vs AUTO */}
          <div className="grid grid-cols-2 p-1 bg-dark-950/90 border border-purple-900/30 rounded-2xl">
            <button
              id="dice-tab-manual"
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
              id="dice-tab-auto"
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

          {/* Mode Switch: ROLL UNDER vs ROLL OVER */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono font-bold text-gray-400">ROLL MODE</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="dice-mode-under"
                disabled={isRolling || isAutoPlaying}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setMode('ROLL_UNDER');
                }}
                className={`py-2.5 px-3 rounded-2xl text-xs font-mono font-black border flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'ROLL_UNDER'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-dark-950 border-purple-900/40 text-gray-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                <span>ROLL UNDER</span>
              </button>

              <button
                id="dice-mode-over"
                disabled={isRolling || isAutoPlaying}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setMode('ROLL_OVER');
                }}
                className={`py-2.5 px-3 rounded-2xl text-xs font-mono font-black border flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'ROLL_OVER'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-dark-950 border-purple-900/40 text-gray-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>ROLL OVER</span>
              </button>
            </div>
          </div>

          {/* Bet Amount Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-gray-400">BET AMOUNT</span>
              <span className="text-amber-400">PROFIT ON WIN: ₹{potentialProfit.toFixed(2)}</span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-gold font-bold text-sm">₹</span>
              <input
                id="dice-bet-input"
                type="number"
                min="10"
                max="5000"
                step="10"
                disabled={isRolling || isAutoPlaying}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-dark-950 border border-purple-900/50 focus:border-purple-500 rounded-2xl pl-8 pr-28 py-3 text-white font-mono font-bold text-base focus:outline-none transition"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  id="dice-bet-half"
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
                  id="dice-bet-double"
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
                  id="dice-bet-max"
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

            {/* Quick Chips */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[10, 50, 100, 500, 1000].map((chip) => (
                <button
                  key={chip}
                  id={`dice-chip-${chip}`}
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

          {/* Auto Play Configuration Panel */}
          {activeTab === 'AUTO' && (
            <div className="space-y-3 p-3.5 bg-dark-950/80 border border-purple-900/40 rounded-2xl text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">NUMBER OF ROUNDS:</span>
                <div className="flex gap-1">
                  {[10, 25, 50, 100].map((r) => (
                    <button
                      key={r}
                      id={`dice-auto-rounds-${r}`}
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

          {/* Error Message */}
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
                id="dice-roll-button"
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
                    <span>ROLL DICE (SPACEBAR)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                id="dice-auto-button"
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

