import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { GameItem, GameCategoryType } from '../../types';
import { getDemoBalance, resetDemoBalance } from '../../utils/demoWallet';
import { soundManager } from '../../utils/soundManager';
import {
  Coins,
  RotateCcw,
  Sparkles,
  Gamepad2,
  ShieldCheck,
  LayoutDashboard,
  Volume2,
  VolumeX,
  Crown,
  Search,
  Flame,
  Play,
  Layers,
  Rocket,
  Gem,
  Award,
  Zap,
  Target,
  Dices,
  Club,
  CircleDot,
} from 'lucide-react';

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'ALL', label: 'All Games', icon: '🎮' },
  { id: 'POPULAR', label: 'Popular', icon: '🔥' },
  { id: 'SLOTS', label: 'Slots', icon: '🎰' },
  { id: 'CRASH', label: 'Crash', icon: '🚀' },
  { id: 'CASINO', label: 'Casino Originals', icon: '🎪' },
  { id: 'MINES', label: 'Puzzle & Mines', icon: '💎' },
  { id: 'PLINKO', label: 'Plinko', icon: '🟡' },
  { id: 'TABLE_CARD', label: 'Table & Cards', icon: '♠️' },
  { id: 'KENO', label: 'Bingo & Keno', icon: '🎱' },
  { id: 'ROULETTE_DICE', label: 'Dice & Arcade', icon: '🎲' },
];

export const GameLobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [demoBalance, setDemoBalance] = useState<number>(getDemoBalance());
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  useEffect(() => {
    const handleBalance = () => setDemoBalance(getDemoBalance());
    const handleSound = (e: any) => setIsMuted(e.detail.isMuted);

    window.addEventListener('demo_balance_updated', handleBalance);
    window.addEventListener('sound_settings_changed', handleSound);
    return () => {
      window.removeEventListener('demo_balance_updated', handleBalance);
      window.removeEventListener('sound_settings_changed', handleSound);
    };
  }, []);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/games');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setGames(res.data.data);
      } else {
        setGames([]);
      }
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleResetBalance = () => {
    soundManager.play('buttonClick');
    const next = resetDemoBalance();
    setDemoBalance(next);
  };

  const handleToggleMute = () => {
    soundManager.toggleMute();
  };

  const filteredGames = games.filter((g) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'POPULAR' && g.isPopular) ||
      g.category === selectedCategory ||
      (selectedCategory === 'KENO' && (g.category === 'KENO' || g.category === 'BINGO')) ||
      (selectedCategory === 'BINGO' && (g.category === 'KENO' || g.category === 'BINGO'));

    const matchesSearch =
      searchQuery.trim() === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col selection:bg-gold/30 selection:text-gold font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-md border-b border-dark-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between shadow-2xl gap-2">
        {/* Brand Logo */}
        <div
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-w-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-lg shadow-gold/20 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black tracking-wider font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 truncate">
              TREASURE CASINO
            </h1>
            <p className="text-[9px] sm:text-[10px] font-mono tracking-widest text-gold/70 uppercase hidden xs:block truncate">
              55 Original 3D Games Platform
            </p>
          </div>
        </div>

        {/* Right HUD: Demo Wallet, Sound & Admin link */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Demo Balance Display */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-dark-950 border border-dark-700 rounded-xl shadow-inner">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold shrink-0" />
            <div className="text-right">
              <div className="text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 leading-none hidden sm:block">
                Demo Balance
              </div>
              <div className="text-[11px] sm:text-xs font-black text-gold leading-tight">
                ₹{demoBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            onClick={handleToggleMute}
            className="p-1.5 sm:p-2 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-xl border border-dark-700 transition"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />}
          </button>

          {/* Admin Navigation */}
          <button
            onClick={() => {
              soundManager.play('buttonClick');
              navigate('/games');
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-white rounded-xl text-xs font-bold border border-dark-700 transition"
            title="Open Admin Panel"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-gold" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Hero Showcase Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-dark-900 via-amber-950/20 to-dark-900 border border-gold/40 p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-gold/50 text-gold text-xs font-bold uppercase tracking-widest shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-gold animate-spin" />
              <span>PHASE 1 ACTIVE • ORIGINAL 3D GAMES</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black font-cinzel text-white leading-tight">
              EXPERIENCE NEXT-GEN 3D CASINO GAMING
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
              Immerse yourself in original 3D slots, crash flights, and cavern mines powered by Three.js WebGL physics, server-authoritative fair outcomes, and responsive graphics.
            </p>
          </div>
        </section>

        {/* Search & Category Filter Navigation */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search 3D games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 focus:border-gold/60 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition shadow-inner"
              />
            </div>

            <div className="text-xs text-gray-400 font-mono">
              Displaying <strong className="text-gold">{filteredGames.length}</strong> / 55 Games
            </div>
          </div>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  soundManager.play('buttonClick');
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition whitespace-nowrap shadow-md ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-gold/20'
                    : 'bg-dark-900 hover:bg-dark-850 text-gray-300 hover:text-white border border-dark-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Game Cards Grid */}
        {filteredGames.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => {
                  soundManager.play('buttonClick');
                  navigate(`/lobby/arena/${game.id}`);
                }}
                className="group relative bg-dark-900 border border-dark-800 hover:border-gold/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-gold/10 transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1.5"
              >
                {/* Visual Banner Artwork */}
                <div className="relative h-44 w-full bg-gradient-to-b from-dark-800 to-dark-950 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-radial-gradient from-gold/10 to-transparent opacity-60" />

                  {/* 3D Visual Icon based on Category */}
                  <div className="relative z-10 w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-600/40 via-yellow-500/20 to-transparent p-0.5 border border-gold/30 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {game.name.toLowerCase().includes('hotline') || game.id.includes('hotline') ? (
                      <img
                        src="/assets/games/hotline/treasure-hotline-logo.jpg"
                        alt="TREASURE HOTLINE"
                        className="w-full h-full object-cover rounded-2xl shadow-lg border border-yellow-400/40"
                      />
                    ) : game.name.toLowerCase().includes('chicken') || game.id.includes('chicken') ? (
                      <div className="flex flex-col items-center">
                        <span className="text-3xl">🐔</span>
                        <span className="text-[9px] text-emerald-400 font-bold font-mono">24 TILES</span>
                      </div>
                    ) : game.name.toLowerCase().includes('hilo') || game.id.includes('hilo') ? (
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-amber-300 font-cinzel">HI-LO</span>
                        <span className="text-[10px] text-purple-300 font-bold">▲ / ▼ / =</span>
                      </div>
                    ) : game.name.toLowerCase().includes('keno') || game.id.includes('keno') ? (
                      <div className="text-[11px] text-purple-300 font-extrabold flex items-center gap-1">
                        <Target className="w-3 h-3 text-purple-400" />
                        <span>1–10 SPOTS • 3,500x JACKPOT</span>
                      </div>
                    ) : game.name.toLowerCase().includes('plinko') || game.id.includes('plinko') ? (
                      <div className="text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-amber-400" />
                        <span>8-16 ROWS • 1,000x JACKPOT</span>
                      </div>
                    ) : game.name.toLowerCase().includes('blackjack') || game.id.includes('blackjack') ? (
                      <Club className="w-12 h-12 text-emerald-400 animate-pulse" />
                    ) : game.name.toLowerCase().includes('dice') ? (
                      <Dices className="w-12 h-12 text-amber-400 animate-pulse" />
                    ) : game.name.toLowerCase().includes('limbo') ? (
                      <Zap className="w-12 h-12 text-purple-400 animate-pulse" />
                    ) : game.category === 'SLOTS' ? (
                      <Crown className="w-12 h-12 text-gold animate-pulse" />
                    ) : game.category === 'CRASH' && !game.name.toLowerCase().includes('spiral') ? (
                      <Rocket className="w-12 h-12 text-cyan-400 animate-pulse" />
                    ) : game.category === 'MINES' ? (
                      <Gem className="w-12 h-12 text-fuchsia-400 animate-pulse" />
                    ) : game.name.toLowerCase().includes('spiral') ? (
                      <Layers className="w-12 h-12 text-amber-400 animate-pulse" />
                    ) : game.name.toLowerCase().includes('vortex') ? (
                      <Sparkles className="w-12 h-12 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                    ) : (
                      <Target className="w-12 h-12 text-gold animate-pulse" />
                    )}
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 border border-gold/40 text-gold shadow-sm">
                      3D ORIGINAL
                    </span>
                    {game.isPopular && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/30 text-rose-300">
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>HOT</span>
                      </span>
                    )}
                  </div>

                  {/* Category Pill */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-dark-950/80 border border-dark-700 text-gray-300">
                    {game.category}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-cinzel font-black text-white group-hover:text-gold transition">
                      {game.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between">
                    {game.name.toLowerCase().includes('hotline') || game.id.includes('hotline') ? (
                      <div className="text-[11px] text-fuchsia-400 font-extrabold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-cyan-400" />
                        <span>RETRO 80S SLOT • EXPANDING WILDS</span>
                      </div>
                    ) : game.name.toLowerCase().includes('chicken') || game.id.includes('chicken') ? (
                      <div className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-yellow-400" />
                        <span>CHICKEN ROAD • 100,000x JACKPOT</span>
                      </div>
                    ) : game.name.toLowerCase().includes('hilo') || game.id.includes('hilo') ? (
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-amber-300 font-cinzel">HI-LO</span>
                        <span className="text-[10px] text-purple-300 font-bold">▲ / ▼ / =</span>
                      </div>
                    ) : game.name.toLowerCase().includes('keno') || game.id.includes('keno') ? (
                      <div className="text-[11px] text-purple-300 font-extrabold flex items-center gap-1">
                        <Target className="w-3 h-3 text-purple-400" />
                        <span>1–10 SPOTS • 3,500x JACKPOT</span>
                      </div>
                    ) : game.name.toLowerCase().includes('plinko') || game.id.includes('plinko') ? (
                      <div className="text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-amber-400" />
                        <span>8-16 ROWS • 1,000x JACKPOT</span>
                      </div>
                    ) : game.name.toLowerCase().includes('blackjack') || game.id.includes('blackjack') ? (
                      <div className="text-[11px] text-emerald-300 font-extrabold flex items-center gap-1">
                        <Club className="w-3 h-3 text-emerald-400" />
                        <span>CLASSIC 21 • 3:2 BLACKJACK</span>
                      </div>
                    ) : game.name.toLowerCase().includes('dice') || game.id.includes('dice') ? (
                      <div className="text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
                        <Dices className="w-3 h-3 text-amber-400" />
                        <span>ROLL UNDER / OVER • 960x</span>
                      </div>
                    ) : game.name.toLowerCase().includes('limbo') || game.id.includes('limbo') ? (
                      <div className="text-[11px] text-purple-300 font-extrabold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-400" />
                        <span>TARGET MULTIPLIER • 10,000x</span>
                      </div>
                    ) : game.name.toLowerCase().includes('spiral') || game.id.includes('spiral') ? (
                      <div className="text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>3 CONCENTRIC RINGS • 700x BONUS</span>
                      </div>
                    ) : game.name.toLowerCase().includes('vortex') || game.id.includes('vortex') ? (
                      <div className="text-[11px] text-cyan-300 font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>ELEMENTAL CRASH • MULTIPLIER</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400">
                        RTP: <strong className="text-white font-mono">{game.rtp}%</strong>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.play('buttonClick');
                        navigate(`/lobby/arena/${game.id}`);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-extrabold text-xs uppercase rounded-xl shadow-lg shadow-gold/20 group-hover:scale-105 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>PLAY 3D DEMO</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-dark-900 border border-dark-800 rounded-3xl p-12 text-center space-y-4 shadow-xl max-w-xl mx-auto w-full">
            <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-gold/30 flex items-center justify-center mx-auto text-gold shadow-lg shadow-gold/5">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-cinzel text-white">
                No Games Found in this Category
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Try selecting "All Games" or searching for a different title.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-6 px-4 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gold/80">
            <Crown className="w-4 h-4 text-gold" />
            <span className="font-cinzel font-bold text-white">TREASURE CASINO</span>
            <span>• 55 Original 3D Games Suite</span>
          </div>
          <div>All rights reserved. Regulated gaming architecture with CSPRNG security.</div>
        </div>
      </footer>
    </div>
  );
};

export default GameLobbyPage;
