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
    } else if (lower.includes('limbo')) {
      setGame({
        id: gameId,
        name: 'Treasure Limbo',
        category: 'CRASH',
        description: 'High-speed 2D neon multiplier game with dynamic target selection, provably fair engine, and payouts up to 10,000x.',
        thumbnailUrl: '/assets/games/default.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.0,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 6,
      });
    } else if (lower.includes('dice')) {
      setGame({
        id: gameId,
        name: 'Treasure Dice',
        category: 'ROULETTE_DICE',
        description: 'Provably fair 2D casino dice game with customizable Roll Under / Roll Over sliders, real-time odds calculation, and payouts up to 960x.',
        thumbnailUrl: '/assets/games/default.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.0,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 7,
      });
    } else if (lower.includes('blackjack')) {
      setGame({
        id: gameId,
        name: 'Treasure Blackjack',
        category: 'TABLE_CARD',
        description: 'Authentic 2D casino Blackjack (21). Classic table rules, 3:2 Natural Blackjack payout, Insurance (2:1), Double Down, and Dealer stands on 17.',
        thumbnailUrl: '/assets/games/default.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 99.5,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 8,
      });
    } else if (lower.includes('hilo')) {
      setGame({
        id: gameId,
        name: 'Treasure Hilo',
        category: 'CASINO',
        description: 'Classic 2D casino card prediction game with Higher, Lower, Same bets, dynamic odds, streak multipliers, and instant cashout.',
        thumbnailUrl: '/assets/games/default.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.0,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 11,
      });
    } else if (lower.includes('hotline')) {
      setGame({
        id: gameId,
        name: 'Treasure Hotline',
        category: 'SLOTS',
        description: 'Retro 1980s neon 5-reel video slot inspired by Hotline with expanding wilds, 20 paylines, and scatter pays.',
        thumbnailUrl: '/assets/games/hotline/treasure-hotline-logo.jpg',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.0,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 12,
      });
    } else if (lower.includes('chicken')) {
      setGame({
        id: gameId,
        name: 'Treasure Chicken Run',
        category: 'CASINO',
        description: 'Exciting 3D cartoon chicken road crossing casino game with 4 difficulties, progressive multipliers up to 100,000x, and instant cashout.',
        thumbnailUrl: '/assets/games/default.png',
        minBet: 10,
        maxBet: 5000,
        rtp: 96.0,
        isActive: true,
        isPopular: true,
        providerId: 'prov-inhouse',
        isDemo: true,
        sortOrder: 13,
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

    if (name.includes('kingdom') || name.includes('slot-01') || name === 'treasure kingdom' || (cat === 'SLOTS' && !name.includes('hotline'))) {
      return <TreasureKingdom3D />;
    }

    if (name.includes('rocket') || name.includes('sky') || name.includes('crash-01') || name.includes('aviator')) {
      return <SkyRocket3D />;
    }

    if (name.includes('crystal') || name.includes('mines') || name.includes('mines-01')) {
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
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-dark-800 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shadow-xl">
        {/* Left: Back to Lobby Button */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => {
              soundManager.play('buttonClick');
              navigate('/lobby');
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-dark-800 hover:bg-dark-750 text-gold hover:text-white rounded-xl text-xs font-bold border border-gold/40 hover:border-gold transition shadow-md shrink-0"
            title="Back to Lobby"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span className="hidden sm:inline">LOBBY</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
            <Crown className="w-4 h-4 text-gold shrink-0 hidden xs:inline" />
            <span className="font-cinzel text-xs sm:text-sm font-black tracking-wide text-white truncate">
              {game?.name || 'TREASURE CASINO 3D'}
            </span>
            <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-gold font-bold border border-gold/30 shrink-0 hidden md:inline">
              DEMO MODE
            </span>
          </div>
        </div>

        {/* Right: Demo Wallet & Audio Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Demo Balance Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-dark-950 border border-dark-700 rounded-xl shadow-inner">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold shrink-0" />
            <div>
              <div className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-semibold leading-none hidden sm:block">
                Demo Balance
              </div>
              <div className="text-[11px] sm:text-xs font-extrabold text-gold leading-tight">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={handleResetBalance}
              title="Reset Demo Balance (₹10,000)"
              className="p-0.5 sm:p-1 hover:bg-dark-800 text-gray-400 hover:text-gold rounded-lg transition"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => soundManager.toggleMute()}
            className="p-1.5 sm:p-2 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white rounded-xl border border-dark-700 transition"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white rounded-xl border border-dark-700 transition hidden sm:flex"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
          </button>
        </div>
      </header>

      {/* Main 3D Game Container */}
      <main className="flex-1 flex flex-col relative w-full h-[calc(100vh-56px)] min-h-0 overflow-y-auto lg:overflow-hidden">
        {renderGameContent()}
      </main>
    </div>
  );
};

export default GameArenaPage;
