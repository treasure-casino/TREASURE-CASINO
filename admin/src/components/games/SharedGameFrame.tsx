import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameItem } from '../../types';
import { getDemoBalance, resetDemoBalance } from '../../utils/demoWallet';
import { soundManager } from '../../utils/soundManager';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  ShieldCheck,
  Coins,
  Sparkles,
} from 'lucide-react';

interface SharedGameFrameProps {
  game: GameItem;
  children: (props: {
    betAmount: number;
    balance: number;
    soundEnabled: boolean;
    onWin: (amount: number, multiplier: number) => void;
    onLoss: (bet: number) => void;
  }) => React.ReactNode;
  historyMultipliers?: number[];
  isComingSoon?: boolean;
}

export const SharedGameFrame: React.FC<SharedGameFrameProps> = ({
  game,
  children,
  historyMultipliers = [],
  isComingSoon = false,
}) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [volume, setVolume] = useState<number>(soundManager.getVolume());
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [lastWinMessage, setLastWinMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleBalanceChange = () => setBalance(getDemoBalance());
    const handleSoundChange = (e: any) => {
      setIsMuted(e.detail.isMuted);
      setVolume(e.detail.volume);
    };

    window.addEventListener('demo_balance_updated', handleBalanceChange);
    window.addEventListener('sound_settings_changed', handleSoundChange);
    return () => {
      window.removeEventListener('demo_balance_updated', handleBalanceChange);
      window.removeEventListener('sound_settings_changed', handleSoundChange);
    };
  }, []);

  const handleResetBalance = () => {
    soundManager.play('buttonClick');
    const fresh = resetDemoBalance();
    setBalance(fresh);
  };

  const handleWin = (winAmount: number, multiplier: number) => {
    soundManager.play('win');
    setLastWinMessage(`WON ₹${winAmount.toFixed(2)} (${multiplier.toFixed(2)}x)!`);
    setTimeout(() => setLastWinMessage(null), 4000);
  };

  const handleLoss = (_bet: number) => {
    soundManager.play('loss');
  };

  const adjustBet = (multiplier: number) => {
    soundManager.play('buttonClick');
    setBetAmount((prev) => {
      const next = Math.max(1, Math.min(balance, Math.round(prev * multiplier)));
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-dark-950 text-white font-sans">
      {/* Top Bar HUD */}
      <header className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.play('buttonClick');
              navigate('/lobby');
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-dark-800 hover:bg-dark-750 text-gold hover:text-white rounded-xl text-xs font-bold border border-gold/40 hover:border-gold transition shadow-md"
            title="Return to Game Lobby"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>BACK TO LOBBY</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white font-cinzel tracking-wider">
                {game.name}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-950/80 text-gold border border-gold/40">
                {game.category}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-2">
              <span>{game.provider?.name || 'Treasure In-House'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">RTP {game.rtp}%</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> DEMO MODE ONLY
              </span>
            </div>
          </div>
        </div>

        {/* Balance & Audio Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-dark-950 px-3 py-1.5 rounded-xl border border-gold/30 shadow-inner">
            <Coins className="w-4 h-4 text-gold shrink-0 animate-pulse" />
            <div>
              <div className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">
                Demo Credits
              </div>
              <div className="text-sm font-black font-mono text-gold leading-tight">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={handleResetBalance}
              title="Reset Demo Balance to ₹10,000"
              className="p-1 hover:bg-dark-800 text-gray-400 hover:text-gold rounded transition ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => soundManager.toggleMute()}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="p-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-gold rounded-xl transition"
              title={isMuted ? 'Muted (Click to Unmute)' : `Audio Active (${Math.round(volume * 100)}%)`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-gray-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {showVolumeSlider && (
              <div
                onMouseLeave={() => setShowVolumeSlider(false)}
                className="absolute right-0 top-11 bg-dark-900 border border-dark-700 p-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 w-32"
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    soundManager.setVolume(v);
                    if (isMuted && v > 0) soundManager.setMuted(false);
                  }}
                  className="w-full accent-gold h-1.5 bg-dark-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* History Ribbon (if available) */}
      {historyMultipliers.length > 0 && (
        <div className="bg-dark-900/60 border-b border-dark-800 px-4 py-1.5 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-gray-500 text-[10px] uppercase tracking-wider shrink-0 mr-1 font-sans">
            Past Rounds:
          </span>
          {historyMultipliers.map((m, idx) => {
            const isHigh = m >= 2.0;
            const isJackpot = m >= 10.0;
            return (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded-full font-bold border transition ${
                  isJackpot
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow'
                    : isHigh
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-dark-800 text-gray-300 border-dark-700'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            );
          })}
        </div>
      )}

      {/* Win Banner Notification */}
      {lastWinMessage && (
        <div className="bg-gradient-to-r from-emerald-600 to-amber-600 text-black font-black text-center py-2 text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{lastWinMessage}</span>
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      {/* Main Game Arena Canvas/Viewport */}
      <main className="flex-1 p-4 md:p-6 flex flex-col justify-center items-center max-w-6xl w-full mx-auto">
        <div className="w-full bg-dark-900 border border-gold/20 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-gold/5 relative overflow-hidden">
          {children({
            betAmount,
            balance,
            soundEnabled: !isMuted,
            onWin: handleWin,
            onLoss: handleLoss,
          })}
        </div>
      </main>

      {/* Unified Bottom Betting Controls (Hidden for Coming Soon previews) */}
      {!isComingSoon && (
        <footer className="bg-dark-900 border-t border-dark-800 p-4 sticky bottom-0 z-40 shadow-2xl">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Bet Input & Quick Multipliers */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 shrink-0">
                BET (₹)
              </span>
              <div className="relative flex-1 sm:w-44">
                <input
                  type="number"
                  min="1"
                  max={balance}
                  step="5"
                  value={betAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBetAmount(isNaN(val) ? 1 : Math.max(1, Math.min(balance, val)));
                  }}
                  className="w-full bg-dark-950 border border-gold/40 rounded-xl px-3 py-2 text-gold font-mono font-bold text-base focus:outline-none focus:border-gold shadow-inner"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => adjustBet(0.5)}
                  className="px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs rounded-lg border border-dark-700 transition"
                  title="Half Bet"
                >
                  ½
                </button>
                <button
                  onClick={() => adjustBet(2)}
                  className="px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 font-bold text-xs rounded-lg border border-dark-700 transition"
                  title="Double Bet"
                >
                  2x
                </button>
                <button
                  onClick={() => setBetAmount(Math.min(balance, 1000))}
                  className="px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 text-gold font-bold text-xs rounded-lg border border-dark-700 transition"
                  title="Max Allowed Quick Bet"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Quick Chip Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto justify-center">
              {[10, 50, 100, 250, 500].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBetAmount(Math.min(balance, preset))}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition ${
                    betAmount === preset
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-black border-gold shadow-lg shadow-gold/20'
                      : 'bg-dark-950 text-gray-300 border-dark-800 hover:border-gold/30 hover:text-white'
                  }`}
                >
                  +₹{preset}
                </button>
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

