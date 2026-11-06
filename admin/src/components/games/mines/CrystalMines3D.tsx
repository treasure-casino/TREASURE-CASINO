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
  Sparkles,
  Bomb,
  Gem,
  Coins,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Flame,
  Award,
} from 'lucide-react';

interface TileState {
  id: number;
  row: number;
  col: number;
  isRevealed: boolean;
  isMine: boolean;
  meshGroup: THREE.Group;
  topMesh: THREE.Mesh;
  gemMesh: THREE.Mesh;
  mineMesh: THREE.Mesh;
  targetRotationX: number;
  currentRotationX: number;
  targetY: number;
}

export const CrystalMines3D: React.FC = () => {
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [mineCount, setMineCount] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [nextMultiplier, setNextMultiplier] = useState<number>(1.08);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [roundId, setRoundId] = useState<string | null>(null);

  // 3D Object references
  const sceneRef = useRef<Scene3DManager | null>(null);
  const cameraRef = useRef<CameraManager | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const tilesRef = useRef<TileState[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-100, -100));
  const hoveredTileId = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const roundIdRef = useRef<string | null>(null);
  roundIdRef.current = roundId;

  // Sync balance
  useEffect(() => {
    const handleBalance = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setBalance(e.detail.balance);
      } else {
        setBalance(getDemoBalance());
      }
    };
    window.addEventListener('demo_balance_updated', handleBalance);
    return () => window.removeEventListener('demo_balance_updated', handleBalance);
  }, []);

  const updateCameraForViewport = useCallback(() => {
    if (!cameraRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / Math.max(h, 1);

    // Grid bounding box is ~5.2 x 5.2 units with 45 deg vertical FOV
    let camDist: number;
    let camY: number;

    if (aspect < 0.6) {
      // Very narrow mobile portrait (e.g., 320x568 or 360x800)
      camDist = 11.2;
      camY = -3.2;
    } else if (aspect < 0.85) {
      // Standard mobile portrait (e.g., 375x812, 390x844, 430x932)
      camDist = 9.8;
      camY = -3.0;
    } else if (aspect < 1.1) {
      // Square-ish / Foldable portrait
      camDist = 8.5;
      camY = -2.8;
    } else if (h < 500) {
      // Mobile landscape (e.g. 740x360, 844x390) - camera pulled back slightly to frame all tiles
      camDist = 8.2;
      camY = -2.2;
    } else {
      // Desktop
      camDist = 7.0;
      camY = -2.8;
    }

    cameraRef.current.setPosition(new THREE.Vector3(0, camY, camDist), true);
    cameraRef.current.setLookAt(new THREE.Vector3(0, 0, 0), true);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateCameraForViewport);
    window.addEventListener('orientationchange', updateCameraForViewport);
    return () => {
      window.removeEventListener('resize', updateCameraForViewport);
      window.removeEventListener('orientationchange', updateCameraForViewport);
    };
  }, [updateCameraForViewport]);

  const handleInit = (sceneMgr: Scene3DManager, camMgr: CameraManager) => {
    sceneRef.current = sceneMgr;
    cameraRef.current = camMgr;

    updateCameraForViewport();

    const scene = sceneMgr.scene;

    // Crystal Cave Lighting
    new LightingManager(scene, {
      ambientColor: 0x1e1533,
      ambientIntensity: 0.95,
      mainColor: 0xec4899,
      mainIntensity: 1.5,
      mainPos: new THREE.Vector3(4, 5, 7),
      rimColor: 0x06b6d4,
      rimIntensity: 1.2,
      rimPos: new THREE.Vector3(-4, -5, -3),
    });

    particlesRef.current = new ParticleSystem(scene, 500);

    // ─── 5x5 GRID OF 3D CRYSTAL RUNESTONES ────────────────────────────────────
    tilesRef.current = [];
    const gridSize = 5;
    const spacing = 1.05;
    const startX = -((gridSize - 1) * spacing) / 2;
    const startY = ((gridSize - 1) * spacing) / 2;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x221a36,
      metalness: 0.6,
      roughness: 0.35,
    });

    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });

    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });

    const mineMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.2,
    });

    let tileId = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const posX = startX + c * spacing;
        const posY = startY - r * spacing;

        const tileGroup = new THREE.Group();
        tileGroup.position.set(posX, posY, 0);

        // Stone Base Box
        const boxGeom = new THREE.BoxGeometry(0.88, 0.88, 0.22);
        const topMesh = new THREE.Mesh(boxGeom, stoneMat.clone());
        topMesh.userData = { tileId };
        tileGroup.add(topMesh);

        // Glowing Rune Inlay on Front
        const runeGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 6);
        const runeMesh = new THREE.Mesh(runeGeom, runeMat);
        runeMesh.rotation.x = Math.PI / 2;
        runeMesh.position.set(0, 0, 0.12);
        tileGroup.add(runeMesh);

        // Hidden 3D Gem on Reverse (Cyan Diamond Octahedron)
        const gemGeom = new THREE.OctahedronGeometry(0.3, 0);
        const gemMesh = new THREE.Mesh(gemGeom, gemMat);
        gemMesh.position.set(0, 0, -0.15);
        gemMesh.visible = false;
        tileGroup.add(gemMesh);

        // Hidden 3D Mine on Reverse (Spiked Sphere)
        const mineGeom = new THREE.IcosahedronGeometry(0.26, 1);
        const mineMesh = new THREE.Mesh(mineGeom, mineMat);
        mineMesh.position.set(0, 0, -0.15);
        mineMesh.visible = false;
        tileGroup.add(mineMesh);

        scene.add(tileGroup);

        tilesRef.current.push({
          id: tileId,
          row: r,
          col: c,
          isRevealed: false,
          isMine: false,
          meshGroup: tileGroup,
          topMesh,
          gemMesh,
          mineMesh,
          targetRotationX: 0,
          currentRotationX: 0,
          targetY: 0,
        });

        tileId++;
      }
    }
  };

  const handleUpdate = (delta: number) => {
    if (particlesRef.current) {
      particlesRef.current.update(delta);
    }

    tilesRef.current.forEach((t) => {
      // Rotation flip animation
      if (Math.abs(t.currentRotationX - t.targetRotationX) > 0.01) {
        t.currentRotationX = THREE.MathUtils.lerp(
          t.currentRotationX,
          t.targetRotationX,
          Math.min(1, delta * 12)
        );
        t.meshGroup.rotation.x = t.currentRotationX;
      }

      // Hover elevation
      const currentZ = t.meshGroup.position.z;
      const targetZ = t.targetY;
      if (Math.abs(currentZ - targetZ) > 0.005) {
        t.meshGroup.position.z = THREE.MathUtils.lerp(currentZ, targetZ, Math.min(1, delta * 15));
      }
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!sceneRef.current || !isPlayingRef.current) return;

    raycasterRef.current.setFromCamera(mouseRef.current, sceneRef.current.camera);
    const meshes = tilesRef.current.map((t) => t.topMesh);
    const intersects = raycasterRef.current.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitTileId = intersects[0].object.userData.tileId;
      if (hoveredTileId.current !== hitTileId) {
        hoveredTileId.current = hitTileId;
        tilesRef.current.forEach((t) => {
          t.targetY = t.id === hitTileId && !t.isRevealed ? 0.18 : 0;
        });
      }
    } else {
      if (hoveredTileId.current !== null) {
        hoveredTileId.current = null;
        tilesRef.current.forEach((t) => {
          t.targetY = 0;
        });
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPlayingRef.current || !sceneRef.current) return;
    const start = pointerStartRef.current;
    if (start) {
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const elapsed = Date.now() - start.time;
      if (dist < 15 && elapsed < 600) {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, sceneRef.current.camera);
        const meshes = tilesRef.current.map((t) => t.topMesh);
        const intersects = raycasterRef.current.intersectObjects(meshes);

        if (intersects.length > 0) {
          const clickedId = intersects[0].object.userData.tileId;
          revealTile(clickedId);
        }
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlayingRef.current || !sceneRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, sceneRef.current.camera);
    const meshes = tilesRef.current.map((t) => t.topMesh);
    const intersects = raycasterRef.current.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedId = intersects[0].object.userData.tileId;
      revealTile(clickedId);
    }
  };

  // Start Mines Round
  const startGame = async () => {
    if (isPlaying) return;
    if (balance < betAmount) {
      soundManager.play('loss');
      return;
    }

    soundManager.play('buttonClick');

    try {
      // Authoritative Backend Start
      const res = await apiClient.post('/api/games/original/crystal-mines/start', {
        betAmount,
        mineCount,
        demoToken: getDemoToken(),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to start mines');
      }

      const { roundId: newRoundId, balanceAfter, currentMultiplier: cMult, nextMultiplier: nMult } = res.data.data;

      setRoundId(newRoundId);
      setLocalDemoBalance(balanceAfter);
      setBalance(balanceAfter);
      setIsPlaying(true);
      setIsGameOver(false);
      setRevealedCount(0);
      setLastWinAmount(0);
      setCurrentMultiplier(cMult);
      setNextMultiplier(nMult);

      // Reset tile meshes
      tilesRef.current.forEach((t) => {
        t.isRevealed = false;
        t.isMine = false;
        t.targetRotationX = 0;
        t.currentRotationX = 0;
        t.targetY = 0;
        t.gemMesh.visible = false;
        t.mineMesh.visible = false;
        const mat = t.topMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x221a36);
      });
    } catch (err: any) {
      console.error('Start error:', err);
      soundManager.play('loss');
    }
  };

  // Reveal Tile
  const revealTile = async (tileId: number) => {
    const tile = tilesRef.current.find((t) => t.id === tileId);
    if (!tile || tile.isRevealed || !isPlayingRef.current || !roundIdRef.current) return;

    tile.isRevealed = true;
    tile.targetRotationX = Math.PI; // Flip tile

    try {
      const res = await apiClient.post('/api/games/original/crystal-mines/reveal', {
        roundId: roundIdRef.current,
        tileIndex: tileId,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Tile reveal failed');
      }

      const { hitMine, minePositions, currentMultiplier: cMult, nextMultiplier: nMult, isMaxWin, payout, balanceAfter } = res.data.data;

      if (hitMine) {
        // Hit Mine! Explosion
        tile.isMine = true;
        tile.mineMesh.visible = true;
        soundManager.play('crash');

        if (cameraRef.current) {
          cameraRef.current.triggerShake(0.65, 5);
        }
        if (particlesRef.current) {
          particlesRef.current.burst(tile.meshGroup.position, 80, new THREE.Color(1, 0.2, 0.1), 4.5);
        }

        // Reveal all other mines
        if (minePositions) {
          const mineSet = new Set(minePositions);
          tilesRef.current.forEach((t) => {
            if (!t.isRevealed) {
              t.isRevealed = true;
              t.targetRotationX = Math.PI;
              if (mineSet.has(t.id)) {
                t.mineMesh.visible = true;
              } else {
                t.gemMesh.visible = true;
              }
            }
          });
        }

        setIsPlaying(false);
        setIsGameOver(true);
      } else {
        // Safe Gem!
        tile.gemMesh.visible = true;
        soundManager.play('cardReveal');

        if (particlesRef.current) {
          particlesRef.current.burst(tile.meshGroup.position, 40, new THREE.Color(0.2, 0.9, 1), 3);
        }

        setRevealedCount((prev) => prev + 1);
        setCurrentMultiplier(cMult);
        setNextMultiplier(nMult);

        if (isMaxWin) {
          // Max win auto cashout
          soundManager.play('win');
          setLastWinAmount(payout);
          setLocalDemoBalance(balanceAfter);
          setBalance(balanceAfter);
          setIsPlaying(false);
          setIsGameOver(true);
        }
      }
    } catch (err: any) {
      console.error('Reveal error:', err);
    }
  };

  // Cashout
  const cashout = async () => {
    if (!isPlayingRef.current || revealedCount === 0 || !roundIdRef.current) return;

    try {
      const res = await apiClient.post('/api/games/original/crystal-mines/cashout', {
        roundId: roundIdRef.current,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Cashout failed');
      }

      const { payout, minePositions, balanceAfter } = res.data.data;

      setLastWinAmount(payout);
      setLocalDemoBalance(balanceAfter);
      setBalance(balanceAfter);

      soundManager.play('win');
      if (particlesRef.current) {
        particlesRef.current.burst(new THREE.Vector3(0, 0, 1), 120, new THREE.Color(1, 0.85, 0.2), 5);
      }

      // Reveal remaining board
      if (minePositions) {
        const mineSet = new Set(minePositions);
        tilesRef.current.forEach((t) => {
          if (!t.isRevealed) {
            t.isRevealed = true;
            t.targetRotationX = Math.PI;
            if (mineSet.has(t.id)) {
              t.mineMesh.visible = true;
            } else {
              t.gemMesh.visible = true;
            }
          }
        });
      }

      setIsPlaying(false);
      setIsGameOver(true);
    } catch (err: any) {
      console.error('Cashout error:', err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 bg-dark-950 text-white select-none">
      {/* 3D Viewport Area */}
      <div
        className="relative flex-1 w-full min-h-0 overflow-hidden cursor-pointer touch-none select-none"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleCanvasClick}
      >
        <Canvas3DViewport onInit={handleInit} onUpdate={handleUpdate} className="absolute inset-0 w-full h-full">
          {/* Top Brand Banner & Multiplier Stats */}
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-auto gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-dark-900/85 backdrop-blur-md border border-fuchsia-500/40 rounded-xl shadow-lg">
                <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fuchsia-400 animate-pulse" />
                <span className="font-cinzel text-[11px] sm:text-xs font-black tracking-wider text-fuchsia-300">
                  CRYSTAL MINES
                </span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold">
                  PUZZLE & MINES
                </span>
              </div>
            </div>

            {/* Active Multiplier Progression Card */}
            {isPlaying && (
              <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1 sm:py-1.5 bg-dark-900/90 border border-fuchsia-500/40 rounded-xl shadow-xl">
                <div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-semibold">Current</div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-400">{currentMultiplier.toFixed(2)}x</div>
                </div>
                <div className="w-px h-5 sm:h-6 bg-dark-700" />
                <div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-semibold">Next</div>
                  <div className="text-xs sm:text-sm font-extrabold text-cyan-300">{nextMultiplier.toFixed(2)}x</div>
                </div>
              </div>
            )}
          </div>

          {/* Win/Loss Status Banner */}
          {lastWinAmount > 0 && (
            <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 px-5 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-emerald-600/90 via-teal-500/95 to-emerald-600/90 border-2 border-emerald-400 rounded-2xl sm:rounded-3xl shadow-2xl shadow-emerald-500/30 text-center animate-bounce pointer-events-none z-20">
              <div className="text-[10px] sm:text-[11px] font-extrabold text-black uppercase tracking-widest">
                CAVERN CONQUERED!
              </div>
              <div className="text-xl sm:text-2xl font-black font-cinzel text-black">
                +₹{lastWinAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </Canvas3DViewport>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-dark-900 border-t border-dark-800 px-2 sm:px-6 py-1.5 sm:py-3.5 flex flex-col landscape:flex-row sm:flex-row items-center justify-between gap-1.5 sm:gap-4 z-20 shadow-2xl shrink-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-3 w-full sm:w-auto">
          {/* Bet Selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Bet</span>
            <div className="flex items-center gap-1 bg-dark-950 p-0.5 sm:p-1 rounded-xl border border-dark-700 overflow-x-auto no-scrollbar">
              {[10, 50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  disabled={isPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setBetAmount(amt);
                  }}
                  className={`px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition shrink-0 ${
                    betAmount === amt
                      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Mines Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Mines</span>
            <div className="flex items-center gap-1 bg-dark-950 p-0.5 sm:p-1 rounded-xl border border-dark-700">
              {[1, 3, 5, 10].map((m) => (
                <button
                  key={m}
                  disabled={isPlaying}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setMineCount(m);
                  }}
                  className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition ${
                    mineCount === m
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Bomb className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{m}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button: START GAME or CASHOUT */}
        <div className="w-full sm:w-auto">
          {isPlaying ? (
            <button
              disabled={revealedCount === 0}
              onClick={cashout}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 shadow-xl ${
                revealedCount === 0
                  ? 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                  : 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 hover:from-emerald-400 hover:to-green-300 text-black shadow-emerald-500/25 hover:scale-105 active:scale-95 animate-pulse'
              }`}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>
                {revealedCount === 0
                  ? 'PICK A TILE'
                  : `CASHOUT ₹${(betAmount * currentMultiplier).toFixed(2)}`}
              </span>
            </button>
          ) : (
            <button
              disabled={balance < betAmount}
              onClick={startGame}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 shadow-xl ${
                balance < betAmount
                  ? 'bg-dark-800 text-gray-500 cursor-not-allowed border border-dark-700'
                  : 'bg-gradient-to-r from-fuchsia-500 via-purple-400 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-black shadow-fuchsia-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              <Gem className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>START GAME (₹{betAmount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrystalMines3D;
