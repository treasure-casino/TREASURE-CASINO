import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlinkoRows,
  PlinkoRisk,
  PlinkoConfig,
  PlinkoHistoryItem,
} from '../../../types/plinko';
import { plinkoApi } from '../../../services/plinkoApi';
import { getDemoBalance, setLocalDemoBalance } from '../../../utils/demoWallet';
import {
  Coins,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Trophy,
  History,
  Shield,
  Layers,
  Flame,
  Zap,
  RotateCcw,
} from 'lucide-react';

// Web Audio Sound Synthesizer for high-performance physical acoustic feedback
class PlinkoAudio {
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

  // Pin collision: crisp metallic ping with dynamic pitch based on row
  playPinBounce(row = 0, totalRows = 16) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch increases progressively down the board (600Hz to 1400Hz)
      const baseFreq = 650 + (row / totalRows) * 650;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.05);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio fallback
    }
  }

  // Slot landing chime
  playSlotLand(multiplier: number) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const isWin = multiplier >= 1.5;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isWin ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isWin ? 523.25 : 300, now);
      if (isWin) {
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      }

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio fallback
    }
  }

  // Big Win Fanfare
  playBigWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.3, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.35);
      });
    } catch {
      // Audio fallback
    }
  }
}

const audio = new PlinkoAudio();

// Ball simulation object
interface ActiveBall {
  id: string;
  roundId: string;
  betAmount: number;
  path: number[]; // 0 for Left, 1 for Right at each row pin
  slotIndex: number;
  multiplier: number;
  payout: number;
  profit: number;
  isWin: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  currentRow: number;
  currentCol: number;
  radius: number;
  color: string;
  glowColor: string;
  trail: { x: number; y: number; alpha: number }[];
  settled: boolean;
}

interface Pin {
  x: number;
  y: number;
  row: number;
  col: number;
  hitTime: number; // timestamp of last hit for glow animation
}

interface MultiplierSlot {
  index: number;
  multiplier: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hitTime: number;
}

const QUICK_CHIPS = [10, 50, 100, 500, 1000];

export const TreasurePlinko2D: React.FC = () => {
  // Game Setup
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [rows, setRows] = useState<PlinkoRows>(16);
  const [risk, setRisk] = useState<PlinkoRisk>('HIGH');

  // Backend Config & History
  const [config, setConfig] = useState<PlinkoConfig | null>(null);
  const [history, setHistory] = useState<PlinkoHistoryItem[]>([]);
  const [muted, setMuted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Auto Play
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoRoundsLeft, setAutoRoundsLeft] = useState<number>(0);
  const [stopOnProfit, setStopOnProfit] = useState<string>('');
  const [stopOnLoss, setStopOnLoss] = useState<string>('');
  const autoPlayStartBalanceRef = useRef<number>(balance);
  const isAutoPlayingRef = useRef<boolean>(false);
  const autoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Simulation Entities
  const ballsRef = useRef<ActiveBall[]>([]);
  const pinsRef = useRef<Pin[]>([]);
  const slotsRef = useRef<MultiplierSlot[]>([]);
  const boardLayoutRef = useRef<{
    width: number;
    height: number;
    topY: number;
    rowSpacing: number;
    pinSpacing: number;
    centerX: number;
  }>({
    width: 800,
    height: 600,
    topY: 40,
    rowSpacing: 30,
    pinSpacing: 35,
    centerX: 400,
  });

  // Toggle Mute
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

  // Fetch initial config and history
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [loadedConfig, loadedHistory] = await Promise.all([
          plinkoApi.getConfig().catch(() => null),
          plinkoApi.getHistory(10).catch(() => []),
        ]);
        if (!isMounted) return;
        if (loadedConfig) setConfig(loadedConfig);
        if (loadedHistory) setHistory(loadedHistory);
      } catch (err) {
        console.warn('Plinko load error:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Multiplier table helper for current rows & risk
  const currentMultipliers = config?.multiplierTables?.[rows]?.[risk] || [
    1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000,
  ];

  // ── Compute Board Layout & Pin Coordinates ──
  const calculateLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;

    const bottomPadding = 75; // Space for multiplier slots
    const topY = 40;
    const availableHeight = height - topY - bottomPadding;
    const rowSpacing = availableHeight / rows;
    // Pin spacing scales with total rows to fill triangular space harmoniously
    const maxPinsBottom = rows + 2;
    const pinSpacing = Math.min((width - 60) / maxPinsBottom, rowSpacing * 1.25);

    boardLayoutRef.current = {
      width,
      height,
      topY,
      rowSpacing,
      pinSpacing,
      centerX,
    };

    // Generate Pins: Row 0 has 3 pins, Row r has r + 3 pins
    const newPins: Pin[] = [];
    for (let r = 0; r <= rows; r++) {
      const count = r + 3;
      const startX = centerX - ((count - 1) / 2) * pinSpacing;
      const y = topY + r * rowSpacing;

      for (let c = 0; c < count; c++) {
        const x = startX + c * pinSpacing;
        newPins.push({
          x,
          y,
          row: r,
          col: c,
          hitTime: 0,
        });
      }
    }
    pinsRef.current = newPins;

    // Generate Slots at bottom: rows + 1 slots
    const totalSlots = rows + 1;
    const bottomRowY = topY + rows * rowSpacing;
    const slotY = bottomRowY + rowSpacing * 0.85;
    const slotWidth = pinSpacing * 0.92;
    const slotHeight = 36;
    const slotsStartX = centerX - ((totalSlots - 1) / 2) * pinSpacing;

    const newSlots: MultiplierSlot[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const x = slotsStartX + i * pinSpacing;
      newSlots.push({
        index: i,
        multiplier: currentMultipliers[i] ?? 1.0,
        x,
        y: slotY,
        width: slotWidth,
        height: slotHeight,
        hitTime: 0,
      });
    }
    slotsRef.current = newSlots;
  }, [rows, currentMultipliers]);

  // Resize Canvas to fit container with HiDPI support
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor(rect.width);
      // Height proportional to width with minimum constraint
      const displayHeight = Math.max(540, Math.floor(displayWidth * 0.85));

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      calculateLayout();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [calculateLayout]);

  // Color generator for multiplier slots
  const getSlotColor = (mult: number) => {
    if (mult >= 100) return { bg: '#dc2626', border: '#f87171', text: '#ffffff' }; // Red
    if (mult >= 20) return { bg: '#ea580c', border: '#fb923c', text: '#ffffff' }; // Orange
    if (mult >= 5) return { bg: '#d97706', border: '#fcd34d', text: '#000000' }; // Amber
    if (mult >= 2) return { bg: '#16a34a', border: '#86efac', text: '#ffffff' }; // Emerald
    if (mult >= 1) return { bg: '#2563eb', border: '#93c5fd', text: '#ffffff' }; // Blue
    return { bg: '#7c3aed', border: '#c4b5fd', text: '#ffffff' }; // Violet
  };

  // ── Physics & Rendering Loop ──
  useEffect(() => {
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const now = Date.now();

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.4,
        20,
        width / 2,
        height * 0.5,
        width * 0.65
      );
      bgGrad.addColorStop(0, '#0c151c');
      bgGrad.addColorStop(0.6, '#060a0f');
      bgGrad.addColorStop(1, '#020406');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const layout = boardLayoutRef.current;

      // ── 1. Draw Multiplier Slots ──
      slotsRef.current.forEach((slot) => {
        const isRecentlyHit = now - slot.hitTime < 450;
        const color = getSlotColor(slot.multiplier);

        const slotX = slot.x - slot.width / 2;
        const slotY = slot.y;
        const radius = 6;

        ctx.save();
        if (isRecentlyHit) {
          ctx.shadowColor = color.border;
          ctx.shadowBlur = 20;
          ctx.transform(1, 0, 0, 1, 0, -2);
        }

        // Rounded box
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slot.width, slot.height, radius);
        ctx.fillStyle = isRecentlyHit ? '#ffffff' : color.bg;
        ctx.fill();

        ctx.lineWidth = isRecentlyHit ? 2.5 : 1.2;
        ctx.strokeStyle = isRecentlyHit ? '#ffffff' : color.border;
        ctx.stroke();

        // Multiplier Label
        ctx.fillStyle = isRecentlyHit ? '#000000' : color.text;
        const fontSize = Math.max(9, Math.min(13, slot.width * 0.32));
        ctx.font = `900 ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = slot.multiplier >= 100 ? `${slot.multiplier}` : `${slot.multiplier}x`;
        ctx.fillText(label, slot.x, slotY + slot.height / 2);
        ctx.restore();
      });

      // ── 2. Draw Pins with Metallic Shading & Hit Glow ──
      pinsRef.current.forEach((pin) => {
        const isHit = now - pin.hitTime < 300;
        const pinRadius = Math.max(3.2, Math.min(5.5, layout.pinSpacing * 0.12));

        ctx.save();
        if (isHit) {
          // Shockwave aura ring
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, pinRadius * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 15;
        }

        // Pin body
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, pinRadius, 0, Math.PI * 2);
        const pinGrad = ctx.createRadialGradient(
          pin.x - pinRadius * 0.3,
          pin.y - pinRadius * 0.3,
          1,
          pin.x,
          pin.y,
          pinRadius
        );
        if (isHit) {
          pinGrad.addColorStop(0, '#ffffff');
          pinGrad.addColorStop(1, '#eab308');
        } else {
          pinGrad.addColorStop(0, '#fef08a');
          pinGrad.addColorStop(0.5, '#eab308');
          pinGrad.addColorStop(1, '#854d0e');
        }
        ctx.fillStyle = pinGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      });

      // ── 3. Update & Draw Active Balls ──
      const balls = ballsRef.current;
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];

        if (ball.settled) {
          // Fade out / remove settled ball
          balls.splice(i, 1);
          continue;
        }

        // Add trail point
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.7 });
        if (ball.trail.length > 7) ball.trail.shift();

        // Draw trail
        for (let t = 0; t < ball.trail.length; t++) {
          const pt = ball.trail[t];
          pt.alpha *= 0.88;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ball.radius * (0.4 + (t / ball.trail.length) * 0.6), 0, Math.PI * 2);
          ctx.fillStyle = `${ball.glowColor} ${pt.alpha})`;
          ctx.fill();
        }

        // Target row navigation
        const targetRow = ball.currentRow;

        if (targetRow <= rows) {
          const nextRowY = layout.topY + targetRow * layout.rowSpacing;

          // Physics integration
          const gravity = 0.38;
          ball.vy += gravity;
          ball.y += ball.vy;

          // Target X based on cumulative path decisions (0 = left, 1 = right)
          // At row r, ball aims for slot index sum(path[0..r-1])
          const sumDecisions = ball.path.slice(0, targetRow).reduce((a, b) => a + b, 0);
          // Calculate center of the pin gap at target row
          const pinsInTargetRow = targetRow + 3;
          const startX = layout.centerX - ((pinsInTargetRow - 1) / 2) * layout.pinSpacing;
          const targetX = startX + (sumDecisions + 1) * layout.pinSpacing;

          // Smooth horizontal spring steering toward the calculated path peg
          const dx = targetX - ball.x;
          ball.vx += dx * 0.045;
          ball.vx *= 0.86; // friction damping
          ball.x += ball.vx;

          // Check if ball crossed current row level -> trigger pin bounce!
          if (ball.y >= nextRowY) {
            ball.currentRow += 1;
            ball.vy = -ball.vy * 0.35; // bounce restitution

            // Locate closest pin in this row and trigger hit animation + audio
            let closestPin: Pin | null = null;
            let minDist = 9999;
            pinsRef.current.forEach((pin) => {
              if (pin.row === targetRow) {
                const dist = Math.hypot(pin.x - ball.x, pin.y - ball.y);
                if (dist < minDist) {
                  minDist = dist;
                  closestPin = pin;
                }
              }
            });

            if (closestPin) {
              (closestPin as Pin).hitTime = now;
              audio.playPinBounce(targetRow, rows);
            }
          }
        } else {
          // Falling into bottom multiplier slot
          ball.vy += 0.45;
          ball.y += ball.vy;

          // Steer towards target slot
          const targetSlot = slotsRef.current[ball.slotIndex];
          if (targetSlot) {
            const dx = targetSlot.x - ball.x;
            ball.vx += dx * 0.08;
            ball.vx *= 0.82;
            ball.x += ball.vx;

            // Check if ball arrived in slot
            if (ball.y >= targetSlot.y + targetSlot.height / 2) {
              ball.settled = true;
              targetSlot.hitTime = now;

              // Audio & visual celebration
              audio.playSlotLand(ball.multiplier);
              if (ball.multiplier >= 10) {
                audio.playBigWin();
              }

              // Update history and banner message
              setHistory((prev) => [
                {
                  id: ball.roundId,
                  betAmount: ball.betAmount ?? 50,
                  payout: ball.payout,
                  multiplier: ball.multiplier,
                  rows,
                  risk,
                  slotIndex: ball.slotIndex,
                  createdAt: new Date().toISOString(),
                },
                ...prev.slice(0, 14),
              ]);

              if (ball.isWin) {
                setBannerMessage(
                  `WIN! ₹${ball.payout.toFixed(2)} (${ball.multiplier}x)`
                );
              } else {
                setBannerMessage(`LANDED: ${ball.multiplier}x`);
              }
            }
          }
        }

        // Draw Ball
        ctx.save();
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.35,
          ball.y - ball.radius * 0.35,
          1,
          ball.x,
          ball.y,
          ball.radius
        );
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.4, ball.color);
        ballGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = ballGrad;
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [rows, currentMultipliers]);

  // ── Action: Drop Single Ball ──
  const handleDropBall = async () => {
    if (balance < betAmount) {
      setError(`Insufficient demo balance. Minimum required: ₹${betAmount}`);
      return;
    }
    setError(null);

    try {
      const data = await plinkoApi.dropBall({
        betAmount,
        rows,
        risk,
      });

      // Update local demo wallet balance immediately
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);

      const layout = boardLayoutRef.current;
      const initialBallRadius = Math.max(5.5, Math.min(8.5, layout.pinSpacing * 0.22));

      // Spawn ball at top apex
      const newBall: ActiveBall = {
        id: data.roundId,
        roundId: data.roundId,
        betAmount: data.betAmount,
        path: data.path,
        slotIndex: data.slotIndex,
        multiplier: data.multiplier,
        payout: data.payout,
        profit: data.profit,
        isWin: data.isWin,
        x: layout.centerX + (Math.random() * 4 - 2),
        y: layout.topY - 18,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1.5,
        currentRow: 0,
        currentCol: 1,
        radius: initialBallRadius,
        color: '#f59e0b',
        glowColor: 'rgba(245, 158, 11,',
        trail: [],
        settled: false,
      };

      ballsRef.current.push(newBall);
    } catch (err: any) {
      setError(err?.userFacingMessage || err?.message || 'Failed to drop ball');
      if (isAutoPlayingRef.current) stopAutoPlay();
    }
  };

  // ── Auto Play Loop ──
  const startAutoPlay = (roundsCount = 50) => {
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

    // Check stop criteria
    const currentBalance = getDemoBalance();
    const netProfit = currentBalance - autoPlayStartBalanceRef.current;

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

    await handleDropBall();
    setAutoRoundsLeft(remaining - 1);

    // Stagger drops smoothly by 450ms
    autoTimeoutRef.current = setTimeout(() => {
      runAutoPlayStep(remaining - 1);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none text-white p-2 sm:p-4">
      {/* ── Top Bar: Branding, Multiplier Pill, Audio Toggle ── */}
      <div className="w-full flex items-center justify-between bg-dark-900/85 backdrop-blur border border-dark-800 rounded-2xl px-4 py-2.5 mb-3 shadow-lg">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold animate-pulse" />
            <span className="font-cinzel text-sm sm:text-base font-black tracking-wider text-white">
              TREASURE PLINKO
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-gold font-bold border border-gold/30">
              UP TO 1,000x
            </span>
          </div>
        </div>

        {/* Center: Live Round History Badges */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-md">
          {history.slice(0, 8).map((h) => (
            <div
              key={h.id}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                h.multiplier >= 10
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                  : h.multiplier >= 2.0
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}
            >
              {h.multiplier}x
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
        {/* Left Side (4 Cols): Betting & Configuration HUD */}
        <div className="lg:col-span-4 flex flex-col gap-3.5 bg-dark-900/90 backdrop-blur border border-dark-800 rounded-3xl p-4 sm:p-5 shadow-2xl">
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
                disabled={isAutoPlaying}
                onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-dark-950 border border-dark-700 focus:border-gold/60 rounded-xl pl-7 pr-24 py-2.5 text-sm font-mono font-bold text-white focus:outline-none transition"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  disabled={isAutoPlaying}
                  onClick={() => setBetAmount((b) => Math.max(10, Math.floor(b / 2)))}
                  className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-[10px] font-bold text-gray-300 hover:text-white transition"
                >
                  ½
                </button>
                <button
                  disabled={isAutoPlaying}
                  onClick={() => setBetAmount((b) => Math.min(config?.maxBet ?? 5000, b * 2))}
                  className="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-[10px] font-bold text-gray-300 hover:text-white transition"
                >
                  2×
                </button>
                <button
                  disabled={isAutoPlaying}
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
                  disabled={isAutoPlaying}
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

          {/* Risk Level Selector (LOW, MEDIUM, HIGH) */}
          <div className="space-y-1.5">
            <div className="text-xs text-gray-400 font-semibold px-1 flex items-center justify-between">
              <span>RISK LEVEL</span>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">{risk} RISK</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as PlinkoRisk[]).map((r) => (
                <button
                  key={r}
                  disabled={isAutoPlaying}
                  onClick={() => setRisk(r)}
                  className={`py-2 rounded-xl text-xs font-black tracking-wider uppercase border transition ${
                    risk === r
                      ? r === 'HIGH'
                        ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-400 shadow-md'
                        : r === 'MEDIUM'
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black border-amber-300 shadow-md'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-300 shadow-md'
                      : 'bg-dark-800 hover:bg-dark-750 text-gray-400 border-dark-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Rows Selector (8, 12, 16) */}
          <div className="space-y-1.5">
            <div className="text-xs text-gray-400 font-semibold px-1 flex items-center justify-between">
              <span>BOARD ROWS</span>
              <span className="text-[10px] font-mono text-gold">{rows} ROWS ({rows + 1} SLOTS)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([8, 12, 16] as PlinkoRows[]).map((rowCount) => (
                <button
                  key={rowCount}
                  disabled={isAutoPlaying}
                  onClick={() => setRows(rowCount)}
                  className={`py-2 rounded-xl text-xs font-mono font-black border transition ${
                    rows === rowCount
                      ? 'bg-amber-500 text-black border-yellow-200 shadow-md scale-102'
                      : 'bg-dark-800 hover:bg-dark-750 text-gray-300 border-dark-700'
                  }`}
                >
                  {rowCount} ROWS
                </button>
              ))}
            </div>
          </div>

          {/* DROP BALL / ACTION BUTTONS */}
          <div className="pt-2 space-y-2">
            {!isAutoPlaying ? (
              <button
                onClick={handleDropBall}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-cinzel font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/40 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>DROP BALL (₹{betAmount})</span>
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

            {/* Auto Play Accordion / Triggers */}
            <div className="pt-2 border-t border-dark-800">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2">
                <span>AUTO PLAY CONTROLS</span>
                {isAutoPlaying && (
                  <span className="text-[10px] font-mono text-emerald-400 animate-pulse">ACTIVE</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {[10, 25, 50, 100].map((count) => (
                  <button
                    key={count}
                    disabled={isAutoPlaying}
                    onClick={() => startAutoPlay(count)}
                    className="py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-[11px] font-mono font-bold text-gray-300 hover:text-white border border-dark-700 transition"
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

          {/* Banner / Feedback Messages */}
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

        {/* Right Side (8 Cols): High-Resolution 2D Plinko Board Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-8 relative w-full flex flex-col items-center justify-center bg-dark-950 rounded-3xl border-4 border-[#251d14] shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden p-2 sm:p-4 min-h-[540px]"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #0c1824 0%, #070d14 60%, #020407 100%)',
          }}
        >
          {/* Subtle silkscreen apex indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center opacity-60">
            <div className="w-8 h-2 rounded-full bg-gold/40 mb-1" />
            <span className="text-[8px] font-cinzel font-black tracking-widest text-gold/80">DROP ZONE</span>
          </div>

          <canvas ref={canvasRef} className="block w-full h-full max-w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
};

export default TreasurePlinko2D;
