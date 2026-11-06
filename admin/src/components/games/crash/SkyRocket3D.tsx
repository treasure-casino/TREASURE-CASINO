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
  Rocket,
  TrendingUp,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertCircle,
  History,
  Play,
  Square,
  Sliders,
  Check,
  X,
} from 'lucide-react';

export type RocketState = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'CRASHED';

export interface BetSlotState {
  placed: boolean;
  betAmount: number;
  autoCashout: number;
  autoCashoutEnabled: boolean;
  status: 'IDLE' | 'PLACED' | 'RUNNING' | 'CASHOUT' | 'LOST';
  cashedOutMultiplier?: number;
  winAmount?: number;
}

export const SkyRocket3D: React.FC = () => {
  // Demo Wallet & Sound
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Round State Machine
  const [gameState, setGameState] = useState<RocketState>('IDLE');
  const [countdown, setCountdown] = useState<number>(3);
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([1.42, 2.85, 1.15, 6.4, 1.95, 3.1, 1.05, 15.2]);

  // Two Independent Bet Slots
  const [slot1, setSlot1] = useState<BetSlotState>({
    placed: true,
    betAmount: 50,
    autoCashout: 2.0,
    autoCashoutEnabled: false,
    status: 'PLACED',
  });

  const [slot2, setSlot2] = useState<BetSlotState>({
    placed: false,
    betAmount: 100,
    autoCashout: 5.0,
    autoCashoutEnabled: false,
    status: 'IDLE',
  });

  // Auto Bet State
  const [autoBetActive, setAutoBetActive] = useState<boolean>(false);
  const [autoBetRounds, setAutoBetRounds] = useState<number>(10);
  const [autoBetRemaining, setAutoBetRemaining] = useState<number>(0);
  const [stopOnProfit, setStopOnProfit] = useState<number>(500);
  const [stopOnLoss, setStopOnLoss] = useState<number>(200);
  const [showAutoBetModal, setShowAutoBetModal] = useState<boolean>(false);
  const autoBetSessionProfitRef = useRef<number>(0);
  const autoBetActiveRef = useRef<boolean>(false);
  autoBetActiveRef.current = autoBetActive;
  const autoBetRemainingRef = useRef<number>(0);
  autoBetRemainingRef.current = autoBetRemaining;
  const stopOnProfitRef = useRef<number>(500);
  stopOnProfitRef.current = stopOnProfit;
  const stopOnLossRef = useRef<number>(200);
  stopOnLossRef.current = stopOnLoss;
  const autoBetSlot1Ref = useRef<boolean>(true);
  const autoBetSlot2Ref = useRef<boolean>(false);

  // 3D Object References
  const sceneRef = useRef<Scene3DManager | null>(null);
  const cameraRef = useRef<CameraManager | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const rocketGroupRef = useRef<THREE.Group | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);
  const thrusterLightRef = useRef<THREE.PointLight | null>(null);

  // Round Timing & Sync Refs
  const crashPointRef = useRef<number>(2.5);
  const startTimeRef = useRef<number>(0);
  const currentMultRef = useRef<number>(1.0);
  const roundIdRef = useRef<string | null>(null);
  roundIdRef.current = roundId;
  const isStartingRef = useRef<boolean>(false);
  const cashingOutSlotRef = useRef<{ [slot: number]: boolean }>({ 1: false, 2: false });
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextRoundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ignitionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCrashingRef = useRef<boolean>(false);
  const slot1Ref = useRef<BetSlotState>(slot1);
  slot1Ref.current = slot1;
  const slot2Ref = useRef<BetSlotState>(slot2);
  slot2Ref.current = slot2;

  const starCount = 800;
  const starPositions = useRef<Float32Array>(new Float32Array(starCount * 3));

  // Sync Demo Balance & Audio Settings
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

    apiClient
      .get('/api/games/original/sky-rocket/history')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setHistory(res.data.data);
        }
      })
      .catch(() => {});

    // Start initial betting window countdown automatically on component mount
    const initialCountdownTimer = setTimeout(() => {
      startNextRoundIntermission();
    }, 400);

    return () => {
      clearTimeout(initialCountdownTimer);
      window.removeEventListener('demo_balance_updated', handleBalance);
      window.removeEventListener('sound_settings_changed', handleSound);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (nextRoundTimerRef.current) clearInterval(nextRoundTimerRef.current);
      if (ignitionIntervalRef.current) clearInterval(ignitionIntervalRef.current);
    };
  }, []);

  // 3D Scene Initialization
  const handleInit = (sceneMgr: Scene3DManager, camMgr: CameraManager) => {
    sceneRef.current = sceneMgr;
    cameraRef.current = camMgr;

    camMgr.setPosition(new THREE.Vector3(0, 0, 7.5), true);
    camMgr.setLookAt(new THREE.Vector3(0, 0, 0), true);

    const scene = sceneMgr.scene;

    const lighting = new LightingManager(scene, {
      ambientColor: 0x0f172a,
      ambientIntensity: 0.9,
      mainColor: 0xffffff,
      mainIntensity: 1.4,
      mainPos: new THREE.Vector3(4, 6, 8),
      rimColor: 0x38bdf8,
      rimIntensity: 1.2,
      rimPos: new THREE.Vector3(-4, -4, -4),
    });

    thrusterLightRef.current = lighting.addPointLight(0xff6600, 0, 12, new THREE.Vector3(-3.2, -1.8, 0));
    particlesRef.current = new ParticleSystem(scene, 750);

    // Starfield
    const starGeom = new THREE.BufferGeometry();
    for (let i = 0; i < starCount; i++) {
      starPositions.current[i * 3] = (Math.random() - 0.5) * 36;
      starPositions.current[i * 3 + 1] = (Math.random() - 0.5) * 36;
      starPositions.current[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions.current, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.16,
      transparent: true,
      opacity: 0.85,
    });
    starFieldRef.current = new THREE.Points(starGeom, starMat);
    scene.add(starFieldRef.current);

    // ─── 3D AVIATOR-STYLE ROCKET MODEL ──────────────────────────────────────────
    const rocket = new THREE.Group();

    // Fuselage
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.42, 1.9, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.75,
      roughness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    rocket.add(bodyMesh);

    // Red Aerodynamic Nose Cone
    const noseGeom = new THREE.ConeGeometry(0.3, 0.85, 24);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.6,
      roughness: 0.25,
    });
    const noseMesh = new THREE.Mesh(noseGeom, noseMat);
    noseMesh.position.set(0, 1.35, 0);
    rocket.add(noseMesh);

    // Cockpit Canopy
    const glassGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.9,
      roughness: 0.1,
    });
    const glassMesh = new THREE.Mesh(glassGeom, glassMat);
    glassMesh.position.set(0, 0.4, 0.3);
    glassMesh.scale.set(1, 1.25, 0.55);
    rocket.add(glassMesh);

    // Golden Stabilizer Fins
    const finMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const finGeom = new THREE.BoxGeometry(0.08, 0.65, 0.55);

    const finL = new THREE.Mesh(finGeom, finMat);
    finL.position.set(-0.5, -0.6, 0);
    rocket.add(finL);

    const finR = new THREE.Mesh(finGeom, finMat);
    finR.position.set(0.5, -0.6, 0);
    rocket.add(finR);

    // Engine Exhaust Nozzle
    const engineGeom = new THREE.CylinderGeometry(0.28, 0.38, 0.38, 16);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.4,
    });
    const engineMesh = new THREE.Mesh(engineGeom, engineMat);
    engineMesh.position.set(0, -1.05, 0);
    rocket.add(engineMesh);

    // Initial position: Bottom-Left
    rocket.position.set(-3.2, -1.8, 0);
    rocket.rotation.z = -Math.PI / 4;
    scene.add(rocket);
    rocketGroupRef.current = rocket;
  };

  // 3D Frame Loop with Curved Flight Path (Bottom-Left to Upper-Right)
  const handleUpdate = (delta: number, elapsed: number) => {
    // Starfield downwards-left drift
    if (starFieldRef.current) {
      const pos = starFieldRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const speed = gameState === 'RUNNING' ? 8.0 + currentMultRef.current * 2.4 : 1.2;

      for (let i = 0; i < starCount; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        x -= delta * (speed * 0.4);
        y -= delta * (speed * 0.7);
        if (y < -18) y = 18;
        if (x < -18) x = 18;
        pos.setX(i, x);
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Rocket Curved Flight Path
    if (rocketGroupRef.current) {
      if (gameState === 'RUNNING') {
        rocketGroupRef.current.visible = true;

        const flightTime = Math.max(0, (Date.now() - startTimeRef.current) / 1000);

        // Curved progression: bottom-left (-3.2, -1.8) -> upper-right (+2.4, +1.6)
        const progressX = 1 - Math.exp(-0.25 * flightTime);
        const progressY = 1 - Math.exp(-0.30 * flightTime);

        const targetX = -3.2 + progressX * 5.6 + Math.sin(elapsed * 2.5) * 0.08;
        const targetY = -1.8 + progressY * 3.6 + Math.sin(elapsed * 6) * 0.06;

        rocketGroupRef.current.position.set(targetX, targetY, 0);
        rocketGroupRef.current.rotation.z = -Math.PI / 4 + Math.sin(elapsed * 3) * 0.05;

        // Thruster Particle Emissions
        if (particlesRef.current) {
          const nozzleOffset = new THREE.Vector3(0, -1.2, 0).applyEuler(rocketGroupRef.current.rotation);
          const origin = rocketGroupRef.current.position.clone().add(nozzleOffset);
          const exhaustDir = new THREE.Vector3(-4, -4, 0).normalize().multiplyScalar(6);

          particlesRef.current.emit(origin, exhaustDir, new THREE.Color(1, 0.45, 0.05), 0.45, 4);
          particlesRef.current.emit(origin, exhaustDir.clone().multiplyScalar(0.7), new THREE.Color(0.8, 0.8, 0.9), 0.7, 2);
        }

        if (thrusterLightRef.current) {
          thrusterLightRef.current.position.copy(rocketGroupRef.current.position);
          thrusterLightRef.current.intensity = 3.0 + Math.random() * 1.5;
        }
      } else if (gameState === 'CRASHED' && nextRoundCountdown === 0) {
        rocketGroupRef.current.visible = false;
        if (thrusterLightRef.current) {
          thrusterLightRef.current.intensity = 0;
        }
      } else {
        // IDLE, COUNTDOWN, or INTERMISSION COUNTDOWN
        rocketGroupRef.current.visible = true;
        const bob = Math.sin(elapsed * 2) * 0.05;
        rocketGroupRef.current.position.set(-3.2, -1.8 + bob, 0);
        rocketGroupRef.current.rotation.z = -Math.PI / 4;

        if (thrusterLightRef.current) {
          thrusterLightRef.current.position.set(-3.2, -1.8, 0);
          thrusterLightRef.current.intensity = gameState === 'COUNTDOWN' ? 1.5 : (nextRoundCountdown > 0 ? 0.8 : 0);
        }
      }
    }

    if (particlesRef.current) {
      particlesRef.current.update(delta);
    }
  };

  // Launch Next Round automatically (Server-Authoritative, No Manual Action)
  const launchNextRound = useCallback(() => {
    if (nextRoundTimerRef.current) {
      clearInterval(nextRoundTimerRef.current);
      nextRoundTimerRef.current = null;
    }
    setNextRoundCountdown(0);
    setGameState('IDLE');
    setMultiplier(1.0);
    currentMultRef.current = 1.0;
    cashingOutSlotRef.current = { 1: false, 2: false };
    isStartingRef.current = false;

    if (rocketGroupRef.current) {
      rocketGroupRef.current.visible = true;
      rocketGroupRef.current.position.set(-3.2, -1.8, 0);
      rocketGroupRef.current.rotation.z = -Math.PI / 4;
    }

    startRound();
  }, []);

  // Launch Rocket with Dual Bets (or Spectator Round if no bets armed)
  const startRound = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    if (nextRoundTimerRef.current) {
      clearInterval(nextRoundTimerRef.current);
      nextRoundTimerRef.current = null;
    }
    if (ignitionIntervalRef.current) {
      clearInterval(ignitionIntervalRef.current);
      ignitionIntervalRef.current = null;
    }
    setNextRoundCountdown(0);

    const betsToPlace: Array<{
      slot: number;
      betAmount: number;
      autoCashout?: number;
      autoCashoutEnabled: boolean;
    }> = [];

    if (slot1Ref.current.placed) {
      betsToPlace.push({
        slot: 1,
        betAmount: slot1Ref.current.betAmount,
        autoCashout: slot1Ref.current.autoCashout,
        autoCashoutEnabled: slot1Ref.current.autoCashoutEnabled,
      });
    }

    if (slot2Ref.current.placed) {
      betsToPlace.push({
        slot: 2,
        betAmount: slot2Ref.current.betAmount,
        autoCashout: slot2Ref.current.autoCashout,
        autoCashoutEnabled: slot2Ref.current.autoCashoutEnabled,
      });
    }

    const totalBet = betsToPlace.reduce((sum, b) => sum + b.betAmount, 0);
    if (totalBet > 0 && balance < totalBet) {
      soundManager.play('loss');
      setErrorMessage('Insufficient demo balance. Launching spectator round.');
      betsToPlace.length = 0;
      setSlot1((prev) => ({ ...prev, placed: false, status: 'IDLE' }));
      setSlot2((prev) => ({ ...prev, placed: false, status: 'IDLE' }));
    }

    setErrorMessage(null);
    soundManager.play('buttonClick');

    // Update statuses to PLACED
    if (slot1Ref.current.placed) setSlot1((prev) => ({ ...prev, status: 'PLACED' }));
    if (slot2Ref.current.placed) setSlot2((prev) => ({ ...prev, status: 'PLACED' }));

    try {
      const res = await apiClient.post('/api/games/original/sky-rocket/start', {
        bets: betsToPlace,
        demoToken: getDemoToken(),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to start rocket round');
      }

      const { roundId: newRoundId, crashPoint: serverCrashPoint, balanceAfter } = res.data.data;
      setRoundId(newRoundId);
      crashPointRef.current = serverCrashPoint || 2.5;
      setLocalDemoBalance(balanceAfter);
      setBalance(balanceAfter);
      cashingOutSlotRef.current = { 1: false, 2: false };

      if (rocketGroupRef.current) {
        rocketGroupRef.current.visible = true;
        rocketGroupRef.current.position.set(-3.2, -1.8, 0);
        rocketGroupRef.current.rotation.z = -Math.PI / 4;
      }

      // Ignition Countdown (3, 2, 1)
      setGameState('COUNTDOWN');
      let count = 3;
      setCountdown(count);
      soundManager.play('countdownBeep');

      ignitionIntervalRef.current = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count > 0) {
          soundManager.play('countdownBeep');
        } else {
          if (ignitionIntervalRef.current) {
            clearInterval(ignitionIntervalRef.current);
            ignitionIntervalRef.current = null;
          }
          // Rocket Ascends
          startTimeRef.current = Date.now();
          currentMultRef.current = 1.0;
          setMultiplier(1.0);
          setGameState('RUNNING');
          isStartingRef.current = false;
          soundManager.play('airplaneEngine');

          // Transition placed slots to RUNNING
          setSlot1((prev) => (prev.placed ? { ...prev, status: 'RUNNING' } : prev));
          setSlot2((prev) => (prev.placed ? { ...prev, status: 'RUNNING' } : prev));
        }
      }, 1000);
    } catch (err: any) {
      console.error('Start error:', err);
      soundManager.play('loss');
      const msg = err.userFacingMessage || err?.response?.data?.message || err?.response?.data?.error || err.message || 'Error launching rocket';
      setErrorMessage(msg);
      if (autoBetActiveRef.current) {
        stopAutoBet(msg);
      }
      setGameState('IDLE');
      isStartingRef.current = false;
      setSlot1((prev) => ({ ...prev, status: prev.placed ? 'PLACED' : 'IDLE' }));
      setSlot2((prev) => ({ ...prev, status: prev.placed ? 'PLACED' : 'IDLE' }));
      // Restart countdown on error so round loop never freezes
      setTimeout(() => {
        startNextRoundIntermission();
      }, 3000);
    }
  };

  // Flight Loop & Independent Auto Cash Out for Slot 1 and Slot 2
  useEffect(() => {
    if (gameState !== 'RUNNING') return;

    let animFrame: number;
    const speedRate = 0.065;

    const tick = () => {
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      const current = +(Math.exp(speedRate * elapsedSec * 2.2)).toFixed(2);
      currentMultRef.current = current;
      setMultiplier(current);

      // Auto Cashout for Slot 1 using current ref
      if (
        slot1Ref.current.status === 'RUNNING' &&
        slot1Ref.current.autoCashoutEnabled &&
        !cashingOutSlotRef.current[1] &&
        current >= slot1Ref.current.autoCashout
      ) {
        cashoutSlot(1, current);
      }

      // Auto Cashout for Slot 2 using current ref
      if (
        slot2Ref.current.status === 'RUNNING' &&
        slot2Ref.current.autoCashoutEnabled &&
        !cashingOutSlotRef.current[2] &&
        current >= slot2Ref.current.autoCashout
      ) {
        cashoutSlot(2, current);
      }

      // Check Server Crash Point
      if (current >= crashPointRef.current) {
        triggerCrash();
        return;
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [gameState]);

  // Cashout Specific Slot Independently
  const cashoutSlot = async (slotNum: 1 | 2, claimedAt?: number) => {
    if (gameState !== 'RUNNING' || cashingOutSlotRef.current[slotNum] || !roundIdRef.current) return;
    cashingOutSlotRef.current[slotNum] = true;

    const claimed = claimedAt ?? currentMultRef.current;

    try {
      const res = await apiClient.post('/api/games/original/sky-rocket/cashout', {
        roundId: roundIdRef.current,
        slot: slotNum,
        claimedMultiplier: claimed,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || `Cashout failed for Slot ${slotNum}`);
      }

      const { outcome, multiplier: finalMult, payout, balanceAfter } = res.data.data;

      if (outcome === 'CRASHED') {
        handleSlotCrashed(slotNum);
      } else {
        soundManager.play('cashoutSuccess');
        setLocalDemoBalance(balanceAfter);
        setBalance(balanceAfter);

        autoBetSessionProfitRef.current += payout;

        const updateSlot = {
          status: 'CASHOUT' as const,
          cashedOutMultiplier: finalMult,
          winAmount: payout,
        };

        if (slotNum === 1) {
          setSlot1((prev) => ({ ...prev, ...updateSlot }));
        } else {
          setSlot2((prev) => ({ ...prev, ...updateSlot }));
        }

        if (particlesRef.current && rocketGroupRef.current) {
          particlesRef.current.burst(
            rocketGroupRef.current.position,
            120,
            new THREE.Color(0.2, 1, 0.4),
            5
          );
        }
      }
    } catch (err: any) {
      console.error(`Slot ${slotNum} cashout error:`, err);
      handleSlotCrashed(slotNum);
    }
  };

  const handleSlotCrashed = (slotNum: 1 | 2) => {
    const updateSlot = {
      status: 'LOST' as const,
      cashedOutMultiplier: currentMultRef.current,
      winAmount: 0,
    };
    if (slotNum === 1) setSlot1((prev) => ({ ...prev, ...updateSlot }));
    else setSlot2((prev) => ({ ...prev, ...updateSlot }));
  };

  // Trigger Crash for Active Slots
  const triggerCrash = async () => {
    if (gameState !== 'RUNNING' || !roundIdRef.current || isCrashingRef.current) return;
    isCrashingRef.current = true;

    try {
      const res = await apiClient.post('/api/games/original/sky-rocket/crash', {
        roundId: roundIdRef.current,
      });

      const { crashPoint, balanceAfter } = res.data?.data || {
        crashPoint: currentMultRef.current,
        balanceAfter: balance,
      };
      handleServerCrash(crashPoint, balanceAfter);
    } catch {
      handleServerCrash(currentMultRef.current, balance);
    }
  };

  const handleServerCrash = (finalPoint: number, balanceAfter: number) => {
    isCrashingRef.current = false;
    setGameState('CRASHED');
    setMultiplier(finalPoint);
    setLocalDemoBalance(balanceAfter);
    setBalance(balanceAfter);

    soundManager.play('crash');
    if (cameraRef.current) {
      cameraRef.current.triggerShake(0.9, 6);
    }
    if (particlesRef.current && rocketGroupRef.current) {
      particlesRef.current.burst(
        rocketGroupRef.current.position,
        220,
        new THREE.Color(1, 0.25, 0.05),
        7
      );
    }

    // Set remaining active slots to LOST
    setSlot1((prev) =>
      prev.status === 'RUNNING' || (prev.placed && prev.status === 'PLACED')
        ? { ...prev, status: 'LOST', cashedOutMultiplier: finalPoint }
        : prev
    );
    setSlot2((prev) =>
      prev.status === 'RUNNING' || (prev.placed && prev.status === 'PLACED')
        ? { ...prev, status: 'LOST', cashedOutMultiplier: finalPoint }
        : prev
    );

    setHistory((prev) => [finalPoint, ...prev.slice(0, 9)]);

    // Start 10-Second Countdown to Next Round
    startNextRoundIntermission();
  };

  // Intermission: 10-Second Countdown and Automatic Next Round
  const startNextRoundIntermission = () => {
    if (nextRoundTimerRef.current) clearInterval(nextRoundTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    let shouldAutoArm = false;
    if (autoBetActiveRef.current) {
      const currentProfit = autoBetSessionProfitRef.current;
      if (stopOnProfitRef.current > 0 && currentProfit >= stopOnProfitRef.current) {
        stopAutoBet(`Stop on Profit limit reached (+₹${currentProfit.toFixed(2)})`);
      } else if (stopOnLossRef.current > 0 && currentProfit <= -stopOnLossRef.current) {
        stopAutoBet(`Stop on Loss limit reached (-₹${Math.abs(currentProfit).toFixed(2)})`);
      } else if (autoBetRemainingRef.current <= 1) {
        stopAutoBet('Completed all automatic rounds');
      } else {
        setAutoBetRemaining((prev) => prev - 1);
        shouldAutoArm = true;
      }
    }

    // Reset slots for the upcoming betting window
    if (shouldAutoArm) {
      // Auto Bet re-arms configured slots
      setSlot1((prev) => ({
        ...prev,
        placed: autoBetSlot1Ref.current,
        status: autoBetSlot1Ref.current ? 'PLACED' : 'IDLE',
        winAmount: undefined,
        cashedOutMultiplier: undefined,
      }));
      setSlot2((prev) => ({
        ...prev,
        placed: autoBetSlot2Ref.current,
        status: autoBetSlot2Ref.current ? 'PLACED' : 'IDLE',
        winAmount: undefined,
        cashedOutMultiplier: undefined,
      }));
    } else {
      // Auto Bet disabled: do NOT place bets automatically
      setSlot1((prev) => ({
        ...prev,
        placed: false,
        status: 'IDLE',
        winAmount: undefined,
        cashedOutMultiplier: undefined,
      }));
      setSlot2((prev) => ({
        ...prev,
        placed: false,
        status: 'IDLE',
        winAmount: undefined,
        cashedOutMultiplier: undefined,
      }));
    }

    // Bring rocket back to launchpad so it is ready
    if (rocketGroupRef.current) {
      rocketGroupRef.current.visible = true;
      rocketGroupRef.current.position.set(-3.2, -1.8, 0);
      rocketGroupRef.current.rotation.z = -Math.PI / 4;
    }

    // Start 10-Second visible countdown
    let secondsLeft = 10;
    setNextRoundCountdown(secondsLeft);

    nextRoundTimerRef.current = setInterval(() => {
      secondsLeft -= 1;
      setNextRoundCountdown(secondsLeft);

      if (secondsLeft > 0) {
        soundManager.play('countdownBeep');
      } else {
        if (nextRoundTimerRef.current) clearInterval(nextRoundTimerRef.current);
        nextRoundTimerRef.current = null;
        setNextRoundCountdown(0);
        // Automatically start the next round
        launchNextRound();
      }
    }, 1000);
  };

  const startAutoBet = () => {
    if (!slot1.placed && !slot2.placed) {
      setErrorMessage('Place at least one bet on Slot 1 or Slot 2 for Auto Bet');
      return;
    }
    autoBetSlot1Ref.current = slot1.placed;
    autoBetSlot2Ref.current = slot2.placed;
    autoBetSessionProfitRef.current = 0;
    setAutoBetRemaining(autoBetRounds);
    setAutoBetActive(true);
    setShowAutoBetModal(false);
    setErrorMessage(null);
    soundManager.play('buttonClick');

    if (gameState === 'IDLE' && nextRoundCountdown === 0) {
      startRound();
    }
  };

  const stopAutoBet = (reason?: string) => {
    setAutoBetActive(false);
    setAutoBetRemaining(0);
    if (reason) setErrorMessage(reason);
    soundManager.play('buttonClick');
  };

  const toggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const totalArmedBet = (slot1.placed ? slot1.betAmount : 0) + (slot2.placed ? slot2.betAmount : 0);
  const isBettingOpen = gameState === 'IDLE' || nextRoundCountdown > 0;

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 bg-dark-950 text-white select-none">
      {/* 3D Flight Viewport Area */}
      <div className="relative flex-1 w-full min-h-[250px] sm:min-h-0 overflow-hidden">
        <Canvas3DViewport onInit={handleInit} onUpdate={handleUpdate} className="absolute inset-0 w-full h-full">
          {/* Top HUD: Brand, Sound, and Multipliers */}
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-auto z-10 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-dark-900/85 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-lg">
                <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
                <span className="font-cinzel text-[11px] sm:text-xs font-black tracking-wider text-cyan-300">
                  SKY ROCKET
                </span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                  AVIATOR CRASH
                </span>
              </div>

              {/* In-Game Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-1 sm:p-1.5 bg-dark-900/85 hover:bg-dark-800 backdrop-blur-md border border-dark-700 hover:border-cyan-500/50 rounded-xl text-gray-300 hover:text-white transition shadow-md"
                title={isMuted ? 'Turn Sound ON' : 'Turn Sound OFF'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
              </button>

              {/* Auto Bet Indicator */}
              {autoBetActive && (
                <div className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 text-[10px] sm:text-xs font-bold animate-pulse">
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                  <span>{autoBetRemaining} LEFT</span>
                </div>
              )}
            </div>

            {/* History Ribbon */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-[140px] sm:max-w-md py-1 no-scrollbar">
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">
                <History className="w-3 h-3 text-gray-500" />
              </span>
              {history.map((h, i) => (
                <span
                  key={i}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold shadow-sm whitespace-nowrap ${
                    h >= 2.0
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  {h.toFixed(2)}x
                </span>
              ))}
            </div>
          </div>

          {/* Central Live HUD */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-3 sm:p-4">
            {gameState === 'IDLE' && nextRoundCountdown === 0 && (
              <div className="text-center space-y-1.5 sm:space-y-2">
                <div className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-cyan-400">
                  READY FOR LAUNCH
                </div>
                <div className="text-4xl sm:text-6xl font-black font-cinzel text-white drop-shadow-lg">
                  1.00x
                </div>
                <div className="text-[11px] sm:text-xs text-gray-400">Configure Bet Slot 1 and/or Slot 2 and launch</div>
              </div>
            )}

            {nextRoundCountdown > 0 && (
              <div className="next-round-countdown-overlay text-center space-y-2 sm:space-y-3 pointer-events-auto bg-dark-950/90 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-5 rounded-2xl sm:rounded-3xl border border-cyan-500/40 shadow-2xl max-w-[92%] sm:max-w-sm mx-auto">
                {/* Last Crash Multiplier */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-rose-400">
                    ROUND CRASHED AT
                  </span>
                  <span className="px-1.5 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 font-black text-xs sm:text-sm">
                    {multiplier.toFixed(2)}x
                  </span>
                </div>

                {/* Next Round Starting Headline */}
                <div className="text-[11px] sm:text-xs uppercase font-black tracking-widest text-amber-400 animate-pulse">
                  NEXT ROUND STARTING IN
                </div>

                {/* Big 10s Countdown Number */}
                <div className="relative flex items-center justify-center my-0.5 sm:my-1">
                  <div className="countdown-number text-5xl sm:text-7xl md:text-8xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-sky-100 to-blue-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]">
                    {nextRoundCountdown}
                  </div>
                </div>

                {/* Progress Bar (10s to 0s) */}
                <div className="w-full h-1.5 sm:h-2 bg-dark-800 rounded-full overflow-hidden border border-cyan-500/30 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                    style={{ width: `${(nextRoundCountdown / 10) * 100}%` }}
                  />
                </div>

                {/* Betting Window Status Pill */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-emerald-300">
                    BETTING OPEN • PLACE YOUR BETS
                  </span>
                </div>
              </div>
            )}

            {gameState === 'COUNTDOWN' && (
              <div className="text-center space-y-1 sm:space-y-2 animate-bounce">
                <div className="text-[11px] sm:text-xs uppercase tracking-widest font-extrabold text-amber-400">
                  IGNITION IN
                </div>
                <div className="text-5xl sm:text-7xl md:text-8xl font-black font-cinzel text-amber-300 drop-shadow-2xl">
                  {countdown}
                </div>
                <div className="text-[11px] sm:text-xs text-amber-300/80 font-bold tracking-wider">
                  PREPARING FLIGHT
                </div>
              </div>
            )}

            {gameState === 'RUNNING' && (
              <div className="text-center space-y-0.5 sm:space-y-1">
                <div className="text-5xl sm:text-7xl md:text-8xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-400 drop-shadow-2xl">
                  {multiplier.toFixed(2)}x
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-cyan-300 uppercase tracking-widest animate-pulse">
                  ALTITUDE RISING
                </div>
              </div>
            )}

            {gameState === 'CRASHED' && nextRoundCountdown === 0 && (
              <div className="text-center space-y-1.5 sm:space-y-2 animate-shake pointer-events-auto">
                <div className="text-[11px] sm:text-xs font-extrabold text-rose-400 uppercase tracking-widest">
                  ROCKET CRASHED AT
                </div>
                <div className="text-5xl sm:text-6xl md:text-7xl font-black font-cinzel text-rose-500 drop-shadow-2xl">
                  {multiplier.toFixed(2)}x
                </div>
                <div className="text-[10px] sm:text-xs text-rose-300/80 font-semibold">
                  Round Settled • Results recorded in Demo Wallet
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-4 px-3 py-1.5 bg-rose-950/90 border border-rose-500/60 rounded-xl text-xs text-rose-300 flex items-center gap-1.5 shadow-xl">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </Canvas3DViewport>
      </div>

      {/* Auto Bet Toolbar & Master Controls */}
      <div className="bg-dark-900/90 border-t border-dark-800 px-2 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowAutoBetModal(!showAutoBetModal)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition ${
              autoBetActive
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-dark-800 border-dark-700 text-gray-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto Bet Settings</span>
          </button>

          {autoBetActive ? (
            <button
              onClick={() => stopAutoBet('Auto Bet stopped by user')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-black uppercase text-[11px] shadow-lg animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Auto Bet</span>
            </button>
          ) : (
            <button
              onClick={startAutoBet}
              disabled={!isBettingOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 rounded-lg font-bold text-[11px] disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Auto Bet</span>
            </button>
          )}
        </div>

        {/* Automatic Continuous Round Status Indicator */}
        <div className="flex items-center gap-2">
          {nextRoundCountdown > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-black">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>NEXT ROUND IN {nextRoundCountdown}s (AUTO LAUNCH)</span>
            </div>
          ) : gameState === 'COUNTDOWN' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/15 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs font-black">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>IGNITION • LAUNCHING IN {countdown}s</span>
            </div>
          ) : gameState === 'RUNNING' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-black">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>ROCKET IN FLIGHT ({multiplier.toFixed(2)}x)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-black">
              <span>ROUND CRASHED ({multiplier.toFixed(2)}x)</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto Bet Drawer */}
      {showAutoBetModal && (
        <div className="bg-dark-900 border-t border-dark-700 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-semibold">Rounds:</span>
              <div className="flex gap-1">
                {[5, 10, 25, 50].map((r) => (
                  <button
                    key={r}
                    onClick={() => setAutoBetRounds(r)}
                    className={`px-2.5 py-1 rounded-md font-bold ${
                      autoBetRounds === r
                        ? 'bg-cyan-500 text-black'
                        : 'bg-dark-800 text-gray-300 hover:bg-dark-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-semibold">Stop on Profit:</span>
              <div className="flex items-center bg-dark-950 border border-dark-700 rounded-lg px-2 py-0.5">
                <span className="text-gold mr-1">₹</span>
                <input
                  type="number"
                  value={stopOnProfit}
                  onChange={(e) => setStopOnProfit(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 bg-transparent text-white text-center focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-semibold">Stop on Loss:</span>
              <div className="flex items-center bg-dark-950 border border-dark-700 rounded-lg px-2 py-0.5">
                <span className="text-gold mr-1">₹</span>
                <input
                  type="number"
                  value={stopOnLoss}
                  onChange={(e) => setStopOnLoss(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 bg-transparent text-white text-center focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAutoBetModal(false)}
            className="px-3 py-1 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      )}

      {/* ─── DUAL INDEPENDENT BET SLOTS ────────────────────────────────────────── */}
      <div className="bg-dark-950 border-t border-dark-800 px-2 sm:px-6 py-2 sm:py-3.5 grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4 z-20 shadow-2xl">
        {/* ── BET SLOT 1 ── */}
        <div className="slot-panel-1 bg-dark-900 border border-dark-800 hover:border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 sm:gap-3 transition">
          {/* Slot Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm" />
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                BET SLOT 1
              </span>
            </div>

            {/* Status Pill */}
            {slot1.status === 'RUNNING' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                IN FLIGHT (₹{slot1.betAmount})
              </span>
            )}
            {slot1.status === 'CASHOUT' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                WON +₹{slot1.winAmount?.toFixed(2)} ({slot1.cashedOutMultiplier}x)
              </span>
            )}
            {slot1.status === 'LOST' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40">
                LOST (₹{slot1.betAmount})
              </span>
            )}
            {slot1.status === 'PLACED' && isBettingOpen && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BET ARMED (₹{slot1.betAmount})
              </span>
            )}
          </div>

          {/* Quick Bet Buttons & Inputs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-dark-700 overflow-x-auto no-scrollbar max-w-full">
              {[10, 50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  disabled={!isBettingOpen}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setSlot1((prev) => ({ ...prev, betAmount: amt }));
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                    slot1.betAmount === amt
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white disabled:opacity-40'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Auto Cash Out Setting */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={slot1.autoCashoutEnabled}
                  disabled={!isBettingOpen}
                  onChange={(e) => setSlot1((prev) => ({ ...prev, autoCashoutEnabled: e.target.checked }))}
                  className="accent-cyan-500 rounded cursor-pointer"
                />
                <span className="text-[11px] text-gray-400">Auto Cashout</span>
              </label>
              <input
                type="number"
                step="0.05"
                min="1.05"
                max="100"
                value={slot1.autoCashout}
                disabled={!slot1.autoCashoutEnabled || !isBettingOpen}
                onChange={(e) =>
                  setSlot1((prev) => ({
                    ...prev,
                    autoCashout: Math.max(1.05, parseFloat(e.target.value) || 1.1),
                  }))
                }
                className="w-14 bg-dark-950 border border-dark-700 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none disabled:opacity-40"
              />
              <span className="text-xs text-gray-500">x</span>
            </div>
          </div>

          {/* Slot 1 Action Button */}
          <div>
            {gameState === 'RUNNING' && slot1.status === 'RUNNING' ? (
              <button
                onClick={() => cashoutSlot(1)}
                className="btn-cashout-slot-1 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 hover:from-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.02] active:scale-95 animate-pulse"
              >
                <TrendingUp className="w-4 h-4 fill-current" />
                <span>CASHOUT ₹{(slot1.betAmount * multiplier).toFixed(2)}</span>
              </button>
            ) : isBettingOpen ? (
              <button
                disabled={!slot1.placed && balance < slot1.betAmount}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setSlot1((prev) => ({
                    ...prev,
                    placed: !prev.placed,
                    status: !prev.placed ? 'PLACED' : 'IDLE',
                  }));
                }}
                className={`btn-bet-slot-1 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-md ${
                  slot1.placed
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-cyan-500/25 hover:scale-[1.02]'
                    : 'bg-dark-800 text-gray-400 hover:text-white border border-dark-700'
                }`}
              >
                {slot1.placed ? <Check className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                <span>
                  {slot1.placed
                    ? `✓ ARMED SLOT 1 (₹${slot1.betAmount})`
                    : `BET SLOT 1 (₹${slot1.betAmount})`}
                </span>
              </button>
            ) : slot1.status === 'CASHOUT' ? (
              <div className="w-full py-2.5 sm:py-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-center text-xs font-black text-emerald-300">
                ✓ CASHED OUT: +₹{slot1.winAmount?.toFixed(2)} ({slot1.cashedOutMultiplier}x)
              </div>
            ) : slot1.status === 'LOST' ? (
              <div className="w-full py-2.5 sm:py-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-center text-xs font-black text-rose-400">
                ✕ CRASHED (₹{slot1.betAmount} LOST)
              </div>
            ) : (
              <div className="w-full py-2.5 sm:py-3 bg-dark-800 border border-dark-700 rounded-xl text-center text-xs font-bold text-gray-500">
                WAITING FOR NEXT ROUND
              </div>
            )}
          </div>
        </div>

        {/* ── BET SLOT 2 ── */}
        <div className="slot-panel-2 bg-dark-900 border border-dark-800 hover:border-amber-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 sm:gap-3 transition">
          {/* Slot Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                BET SLOT 2
              </span>
            </div>

            {/* Status Pill */}
            {slot2.status === 'RUNNING' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                IN FLIGHT (₹{slot2.betAmount})
              </span>
            )}
            {slot2.status === 'CASHOUT' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                WON +₹{slot2.winAmount?.toFixed(2)} ({slot2.cashedOutMultiplier}x)
              </span>
            )}
            {slot2.status === 'LOST' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40">
                LOST (₹{slot2.betAmount})
              </span>
            )}
            {slot2.status === 'PLACED' && isBettingOpen && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                BET ARMED (₹{slot2.betAmount})
              </span>
            )}
          </div>

          {/* Quick Bet Buttons & Inputs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-dark-700 overflow-x-auto no-scrollbar max-w-full">
              {[10, 50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  disabled={!isBettingOpen}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setSlot2((prev) => ({ ...prev, betAmount: amt }));
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                    slot2.betAmount === amt
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-gray-400 hover:text-white disabled:opacity-40'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Auto Cash Out Setting */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={slot2.autoCashoutEnabled}
                  disabled={!isBettingOpen}
                  onChange={(e) => setSlot2((prev) => ({ ...prev, autoCashoutEnabled: e.target.checked }))}
                  className="accent-amber-400 rounded cursor-pointer"
                />
                <span className="text-[11px] text-gray-400">Auto Cashout</span>
              </label>
              <input
                type="number"
                step="0.05"
                min="1.05"
                max="100"
                value={slot2.autoCashout}
                disabled={!slot2.autoCashoutEnabled || !isBettingOpen}
                onChange={(e) =>
                  setSlot2((prev) => ({
                    ...prev,
                    autoCashout: Math.max(1.05, parseFloat(e.target.value) || 1.1),
                  }))
                }
                className="w-14 bg-dark-950 border border-dark-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none disabled:opacity-40"
              />
              <span className="text-xs text-gray-500">x</span>
            </div>
          </div>

          {/* Slot 2 Action Button */}
          <div>
            {gameState === 'RUNNING' && slot2.status === 'RUNNING' ? (
              <button
                onClick={() => cashoutSlot(2)}
                className="btn-cashout-slot-2 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 hover:from-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.02] active:scale-95 animate-pulse"
              >
                <TrendingUp className="w-4 h-4 fill-current" />
                <span>CASHOUT ₹{(slot2.betAmount * multiplier).toFixed(2)}</span>
              </button>
            ) : isBettingOpen ? (
              <button
                disabled={!slot2.placed && balance < slot2.betAmount}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setSlot2((prev) => ({
                    ...prev,
                    placed: !prev.placed,
                    status: !prev.placed ? 'PLACED' : 'IDLE',
                  }));
                }}
                className={`btn-bet-slot-2 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-md ${
                  slot2.placed
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-400/25 hover:scale-[1.02]'
                    : 'bg-dark-800 text-gray-400 hover:text-white border border-dark-700'
                }`}
              >
                {slot2.placed ? <Check className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                <span>
                  {slot2.placed
                    ? `✓ ARMED SLOT 2 (₹${slot2.betAmount})`
                    : `BET SLOT 2 (₹${slot2.betAmount})`}
                </span>
              </button>
            ) : slot2.status === 'CASHOUT' ? (
              <div className="w-full py-2.5 sm:py-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-center text-xs font-black text-emerald-300">
                ✓ CASHED OUT: +₹{slot2.winAmount?.toFixed(2)} ({slot2.cashedOutMultiplier}x)
              </div>
            ) : slot2.status === 'LOST' ? (
              <div className="w-full py-2.5 sm:py-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-center text-xs font-black text-rose-400">
                ✕ CRASHED (₹{slot2.betAmount} LOST)
              </div>
            ) : (
              <div className="w-full py-2.5 sm:py-3 bg-dark-800 border border-dark-700 rounded-xl text-center text-xs font-bold text-gray-500">
                WAITING FOR NEXT ROUND
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkyRocket3D;
