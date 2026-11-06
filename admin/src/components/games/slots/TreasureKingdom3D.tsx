import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas3DViewport } from '../framework3d/Canvas3DViewport';
import { Scene3DManager } from '../framework3d/Scene3DManager';
import { CameraManager } from '../framework3d/CameraManager';
import { LightingManager } from '../framework3d/LightingManager';
import { ParticleSystem } from '../framework3d/ParticleSystem';
import { apiClient } from '../../../api/client';
import { getDemoToken, getDemoBalance, setLocalDemoBalance } from '../../../utils/demoWallet';
import { soundManager } from '../../../utils/soundManager';
import {
  Crown,
  Sparkles,
  RotateCw,
  Award,
  HelpCircle,
  X,
  Zap,
  Volume2,
  VolumeX,
  History,
  Plus,
  Minus,
} from 'lucide-react';

export interface SymbolDef {
  id: number;
  name: string;
  isWild?: boolean;
  isScatter?: boolean;
  payouts: Record<number, number>;
  color: string;
  glowColor: string;
  icon: string;
  badge: string;
  subtext: string;
}

export const SYMBOLS: SymbolDef[] = [
  {
    id: 0,
    name: 'Wild – Lightning',
    isWild: true,
    payouts: { 5: 150, 4: 40, 3: 15 },
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.75)',
    icon: '⚡',
    badge: 'WILD',
    subtext: 'SUBSTITUTES',
  },
  {
    id: 1,
    name: 'Golden Crown',
    payouts: { 5: 100, 4: 30, 3: 10 },
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.75)',
    icon: '👑',
    badge: 'CROWN',
    subtext: 'TOP PAY',
  },
  {
    id: 2,
    name: 'Treasure Chest',
    payouts: { 5: 60, 4: 20, 3: 8 },
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.75)',
    icon: '📦',
    badge: 'CHEST',
    subtext: 'HIGH PAY',
  },
  {
    id: 3,
    name: 'Diamond',
    payouts: { 5: 40, 4: 15, 3: 6 },
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.75)',
    icon: '💎',
    badge: 'DIAMOND',
    subtext: 'GEM',
  },
  {
    id: 4,
    name: 'Ruby',
    payouts: { 5: 25, 4: 10, 3: 4 },
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.75)',
    icon: '♦️',
    badge: 'RUBY',
    subtext: 'GEM',
  },
  {
    id: 5,
    name: 'Emerald',
    payouts: { 5: 20, 4: 8, 3: 3 },
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.75)',
    icon: '🟢',
    badge: 'EMERALD',
    subtext: 'GEM',
  },
  {
    id: 6,
    name: 'Gold Coin',
    payouts: { 5: 15, 4: 6, 3: 2 },
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.75)',
    icon: '🪙',
    badge: 'COIN',
    subtext: 'GOLD',
  },
  {
    id: 7,
    name: 'Ancient Key',
    payouts: { 5: 10, 4: 4, 3: 1.5 },
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    icon: '🗝️',
    badge: 'KEY',
    subtext: 'RELIC',
  },
  {
    id: 8,
    name: 'Scatter – Treasure Star',
    isScatter: true,
    payouts: { 5: 100, 4: 20, 3: 5 },
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    icon: '🌟',
    badge: 'SCATTER',
    subtext: 'PAYS ANY',
  },
];

export const PAYLINES = [
  { id: 1, name: 'Middle Row', coords: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
  { id: 2, name: 'Top Row', coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 3, name: 'Bottom Row', coords: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
  { id: 4, name: 'V-Shape', coords: [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]] },
  { id: 5, name: 'Inverted-V', coords: [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]] },
  { id: 6, name: 'Step-Down', coords: [[0, 0], [0, 1], [1, 2], [2, 3], [2, 4]] },
  { id: 7, name: 'Step-Up', coords: [[2, 0], [2, 1], [1, 2], [0, 3], [0, 4]] },
  { id: 8, name: 'Trough', coords: [[1, 0], [2, 1], [2, 2], [2, 3], [1, 4]] },
  { id: 9, name: 'Crest', coords: [[1, 0], [0, 1], [0, 2], [0, 3], [1, 4]] },
  { id: 10, name: 'Z-Line', coords: [[0, 0], [1, 1], [1, 2], [1, 3], [0, 4]] },
];

export const TreasureKingdom3D: React.FC = () => {
  // Demo Wallet & Sound
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Spin & Round State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [autoPlayCount, setAutoPlayCount] = useState<number>(0);
  const [lastWin, setLastWin] = useState<number>(0);
  const [winningLines, setWinningLines] = useState<any[]>([]);
  const [scatterHit, setScatterHit] = useState<any | null>(null);
  const [showPaytable, setShowPaytable] = useState<boolean>(false);
  const [showChestAnimation, setShowChestAnimation] = useState<boolean>(false);
  const [spinHistory, setSpinHistory] = useState<number[]>([150, 0, 25, 0, 80, 0, 200, 0]);

  // 5 Reels x 3 Rows Visible Grid (Row 0: Top, Row 1: Middle, Row 2: Bottom)
  // Initialized with 15 rich symbols so reels are never blank!
  const [grid, setGrid] = useState<number[][]>([
    [1, 2, 3, 4, 5],
    [0, 1, 8, 1, 6],
    [6, 7, 3, 2, 7],
  ]);

  // Individual Reel Spinning States for Sequential Staggered Stops
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false]);

  // References for 3D objects
  const sceneRef = useRef<Scene3DManager | null>(null);
  const cameraRef = useRef<CameraManager | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const chestGroupRef = useRef<THREE.Group | null>(null);

  const autoPlayRef = useRef<number>(0);
  autoPlayRef.current = autoPlayCount;
  const isSpinningRef = useRef<boolean>(false);
  isSpinningRef.current = isSpinning;

  // Sync Demo Balance & Audio
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
    return () => {
      window.removeEventListener('demo_balance_updated', handleBalance);
      window.removeEventListener('sound_settings_changed', handleSound);
    };
  }, []);

  const handleInit = (sceneMgr: Scene3DManager, camMgr: CameraManager) => {
    sceneRef.current = sceneMgr;
    cameraRef.current = camMgr;

    camMgr.setPosition(new THREE.Vector3(0, 0, 7.8), true);
    camMgr.setLookAt(new THREE.Vector3(0, 0, 0), true);

    const scene = sceneMgr.scene;

    // Atmospheric Aztec Vault Lighting
    new LightingManager(scene, {
      ambientColor: 0x3d2817,
      ambientIntensity: 1.2,
      mainColor: 0xffe6a3,
      mainIntensity: 1.8,
      mainPos: new THREE.Vector3(3, 8, 8),
      rimColor: 0xd97706,
      rimIntensity: 1.4,
      rimPos: new THREE.Vector3(-4, -2, -3),
    });

    particlesRef.current = new ParticleSystem(scene, 400);

    // ─── 3D SLOT MACHINE VAULT FRAME (SCALED FOR COMPACT ELEGANCE) ───────────
    const frameGroup = new THREE.Group();

    // Aztec stone vault backing
    const backGeom = new THREE.BoxGeometry(7.4, 4.8, 0.4);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x181109,
      roughness: 0.9,
      metalness: 0.25,
    });
    const backMesh = new THREE.Mesh(backGeom, backMat);
    backMesh.position.set(0, 0, -1.5);
    frameGroup.add(backMesh);

    // Golden frame borders
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.85,
    });

    // Top Header Arch
    const archGeom = new THREE.BoxGeometry(7.6, 0.5, 0.5);
    const archMesh = new THREE.Mesh(archGeom, borderMat);
    archMesh.position.set(0, 2.4, 0);
    frameGroup.add(archMesh);

    // Bottom Base
    const baseGeom = new THREE.BoxGeometry(7.6, 0.5, 0.5);
    const baseMesh = new THREE.Mesh(baseGeom, borderMat);
    baseMesh.position.set(0, -2.4, 0);
    frameGroup.add(baseMesh);

    // Left & Right Golden Pillars
    const pillarGeom = new THREE.CylinderGeometry(0.28, 0.32, 4.8, 16);
    const leftPillar = new THREE.Mesh(pillarGeom, borderMat);
    leftPillar.position.set(-3.7, 0, 0);
    frameGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeom, borderMat);
    rightPillar.position.set(3.7, 0, 0);
    frameGroup.add(rightPillar);

    scene.add(frameGroup);

    // ─── 3D TREASURE CHEST MODEL (FOR MAJOR WIN CELEBRATIONS) ─────────────────
    const chestGroup = new THREE.Group();
    const chestBaseGeom = new THREE.BoxGeometry(1.8, 0.9, 1.1);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5, metalness: 0.4 });
    const chestBase = new THREE.Mesh(chestBaseGeom, chestMat);
    chestGroup.add(chestBase);

    const chestLidGeom = new THREE.CylinderGeometry(0.55, 0.55, 1.8, 16, 1, false, 0, Math.PI);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.8 });
    const chestLid = new THREE.Mesh(chestLidGeom, lidMat);
    chestLid.rotation.z = Math.PI / 2;
    chestLid.position.set(0, 0.45, 0);
    chestGroup.add(chestLid);

    chestGroup.position.set(0, 0, 1.5);
    chestGroup.visible = false;
    scene.add(chestGroup);
    chestGroupRef.current = chestGroup;
  };

  const handleUpdate = (delta: number) => {
    if (particlesRef.current) {
      particlesRef.current.update(delta);
    }

    // Animate Treasure Chest floating if visible
    if (chestGroupRef.current && chestGroupRef.current.visible) {
      chestGroupRef.current.rotation.y += delta * 1.5;
    }
  };

  // Check if a specific cell [row, col] is part of any winning payline or scatter win
  const isWinningCell = useCallback(
    (row: number, col: number) => {
      if (isSpinning) return false;

      // Check winning paylines
      for (const wl of winningLines) {
        const pl = PAYLINES.find((p) => p.id === wl.lineId);
        if (pl) {
          const matchedCoords = pl.coords.slice(0, wl.count);
          if (matchedCoords.some(([r, c]) => r === row && c === col)) {
            return true;
          }
        }
      }

      // Check scatter win
      if (scatterHit && scatterHit.count >= 3 && grid[row]?.[col] === 8) {
        return true;
      }

      return false;
    },
    [isSpinning, winningLines, scatterHit, grid]
  );

  const spin = async () => {
    if (isSpinningRef.current) return;
    if (balance < betAmount) {
      soundManager.play('loss');
      return;
    }

    setIsSpinning(true);
    setWinningLines([]);
    setScatterHit(null);
    setLastWin(0);
    setShowChestAnimation(false);

    if (chestGroupRef.current) {
      chestGroupRef.current.visible = false;
    }

    // Start all 5 reels spinning
    setSpinningReels([true, true, true, true, true]);
    soundManager.play('slotSpin');

    try {
      const res = await apiClient.post('/api/games/original/treasure-kingdom/spin', {
        betAmount,
        demoToken: getDemoToken(),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Spin failed');
      }

      const {
        grid: authoritativeGrid,
        winningLines: serverWins,
        scatterWin,
        totalPayout,
        balanceAfter,
      } = res.data.data;

      // Sequential Staggered Reel Stopping:
      // Reel 0 stops @ 700ms, Reel 1 @ 1000ms, Reel 2 @ 1300ms, Reel 3 @ 1600ms, Reel 4 @ 1900ms
      const stopDelays = [700, 1000, 1300, 1600, 1900];

      stopDelays.forEach((delay, reelIdx) => {
        setTimeout(() => {
          soundManager.play('slotStop');

          // Lock this reel's columns in state
          setGrid((prevGrid) => {
            const nextGrid = prevGrid.map((row) => [...row]);
            for (let r = 0; r < 3; r++) {
              nextGrid[r][reelIdx] = authoritativeGrid[r][reelIdx];
            }
            return nextGrid;
          });

          // Mark this reel as stopped
          setSpinningReels((prev) => {
            const updated = [...prev];
            updated[reelIdx] = false;
            return updated;
          });
        }, delay);
      });

      // Complete round settlement after all reels lock in (2200ms)
      setTimeout(() => {
        setIsSpinning(false);
        setGrid(authoritativeGrid);
        setLocalDemoBalance(balanceAfter);
        setBalance(balanceAfter);

        if (totalPayout > 0) {
          setLastWin(totalPayout);
          setWinningLines(serverWins || []);
          if (scatterWin && scatterWin.count >= 3) {
            setScatterHit(scatterWin);
          }

          // Add to spin history
          setSpinHistory((prev) => [totalPayout, ...prev.slice(0, 7)]);
          soundManager.play('win');

          // Major win: trigger Treasure Chest opening animation & particle shower!
          if (totalPayout >= betAmount * 10 || (scatterWin && scatterWin.count >= 3)) {
            setShowChestAnimation(true);
            if (chestGroupRef.current) {
              chestGroupRef.current.visible = true;
            }
          }

          if (particlesRef.current) {
            particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 160, new THREE.Color(1, 0.8, 0.1), 5);
          }
          if (cameraRef.current) {
            cameraRef.current.triggerShake(0.35, 4);
          }
        } else {
          soundManager.play('loss');
          setSpinHistory((prev) => [0, ...prev.slice(0, 7)]);
        }

        // Auto Spin continuation
        if (autoPlayRef.current > 0) {
          setAutoPlayCount((prev) => prev - 1);
          setTimeout(() => {
            if (autoPlayRef.current > 0) {
              spin();
            }
          }, 1200);
        }
      }, 2200);
    } catch (err: any) {
      console.error('Spin error:', err);
      setIsSpinning(false);
      setAutoPlayCount(0);
      autoPlayRef.current = 0;
      setSpinningReels([false, false, false, false, false]);
      soundManager.play('loss');
    }
  };

  const handleBetChange = (delta: number) => {
    soundManager.play('buttonClick');
    setBetAmount((prev) => Math.min(5000, Math.max(10, prev + delta)));
  };

  const toggleAutoPlay = (count: number) => {
    if (autoPlayCount > 0) {
      setAutoPlayCount(0);
    } else {
      setAutoPlayCount(count);
      if (!isSpinning) {
        spin();
      }
    }
  };

  const toggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  // Render individual high-fidelity symbol card (proportionally scaled down by ~25-30%)
  const renderSymbolCard = (symId: number, isWinning: boolean, isScatterWinning: boolean) => {
    const sym = SYMBOLS.find((s) => s.id === symId) || SYMBOLS[1];

    return (
      <div
        className={`symbol-card relative w-full h-16 sm:h-20 md:h-24 flex flex-col items-center justify-center rounded-lg sm:rounded-xl p-0.5 sm:p-1 transition-all duration-300 select-none ${
          isWinning
            ? 'ring-2 sm:ring-3 ring-amber-400 border-2 border-amber-300 bg-gradient-to-b from-amber-500/30 via-yellow-500/20 to-amber-950/60 shadow-[0_0_20px_rgba(245,158,11,0.9)] scale-[1.03] z-20 animate-pulse'
            : isScatterWinning
            ? 'ring-2 sm:ring-3 ring-pink-400 border-2 border-pink-300 bg-gradient-to-b from-pink-500/30 via-fuchsia-500/20 to-purple-950/60 shadow-[0_0_20px_rgba(236,72,153,0.9)] scale-[1.03] z-20 animate-pulse'
            : 'border border-amber-500/30 bg-gradient-to-b from-dark-800/90 via-dark-900/95 to-black/95 shadow-md hover:border-amber-400/50'
        }`}
      >
        {/* Glow backdrop behind icon */}
        <div
          className="absolute inset-0 rounded-lg sm:rounded-xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${sym.glowColor} 0%, transparent 70%)` }}
        />

        {/* Proportionally scaled original Symbol Icon */}
        <span
          className="relative text-2xl sm:text-3xl md:text-4xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] transform transition-transform"
          style={{ filter: isWinning ? 'drop-shadow(0 0 8px #f59e0b)' : undefined }}
        >
          {sym.icon}
        </span>

        {/* Distinctive luxury symbol badge */}
        <div
          className={`relative text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-wider px-1 sm:px-1.5 py-0.2 rounded mt-0.5 font-cinzel border ${
            sym.isWild
              ? 'bg-sky-500/25 text-sky-200 border-sky-400/60 shadow-[0_0_6px_rgba(56,189,248,0.5)]'
              : sym.isScatter
              ? 'bg-pink-500/25 text-pink-200 border-pink-400/60 shadow-[0_0_8px_rgba(236,72,153,0.6)]'
              : 'bg-dark-950/80 text-amber-300 border-amber-500/40'
          }`}
        >
          {sym.badge}
        </div>

        {/* Winning Indicator Sparkle Badge */}
        {isWinning && (
          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-amber-500 text-black text-[8px] sm:text-[9px] font-black px-1 rounded flex items-center gap-0.5 shadow">
            <Sparkles className="w-2 h-2" />
            <span>WIN</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 bg-dark-950 text-white select-none">
      {/* 3D Viewport Area */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <Canvas3DViewport onInit={handleInit} onUpdate={handleUpdate} className="absolute inset-0 w-full h-full">
          {/* Top Brand Banner & Controls */}
          <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-6 sm:right-6 flex justify-between items-center pointer-events-auto z-30 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-dark-900/90 backdrop-blur-md border border-gold/40 rounded-2xl shadow-lg min-w-0">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-gold animate-pulse shrink-0" />
                <span className="font-cinzel text-xs sm:text-sm font-black tracking-wider text-gold truncate">
                  TREASURE KINGDOM
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 hidden xs:inline shrink-0">
                  5 REELS • 10 LINES
                </span>
              </div>

              {/* In-Game Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-1.5 sm:p-2 bg-dark-900/90 hover:bg-dark-800 backdrop-blur-md border border-dark-700 hover:border-gold/50 rounded-xl text-gray-300 hover:text-white transition shadow-md shrink-0"
                title={isMuted ? 'Turn Sound ON' : 'Turn Sound OFF'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-gold" />}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* History Ribbon */}
              <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-xs py-1">
                <History className="w-3.5 h-3.5 text-gray-400 mr-1" />
                {spinHistory.map((h, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      h > 0
                        ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                        : 'bg-dark-900/80 border border-dark-700 text-gray-400'
                    }`}
                  >
                    {h > 0 ? `+₹${h}` : '₹0'}
                  </span>
                ))}
              </div>

              {/* Paytable Button */}
              <button
                onClick={() => setShowPaytable(!showPaytable)}
                className="btn-paytable flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-dark-900/90 hover:bg-dark-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-dark-700 hover:border-gold/50 transition shadow-md"
              >
                <HelpCircle className="w-4 h-4 text-gold" />
                <span className="hidden xs:inline">Paytable</span>
              </button>
            </div>
          </div>

          {/* ─── CENTRAL 5x3 SLOT GRID (COMPACT & ELEGANT 25-30% REDUCTION) ──── */}
          <div className="absolute inset-0 flex items-center justify-center p-1 sm:p-4 z-20 pointer-events-none">
            <div className="slot-grid-frame relative w-full max-w-[96%] sm:max-w-[620px] md:max-w-[660px] bg-dark-950/85 backdrop-blur-md border-2 border-amber-500/60 rounded-xl sm:rounded-2xl p-1 sm:p-2.5 md:p-3 shadow-2xl shadow-black/80 pointer-events-auto">
              {/* Aztec Top Header Bar */}
              <div className="flex items-center justify-between mb-1 sm:mb-1.5 px-1 text-[9px] sm:text-[10px] text-amber-400/80 font-cinzel font-bold border-b border-amber-500/20 pb-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-gold" /> REELS 1 TO 5
                </span>
                <span>10 FIXED PAYLINES</span>
              </div>

              {/* 5 Column Reel Grid */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5 md:gap-2 relative">
                {[0, 1, 2, 3, 4].map((colIdx) => {
                  const isReelSpinning = spinningReels[colIdx];

                  return (
                    <div
                      key={colIdx}
                      className="reel-column flex flex-col gap-1 sm:gap-1.5 p-0.5 sm:p-1 bg-dark-900/90 rounded-lg sm:rounded-xl border border-amber-500/30 overflow-hidden relative shadow-inner"
                    >
                      {/* Reel spinning vertical motion blur overlay */}
                      {isReelSpinning ? (
                        <div className="flex flex-col gap-1 sm:gap-1.5 animate-pulse filter blur-[1px]">
                          {/* Fast cycling symbols in motion blur */}
                          {[
                            (colIdx * 2 + 1) % 9,
                            (colIdx * 2 + 3) % 9,
                            (colIdx * 2 + 5) % 9,
                          ].map((mockSymId, mockIdx) => (
                            <div key={mockIdx} className="opacity-70 transform -translate-y-1">
                              {renderSymbolCard(mockSymId, false, false)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Clear, locked 3 visible row symbols */
                        <>
                          {renderSymbolCard(
                            grid[0]?.[colIdx] ?? 1,
                            isWinningCell(0, colIdx),
                            scatterHit && scatterHit.count >= 3 && grid[0]?.[colIdx] === 8
                          )}
                          {renderSymbolCard(
                            grid[1]?.[colIdx] ?? 1,
                            isWinningCell(1, colIdx),
                            scatterHit && scatterHit.count >= 3 && grid[1]?.[colIdx] === 8
                          )}
                          {renderSymbolCard(
                            grid[2]?.[colIdx] ?? 1,
                            isWinningCell(2, colIdx),
                            scatterHit && scatterHit.count >= 3 && grid[2]?.[colIdx] === 8
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* SVG Payline Trace Overlay across winning symbols */}
                {!isSpinning && winningLines.length > 0 && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none z-30"
                  >
                    {winningLines.map((wl, idx) => {
                      const pl = PAYLINES.find((p) => p.id === wl.lineId);
                      if (!pl) return null;

                      // Map row coordinates to 0..100 viewBox space
                      const points = pl.coords
                        .slice(0, wl.count)
                        .map(([r, c]) => {
                          const x = ((c + 0.5) / 5) * 100;
                          const y = ((r + 0.5) / 3) * 100;
                          return `${x.toFixed(2)},${y.toFixed(2)}`;
                        })
                        .join(' ');

                      return (
                        <polyline
                          key={idx}
                          points={points}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-pulse"
                          style={{ filter: 'drop-shadow(0 0 6px #f59e0b)' }}
                        />
                      );
                    })}
                  </svg>
                )}
              </div>

              {/* Winning Lines Summary Notification */}
              {!isSpinning && winningLines.length > 0 && (
                <div className="mt-1.5 p-1 bg-amber-950/80 border border-amber-500/50 rounded-lg text-center flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-amber-300">
                  <Sparkles className="w-3 h-3 text-gold animate-spin" />
                  <span>
                    {winningLines.map((w) => `${w.name} (${w.symbolName} ${w.count}x: +₹${w.payout})`).join(' • ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Major Win / Treasure Chest Opening Celebration Banner */}
          {lastWin > 0 && (
            <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 px-4 sm:px-8 py-2 bg-gradient-to-r from-amber-600/95 via-yellow-500 to-amber-600/95 border-2 border-gold rounded-2xl shadow-xl shadow-gold/40 text-center animate-bounce z-40 pointer-events-none">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-black uppercase tracking-widest flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showChestAnimation ? 'TREASURE CHEST JACKPOT WIN!' : 'BIG TREASURE WIN!'}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-3xl font-black font-cinzel text-black drop-shadow">
                +₹{lastWin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              {scatterHit && (
                <div className="text-[9px] font-bold text-amber-950 uppercase">
                  {scatterHit.count} SCATTERS TRIGGERED (+₹{scatterHit.payout.toFixed(2)})
                </div>
              )}
            </div>
          )}
        </Canvas3DViewport>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-dark-900 border-t border-dark-800 px-2 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 z-30 shadow-2xl shrink-0">
        {/* Bet Selection & Increase/Decrease Controls */}
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-1 sm:gap-2">
          <span className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Bet</span>

          {/* Minus Button */}
          <button
            disabled={isSpinning || betAmount <= 10}
            onClick={() => handleBetChange(-10)}
            className="btn-bet-minus p-1.5 bg-dark-950 border border-dark-700 hover:border-gold/50 rounded-lg sm:rounded-xl text-gray-300 hover:text-white disabled:opacity-40 transition shrink-0"
            title="Decrease Bet (-₹10)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Quick Bet Chips */}
          <div className="flex items-center gap-1 bg-dark-950 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-dark-700 overflow-x-auto no-scrollbar">
            {[10, 50, 100, 500, 1000].map((amt) => (
              <button
                key={amt}
                disabled={isSpinning}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setBetAmount(amt);
                }}
                className={`btn-chip-${amt} px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition shrink-0 ${
                  betAmount === amt
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                    : 'text-gray-400 hover:text-white disabled:opacity-40'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          {/* Plus Button */}
          <button
            disabled={isSpinning || betAmount >= 5000}
            onClick={() => handleBetChange(10)}
            className="btn-bet-plus p-1.5 bg-dark-950 border border-dark-700 hover:border-gold/50 rounded-lg sm:rounded-xl text-gray-300 hover:text-white disabled:opacity-40 transition shrink-0"
            title="Increase Bet (+₹10)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Win & Spin Controls */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 sm:gap-3">
          {/* Total Win Status */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-semibold">Last Win</span>
            <span className="text-xs sm:text-sm font-black text-gold">
              ₹{lastWin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Autoplay Button */}
          <button
            onClick={() => toggleAutoPlay(25)}
            className={`btn-auto-spin flex items-center gap-1 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition shrink-0 ${
              autoPlayCount > 0
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-dark-800 hover:bg-dark-750 text-gray-300 border border-dark-700'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoPlayCount > 0 ? 'animate-spin' : ''}`} />
            <span>{autoPlayCount > 0 ? `STOP (${autoPlayCount})` : 'AUTO'}</span>
          </button>

          {/* Master Spin Button */}
          <button
            disabled={isSpinning || balance < betAmount}
            onClick={spin}
            className={`btn-spin flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 shadow-lg ${
              isSpinning || balance < betAmount
                ? 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black shadow-gold/25 hover:scale-105 active:scale-95'
            }`}
          >
            <Zap className={`w-4 h-4 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'SPINNING...' : `SPIN (₹${betAmount})`}</span>
          </button>
        </div>
      </div>

      {/* Paytable Modal detailing the 9 Original Symbols & 10 Paylines */}
      {showPaytable && (
        <div className="paytable-modal absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-dark-900 border border-gold/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowPaytable(false)}
              className="btn-close-paytable absolute top-4 right-4 p-1.5 rounded-lg bg-dark-800 text-gray-400 hover:text-white transition"
              title="Close Paytable"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <Award className="w-5 h-5 text-gold" />
              <h3 className="text-base sm:text-lg font-cinzel font-black text-white">
                TREASURE KINGDOM PAYTABLE (9 SYMBOLS)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {SYMBOLS.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{s.name}</div>
                      <div className="text-[9px] text-gray-400">{s.subtext}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono font-bold text-gold">
                    <div>5x: {s.payouts[5]}x</div>
                    <div className="text-[10px] text-gray-400">3x: {s.payouts[3]}x</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-950/40 border border-gold/30 rounded-xl text-xs text-amber-200 space-y-1">
              <div className="font-bold">Rules & Features:</div>
              <p className="text-[11px] text-gray-300">
                • <strong>Wild – Lightning (⚡):</strong> Substitutes for any symbol except Scatter.
              </p>
              <p className="text-[11px] text-gray-300">
                • <strong>Scatter – Treasure Star (🌟):</strong> Pays anywhere on the 5x3 grid (3=5x, 4=20x, 5=100x total bet) and triggers Treasure Chest celebration!
              </p>
              <p className="text-[11px] text-gray-300">
                • <strong>10 Fixed Paylines:</strong> Evaluated from leftmost reel to right. Line bet = Total Bet ÷ 10.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasureKingdom3D;
