import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas3DViewport } from '../framework3d/Canvas3DViewport';
import { Scene3DManager } from '../framework3d/Scene3DManager';
import { CameraManager } from '../framework3d/CameraManager';
import { LightingManager } from '../framework3d/LightingManager';
import { ParticleSystem } from '../framework3d/ParticleSystem';
import { apiClient } from '../../../api/client';
import {
  getDemoToken,
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
  Flame,
  Droplets,
  Mountain,
  Wind,
  Skull,
  Play,
  CheckCircle2,
  RefreshCw,
  Coins,
  ShieldCheck,
} from 'lucide-react';

export type ElementType = 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'SKULL';

export interface VortexLevels {
  fire: number;
  water: number;
  earth: number;
}

export interface RecentRoundResult {
  id: string;
  element: ElementType;
  multiplier: number;
  status: 'WON' | 'CRASHED' | 'ACTIVE';
}

export const FIRE_TIERS = [3, 5, 9, 16, 28, 45, 70];
export const WATER_TIERS = [1.5, 2.2, 3.5, 5];
export const EARTH_TIERS = [2, 3.5, 6, 10, 16, 25];

export const TreasureVortex3D: React.FC = () => {
  // Wallet & Sound
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Game Lifecycle States: 'IDLE' -> 'READY' -> 'FLYING' -> 'WON' | 'CRASHED'
  const [gameState, setGameState] = useState<'IDLE' | 'READY' | 'FLYING' | 'WON' | 'CRASHED'>('IDLE');
  const [roundId, setRoundId] = useState<string | null>(null);
  const [crashPoint, setCrashPoint] = useState<number>(2.0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [lastCrashMultiplier, setLastCrashMultiplier] = useState<number>(2.34);
  const [recentResults, setRecentResults] = useState<RecentRoundResult[]>([
    { id: '1', element: 'FIRE', multiplier: 3.12, status: 'WON' },
    { id: '2', element: 'WATER', multiplier: 1.56, status: 'WON' },
    { id: '3', element: 'WIND', multiplier: 1.23, status: 'CRASHED' },
    { id: '4', element: 'SKULL', multiplier: 2.76, status: 'WON' },
    { id: '5', element: 'EARTH', multiplier: 4.87, status: 'WON' },
  ]);

  // Elemental Visual Progress
  const [levels, setLevels] = useState<VortexLevels>({ fire: 0, water: 0, earth: 0 });
  const [activeSurgeElement, setActiveSurgeElement] = useState<ElementType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [lastPayout, setLastPayout] = useState<number | null>(null);

  // Animation & Loop Refs
  const animFrameRef = useRef<number | null>(null);
  const flightStartTimeRef = useRef<number>(0);
  const serverCrashPointRef = useRef<number>(2.0);
  const currentMultiplierRef = useRef<number>(1.0);
  const isCollectingRef = useRef<boolean>(false);

  // 3D Scene Refs
  const sceneRef = useRef<Scene3DManager | null>(null);
  const cameraRef = useRef<CameraManager | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const vortexCoreRef = useRef<THREE.Mesh | null>(null);
  const outerRingRef = useRef<THREE.Mesh | null>(null);
  const innerRingRef = useRef<THREE.Mesh | null>(null);
  const accretionRingRef = useRef<THREE.Mesh | null>(null);

  // Sync balance with global events
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
      const res = await apiClient.get('/api/vortex/history');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const mapped: RecentRoundResult[] = res.data.data.slice(0, 8).map((r: any) => ({
          id: r.id,
          element: r.element || 'FIRE',
          multiplier: r.crashPoint || r.multiplier || 1.0,
          status: r.status === 'WON' ? 'WON' : 'CRASHED',
        }));
        setRecentResults(mapped);
        if (mapped[0]) {
          setLastCrashMultiplier(mapped[0].multiplier);
        }
      }
    } catch {}
  };

  // ─── 3D SCENE SETUP ──────────────────────────────────────────────────────
  const handleInit = (sceneMgr: Scene3DManager, camMgr: CameraManager) => {
    sceneRef.current = sceneMgr;
    cameraRef.current = camMgr;

    camMgr.setPosition(new THREE.Vector3(0, 0, 7.5), true);
    camMgr.setLookAt(new THREE.Vector3(0, 0, 0), true);

    const scene = sceneMgr.scene;

    // Premium Cosmic Nebula Lighting
    new LightingManager(scene, {
      ambientColor: 0x111827,
      ambientIntensity: 1.8,
      mainColor: 0x38bdf8,
      mainIntensity: 2.5,
      mainPos: new THREE.Vector3(0, 6, 8),
      rimColor: 0xa855f7,
      rimIntensity: 2.2,
      rimPos: new THREE.Vector3(0, -6, -4),
    });

    particlesRef.current = new ParticleSystem(scene, 500);

    // 1. Central Vortex Singularity Core
    const coreGeom = new THREE.SphereGeometry(1.0, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.85,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.position.set(0, 0, -0.3);
    scene.add(coreMesh);
    vortexCoreRef.current = coreMesh;

    // 2. Concentric Accretion Torus Rings (Cosmic Vortex Spiral)
    const ring1Geom = new THREE.TorusGeometry(1.6, 0.08, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.9,
    });
    const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
    scene.add(ring1);
    innerRingRef.current = ring1;

    const ring2Geom = new THREE.TorusGeometry(2.3, 0.06, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.8,
    });
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
    scene.add(ring2);
    outerRingRef.current = ring2;

    const ring3Geom = new THREE.TorusGeometry(2.9, 0.04, 16, 100);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.7,
    });
    const ring3 = new THREE.Mesh(ring3Geom, ring3Mat);
    scene.add(ring3);
    accretionRingRef.current = ring3;
  };

  const handleUpdate = (delta: number) => {
    if (particlesRef.current) {
      particlesRef.current.update(delta);
    }

    const isSpinningFast = gameState === 'FLYING';
    const baseSpeed = isSpinningFast ? 6.0 : gameState === 'READY' ? 2.5 : 1.0;

    if (vortexCoreRef.current) {
      vortexCoreRef.current.rotation.y += delta * (baseSpeed * 0.8);
      vortexCoreRef.current.rotation.z += delta * (baseSpeed * 0.5);
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * (baseSpeed * 1.2);
      innerRingRef.current.rotation.x = Math.sin(Date.now() * 0.003) * 0.2;
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * (baseSpeed * 0.9);
      outerRingRef.current.rotation.y = Math.cos(Date.now() * 0.002) * 0.25;
    }

    if (accretionRingRef.current) {
      accretionRingRef.current.rotation.z -= delta * (baseSpeed * 0.6);
    }
  };

  // ─── TRIGGER 3D ELEMENTAL SURGE PARTICLES ─────────────────────────────────
  const triggerElementalSurge = (element: ElementType) => {
    setActiveSurgeElement(element);
    if (!particlesRef.current || !vortexCoreRef.current) return;

    const coreMat = vortexCoreRef.current.material as THREE.MeshStandardMaterial;

    switch (element) {
      case 'FIRE':
        coreMat.color.setHex(0xf97316);
        coreMat.emissive.setHex(0xea580c);
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 260, new THREE.Color(1.0, 0.4, 0.0), 8);
        break;

      case 'WATER':
        coreMat.color.setHex(0x06b6d4);
        coreMat.emissive.setHex(0x0284c7);
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 220, new THREE.Color(0.2, 0.8, 1.0), 7);
        break;

      case 'EARTH':
        coreMat.color.setHex(0x10b981);
        coreMat.emissive.setHex(0x059669);
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 240, new THREE.Color(0.2, 0.9, 0.4), 7);
        if (cameraRef.current) cameraRef.current.triggerShake(0.2, 3);
        break;

      case 'WIND':
        coreMat.color.setHex(0xa855f7);
        coreMat.emissive.setHex(0x7c3aed);
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 280, new THREE.Color(0.8, 0.5, 1.0), 10);
        break;

      case 'SKULL':
        coreMat.color.setHex(0x475569);
        coreMat.emissive.setHex(0xef4444);
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 200, new THREE.Color(0.5, 0.1, 0.1), 5);
        if (cameraRef.current) cameraRef.current.triggerShake(0.35, 6);
        break;
    }
  };

  // ─── 1. BUTTON: START (READY ONLY - NO BET DEDUCTION) ─────────────────────
  const handleStartReady = async () => {
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
      const res = await apiClient.post('/api/vortex/start', {
        betAmount,
        demoToken: getDemoToken(),
      });

      if (res.data?.success) {
        setGameState('READY');
        setStatusMessage('VORTEX READY! Click SPIN VORTEX to launch.');
        soundManager.play('slotStop');
      }
    } catch (err: any) {
      console.error('START ready error:', err);
      setStatusMessage(err.response?.data?.message || err.message || 'Error preparing vortex');
      soundManager.play('loss');
    }
  };

  // ─── 2. BUTTON: SPIN VORTEX (DEDUCTS BET ONCE & LAUNCHES FLIGHT) ──────────
  const handleSpinVortex = async () => {
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
      const res = await apiClient.post('/api/vortex/spin', {
        betAmount,
        demoToken: getDemoToken(),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to spin vortex');
      }

      const data = res.data.data;
      const targetCrash = parseFloat(data.crashPoint || '2.00');

      setRoundId(data.roundId);
      setCrashPoint(targetCrash);
      serverCrashPointRef.current = targetCrash;
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setGameState('FLYING');
      setStatusMessage('Vortex spinning! Multiplier rising...');

      // Start Real-Time 60FPS Multiplier Animation Curve
      flightStartTimeRef.current = performance.now();
      currentMultiplierRef.current = 1.0;
      setCurrentMultiplier(1.0);
      setLevels({ fire: 0, water: 0, earth: 0 });

      startMultiplierFlight(targetCrash, data.roundId);
    } catch (err: any) {
      console.error('SPIN VORTEX error:', err);
      setStatusMessage(err.response?.data?.message || err.message || 'Spin failed');
      soundManager.play('loss');
      setGameState('IDLE');
    }
  };

  // ─── REAL-TIME MULTIPLIER FLIGHT LOOP ────────────────────────────────────
  const startMultiplierFlight = (targetCrash: number, rId: string) => {
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

      // Trigger Elemental Surges as Multiplier Climbs
      const surgeStep = Math.floor(calculatedMult);
      if (surgeStep > lastElementIndex && calculatedMult < targetCrash) {
        lastElementIndex = surgeStep;
        const elem = elementSequence[surgeStep % elementSequence.length];
        triggerElementalSurge(elem);

        // Update progressive meters
        setLevels((prev) => {
          const next = { ...prev };
          if (elem === 'FIRE') next.fire = Math.min(FIRE_TIERS.length, next.fire + 1);
          if (elem === 'WATER') next.water = Math.min(WATER_TIERS.length, next.water + 1);
          if (elem === 'EARTH') next.earth = Math.min(EARTH_TIERS.length, next.earth + 1);
          return next;
        });
      }

      // Check if server crash point reached!
      if (calculatedMult >= targetCrash) {
        handleCrashOccurred(targetCrash, rId);
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateFlight);
    };

    animFrameRef.current = requestAnimationFrame(updateFlight);
  };

  // ─── CRASH HANDLER ────────────────────────────────────────────────────────
  const handleCrashOccurred = async (crashVal: number, rId: string) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    currentMultiplierRef.current = crashVal;
    setCurrentMultiplier(crashVal);
    setLastCrashMultiplier(crashVal);
    setGameState('CRASHED');
    setStatusMessage(`CRASHED AT ${crashVal.toFixed(2)}x!`);

    soundManager.play('loss');
    triggerElementalSurge('SKULL');

    // Notify backend
    try {
      await apiClient.post('/api/vortex/crash', {
        roundId: rId,
        demoToken: getDemoToken(),
        crashPoint: crashVal,
      });
    } catch {}

    // Add to recent results
    setRecentResults((prev) => [
      { id: Date.now().toString(), element: 'SKULL', multiplier: crashVal, status: 'CRASHED' },
      ...prev.slice(0, 7),
    ]);
  };

  // ─── 3. BUTTON: COLLECT (CASH OUT BEFORE CRASH) ───────────────────────────
  const handleCollect = async () => {
    if (gameState !== 'FLYING' || !roundId || isCollectingRef.current) return;

    isCollectingRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const claimedMult = currentMultiplierRef.current;
    soundManager.play('win');

    try {
      const res = await apiClient.post('/api/vortex/collect', {
        roundId,
        demoToken: getDemoToken(),
        multiplier: claimedMult,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Collect failed');
      }

      const data = res.data.data;
      setGameState('WON');
      setLastPayout(data.payout);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setStatusMessage(`COLLECTED ₹${data.payout.toLocaleString('en-IN')} AT ${data.multiplier}x!`);

      // Celebrate with golden particle burst
      if (particlesRef.current) {
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 300, new THREE.Color(1.0, 0.84, 0.0), 9);
      }

      // Add to recent results
      setRecentResults((prev) => [
        { id: Date.now().toString(), element: activeSurgeElement || 'FIRE', multiplier: claimedMult, status: 'WON' },
        ...prev.slice(0, 7),
      ]);
    } catch (err: any) {
      console.error('Collect error:', err);
      setStatusMessage(err.response?.data?.message || err.message || 'Collection failed');
      soundManager.play('loss');
      setGameState('CRASHED');
    }
  };

  // Bet Adjustment
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

  const toggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleResetBalance = () => {
    soundManager.play('buttonClick');
    const newBal = resetDemoBalance();
    setBalance(newBal);
  };

  const potentialPayout = Math.floor(betAmount * currentMultiplier);

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 bg-dark-950 text-white select-none overflow-hidden font-sans">
      {/* ─── 3D VIEWPORT CANVAS ────────────────────────────────────────────── */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <Canvas3DViewport onInit={handleInit} onUpdate={handleUpdate} className="absolute inset-0 w-full h-full">
          {/* ── 1. TOP HEADER ──────────────────────────────────────────────── */}
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-6 sm:right-6 flex justify-between items-center pointer-events-auto z-30 gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-xl">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                <div className="flex flex-col">
                  <span className="font-cinzel text-xs sm:text-sm font-black tracking-wider text-cyan-300 drop-shadow">
                    TREASURE VORTEX
                  </span>
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest -mt-0.5">
                    3D ELEMENTAL CRASH GAME
                  </span>
                </div>
              </div>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-2 bg-dark-900/90 hover:bg-dark-800 backdrop-blur-md border border-dark-700 hover:border-cyan-500/50 rounded-xl text-gray-300 hover:text-white transition shadow-md"
                title={isMuted ? 'Sound OFF' : 'Sound ON'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>

            {/* Right: Demo Balance & Rules */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-900/90 backdrop-blur-md border border-amber-500/40 rounded-xl shadow-lg">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] text-gray-400 uppercase font-bold hidden sm:inline">DEMO BALANCE:</span>
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
                className="p-2 bg-dark-900/90 hover:bg-dark-800 backdrop-blur-md border border-dark-700 hover:border-cyan-500/50 rounded-xl text-gray-300 hover:text-white transition shadow-md"
                title="Game Rules"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* ── 2. FLOATING RIGHT HUD CARDS (EXACT INFOGRAPHIC LAYOUT) ────────── */}
          <div className="absolute top-16 right-3 sm:top-20 sm:right-6 flex flex-col gap-2.5 z-25 pointer-events-auto max-w-[210px] sm:max-w-[240px] w-full">
            {/* CURRENT MULTIPLIER CARD */}
            <div className="bg-dark-950/85 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-3 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
              <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">
                CURRENT MULTIPLIER
              </span>
              <div
                className={`font-black font-cinzel text-3xl sm:text-4xl tracking-tight transition-all drop-shadow-[0_0_20px_rgba(56,189,248,0.5)] ${
                  gameState === 'CRASHED'
                    ? 'text-rose-500 animate-pulse'
                    : gameState === 'WON'
                    ? 'text-emerald-400'
                    : currentMultiplier >= 5
                    ? 'text-amber-300 animate-pulse'
                    : 'text-amber-400'
                }`}
              >
                {currentMultiplier.toFixed(2)}x
              </div>
            </div>

            {/* LAST CRASH CARD */}
            <div className="bg-dark-950/85 backdrop-blur-md border border-dark-700 rounded-xl p-2.5 shadow-lg flex items-center justify-between px-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                LAST CRASH
              </span>
              <span className="font-mono font-black text-sm text-rose-400">
                {lastCrashMultiplier.toFixed(2)}x
              </span>
            </div>

            {/* RECENT RESULTS CARD */}
            <div className="bg-dark-950/85 backdrop-blur-md border border-dark-700 rounded-xl p-2.5 shadow-lg flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                RECENT RESULTS
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {recentResults.slice(0, 4).map((res, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 bg-dark-900/90 rounded border border-dark-800 text-[10px] font-mono font-bold"
                  >
                    <span>
                      {res.element === 'FIRE' && '🔥'}
                      {res.element === 'WATER' && '💧'}
                      {res.element === 'EARTH' && '🌍'}
                      {res.element === 'WIND' && '🌪️'}
                      {res.element === 'SKULL' && '💀'}
                    </span>
                    <span className={res.status === 'WON' ? 'text-cyan-300' : 'text-gray-400'}>
                      {res.multiplier.toFixed(2)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. 5 ELEMENTAL ORBS SURROUNDING 3D VORTEX ──────────────────── */}
          <div className="vortex-stage absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            {/* Center Status Banner */}
            <div className="flex flex-col items-center justify-center text-center">
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-2xl border transition-all ${
                  gameState === 'CRASHED'
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200 animate-bounce'
                    : gameState === 'WON'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 animate-bounce'
                    : gameState === 'FLYING'
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
                    : gameState === 'READY'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-dark-900/80 border-dark-700 text-gray-400'
                }`}
              >
                {statusMessage}
              </div>

              {lastPayout !== null && gameState === 'WON' && (
                <div className="mt-2 text-base sm:text-xl font-extrabold text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                  +₹{lastPayout.toLocaleString('en-IN')} WON!
                </div>
              )}
            </div>

            {/* 🔥 TOP: FIRE (Flame) */}
            <div className="absolute top-14 sm:top-18 flex flex-col items-center pointer-events-auto">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  activeSurgeElement === 'FIRE' || levels.fire > 0
                    ? 'bg-gradient-to-t from-orange-600 to-amber-500 text-white shadow-[0_0_25px_#f97316] scale-110'
                    : 'bg-dark-900/80 border border-orange-500/40 text-orange-400'
                }`}
              >
                <Flame className="w-6 h-6 fill-current animate-pulse" />
              </div>
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">
                FIRE ({levels.fire}/7)
              </span>
            </div>

            {/* 🌪️ TOP RIGHT: WIND (Tornado) */}
            <div className="absolute top-24 right-16 sm:top-28 sm:right-28 flex flex-col items-center pointer-events-auto">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  activeSurgeElement === 'WIND'
                    ? 'bg-gradient-to-t from-purple-600 to-indigo-400 text-white shadow-[0_0_25px_#a855f7] scale-110'
                    : 'bg-dark-900/80 border border-purple-500/40 text-purple-400'
                }`}
              >
                <Wind className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest mt-1">
                WIND
              </span>
            </div>

            {/* 💀 BOTTOM RIGHT: SKULL */}
            <div className="absolute bottom-20 right-16 sm:bottom-24 sm:right-28 flex flex-col items-center pointer-events-auto">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  activeSurgeElement === 'SKULL' || gameState === 'CRASHED'
                    ? 'bg-gradient-to-t from-rose-700 to-red-500 text-white shadow-[0_0_25px_#ef4444] scale-110'
                    : 'bg-dark-900/80 border border-rose-500/40 text-rose-400'
                }`}
              >
                <Skull className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1">
                SKULL
              </span>
            </div>

            {/* 🌍 BOTTOM LEFT: EARTH (Mountain) */}
            <div className="absolute bottom-20 left-16 sm:bottom-24 sm:left-28 flex flex-col items-center pointer-events-auto">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  activeSurgeElement === 'EARTH' || levels.earth > 0
                    ? 'bg-gradient-to-t from-emerald-600 to-green-400 text-white shadow-[0_0_25px_#10b981] scale-110'
                    : 'bg-dark-900/80 border border-emerald-500/40 text-emerald-400'
                }`}
              >
                <Mountain className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                EARTH ({levels.earth}/6)
              </span>
            </div>

            {/* 💧 MIDDLE LEFT: WATER (Droplet) */}
            <div className="absolute top-1/2 -translate-y-1/2 left-6 sm:left-14 flex flex-col items-center pointer-events-auto">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                  activeSurgeElement === 'WATER' || levels.water > 0
                    ? 'bg-gradient-to-t from-cyan-600 to-sky-400 text-white shadow-[0_0_25px_#06b6d4] scale-110'
                    : 'bg-dark-900/80 border border-cyan-500/40 text-cyan-400'
                }`}
              >
                <Droplets className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">
                WATER ({levels.water}/4)
              </span>
            </div>
          </div>
        </Canvas3DViewport>
      </div>

      {/* ── 4. BOTTOM CONTROL DOCK (METALLIC CASINO PANEL) ─────────────────── */}
      <div className="bg-dark-900/95 border-t border-dark-800 px-3 sm:px-6 py-3 z-30 shadow-2xl backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* LEFT: BET CONTROLS */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-wider">
              BET AMOUNT
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                disabled={gameState === 'FLYING' || betAmount <= 10}
                onClick={() => handleBetChange(-10)}
                className="btn-bet-minus p-2 bg-dark-950 border border-dark-700 hover:border-cyan-500/50 rounded-xl text-gray-300 hover:text-white disabled:opacity-40 transition"
                title="-₹10"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex items-center bg-dark-950 border border-dark-700 px-3 py-1.5 rounded-xl gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <input
                  type="number"
                  disabled={gameState === 'FLYING'}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(10, Math.min(5000, parseInt(e.target.value) || 10)))}
                  className="w-16 sm:w-20 bg-transparent text-amber-300 text-center font-mono font-black text-sm outline-none"
                />
              </div>

              <button
                disabled={gameState === 'FLYING' || betAmount >= 5000}
                onClick={() => handleBetChange(10)}
                className="btn-bet-plus p-2 bg-dark-950 border border-dark-700 hover:border-cyan-500/50 rounded-xl text-gray-300 hover:text-white disabled:opacity-40 transition"
                title="+₹10"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Quick Chips */}
              <div className="hidden md:flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-dark-700 ml-1">
                {[10, 50, 100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    disabled={gameState === 'FLYING'}
                    onClick={() => handleChipSelect(amt)}
                    className={`btn-chip-${amt} px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      betAmount === amt
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: START & SPIN VORTEX BUTTONS */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* 1. START BUTTON: Prepares game, zero bet deduction, sets status to READY */}
            <button
              disabled={gameState === 'FLYING' || balance < betAmount}
              onClick={handleStartReady}
              className={`btn-start px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 ${
                gameState === 'READY'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-emerald-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 hover:scale-105 active:scale-95'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Prepares the game. No wallet change. Sets status to READY."
            >
              {gameState === 'READY' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>READY</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>START</span>
                </>
              )}
            </button>

            {/* 2. SPIN VORTEX: Centerpiece large circular button, deducts bet once, launches round */}
            <button
              disabled={gameState === 'FLYING' || balance < betAmount}
              onClick={handleSpinVortex}
              className={`btn-spin relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center p-1 border-2 transition-all ${
                gameState === 'FLYING'
                  ? 'border-cyan-400 bg-dark-900 text-cyan-400 shadow-[0_0_20px_#06b6d4] animate-pulse'
                  : 'border-cyan-400 bg-gradient-to-b from-cyan-600 via-sky-600 to-blue-700 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Deducts bet once. Starts the round. Multiplier rises from 1.00x."
            >
              <Sparkles className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-center leading-tight">
                SPIN<br />VORTEX
              </span>
            </button>
          </div>

          {/* RIGHT: COLLECT BUTTON */}
          <div className="flex items-center">
            {/* 3. COLLECT: Pays out (bet * multiplier), credits demo balance, ends round */}
            <button
              disabled={gameState !== 'FLYING'}
              onClick={handleCollect}
              className={`btn-collect min-w-[130px] sm:min-w-[160px] px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all flex flex-col items-center justify-center ${
                gameState === 'FLYING'
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black shadow-amber-400/40 hover:scale-105 active:scale-95 animate-pulse'
                  : 'bg-dark-800 text-gray-500 border border-dark-700 cursor-not-allowed opacity-50'
              }`}
              title="Collect payout before crash!"
            >
              <span>COLLECT</span>
              <span className="text-[11px] font-mono font-black">
                {gameState === 'FLYING' ? `₹${potentialPayout.toLocaleString('en-IN')}` : '₹0'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. GAME RULES MODAL (PRD SECTION 5 ELEMENT PROGRESSION) ───────── */}
      {showRulesModal && (
        <div className="paytable-modal absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRulesModal(false)}
              className="btn-close-paytable absolute top-4 right-4 p-1.5 rounded-lg bg-dark-800 text-gray-400 hover:text-white transition"
              title="Close Rules"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base sm:text-lg font-cinzel font-black text-white">
                TREASURE VORTEX GAME RULES
              </h3>
            </div>

            {/* Rules Content */}
            <div className="space-y-3 text-xs">
              {/* Game Flow */}
              <div className="p-3 bg-dark-950 border border-dark-800 rounded-xl space-y-1">
                <div className="font-bold text-cyan-300 uppercase">Game Flow:</div>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px]">
                  <li>Player sets bet amount (₹10 – ₹5,000).</li>
                  <li>Click <strong>START</strong> (does not deduct bet; prepares game).</li>
                  <li>Click <strong>SPIN VORTEX</strong> (deducts bet once and starts round).</li>
                  <li>Multiplier increases in real-time from 1.00x.</li>
                  <li>Click <strong>COLLECT</strong> before crash to win payout.</li>
                  <li>If crash occurs, round ends and bet is lost.</li>
                </ol>
              </div>

              {/* Elements & Multiplier */}
              <div className="p-3 bg-dark-950 border border-orange-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-orange-400">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>FIRE Levels (Max 7):</span>
                </div>
                <div className="font-mono text-gray-300 text-[11px]">
                  1: 3x • 2: 5x • 3: 9x • 4: 16x • 5: 28x • 6: 45x • 7: 70x
                </div>
                <div className="text-[10px] text-amber-300">
                  FIRE BONUS: Reaching level 7 triggers bonus surge (100x – 500x).
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-cyan-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                  <Droplets className="w-4 h-4 fill-current" />
                  <span>WATER Levels (Max 4):</span>
                </div>
                <div className="font-mono text-gray-300 text-[11px]">
                  1: 1.5x • 2: 2.2x • 3: 3.5x • 4: 5x
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-emerald-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Mountain className="w-4 h-4 fill-current" />
                  <span>EARTH Levels (Max 6):</span>
                </div>
                <div className="font-mono text-gray-300 text-[11px]">
                  1: 2x • 2: 3.5x • 3: 6x • 4: 10x • 5: 16x • 6: 25x
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-purple-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-400">
                  <Wind className="w-4 h-4" />
                  <span>WIND (Tornado):</span>
                </div>
                <div className="text-gray-300 text-[11px]">
                  Visual speed boost effect only. Does not change levels or multiplier.
                </div>
              </div>

              <div className="p-3 bg-dark-950 border border-rose-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <Skull className="w-4 h-4" />
                  <span>SKULL:</span>
                </div>
                <div className="text-gray-300 text-[11px]">
                  Reduces the highest active element level by 1. Priority: FIRE → EARTH → WATER. If all are zero, no change.
                </div>
              </div>

              <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-gray-300 text-[11px]">
                Elemental visuals accompany the round. The crash point is server-authoritative and determined by cryptographically secure pseudorandom numbers.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasureVortex3D;
