import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameItem } from '../../types';
import { soundManager } from '../../utils/soundManager';
import {
  Clock,
  Sparkles,
  Gamepad2,
  ShieldCheck,
  CheckCircle,
  Bell,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface ComingSoonScreenProps {
  game: GameItem;
}

export const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({ game }) => {
  const navigate = useNavigate();
  const [notified, setNotified] = useState(false);
  const [imgError, setImgError] = useState(false);

  const thumbUrl =
    imgError || (!game.thumbnailUrl && !game.imageUrl)
      ? '/assets/games/default.png'
      : (game.thumbnailUrl || game.imageUrl || '/assets/games/default.png');

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 max-w-xl mx-auto text-center space-y-6">
      {/* Thumbnail Artwork Graphic */}
      <div className="relative group">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-2 border-gold/50 shadow-2xl shadow-gold/20 bg-dark-950 p-1">
          <img
            src={thumbUrl}
            alt={game.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
        <div className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-amber-950 border border-gold text-gold shadow-lg">
          <Clock className="w-4 h-4 animate-spin" />
        </div>
      </div>

      {/* Title & Badge */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-gold/50 text-gold text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>COMING SOON • IN ACTIVE DEVELOPMENT</span>
        </div>
        <h1 className="text-3xl font-black font-cinzel text-white tracking-wider">
          {game.name}
        </h1>
        <p className="text-xs text-gray-400 font-sans max-w-md mx-auto">
          {game.description ||
            'This title is currently undergoing RNG mathematical testing and asset pipeline integration. It will be released in an upcoming certified catalog update.'}
        </p>
      </div>

      {/* Specifications Card */}
      <div className="w-full bg-dark-950 border border-dark-800 rounded-2xl p-4 grid grid-cols-3 gap-3 text-xs text-left">
        <div className="p-2.5 bg-dark-900 rounded-xl border border-dark-800">
          <span className="text-[10px] text-gray-400 uppercase block">Category</span>
          <span className="text-white font-bold">{game.category}</span>
        </div>
        <div className="p-2.5 bg-dark-900 rounded-xl border border-dark-800">
          <span className="text-[10px] text-gray-400 uppercase block">Target RTP</span>
          <span className="text-emerald-400 font-bold">{game.rtp}%</span>
        </div>
        <div className="p-2.5 bg-dark-900 rounded-xl border border-dark-800">
          <span className="text-[10px] text-gray-400 uppercase block">Provider</span>
          <span className="text-gold font-bold truncate block">{game.provider?.name || 'In-House'}</span>
        </div>
      </div>

      {/* Integrity Notice */}
      <div className="p-3 bg-dark-950/70 border border-dark-800 rounded-xl text-[11px] text-gray-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>TREASURE Casino ensures certified fairness and never simulates unfinished games.</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
        <button
          onClick={() => {
            soundManager.play('buttonClick');
            setNotified(true);
          }}
          disabled={notified}
          className={`flex-1 w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition ${
            notified
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
              : 'bg-dark-900 hover:bg-dark-850 text-gray-200 border-dark-700 hover:border-gold/50'
          }`}
        >
          {notified ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>NOTIFICATION REGISTERED</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 text-gold" />
              <span>NOTIFY ME ON RELEASE</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            soundManager.play('buttonClick');
            navigate('/lobby');
          }}
          className="flex-1 w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black flex items-center justify-center gap-2 shadow-lg shadow-gold/10 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO LOBBY</span>
        </button>
      </div>
    </div>
  );
};

