import React, { useState, useEffect, useRef, useCallback } from 'react';
import { spiralApi } from '../../../services/spiralApi';
import {
  getDemoBalance,
  setLocalDemoBalance,
  resetDemoBalance,
} from '../../../utils/demoWallet';
import { soundManager } from '../../../utils/soundManager';
import {
  Sparkles,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Play,
  RotateCw,
  Coins,
  ShieldCheck,
  RefreshCw,
  Square,
  Percent,
  Lock,
} from 'lucide-react';
import { SpiralSymbol } from '../../../types/spiral';

// ─── 18 FIXED SECTOR MULTIPLIERS (CLOCKWISE FROM 12 O'CLOCK) ──────────────
export const INNER_SECTORS = [
  { sec: 1, mult: '1.55x', val: 1.55 },
  { sec: 2, mult: '4.85x', val: 4.85 },
  { sec: 3, mult: '10x', val: 10 },
  { sec: 4, mult: '+7x', val: 7, isBonus: true },
];

export const MIDDLE_SECTORS = [
  { sec: 1, mult: '2.5x', val: 2.5 },
  { sec: 2, mult: '7.7x', val: 7.7 },
  { sec: 3, mult: '16x', val: 16 },
  { sec: 4, mult: '27x', val: 27 },
  { sec: 5, mult: '44x', val: 44 },
  { sec: 6, mult: '+20.5x', val: 20.5, isBonus: true },
];

export const OUTER_SECTORS = [
  { sec: 1, mult: '3.9x', val: 3.9 },
  { sec: 2, mult: '12.5x', val: 12.5 },
  { sec: 3, mult: '28x', val: 28 },
  { sec: 4, mult: '52x', val: 52 },
  { sec: 5, mult: '85x', val: 85 },
  { sec: 6, mult: '133x', val: 133 },
  { sec: 7, mult: '200x', val: 200 },
  { sec: 8, mult: 'BONUS 700x', val: 700, isBonus: true },
];

// Common starting boundary line angle across all 3 rings (matching blue-marked screenshot position: -112.5 deg)
export const START_DIVIDER_ANGLE = -Math.PI / 2 - (Math.PI * 2 / 8) / 2; // -112.5 deg = -5 * Math.PI / 8

// ─── HELPER: 2D ANNULAR SECTOR SVG PATH GENERATOR ─────────────────────────
function createAnnularSectorPath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startAngle: number,
  endAngle: number
): string {
  const x1Out = cx + rOut * Math.cos(startAngle);
  const y1Out = cy + rOut * Math.sin(startAngle);
  const x2Out = cx + rOut * Math.cos(endAngle);
  const y2Out = cy + rOut * Math.sin(endAngle);
  const x2In = cx + rIn * Math.cos(endAngle);
  const y2In = cy + rIn * Math.sin(endAngle);
  const x1In = cx + rIn * Math.cos(startAngle);
  const y1In = cy + rIn * Math.sin(startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${x1Out} ${y1Out} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x2In} ${y2In} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x1In} ${y1In} Z`;
}

// ─── HELPER: 2D LIQUID STREAM ARC PATH GENERATOR ──────────────────────────
function createArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

export const TreasureSpiral2D: React.FC = () => {
  // Wallet & Settings
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Game Engine State (CRITICAL: Before first spin, all rings are NEUTRAL & totalMultiplier is 0.00x!)
  const [roundId, setRoundId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [innerPos, setInnerPos] = useState<number | null>(null);
  const [middlePos, setMiddlePos] = useState<number | null>(null);
  const [outerPos, setOuterPos] = useState<number | null>(null);
  const [outerMult, setOuterMult] = useState<number>(0);
  const [middleMult, setMiddleMult] = useState<number>(0);
  const [innerMult, setInnerMult] = useState<number>(0);
  const [activeOuter, setActiveOuter] = useState<boolean>(false);
  const [activeMiddle, setActiveMiddle] = useState<boolean>(false);
  const [activeInner, setActiveInner] = useState<boolean>(false);
  const [totalMultiplier, setTotalMultiplier] = useState<number>(0.0);
  const [accumulatedBonus, setAccumulatedBonus] = useState<number>(0);
  const [lastSymbol, setLastSymbol] = useState<SpiralSymbol | null>(null);
  const [halfCashedOut, setHalfCashedOut] = useState<boolean>(false);
  const [halfCashoutAmount, setHalfCashoutAmount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to spin — all circles neutral');
  const [activeBonusBanner, setActiveBonusBanner] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Auto Bet State (Long-press 2s)
  const [isAutoBetActive, setIsAutoBetActive] = useState<boolean>(false);
  const isAutoBetActiveRef = useRef<boolean>(false);
  const isSpinningRef = useRef<boolean>(false);
  const [autoHoldProgress, setAutoHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number>(0);

  // 2D Liquid Indicator Angles (Resting at START_DIVIDER_ANGLE matching blue-marked position)
  const [outerLiquidAngle, setOuterLiquidAngle] = useState<number>(START_DIVIDER_ANGLE);
  const [middleLiquidAngle, setMiddleLiquidAngle] = useState<number>(START_DIVIDER_ANGLE);
  const [innerLiquidAngle, setInnerLiquidAngle] = useState<number>(START_DIVIDER_ANGLE);

  const targetOuterAngleRef = useRef<number>(START_DIVIDER_ANGLE);
  const targetMiddleAngleRef = useRef<number>(START_DIVIDER_ANGLE);
  const targetInnerAngleRef = useRef<number>(START_DIVIDER_ANGLE);

  const animFrameRef = useRef<number | null>(null);
  const [ripplePulse, setRipplePulse] = useState<number>(1);

  // Center Coordinates & Ring Radii in 800x800 SVG ViewBox
  const CX = 400;
  const CY = 400;

  const R_OUT_IN = 295;
  const R_OUT_OUT = 375;
  const R_OUT_MID = 335;

  const R_MID_IN = 205;
  const R_MID_OUT = 285;
  const R_MID_MID = 245;

  const R_IN_IN = 115;
  const R_IN_OUT = 195;
  const R_IN_MID = 155;

  // Sync wallet balance
  useEffect(() => {
    const handleBalance = (e: any) => {
      if (e?.detail?.balance !== undefined) setBalance(e.detail.balance);
      else setBalance(getDemoBalance());
    };
    const handleSound = (e: any) => setIsMuted(e.detail?.isMuted ?? soundManager.getMuted());

    window.addEventListener('demo_balance_updated', handleBalance);
    window.addEventListener('sound_settings_changed', handleSound);

    restoreActiveState();

    return () => {
      window.removeEventListener('demo_balance_updated', handleBalance);
      window.removeEventListener('sound_settings_changed', handleSound);
      isAutoBetActiveRef.current = false;
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Smooth 2D Liquid Animation Loop (runs on requestAnimationFrame)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      // Pulse wave
      setRipplePulse(1 + Math.sin(time * 0.006) * 0.3);

      // Smoothly advance liquid indicators toward target angles
      setOuterLiquidAngle((cur) => {
        const target = targetOuterAngleRef.current;
        const diff = target - cur;
        return Math.abs(diff) < 0.001 ? target : cur + diff * Math.min(1, 6.0 * delta);
      });

      setMiddleLiquidAngle((cur) => {
        const target = targetMiddleAngleRef.current;
        const diff = target - cur;
        return Math.abs(diff) < 0.001 ? target : cur + diff * Math.min(1, 6.0 * delta);
      });

      setInnerLiquidAngle((cur) => {
        const target = targetInnerAngleRef.current;
        const diff = target - cur;
        return Math.abs(diff) < 0.001 ? target : cur + diff * Math.min(1, 6.0 * delta);
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const restoreActiveState = async () => {
    try {
      const res = await spiralApi.getState();
      if (res.success && res.data) {
        if (res.data.balance !== undefined) {
          setBalance(res.data.balance);
          setLocalDemoBalance(res.data.balance);
        }
        if (res.data.active && res.data.state) {
          const s = res.data.state;
          setRoundId(s.roundId);
          setIsActive(true);
          setHasStarted(!!s.hasStarted);
          setBetAmount(s.betAmount);
          const oP = s.outerPosition ?? s.outerIndex ?? null;
          const mP = s.middlePosition ?? s.middleIndex ?? null;
          const iP = s.innerPosition ?? s.innerIndex ?? null;
          setOuterPos(oP);
          setMiddlePos(mP);
          setInnerPos(iP);
          setActiveOuter(s.activeOuter ?? (oP !== null));
          setActiveMiddle(s.activeMiddle ?? (mP !== null));
          setActiveInner(s.activeInner ?? (iP !== null));
          setOuterMult(s.outerMultiplier || 0);
          setMiddleMult(s.middleMultiplier || 0);
          setInnerMult(s.innerMultiplier || 0);
          const rawTotal = Number(s.totalMultiplier) || 0.0;
          setTotalMultiplier(rawTotal);
          setAccumulatedBonus(s.accumulatedBonus || 0);
          setLastSymbol(s.lastSymbol);
          setHalfCashedOut(s.halfCashedOut);
          setHalfCashoutAmount(s.halfCashoutAmount);

          // Position targets directly if rings are active; otherwise keep at START_DIVIDER_ANGLE
          if (oP !== null) {
            const baseOuter = START_DIVIDER_ANGLE + (oP + 0.5) * ((Math.PI * 2) / 8);
            targetOuterAngleRef.current = baseOuter;
            setOuterLiquidAngle(baseOuter);
          } else {
            targetOuterAngleRef.current = START_DIVIDER_ANGLE;
            setOuterLiquidAngle(START_DIVIDER_ANGLE);
          }
          if (mP !== null) {
            const baseMiddle = START_DIVIDER_ANGLE + (mP + 0.5) * ((Math.PI * 2) / 6);
            targetMiddleAngleRef.current = baseMiddle;
            setMiddleLiquidAngle(baseMiddle);
          } else {
            targetMiddleAngleRef.current = START_DIVIDER_ANGLE;
            setMiddleLiquidAngle(START_DIVIDER_ANGLE);
          }
          if (iP !== null) {
            const baseInner = START_DIVIDER_ANGLE + (iP + 0.5) * ((Math.PI * 2) / 4);
            targetInnerAngleRef.current = baseInner;
            setInnerLiquidAngle(baseInner);
          } else {
            targetInnerAngleRef.current = START_DIVIDER_ANGLE;
            setInnerLiquidAngle(START_DIVIDER_ANGLE);
          }
        } else {
          setRoundId(null);
          setHasStarted(false);
          setInnerPos(null);
          setMiddlePos(null);
          setOuterPos(null);
          setActiveOuter(false);
          setActiveMiddle(false);
          setActiveInner(false);
          setOuterMult(0);
          setMiddleMult(0);
          setInnerMult(0);
          setTotalMultiplier(0.0);
          targetOuterAngleRef.current = START_DIVIDER_ANGLE;
          targetMiddleAngleRef.current = START_DIVIDER_ANGLE;
          targetInnerAngleRef.current = START_DIVIDER_ANGLE;
          setOuterLiquidAngle(START_DIVIDER_ANGLE);
          setMiddleLiquidAngle(START_DIVIDER_ANGLE);
          setInnerLiquidAngle(START_DIVIDER_ANGLE);
        }
      }
    } catch {}
  };

  // ─── CLOCKWISE LIQUID TARGET UPDATER ─────────────────────────────────────
  const updateLiquidTargets = (
    outP: number | null,
    midP: number | null,
    inP: number | null,
    symbol?: SpiralSymbol | null
  ) => {
    // STEP 7: Goat produces no animation or indicator movement
    if (symbol === 'GOAT') {
      return;
    }

    if (outP !== null) {
      const baseOuter = START_DIVIDER_ANGLE + (outP + 0.5) * ((Math.PI * 2) / 8);
      if (symbol === 'LION') {
        setClockwiseTarget(targetOuterAngleRef, outerLiquidAngle, baseOuter);
      } else if (symbol === 'SKULL') {
        setBackwardTarget(targetOuterAngleRef, outerLiquidAngle, baseOuter);
      } else {
        targetOuterAngleRef.current = baseOuter;
      }
    } else {
      // Returning to initialVisualAngle (START_DIVIDER_ANGLE) on Skull or Reset
      if (symbol === 'SKULL') {
        setBackwardTarget(targetOuterAngleRef, outerLiquidAngle, START_DIVIDER_ANGLE);
      } else {
        targetOuterAngleRef.current = START_DIVIDER_ANGLE;
      }
    }

    if (midP !== null) {
      const baseMiddle = START_DIVIDER_ANGLE + (midP + 0.5) * ((Math.PI * 2) / 6);
      if (symbol === 'ELEPHANT') {
        setClockwiseTarget(targetMiddleAngleRef, middleLiquidAngle, baseMiddle);
      } else if (symbol === 'SKULL') {
        setBackwardTarget(targetMiddleAngleRef, middleLiquidAngle, baseMiddle);
      } else {
        targetMiddleAngleRef.current = baseMiddle;
      }
    } else {
      if (symbol === 'SKULL') {
        setBackwardTarget(targetMiddleAngleRef, middleLiquidAngle, START_DIVIDER_ANGLE);
      } else {
        targetMiddleAngleRef.current = START_DIVIDER_ANGLE;
      }
    }

    if (inP !== null) {
      const baseInner = START_DIVIDER_ANGLE + (inP + 0.5) * ((Math.PI * 2) / 4);
      if (symbol === 'DOG') {
        setClockwiseTarget(targetInnerAngleRef, innerLiquidAngle, baseInner);
      } else if (symbol === 'SKULL') {
        setBackwardTarget(targetInnerAngleRef, innerLiquidAngle, baseInner);
      } else {
        targetInnerAngleRef.current = baseInner;
      }
    } else {
      if (symbol === 'SKULL') {
        setBackwardTarget(targetInnerAngleRef, innerLiquidAngle, START_DIVIDER_ANGLE);
      } else {
        targetInnerAngleRef.current = START_DIVIDER_ANGLE;
      }
    }
  };

  // Ensure target moves clockwise (increasing angle from -PI/2)
  const setClockwiseTarget = (ref: React.MutableRefObject<number>, cur: number, base: number) => {
    let t = base;
    while (t < cur - 0.001) {
      t += Math.PI * 2;
    }
    while (t - cur > Math.PI * 2) {
      t -= Math.PI * 2;
    }
    ref.current = t;
  };

  // Ensure target moves backward
  const setBackwardTarget = (ref: React.MutableRefObject<number>, cur: number, base: number) => {
    let t = base;
    while (t > cur + 0.001) {
      t -= Math.PI * 2;
    }
    while (cur - t > Math.PI * 2) {
      t += Math.PI * 2;
    }
    ref.current = t;
  };

  // ─── ONE SPIN CLICK = ONE BET (CRITICAL PRD REQUIREMENT) ─────────────────
  const handleSpinClick = async (roundNumber?: number): Promise<boolean> => {
    if (isSpinningRef.current) {
      console.warn('[Spiral] Prevented duplicate spin request');
      return false;
    }

    const currentBal = getDemoBalance();
    if (currentBal < betAmount) {
      setStatusMessage('Insufficient demo balance to place spin bet.');
      soundManager.play('loss');
      return false;
    }

    isSpinningRef.current = true;
    setIsSpinning(true);
    soundManager.play('slotSpin');
    setActiveBonusBanner(null);

    const idempotencyKey = `spin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await spiralApi.spin(betAmount, roundId || undefined, idempotencyKey);

      if (!res.success || !res.data) {
        throw new Error(res.data?.status || 'Spin request failed');
      }

      const s = res.data;

      // 600ms Suspense Animation awaited sequentially
      await new Promise((resolve) => setTimeout(resolve, 600));

      setIsSpinning(false);
      isSpinningRef.current = false;
      setRoundId(s.roundId);
      setIsActive(s.active);
      setHasStarted(!!s.hasStarted);
      setBalance(s.balance);
      setLocalDemoBalance(s.balance);
      const oP = s.outerPosition ?? s.outerIndex ?? null;
      const mP = s.middlePosition ?? s.middleIndex ?? null;
      const iP = s.innerPosition ?? s.innerIndex ?? null;
      setOuterPos(oP);
      setMiddlePos(mP);
      setInnerPos(iP);
      setActiveOuter(s.activeOuter ?? (oP !== null));
      setActiveMiddle(s.activeMiddle ?? (mP !== null));
      setActiveInner(s.activeInner ?? (iP !== null));
      setOuterMult(s.outerMultiplier || 0);
      setMiddleMult(s.middleMultiplier || 0);
      setInnerMult(s.innerMultiplier || 0);
      const confirmedTotal = Number(s.totalMultiplier) || 0.0;
      setTotalMultiplier(confirmedTotal);
      setAccumulatedBonus(s.accumulatedBonus || 0);
      setLastSymbol(s.lastSymbol);

      // Smoothly glide liquid indicator clockwise to new position
      updateLiquidTargets(oP, mP, iP, s.lastSymbol);

      // Feedback message handling
      if (s.lastBonus) {
        const b = s.lastBonus;
        setActiveBonusBanner(`${b.ring} RING BONUS: +${b.bonusAmount}x! Stepped back.`);
        soundManager.play('win');
      } else if (s.lastSymbol === 'SKULL') {
        soundManager.play('loss');
        if (s.totalMultiplier === 0) {
          setStatusMessage('SKULL! Circles moved back. Circle at Section 1 — Multiplier reset to 0.00x!');
        } else {
          setStatusMessage(`SKULL! Circles moved back. Multiplier: ${s.totalMultiplier}x`);
        }
      } else if (s.lastSymbol === 'GOAT') {
        soundManager.play('slotStop');
        setStatusMessage('GOAT! NO CHANGE — All ring positions and multipliers remain still.');
      } else {
        soundManager.play('slotStop');
        setStatusMessage(`Rolled ${s.lastSymbol}! Multiplier: ${s.totalMultiplier}x`);
      }

      return true;
    } catch (err: any) {
      isSpinningRef.current = false;
      setIsSpinning(false);
      const userMsg =
        err.userFacingMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Spin failed';

      if (import.meta.env.DEV || process.env.NODE_ENV !== 'production') {
        console.error('[Spiral Spin Error]', {
          roundNumber: roundNumber ?? 'manual',
          url: '/api/spiral/spin',
          status: err.response?.status,
          error: userMsg,
          stack: err.stack,
        });
      }

      setStatusMessage(userMsg);
      soundManager.play('loss');
      return false;
    }
  };

  // ─── AUTO BET LONG-PRESS HANDLER (2 SECONDS) ──────────────────────────────
  const handleSpinPointerDown = () => {
    if (isAutoBetActiveRef.current) {
      stopAutoBet();
      return;
    }

    holdStartRef.current = Date.now();
    setAutoHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(100, Math.floor((elapsed / 2000) * 100));
      setAutoHoldProgress(progress);

      if (elapsed >= 2000) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        startAutoBet();
      }
    }, 50);
  };

  const handleSpinPointerUp = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
      setAutoHoldProgress(0);
      const elapsed = Date.now() - holdStartRef.current;
      if (elapsed < 2000 && !isAutoBetActiveRef.current) {
        handleSpinClick();
      }
    }
  };

  const startAutoBet = async () => {
    if (isAutoBetActiveRef.current || isSpinningRef.current) return;
    soundManager.play('buttonClick');
    isAutoBetActiveRef.current = true;
    setIsAutoBetActive(true);
    setStatusMessage('AUTO BET ACTIVE! Running continuous spins...');

    let autoRound = 0;
    while (isAutoBetActiveRef.current) {
      autoRound++;
      const curBal = getDemoBalance();
      if (curBal < betAmount) {
        stopAutoBet('Auto Bet stopped: Insufficient demo balance.');
        break;
      }

      const success = await handleSpinClick(autoRound);
      if (!success || !isAutoBetActiveRef.current) {
        if (!success) stopAutoBet();
        break;
      }

      // Sequential pause between spins with cancellation check
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  };

  const stopAutoBet = async (reason?: string) => {
    isAutoBetActiveRef.current = false;
    setIsAutoBetActive(false);
    setAutoHoldProgress(0);
    setStatusMessage(reason || 'Auto Bet stopped');
    soundManager.play('buttonClick');
    await spiralApi.stopAuto().catch(() => {});
  };

  // ─── HALF CASH OUT ────────────────────────────────────────────────────────
  const handleHalfCashout = async () => {
    if (!isActive || !roundId || halfCashedOut || isSpinning || totalMultiplier <= 0) return;
    soundManager.play('win');

    try {
      const res = await spiralApi.halfCashout(roundId);
      if (!res.success) throw new Error('Half cashout failed');

      const data = res.data;
      setHalfCashedOut(true);
      setHalfCashoutAmount(data.creditedAmount);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setStatusMessage(`LOCKED 50%: +₹${data.creditedAmount.toLocaleString('en-IN')}. Playing remaining 50%!`);
    } catch (err: any) {
      console.error('Half cashout error:', err);
      setStatusMessage(err.response?.data?.message || err.message || 'Half cashout failed');
      soundManager.play('loss');
    }
  };

  // ─── FULL CASH OUT ────────────────────────────────────────────────────────
  const handleFullCashout = async () => {
    if (!isActive || !roundId || isSpinning || totalMultiplier <= 0) return;
    soundManager.play('win');
    if (isAutoBetActive) stopAutoBet();

    try {
      const res = await spiralApi.fullCashout(roundId);
      if (!res.success) throw new Error('Cashout failed');

      const data = res.data;
      setIsActive(false);
      setHasStarted(false);
      setRoundId(null);
      setInnerPos(null);
      setMiddlePos(null);
      setOuterPos(null);
      setActiveOuter(false);
      setActiveMiddle(false);
      setActiveInner(false);
      setOuterMult(0);
      setMiddleMult(0);
      setInnerMult(0);
      setTotalMultiplier(0.0);
      setAccumulatedBonus(0);
      setLastSymbol(null);
      setHalfCashedOut(false);
      setHalfCashoutAmount(0);
      targetOuterAngleRef.current = START_DIVIDER_ANGLE;
      targetMiddleAngleRef.current = START_DIVIDER_ANGLE;
      targetInnerAngleRef.current = START_DIVIDER_ANGLE;
      setOuterLiquidAngle(START_DIVIDER_ANGLE);
      setMiddleLiquidAngle(START_DIVIDER_ANGLE);
      setInnerLiquidAngle(START_DIVIDER_ANGLE);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setStatusMessage(`CASHED OUT: +₹${data.finalPayout.toLocaleString('en-IN')}! Total won: ₹${data.totalPayout.toLocaleString('en-IN')}`);
    } catch (err: any) {
      console.error('Full cashout error:', err);
      setStatusMessage(err.response?.data?.message || err.message || 'Cashout failed');
      soundManager.play('loss');
    }
  };

  // Authoritative Bet Lock: Locked whenever round is active and Total Multiplier > 0.00x
  const isBetLocked = isActive && totalMultiplier > 0;

  const handleBetChange = (delta: number) => {
    if (isSpinning || isBetLocked) return;
    soundManager.play('buttonClick');
    setBetAmount((prev) => Math.min(5000, Math.max(10, prev + delta)));
  };

  const handleChipSelect = (amt: number) => {
    if (isSpinning || isBetLocked) return;
    soundManager.play('buttonClick');
    setBetAmount(amt);
  };

  const toggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleResetBalance = () => {
    soundManager.play('buttonClick');
    const fresh = resetDemoBalance();
    setBalance(fresh);
  };

  const currentTotalPotential = totalMultiplier > 0 ? Math.round(betAmount * totalMultiplier) : 0;
  const activePotential = halfCashedOut ? Math.round(currentTotalPotential * 0.5) : currentTotalPotential;
  const halfCashoutValue = Math.round(currentTotalPotential * 0.5);

  // ─── RENDER 2D CIRCULAR SVG GAME ──────────────────────────────────────────
  return (
    <div className="relative w-full h-full flex flex-col min-h-0 bg-dark-950 text-white select-none overflow-hidden font-sans">
      {/* ── TOP HEADER: LOGO, DEMO BALANCE, CONTROLS ───────────────────────── */}
      <div className="flex justify-between items-center px-3 sm:px-6 py-2.5 z-30 bg-dark-900/95 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-950 border border-amber-500/40 rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="font-cinzel text-xs sm:text-sm font-black tracking-wider text-amber-300">
                TREASURE SPIRAL
              </span>
              <span className="text-[8px] text-amber-400 font-bold uppercase tracking-widest -mt-0.5">
                2D CIRCULAR MULTIPLIER GAME
              </span>
            </div>
          </div>

          <button
            onClick={toggleSound}
            className="p-2 bg-dark-950 hover:bg-dark-800 border border-dark-700 hover:border-amber-500/50 rounded-xl text-gray-300 hover:text-white transition shadow-sm"
            title={isMuted ? 'Sound OFF' : 'Sound ON'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-950 border border-amber-500/40 rounded-xl shadow-md">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-gray-400 uppercase font-bold hidden sm:inline">DEMO:</span>
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-tight">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button
              onClick={handleResetBalance}
              className="btn-reset-balance ml-1 p-1 hover:bg-dark-800 rounded text-amber-400 hover:text-amber-200 transition"
              title="Reset Demo Balance (₹10,000)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 bg-dark-950 hover:bg-dark-800 border border-dark-700 hover:border-amber-500/50 rounded-xl text-gray-300 hover:text-white transition shadow-sm"
            title="Probabilities & Rules"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* ── MAIN 2D GAME VIEWPORT ─────────────────────────────────────────── */}
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* FLOATING HUD CARDS (MULTIPLIER & POSITIONS) */}
        <div className="absolute top-2 right-2 sm:top-5 sm:right-6 flex flex-col gap-1.5 sm:gap-2 z-25 pointer-events-auto max-w-[130px] sm:max-w-[220px] w-full">
          {/* TOTAL MULTIPLIER CARD */}
          <div className="bg-dark-950/90 backdrop-blur-md border border-amber-500/50 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-gray-400 uppercase">
              MULTIPLIER
            </span>
            <div
              id="total-multiplier-display"
              className="font-black font-cinzel text-2xl sm:text-4xl text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
            >
              {totalMultiplier.toFixed(2)}x
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-gray-300 mt-0.5">
              ₹{activePotential.toLocaleString('en-IN')}
            </div>
            {accumulatedBonus > 0 && (
              <div className="mt-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-[8px] sm:text-[9px] font-bold text-amber-300">
                +{accumulatedBonus}x
              </div>
            )}
            {halfCashedOut && (
              <div className="mt-1 px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/50 rounded text-[8px] sm:text-[9px] font-bold text-emerald-300">
                50%: ₹{halfCashoutAmount.toLocaleString('en-IN')}
              </div>
            )}
          </div>

          {/* ACTIVE MULTIPLIER SECTIONS CARD (Hidden on mobile to keep circular arena unobstructed) */}
          <div className="hidden sm:block bg-dark-950/90 backdrop-blur-md border border-dark-800 rounded-xl p-2.5 text-[10px] space-y-1.5 font-mono shadow-lg">
            <div className="flex justify-between items-center text-amber-400">
              <span className="font-bold">OUTER:</span>
              <span className={`font-black ${activeOuter && outerPos !== null ? 'text-amber-300' : 'text-gray-500'}`}>
                {activeOuter && outerPos !== null ? `${OUTER_SECTORS[outerPos].mult} (${outerPos + 1}/8)` : 'NEUTRAL'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sky-400">
              <span className="font-bold">MIDDLE:</span>
              <span className={`font-black ${activeMiddle && middlePos !== null ? 'text-sky-300' : 'text-gray-500'}`}>
                {activeMiddle && middlePos !== null ? `${MIDDLE_SECTORS[middlePos].mult} (${middlePos + 1}/6)` : 'NEUTRAL'}
              </span>
            </div>
            <div className="flex justify-between items-center text-purple-400">
              <span className="font-bold">INNER:</span>
              <span className={`font-black ${activeInner && innerPos !== null ? 'text-purple-300' : 'text-gray-500'}`}>
                {activeInner && innerPos !== null ? `${INNER_SECTORS[innerPos].mult} (${innerPos + 1}/4)` : 'NEUTRAL'}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2D CONCENTRIC VECTOR SVG ARENA (800x800) ────────────────────── */}
        <div className="relative w-full h-full max-w-[700px] max-h-[700px] flex items-center justify-center">
          <svg
            viewBox="0 0 800 800"
            className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          >
            <defs>
              {/* Outer Amber Liquid Glow Filter */}
              <filter id="glow-outer" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Middle Cyan Liquid Glow Filter */}
              <filter id="glow-middle" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Inner Purple Liquid Glow Filter */}
              <filter id="glow-inner" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Liquid Stream Gradients */}
              <linearGradient id="grad-outer-stream" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fffbeb" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="grad-middle-stream" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.1" />
                <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f0f9ff" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="grad-inner-stream" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7e22ce" stopOpacity="0.1" />
                <stop offset="60%" stopColor="#c084fc" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#faf5ff" stopOpacity="1" />
              </linearGradient>

              {/* Radial Gradients for Liquid Heads */}
              <radialGradient id="grad-head-outer">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>

              <radialGradient id="grad-head-middle">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </radialGradient>

              <radialGradient id="grad-head-inner">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#e879f9" />
                <stop offset="100%" stopColor="#9333ea" />
              </radialGradient>
            </defs>

            {/* Background Outer Halo */}
            <circle cx={CX} cy={CY} r={382} fill="#090d16" stroke="#1e293b" strokeWidth="2" />

            {/* Aligned Radial Start Guideline matching blue screenshot mark */}
            <line
              x1={CX + (R_IN_IN - 6) * Math.cos(START_DIVIDER_ANGLE)}
              y1={CY + (R_IN_IN - 6) * Math.sin(START_DIVIDER_ANGLE)}
              x2={CX + (R_OUT_OUT + 6) * Math.cos(START_DIVIDER_ANGLE)}
              y2={CY + (R_OUT_OUT + 6) * Math.sin(START_DIVIDER_ANGLE)}
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              opacity="0.85"
            />
            <g
              transform={`translate(${CX + (R_OUT_OUT + 14) * Math.cos(START_DIVIDER_ANGLE)}, ${CY + (R_OUT_OUT + 14) * Math.sin(START_DIVIDER_ANGLE)})`}
            >
              <circle r="4" fill="#06b6d4" filter="url(#glow-middle)" />
            </g>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. OUTER RING (8 PERMANENTLY FIXED SECTORS, R = 295 to 375)     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <g id="outer-ring-group">
              {OUTER_SECTORS.map((sec, idx) => {
                const step = (Math.PI * 2) / 8;
                const startA = START_DIVIDER_ANGLE + idx * step + 0.015;
                const endA = START_DIVIDER_ANGLE + (idx + 1) * step - 0.015;
                const midA = START_DIVIDER_ANGLE + (idx + 0.5) * step;
                const isActiveSec = activeOuter && outerPos !== null && idx === outerPos;
                const pathData = createAnnularSectorPath(CX, CY, R_OUT_IN, R_OUT_OUT, startA, endA);

                const labelX = CX + R_OUT_MID * Math.cos(midA);
                const labelY = CY + R_OUT_MID * Math.sin(midA);

                return (
                  <g key={`outer-${idx}`}>
                    {/* Fixed Sector Path */}
                    <path
                      d={pathData}
                      fill={
                        isActiveSec
                          ? 'rgba(245, 158, 11, 0.28)'
                          : sec.isBonus
                          ? 'rgba(185, 28, 28, 0.35)'
                          : 'rgba(15, 23, 42, 0.75)'
                      }
                      stroke={isActiveSec ? '#fbbf24' : sec.isBonus ? '#ef4444' : '#334155'}
                      strokeWidth={isActiveSec ? '3' : '1.5'}
                      className="transition-colors duration-300"
                    />

                    {/* Fixed Upright Multiplier Label Badge */}
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x="-36"
                        y="-14"
                        width="72"
                        height="28"
                        rx="8"
                        fill={isActiveSec ? '#f59e0b' : sec.isBonus ? '#991b1b' : '#0f172a'}
                        stroke={isActiveSec ? '#ffffff' : sec.isBonus ? '#fef08a' : '#475569'}
                        strokeWidth={isActiveSec ? '2' : '1'}
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="Cinzel, Arial Black, monospace"
                        fontWeight="900"
                        fontSize={sec.isBonus ? '9.5' : '13'}
                        fill={isActiveSec ? '#000000' : sec.isBonus ? '#fef08a' : '#f8fafc'}
                      >
                        {sec.mult}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Outer Liquid Conduit Track (Guide Circle) */}
              <circle
                cx={CX}
                cy={CY}
                r={R_OUT_MID}
                fill="none"
                stroke="rgba(245, 158, 11, 0.15)"
                strokeWidth="4"
              />

              {/* Outer Glowing Liquid Indicator */}
              {((activeOuter && outerPos !== null) || Math.abs(outerLiquidAngle - START_DIVIDER_ANGLE) > 0.03) && (
                <g>
                  <path
                    d={createArcPath(CX, CY, R_OUT_MID, START_DIVIDER_ANGLE, outerLiquidAngle)}
                    fill="none"
                    stroke="url(#grad-outer-stream)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#glow-outer)"
                  />
                  <circle
                    cx={CX + R_OUT_MID * Math.cos(outerLiquidAngle)}
                    cy={CY + R_OUT_MID * Math.sin(outerLiquidAngle)}
                    r="7"
                    fill="url(#grad-head-outer)"
                    filter="url(#glow-outer)"
                  />
                  <circle
                    cx={CX + R_OUT_MID * Math.cos(outerLiquidAngle)}
                    cy={CY + R_OUT_MID * Math.sin(outerLiquidAngle)}
                    r={9 * ripplePulse}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    opacity={activeOuter ? Math.max(0, 1 - (ripplePulse - 1) * 2.5) : 0.4}
                  />
                </g>
              )}
            </g>

            {/* Ring Divider Ring 1 */}
            <circle cx={CX} cy={CY} r={R_OUT_IN - 4} fill="none" stroke="#1e293b" strokeWidth="2" />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. MIDDLE RING (6 PERMANENTLY FIXED SECTORS, R = 205 to 285)    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <g id="middle-ring-group">
              {MIDDLE_SECTORS.map((sec, idx) => {
                const step = (Math.PI * 2) / 6;
                const startA = START_DIVIDER_ANGLE + idx * step + 0.015;
                const endA = START_DIVIDER_ANGLE + (idx + 1) * step - 0.015;
                const midA = START_DIVIDER_ANGLE + (idx + 0.5) * step;
                const isActiveSec = activeMiddle && middlePos !== null && idx === middlePos;
                const pathData = createAnnularSectorPath(CX, CY, R_MID_IN, R_MID_OUT, startA, endA);

                const labelX = CX + R_MID_MID * Math.cos(midA);
                const labelY = CY + R_MID_MID * Math.sin(midA);

                return (
                  <g key={`middle-${idx}`}>
                    {/* Fixed Sector Path */}
                    <path
                      d={pathData}
                      fill={
                        isActiveSec
                          ? 'rgba(56, 189, 248, 0.28)'
                          : sec.isBonus
                          ? 'rgba(185, 28, 28, 0.35)'
                          : 'rgba(15, 23, 42, 0.75)'
                      }
                      stroke={isActiveSec ? '#38bdf8' : sec.isBonus ? '#ef4444' : '#334155'}
                      strokeWidth={isActiveSec ? '3' : '1.5'}
                      className="transition-colors duration-300"
                    />

                    {/* Fixed Upright Multiplier Label Badge */}
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x="-32"
                        y="-13"
                        width="64"
                        height="26"
                        rx="7"
                        fill={isActiveSec ? '#0284c7' : sec.isBonus ? '#991b1b' : '#0f172a'}
                        stroke={isActiveSec ? '#ffffff' : sec.isBonus ? '#fef08a' : '#475569'}
                        strokeWidth={isActiveSec ? '2' : '1'}
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="Cinzel, Arial Black, monospace"
                        fontWeight="900"
                        fontSize={sec.isBonus ? '10' : '13'}
                        fill={isActiveSec ? '#ffffff' : sec.isBonus ? '#fef08a' : '#f8fafc'}
                      >
                        {sec.mult}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Middle Liquid Conduit Track */}
              <circle
                cx={CX}
                cy={CY}
                r={R_MID_MID}
                fill="none"
                stroke="rgba(56, 189, 248, 0.15)"
                strokeWidth="4"
              />

              {/* Middle Glowing Liquid Indicator */}
              {((activeMiddle && middlePos !== null) || Math.abs(middleLiquidAngle - START_DIVIDER_ANGLE) > 0.03) && (
                <g>
                  <path
                    d={createArcPath(CX, CY, R_MID_MID, START_DIVIDER_ANGLE, middleLiquidAngle)}
                    fill="none"
                    stroke="url(#grad-middle-stream)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#glow-middle)"
                  />
                  <circle
                    cx={CX + R_MID_MID * Math.cos(middleLiquidAngle)}
                    cy={CY + R_MID_MID * Math.sin(middleLiquidAngle)}
                    r="7"
                    fill="url(#grad-head-middle)"
                    filter="url(#glow-middle)"
                  />
                  <circle
                    cx={CX + R_MID_MID * Math.cos(middleLiquidAngle)}
                    cy={CY + R_MID_MID * Math.sin(middleLiquidAngle)}
                    r={9 * ripplePulse}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    opacity={activeMiddle ? Math.max(0, 1 - (ripplePulse - 1) * 2.5) : 0.4}
                  />
                </g>
              )}
            </g>

            {/* Ring Divider Ring 2 */}
            <circle cx={CX} cy={CY} r={R_MID_IN - 4} fill="none" stroke="#1e293b" strokeWidth="2" />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. INNER RING (4 PERMANENTLY FIXED SECTORS, R = 115 to 195)     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <g id="inner-ring-group">
              {INNER_SECTORS.map((sec, idx) => {
                const step = (Math.PI * 2) / 4;
                const startA = START_DIVIDER_ANGLE + idx * step + 0.015;
                const endA = START_DIVIDER_ANGLE + (idx + 1) * step - 0.015;
                const midA = START_DIVIDER_ANGLE + (idx + 0.5) * step;
                const isActiveSec = activeInner && innerPos !== null && idx === innerPos;
                const pathData = createAnnularSectorPath(CX, CY, R_IN_IN, R_IN_OUT, startA, endA);

                const labelX = CX + R_IN_MID * Math.cos(midA);
                const labelY = CY + R_IN_MID * Math.sin(midA);

                return (
                  <g key={`inner-${idx}`}>
                    {/* Fixed Sector Path */}
                    <path
                      d={pathData}
                      fill={
                        isActiveSec
                          ? 'rgba(192, 132, 252, 0.28)'
                          : sec.isBonus
                          ? 'rgba(185, 28, 28, 0.35)'
                          : 'rgba(15, 23, 42, 0.75)'
                      }
                      stroke={isActiveSec ? '#c084fc' : sec.isBonus ? '#ef4444' : '#334155'}
                      strokeWidth={isActiveSec ? '3' : '1.5'}
                      className="transition-colors duration-300"
                    />

                    {/* Fixed Upright Multiplier Label Badge */}
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x="-28"
                        y="-12"
                        width="56"
                        height="24"
                        rx="6"
                        fill={isActiveSec ? '#7e22ce' : sec.isBonus ? '#991b1b' : '#0f172a'}
                        stroke={isActiveSec ? '#ffffff' : sec.isBonus ? '#fef08a' : '#475569'}
                        strokeWidth={isActiveSec ? '2' : '1'}
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="Cinzel, Arial Black, monospace"
                        fontWeight="900"
                        fontSize={sec.isBonus ? '11' : '13'}
                        fill={isActiveSec ? '#ffffff' : sec.isBonus ? '#fef08a' : '#f8fafc'}
                      >
                        {sec.mult}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Inner Liquid Conduit Track */}
              <circle
                cx={CX}
                cy={CY}
                r={R_IN_MID}
                fill="none"
                stroke="rgba(192, 132, 252, 0.15)"
                strokeWidth="4"
              />

              {/* Inner Glowing Liquid Indicator */}
              {((activeInner && innerPos !== null) || Math.abs(innerLiquidAngle - START_DIVIDER_ANGLE) > 0.03) && (
                <g>
                  <path
                    d={createArcPath(CX, CY, R_IN_MID, START_DIVIDER_ANGLE, innerLiquidAngle)}
                    fill="none"
                    stroke="url(#grad-inner-stream)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#glow-inner)"
                  />
                  <circle
                    cx={CX + R_IN_MID * Math.cos(innerLiquidAngle)}
                    cy={CY + R_IN_MID * Math.sin(innerLiquidAngle)}
                    r="7"
                    fill="url(#grad-head-inner)"
                    filter="url(#glow-inner)"
                  />
                  <circle
                    cx={CX + R_IN_MID * Math.cos(innerLiquidAngle)}
                    cy={CY + R_IN_MID * Math.sin(innerLiquidAngle)}
                    r={9 * ripplePulse}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    opacity={activeInner ? Math.max(0, 1 - (ripplePulse - 1) * 2.5) : 0.4}
                  />
                </g>
              )}
            </g>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. CENTER STAGE PEDESTAL & 2D ANIMAL IMAGE DISPLAY             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <circle cx={CX} cy={CY} r="105" fill="#090d16" stroke="#f59e0b" strokeWidth="3" />
            <circle cx={CX} cy={CY} r="100" fill="none" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="1" />
          </svg>

          {/* 2D CENTER ANIMAL OVERLAY (HTML EMBEDDED DIRECTLY IN CENTER) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full flex flex-col items-center justify-center p-3 text-center">
              {/* High-Resolution Transparent 2D Animal Image (0 Emojis) */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <img
                  src={`/assets/games/spiral/${(lastSymbol || 'LION').toLowerCase()}.png`}
                  alt={lastSymbol || 'Lion'}
                  className={`w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-transform duration-300 ${
                    isSpinning ? 'scale-90 animate-spin' : 'scale-100'
                  }`}
                  style={isSpinning ? { animationDuration: '0.4s' } : undefined}
                />
              </div>

              {/* 2D Animal Symbol Name Badge */}
              <div className="mt-1 px-3 py-0.5 bg-dark-900/90 border border-amber-500/50 rounded-full shadow-lg">
                <span className="font-cinzel text-xs font-black tracking-wider text-amber-300">
                  {lastSymbol === 'GOAT' ? 'GOAT (NO CHANGE)' : lastSymbol || 'READY'}
                </span>
              </div>
            </div>
          </div>

          {/* Bonus Banner Overlay */}
          {activeBonusBanner && (
            <div className="absolute top-1/4 px-5 py-2 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 text-black font-black font-cinzel text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-2xl animate-bounce border-2 border-yellow-200 z-30">
              {activeBonusBanner}
            </div>
          )}

          {/* Bottom Status Message */}
          <div className="absolute bottom-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border shadow-xl bg-dark-900/90 border-dark-700 text-gray-300 z-20">
            {statusMessage}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CONTROL BAR (1 SPIN CLICK = 1 BET DEDUCTED) ─────────────── */}
      <div className="bg-dark-900/95 border-t border-dark-800 px-3 sm:px-6 py-2.5 sm:py-3 z-30 shadow-2xl backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* LEFT: BET CONTROLS */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
              BET AMOUNT (PER SPIN)
              {isBetLocked && (
                <span
                  id="bet-locked-badge"
                  className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/20 border border-amber-500/50 px-1.5 py-0.5 rounded text-[8px] font-mono font-black animate-pulse"
                  title="BET LOCKED — CASH OUT OR REACH 0.00x TO CHANGE BET"
                >
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  LOCKED
                </span>
              )}
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <button
                disabled={isSpinning || isBetLocked || betAmount <= 10}
                onClick={() => handleBetChange(-10)}
                className={`btn-bet-minus p-1.5 sm:p-2 bg-dark-950 border border-dark-700 hover:border-amber-500/50 rounded-xl text-gray-300 hover:text-white disabled:opacity-40 transition ${
                  isBetLocked ? 'cursor-not-allowed opacity-40 bg-dark-900 border-dark-800' : ''
                }`}
                title={isBetLocked ? 'BET LOCKED — CASH OUT OR REACH 0.00x TO CHANGE BET' : '-₹10'}
              >
                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <div
                className={`flex items-center bg-dark-950 border px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl gap-1 transition ${
                  isBetLocked ? 'border-amber-500/40 bg-dark-900/80 cursor-not-allowed' : 'border-dark-700'
                }`}
                title={isBetLocked ? 'BET LOCKED — CASH OUT OR REACH 0.00x TO CHANGE BET' : 'Bet Amount'}
              >
                <Coins className={`w-3.5 h-3.5 ${isBetLocked ? 'text-amber-500/70' : 'text-amber-400'}`} />
                <input
                  type="number"
                  disabled={isSpinning || isBetLocked}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(10, Math.min(5000, parseInt(e.target.value) || 10)))}
                  className={`w-14 sm:w-20 bg-transparent text-center font-mono font-black text-xs sm:text-sm outline-none ${
                    isBetLocked ? 'cursor-not-allowed text-gray-400' : 'text-amber-300'
                  }`}
                />
                {isBetLocked && <Lock className="w-3 h-3 text-amber-400/80 -ml-1" />}
              </div>

              <button
                disabled={isSpinning || isBetLocked || betAmount >= 5000}
                onClick={() => handleBetChange(10)}
                className={`btn-bet-plus p-1.5 sm:p-2 bg-dark-950 border border-dark-700 hover:border-amber-500/50 rounded-xl text-gray-300 hover:text-white disabled:opacity-40 transition ${
                  isBetLocked ? 'cursor-not-allowed opacity-40 bg-dark-900 border-dark-800' : ''
                }`}
                title={isBetLocked ? 'BET LOCKED — CASH OUT OR REACH 0.00x TO CHANGE BET' : '+₹10'}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Quick Chips */}
              <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-dark-700 ml-1 overflow-x-auto no-scrollbar">
                {[10, 50, 100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    disabled={isSpinning || isBetLocked}
                    onClick={() => handleChipSelect(amt)}
                    title={isBetLocked ? 'BET LOCKED — CASH OUT OR REACH 0.00x TO CHANGE BET' : `₹${amt}`}
                    className={`btn-chip-${amt} px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition shrink-0 ${
                      betAmount === amt
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md font-black'
                        : isBetLocked
                        ? 'text-gray-600 cursor-not-allowed opacity-40'
                        : 'text-gray-400 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER & RIGHT: ACTION BUTTONS */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 w-full sm:w-auto">
            {/* 1. SPIN BUTTON (1 CLICK = 1 BET, HOLD 2S = AUTO BET) */}
            <div className="relative flex-1 sm:flex-initial">
              <button
                disabled={isSpinning || balance < betAmount}
                onMouseDown={handleSpinPointerDown}
                onMouseUp={handleSpinPointerUp}
                onTouchStart={handleSpinPointerDown}
                onTouchEnd={handleSpinPointerUp}
                className={`btn-spin relative w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden ${
                  isAutoBetActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black shadow-amber-500/30 hover:scale-105 active:scale-95'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="1 Click = 1 Bet Deducted. Hold 2s for Auto Bet."
              >
                {/* Hold Progress Bar */}
                {autoHoldProgress > 0 && !isAutoBetActive && (
                  <div
                    className="absolute inset-0 bg-white/30 pointer-events-none transition-all"
                    style={{ width: `${autoHoldProgress}%` }}
                  />
                )}

                {isAutoBetActive ? (
                  <>
                    <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span>STOP</span>
                  </>
                ) : isSpinning ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span>SPINNING</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span>SPIN ₹{betAmount}</span>
                  </>
                )}
              </button>

              {autoHoldProgress > 0 && !isAutoBetActive && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap">
                  Auto ({autoHoldProgress}%)
                </div>
              )}
            </div>

            {/* 2. HALF CASH OUT BUTTON */}
            <button
              disabled={!isActive || halfCashedOut || isSpinning || totalMultiplier <= 0}
              onClick={handleHalfCashout}
              className={`btn-half-cashout px-2.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-sm uppercase tracking-wider shadow-lg transition-all flex flex-col items-center justify-center ${
                isActive && !halfCashedOut && totalMultiplier > 0
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-black shadow-sky-500/30 hover:scale-105 active:scale-95'
                  : 'bg-dark-800 text-gray-500 border border-dark-700 cursor-not-allowed opacity-50'
              }`}
              title="Lock 50% payout now and continue playing with remaining 50%!"
            >
              <div className="flex items-center gap-1">
                <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>1/2 CASH</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono font-black">
                {isActive && !halfCashedOut && totalMultiplier > 0 ? `₹${halfCashoutValue.toLocaleString('en-IN')}` : '₹0'}
              </span>
            </button>

            {/* 3. CASH OUT BUTTON */}
            <button
              disabled={!isActive || isSpinning || totalMultiplier <= 0}
              onClick={handleFullCashout}
              className={`btn-cashout flex-1 sm:flex-initial min-w-[90px] sm:min-w-[150px] px-3 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all flex flex-col items-center justify-center ${
                isActive && totalMultiplier > 0
                  ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 hover:from-emerald-400 hover:to-green-300 text-black shadow-emerald-500/30 hover:scale-105 active:scale-95 animate-pulse'
                  : 'bg-dark-800 text-gray-500 border border-dark-700 cursor-not-allowed opacity-50'
              }`}
              title="Collect current potential payout and end the round."
            >
              <span>CASH OUT</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black">
                {isActive && totalMultiplier > 0 ? `₹${activePotential.toLocaleString('en-IN')}` : '₹0'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── RULES MODAL (ZERO EMOJIS, ACTUAL IMAGES) ───────────────────────── */}
      {showRulesModal && (
        <div className="paytable-modal absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRulesModal(false)}
              className="btn-close-paytable absolute top-4 right-4 p-1.5 rounded-lg bg-dark-800 text-gray-400 hover:text-white transition"
              title="Close Rules"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base sm:text-lg font-cinzel font-black text-white">
                TREASURE SPIRAL 2D RULES & PROBABILITIES
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1">
                <div className="font-bold text-amber-300 uppercase">One Spin Click = One Bet:</div>
                <p className="text-[11px] text-gray-300">
                  Each valid spin click deducts exactly one bet, generates one animal symbol on the server, updates the liquid indicator clockwise, and returns the updated multiplier state. Before the first spin, multiplier starts at 0.00x.
                </p>
              </div>

              <div className="p-3 bg-dark-950 border border-amber-500/30 rounded-xl space-y-1.5">
                <div className="font-bold text-amber-300">Configured Animal Symbols & Rules:</div>
                <div className="space-y-2 text-[11px] text-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/assets/games/spiral/lion.png" alt="Lion" className="w-6 h-6 object-contain" />
                      <span><strong>LION:</strong> Advance Outer Circle liquid clockwise by 1</span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold">12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/assets/games/spiral/elephant.png" alt="Elephant" className="w-6 h-6 object-contain" />
                      <span><strong>ELEPHANT:</strong> Advance Middle Circle liquid clockwise by 1</span>
                    </div>
                    <span className="font-mono text-sky-400 font-bold">12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/assets/games/spiral/dog.png" alt="Dog" className="w-6 h-6 object-contain" />
                      <span><strong>DOG:</strong> Advance Inner Circle liquid clockwise by 1</span>
                    </div>
                    <span className="font-mono text-yellow-400 font-bold">11%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/assets/games/spiral/goat.png" alt="Goat" className="w-6 h-6 object-contain" />
                      <span><strong>GOAT:</strong> Neutral roll (no circle movement)</span>
                    </div>
                    <span className="font-mono text-gray-400 font-bold">33%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/assets/games/spiral/skull.png" alt="Skull" className="w-6 h-6 object-contain" />
                      <span><strong>ANIMAL SKULL:</strong> Move all 3 liquid lines backward by 1</span>
                    </div>
                    <span className="font-mono text-rose-400 font-bold">32%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-rose-500/40 rounded-xl space-y-1">
                <div className="font-bold text-rose-400 uppercase">Animal Skull Reset Rule:</div>
                <p className="text-[11px] text-gray-300">
                  When the Animal Skull appears, all three circles move backward by 1 section (never below Section 1). If <strong>ANY ONE</strong> of the three circles is at Section 1, the Total Multiplier resets to <strong>0.00x</strong>!
                </p>
              </div>

              <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-2">
                <div className="font-bold text-amber-300">Concentric Ring Sector Multipliers (Clockwise):</div>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-amber-400 font-bold">Outer Circle (8 Sections):</span>
                    <div className="text-gray-300 font-mono">3.9x, 12.5x, 28x, 52x, 85x, 133x, 200x, BONUS (700x)</div>
                  </div>
                  <div>
                    <span className="text-sky-400 font-bold">Middle Circle (6 Sections):</span>
                    <div className="text-gray-300 font-mono">2.5x, 7.7x, 16x, 27x, 44x, +20.5x</div>
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold">Inner Circle (4 Sections):</span>
                    <div className="text-gray-300 font-mono">1.55x, 4.85x, 10x, +7x</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasureSpiral2D;

