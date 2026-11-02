import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { GameItem } from '../../types';
import { getDemoBalance, resetDemoBalance } from '../../utils/demoWallet';
import { soundManager } from '../../utils/soundManager';
import { TreasureKingdom3D } from '../../components/games/slots/TreasureKingdom3D';
import { SkyRocket3D } from '../../components/games/crash/SkyRocket3D';
import { CrystalMines3D } from '../../components/games/mines/CrystalMines3D';
import { TreasureVortex3D } from '../../components/games/vortex/TreasureVortex3D';
import { TreasureSpiral2D } from '../../components/games/spiral/TreasureSpiral2D';
import { TreasureLimbo2D } from '../../components/games/limbo/TreasureLimbo2D';
import { TreasureDice2D } from '../../components/games/dice/TreasureDice2D';
import { TreasureBlackjack2D } from '../../components/games/blackjack/TreasureBlackjack2D';
import { TreasurePlinko2D } from '../../components/games/plinko/TreasurePlinko2D';
import { TreasureKeno2D } from '../../components/games/keno/TreasureKeno2D';
import { TreasureHilo2D } from '../../components/games/hilo/TreasureHilo2D';
import { TreasureHotline2D } from '../../components/games/hotline/TreasureHotline2D';
import { TreasureChickenRun2D } from '../../components/games/chickenRun/TreasureChickenRun2D';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  ShieldCheck,
  Coins,
  Crown,
  Sparkles,
  Maximize2,
  Loader2,
} from 'lucide-react';

export const PLAYABLE_GAMES_MAP: Record<string, string> = {
  'game-slot-01': 'Treasure Kingdom',
  'treasure-kingdom': 'Treasure Kingdom',
  'game-crash-01': 'Sky Rocket',
  'sky-rocket': 'Sky Rocket',
  'sky-aviator': 'Sky Rocket',
  'aviator': 'Sky Rocket',
  'game-mines-01': 'Crystal Mines',
  'crystal-mines': 'Crystal Mines',
  'game-vortex-01': 'Treasure Vortex',
  'treasure-vortex': 'Treasure Vortex',
  'vortex': 'Treasure Vortex',
  'game-spiral-01': 'Treasure Spiral',
  'treasure-spiral': 'Treasure Spiral',
  'spiral': 'Treasure Spiral',
  'game-limbo-01': 'Treasure Limbo',
  'treasure-limbo': 'Treasure Limbo',
  'limbo': 'Treasure Limbo',
  'game-dice-01': 'Treasure Dice',
  'treasure-dice': 'Treasure Dice',
  'dice': 'Treasure Dice',
  'game-blackjack-01': 'Treasure Blackjack',
  'treasure-blackjack': 'Treasure Blackjack',
  'blackjack': 'Treasure Blackjack',
  'game-plinko-01': 'Treasure Plinko',
  'treasure-plinko': 'Treasure Plinko',
  'plinko': 'Treasure Plinko',
  'game-keno-01': 'Treasure Keno',
  'treasure-keno': 'Treasure Keno',
  'keno': 'Treasure Keno',
  'game-hilo-01': 'Treasure Hilo',
  'treasure-hilo': 'Treasure Hilo',
  'hilo': 'Treasure Hilo',
  'game-hotline-01': 'Treasure Hotline',
  'treasure-hotline': 'Treasure Hotline',
  'hotline': 'Treasure Hotline',
  'game-chicken-run-01': 'Treasure Chicken Run',
  'treasure-chicken-run': 'Treasure Chicken Run',
  'chicken-run': 'Treasure Chicken Run',
  'chicken': 'Treasure Chicken Run',
};

export const GameArenaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleBalance = () => setBalance(getDemoBalance());
    const handleSound = (e: any) => setIsMuted(e.detail.isMuted);

    window.addEventListener('demo_balance_updated', handleBalance);
    window.addEventListener('sound_settings_changed', handleSound);
    return () => {
      window.removeEventListener('demo_balance_updated', handleBalance);
      window.removeEventListener('sound_settings_changed', handleSound);
    };
  }, []);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        if (!id) return;
        const res = await apiClient.get(`/api/games/${id}`);
        if (res.data?.success && res.data?.data) {
          setGame(res.data.data);
        } else {
          // Fallback metadata for direct IDs
          fallbackGame(id);
        }
      } catch {
        if (id) fallbackGame(id);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id]);

  const fallbackGame = (gameId: string) => {
    const lower = gameId.toLowerCase();
    if (lower.includes('slot') || lower.includes('treasure')) {
      setGame({
        id: gameId,
        name: 'Treasure Kingdom',
        category: 'SLOTS',
        description: 'Original 3D Aztec vault slot with dynamic cylindrical reels and 5 paylines.',
        thumbnailUrl: '/assets/games/treasure-kingdom-3d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.5,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 1,
      });
    } else if (lower.includes('crash') || lower.includes('rocket') || lower.includes('aviator')) {
      setGame({
        id: gameId,
        name: 'Sky Rocket',
        category: 'CRASH',
        description: 'Original 3D cosmic crash game with live rocket ascent, thruster fire, and exponential multipliers.',
        thumbnailUrl: '/assets/games/sky-rocket-3d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.8,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 2,
      });
    } else if (lower.includes('mines') || lower.includes('crystal')) {
      setGame({
        id: gameId,
        name: 'Crystal Mines',
        category: 'MINES',
        description: 'Original 3D crystalline cave runestone grid with configurable mines and multiplier progression.',
        thumbnailUrl: '/assets/games/crystal-mines-3d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 97.0,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 3,
      });
    } else if (lower.includes('vortex')) {
      setGame({
        id: gameId,
        name: 'Treasure Vortex',
        category: 'ROULETTE_DICE',
        description: 'Original 3D concentric rotating vortex rings with multiplier zones, glowing cosmic core, and up to 50x convergence rewards.',
        thumbnailUrl: '/assets/games/treasure-vortex-3d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 97.2,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 4,
      });
    } else if (lower.includes('spiral')) {
      setGame({
        id: gameId,
        name: 'Treasure Spiral',
        category: 'CRASH',
        description: 'Original 3D Concentric Rotating Circles with 5 Animal Symbols, 700x Bonus, and Half Cash Out.',
        thumbnailUrl: '/assets/games/treasure-spiral-3d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.5,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 5,
      });
    } else if (lower.includes('plinko')) {
      setGame({
        id: gameId,
        name: 'Treasure Plinko',
        category: 'CRASH',
        description: 'Provably fair 2D casino Plinko board with customizable rows (8, 12, 16), 3 risk tiers, realistic 2D ball pin physics, and payouts up to 1,000x.',
        thumbnailUrl: '/assets/games/treasure-plinko-2d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 98.5,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 6,
      });
    } else if (lower.includes('keno')) {
      setGame({
        id: gameId,
        name: 'Treasure Keno',
        category: 'ROULETTE_DICE',
        description: 'Classic 2D casino Keno with 1–80 grid, player-selectable 1–10 spots, 20 unique ball draws, Quick Pick, and jackpot payouts up to 3,500x.',
        thumbnailUrl: '/assets/games/treasure-keno-2d.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 95.8,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 7,
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleResetBalance = () => {
    soundManager.play('buttonClick');
    const fresh = resetDemoBalance();
    setBalance(fresh);
  };

  // Determine which game component to render
  const renderGameContent = () => {
    const name = game?.name?.toLowerCase() || id?.toLowerCase() || '';
    const cat = game?.category || '';

    if (name.includes('spiral')) {
      return <TreasureSpiral2D />;
    }

    if (name.includes('limbo')) {
      return <TreasureLimbo2D />;
    }

    if (name.includes('dice')) {
      return <TreasureDice2D />;
    }

    if (name.includes('blackjack')) {
      return <TreasureBlackjack2D />;
    }

    if (name.includes('plinko')) {
      return <TreasurePlinko2D />;
    }

    if (name.includes('keno')) {
      return <TreasureKeno2D />;
    }

    if (name.includes('hilo')) {
      return <TreasureHilo2D />;
    }

    if (name.includes('hotline')) {
      return <TreasureHotline2D />;
    }

    if (name.includes('chicken')) {
      return <TreasureChickenRun2D />;
    }

    if (name.includes('vortex')) {
      return <TreasureVortex3D />;
    }

    if (name.includes('kingdom') || (name.includes('treasure') && !name.includes('vortex')) || (cat === 'SLOTS' && name.includes('slot-01'))) {
      return <TreasureKingdom3D />;
    }

    if (name.includes('rocket') || name.includes('sky') || cat === 'CRASH') {
      return <SkyRocket3D />;
    }

    if (name.includes('crystal') || name.includes('mines') || cat === 'MINES') {
      return <CrystalMines3D />;
    }

    // Default to coming soon if game is in a subsequent phase
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-gold/40 flex items-center justify-center text-gold mx-auto">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-cinzel font-black text-white">
          {game?.name || 'ORIGINAL 3D GAME'}
        </h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          This title is currently scheduled for development in Phase 2-5 of the 55 Original 3D Games roadmap.
        </p>
        <button
          onClick={() => navigate('/lobby')}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl text-xs uppercase"
        >
          Return to Lobby
        </button>
      </div>
    );
  };

  if (loading && !game) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
        <span className="text-xs text-gray-400 font-mono">LOADING 3D GAME ENVIRONMENT...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col font-sans select-none">
      {/* Top HUD Bar */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-800 px-4 py-3 flex items-center justify-between gap-4 shadow-xl">
        {/* Left: Back to Lobby Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.play('buttonClick');
              navigate('/lobby');
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-dark-800 hover:bg-dark-750 text-gold hover:text-white rounded-xl text-xs font-bold border border-gold/40 hover:border-gold transition shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span className="hidden sm:inline">BACK TO LOBBY</span>
          </button>

          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold" />
            <span className="font-cinzel text-sm font-black tracking-wide text-white">
              {game?.name || 'TREASURE CASINO 3D'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-gold font-bold border border-gold/30">
              DEMO MODE
            </span>
          </div>
        </div>

        {/* Right: Demo Wallet & Audio Controls */}
        <div className="flex items-center gap-2.5">
          {/* Demo Balance Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-xl shadow-inner">
            <Coins className="w-4 h-4 text-gold" />
            <div>
              <div className="text-[9px] text-gray-400 uppercase font-semibold leading-none">
                Demo Balance
              </div>
              <div className="text-xs font-extrabold text-gold leading-tight">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={handleResetBalance}
              title="Reset Demo Balance (₹10,000)"
              className="p-1 hover:bg-dark-800 text-gray-400 hover:text-gold rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => soundManager.toggleMute()}
            className="p-2 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white rounded-xl border border-dark-700 transition"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-gold" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white rounded-xl border border-dark-700 transition"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </header>

      {/* Main 3D Game Container */}
      <main className="flex-1 flex flex-col relative w-full h-[calc(100vh-60px)] min-h-[500px] overflow-hidden">
        {renderGameContent()}
      </main>
    </div>
  );
};

export default GameArenaPage;
