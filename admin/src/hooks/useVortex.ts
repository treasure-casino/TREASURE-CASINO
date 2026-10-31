/**
 * TREASURE VORTEX - Game Hook
 * Encapsulates game state, flight loop, elemental progression, and API interactions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { vortexApi } from '../services/vortexApi';
import {
  ElementType,
  VortexLevels,
  VortexGameStatus,
  VortexRoundHistoryItem,
  FIRE_TIERS,
  WATER_TIERS,
  EARTH_TIERS,
} from '../types/vortex';
import {
  getDemoBalance,
  setLocalDemoBalance,
  resetDemoBalance,
} from '../utils/demoWallet';
import { soundManager } from '../utils/soundManager';

export function useVortex() {
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(100);
  const [gameState, setGameState] = useState<VortexGameStatus>('IDLE');
  const [roundId, setRoundId] = useState<string | null>(null);
  const [crashPoint, setCrashPoint] = useState<number>(2.0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [lastCrashMultiplier, setLastCrashMultiplier] = useState<number>(2.34);
  const [recentResults, setRecentResults] = useState<VortexRoundHistoryItem[]>([]);
  const [levels, setLevels] = useState<VortexLevels>({ fire: 0, water: 0, earth: 0 });
  const [activeSurgeElement, setActiveSurgeElement] = useState<ElementType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start');
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  const animFrameRef = useRef<number | null>(null);
  const flightStartTimeRef = useRef<number>(0);
  const currentMultiplierRef = useRef<number>(1.0);
  const isCollectingRef = useRef<boolean>(false);

  // Sync wallet balance
  useEffect(() => {
    const handleBalance = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setBalance(e.detail.balance);
      } else {
        setBalance(getDemoBalance());
      }
    };
    const handleSound = (e: any) => {
      setIsMuted(e.detail?.isMuted ?? soundManager.getMuted());
    };

    window.addEventListener('demo_balance_updated', handleBalance);
    window.addEventListener('sound_settings_changed', handleSound);

    // Initial history fetch
    loadHistory();

    return () => {
      window.removeEventListener('demo_balance_updated', handleBalance);
      window.removeEventListener('sound_settings_changed', handleSound);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const loadHistory = async () => {
    try {
      const items = await vortexApi.getHistory();
      if (items && items.length > 0) {
        setRecentResults(items.slice(0, 8));
        setLastCrashMultiplier(items[0].crashPoint || items[0].multiplier || 2.0);
      }
    } catch {}
  };

  /**
   * 1. START: Prepares game, sets status to READY, does not deduct bet
   */
  const handleStartReady = useCallback(async () => {
    if (gameState === 'FLYING') return;
    if (balance < betAmount) {
      setStatusMessage('Insufficient balance');
      soundManager.play('loss');
      return;
    }

    soundManager.play('buttonClick');
    setLastPayout(null);
    setCurrentMultiplier(1.0);
    currentMultiplierRef.current = 1.0;

    try {
      const data = await vortexApi.startRound(betAmount);
      setGameState('READY');
      setStatusMessage(data.message || 'VORTEX READY! Click SPIN VORTEX to launch.');
      soundManager.play('slotStop');
    } catch (err: any) {
      setStatusMessage(err.message || 'Error preparing vortex');
      soundManager.play('loss');
    }
  }, [gameState, balance, betAmount]);

  /**
   * 2. SPIN VORTEX: Deducts bet once, starts round, rises multiplier from 1.00x
   */
  const handleSpinVortex = useCallback(async () => {
    if (gameState === 'FLYING') return;
    if (balance < betAmount) {
      setStatusMessage('Insufficient balance');
      soundManager.play('loss');
      return;
    }

    soundManager.play('slotSpin');
    setLastPayout(null);
    isCollectingRef.current = false;

    try {
      const data = await vortexApi.spinVortex(betAmount);
      const targetCrash = parseFloat(data.crashPoint.toString());

      setRoundId(data.roundId);
      setCrashPoint(targetCrash);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setGameState('FLYING');
      setStatusMessage('Vortex spinning! Multiplier rising...');

      flightStartTimeRef.current = performance.now();
      currentMultiplierRef.current = 1.0;
      setCurrentMultiplier(1.0);
      setLevels({ fire: 0, water: 0, earth: 0 });

      startFlightLoop(targetCrash, data.roundId);
    } catch (err: any) {
      setStatusMessage(err.message || 'Spin failed');
      soundManager.play('loss');
      setGameState('IDLE');
    }
  }, [gameState, balance, betAmount]);

  /**
   * FLIGHT LOOP: Real-time rising multiplier with elemental progression
   */
  const startFlightLoop = (targetCrash: number, rId: string) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    let lastElementIndex = -1;
    const elementSequence: ElementType[] = ['WATER', 'EARTH', 'FIRE', 'WIND'];

    const updateFlight = (timestamp: number) => {
      if (isCollectingRef.current) return;

      const elapsedMs = timestamp - flightStartTimeRef.current;
      const elapsedSec = elapsedMs / 1000;

      // Realistic Exponential Crash Curve: mult = e^(0.065 * t)
      const calculatedMult = +(Math.pow(Math.E, 0.065 * elapsedSec)).toFixed(2);
      currentMultiplierRef.current = calculatedMult;
      setCurrentMultiplier(calculatedMult);

      // Trigger Elemental surges as multiplier climbs
      const surgeStep = Math.floor(calculatedMult);
      if (surgeStep > lastElementIndex && calculatedMult < targetCrash) {
        lastElementIndex = surgeStep;
        const elem = elementSequence[surgeStep % elementSequence.length];
        setActiveSurgeElement(elem);

        setLevels((prev) => {
          const next = { ...prev };
          if (elem === 'FIRE') next.fire = Math.min(FIRE_TIERS.length, next.fire + 1);
          if (elem === 'WATER') next.water = Math.min(WATER_TIERS.length, next.water + 1);
          if (elem === 'EARTH') next.earth = Math.min(EARTH_TIERS.length, next.earth + 1);
          return next;
        });

        // Record event
        vortexApi.recordEvent(rId, elem, calculatedMult, calculatedMult).catch(() => {});
      }

      // Crash reached!
      if (calculatedMult >= targetCrash) {
        onCrash(targetCrash, rId);
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateFlight);
    };

    animFrameRef.current = requestAnimationFrame(updateFlight);
  };

  /**
   * CRASH OCCURRED
   */
  const onCrash = async (crashVal: number, rId: string) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    currentMultiplierRef.current = crashVal;
    setCurrentMultiplier(crashVal);
    setLastCrashMultiplier(crashVal);
    setGameState('CRASHED');
    setStatusMessage(`CRASHED AT ${crashVal.toFixed(2)}x!`);
    setActiveSurgeElement('SKULL');

    soundManager.play('loss');

    try {
      await vortexApi.notifyCrash(rId, crashVal);
    } catch {}

    setRecentResults((prev) => [
      {
        id: Date.now().toString(),
        element: 'SKULL',
        multiplier: crashVal,
        crashPoint: crashVal,
        bet: betAmount,
        payout: 0,
        status: 'CRASHED',
        result: 'LOST',
      },
      ...prev.slice(0, 7),
    ]);
  };

  /**
   * 3. COLLECT: Pays out (bet * multiplier), credits wallet, ends round
   */
  const handleCollect = useCallback(async () => {
    if (gameState !== 'FLYING' || !roundId || isCollectingRef.current) return;

    isCollectingRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const claimedMult = currentMultiplierRef.current;
    soundManager.play('win');

    try {
      const data = await vortexApi.collectPayout(roundId, claimedMult);
      setGameState('WON');
      setLastPayout(data.payout);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setStatusMessage(`COLLECTED ₹${data.payout.toLocaleString('en-IN')} AT ${data.multiplier}x!`);

      setRecentResults((prev) => [
        {
          id: Date.now().toString(),
          element: activeSurgeElement || 'FIRE',
          multiplier: claimedMult,
          crashPoint: data.crashPoint,
          bet: betAmount,
          payout: data.payout,
          status: 'WON',
          result: 'WON',
        },
        ...prev.slice(0, 7),
      ]);
    } catch (err: any) {
      setStatusMessage(err.message || 'Collection failed');
      soundManager.play('loss');
      setGameState('CRASHED');
    }
  }, [gameState, roundId, activeSurgeElement, betAmount]);

  const handleBetChange = (delta: number) => {
    if (gameState === 'FLYING') return;
    soundManager.play('buttonClick');
    setBetAmount((prev) => Math.min(5000, Math.max(10, prev + delta)));
  };

  const handleChipSelect = (amt: number) => {
    if (gameState === 'FLYING') return;
    soundManager.play('buttonClick');
    setBetAmount(amt);
  };

  const handleResetBalance = () => {
    soundManager.play('buttonClick');
    const newBal = resetDemoBalance();
    setBalance(newBal);
  };

  return {
    balance,
    betAmount,
    setBetAmount,
    gameState,
    roundId,
    crashPoint,
    currentMultiplier,
    lastCrashMultiplier,
    recentResults,
    levels,
    activeSurgeElement,
    statusMessage,
    lastPayout,
    isMuted,
    handleStartReady,
    handleSpinVortex,
    handleCollect,
    handleBetChange,
    handleChipSelect,
    handleResetBalance,
    potentialPayout: Math.floor(betAmount * currentMultiplier),
  };
}

