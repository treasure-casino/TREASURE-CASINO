import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { GameItem, GameProvider, GameCategoryType } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PLAYABLE_GAMES_MAP } from '../lobby/GameArenaPage';
import {
  Gamepad2,
  Plus,
  Edit2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  Search,
  ExternalLink,
  Flame,
  Play,
  Clock,
  Zap,
} from 'lucide-react';

export const GamesPage: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameItem[]>([]);
  const [providers, setProviders] = useState<GameProvider[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GameCategoryType>('SLOTS');
  const [providerId, setProviderId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [rtp, setRtp] = useState('96.50');
  const [minBet, setMinBet] = useState('10.00');
  const [maxBet, setMaxBet] = useState('5000.00');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isDemo, setIsDemo] = useState(true);

  const fetchGamesAndProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const [gamesRes, providersRes] = await Promise.all([
        apiClient.get('/api/admin/games'),
        apiClient.get('/api/admin/games/providers'),
      ]);

      if (gamesRes.data.success) {
        setGames(gamesRes.data.data || []);
      }
      if (providersRes.data.success) {
        setProviders(providersRes.data.data);
        if (providersRes.data.data.length > 0 && !providerId) {
          setProviderId(providersRes.data.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load game catalogue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGamesAndProviders();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingGameId(null);
    setName('');
    setDescription('');
    setCategory('SLOTS');
    if (providers.length > 0) setProviderId(providers[0].id);
    setThumbnailUrl('/assets/games/slots-pharaoh.png');
    setRtp('96.50');
    setMinBet('10.00');
    setMaxBet('5000.00');
    setIsActive(true);
    setIsFeatured(false);
    setIsDemo(true);
    setModalOpen(true);
  };

  const openEditModal = (game: GameItem) => {
    setIsEditing(true);
    setEditingGameId(game.id);
    setName(game.name);
    setDescription(game.description || '');
    setCategory(game.category);
    setProviderId(game.providerId);
    setThumbnailUrl(game.thumbnailUrl || '');
    setRtp(String(game.rtp || '96.50'));
    setMinBet(String(game.minBet || '10.00'));
    setMaxBet(String(game.maxBet || '5000.00'));
    setIsActive(game.isActive);
    setIsFeatured(Boolean(game.isFeatured));
    setIsDemo(game.isDemo);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Game title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isEditing && editingGameId) {
        const res = await apiClient.put(`/api/admin/games/${editingGameId}`, {
          name: name.trim(),
          description: description.trim(),
          category,
          isActive,
          isFeatured,
          isDemo,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          rtp: parseFloat(rtp),
          minBet: parseFloat(minBet),
          maxBet: parseFloat(maxBet),
        });

        if (res.data.success) {
          setActionSuccess(`Game "${name}" updated successfully.`);
          setModalOpen(false);
          fetchGamesAndProviders();
          setTimeout(() => setActionSuccess(null), 4000);
        }
      } else {
        const res = await apiClient.post('/api/admin/games', {
          name: name.trim(),
          description: description.trim(),
          category,
          providerId,
          thumbnailUrl: thumbnailUrl.trim() || '/assets/games/default.png',
          rtp: parseFloat(rtp),
          minBet: parseFloat(minBet),
          maxBet: parseFloat(maxBet),
          isDemo,
          isActive,
          isFeatured,
        });

        if (res.data.success) {
          setActionSuccess(`Game "${name}" created and added to catalogue.`);
          setModalOpen(false);
          fetchGamesAndProviders();
          setTimeout(() => setActionSuccess(null), 4000);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save game configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGames = games.filter((g) => {
    if (categoryFilter === 'POPULAR') {
      if (!g.isPopular) return false;
    } else if (categoryFilter !== 'ALL' && g.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
              GAME CATALOGUE MANAGEMENT
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-gold/40 text-gold text-xs font-bold font-mono">
              {games.length} Games
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Curate authorized casino games, manage return-to-player (RTP) parameters, visibility, and featured banners.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-1.5 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gold font-bold text-xs rounded-xl border border-gold/30 hover:border-gold transition shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            <span>PLAYER LOBBY</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-bold text-xs rounded-xl hover:from-amber-500 hover:to-yellow-500 transition shadow-lg shadow-gold/10"
          >
            <Plus className="w-4 h-4" />
            <span>ADD GAME</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Category Bar */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title, description or game ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 focus:border-gold/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          {[
            'ALL',
            'POPULAR',
            'SLOTS',
            'FISHING',
            'TABLE_CARD',
            'BINGO',
            'CASINO',
            'CRASH',
            'PLINKO',
            'MINES',
            'SPORTS',
            'ROULETTE_DICE',
            'KENO',
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${categoryFilter === cat
                  ? 'bg-amber-950 text-gold border border-gold/50 shadow'
                  : 'bg-dark-900 text-gray-400 hover:text-white border border-dark-800'
                }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Game Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-gold">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <span className="text-sm font-cinzel">FETCHING AUTHORIZED GAMES CATALOGUE...</span>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-16 text-center space-y-3">
          <Gamepad2 className="w-12 h-12 mx-auto text-gray-600" />
          <h3 className="text-base font-bold text-gray-200 font-cinzel">Game Catalogue is Empty</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            All previous games have been safely retired. The catalogue is reset and ready for future game integrations.
          </p>
          <div className="pt-2">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold/90 text-dark-950 font-bold text-xs rounded-xl shadow-lg shadow-gold/10 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Game</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game) => {
            const isPlayable = Boolean(PLAYABLE_GAMES_MAP[game.id]);

            return (
              <div
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/play/${game.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/play/${game.id}`);
                  }
                }}
                className="bg-dark-900 border border-dark-800 hover:border-gold/60 rounded-xl overflow-hidden transition group flex flex-col justify-between shadow-lg cursor-pointer hover:-translate-y-0.5"
              >
                <div>
                  {/* Header Image Area */}
                  <div className="h-36 relative overflow-hidden bg-dark-950 border-b border-dark-800 cursor-pointer">
                    <img
                      src={game.thumbnailUrl || `/assets/games/${game.id}.png`}
                      alt={`${game.name} thumbnail`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/games/default.png';
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                    />
                    <div className="absolute top-2.5 left-2.5 flex gap-1 pointer-events-none">
                      {game.isFeatured && (
                        <span className="p-1 rounded-md bg-amber-950/90 border border-gold/40 text-gold text-[10px] flex items-center gap-1 font-bold backdrop-blur-sm">
                          <Flame className="w-3 h-3 text-gold" />
                          <span>FEATURED</span>
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 backdrop-blur-sm pointer-events-none">
                      <Badge status={game.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <div className="text-[10px] font-bold tracking-wider uppercase text-gold truncate">
                        {game.provider?.name || 'In-House'}
                      </div>
                      <h3 className="text-base font-bold text-white font-cinzel group-hover:text-gold transition truncate mt-0.5">
                        {game.name}
                      </h3>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2">
                      {game.description || 'Authorized casino game title with certified RNG outcomes.'}
                    </p>

                    <div className="pt-2 border-t border-dark-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">RTP %</span>
                        <span className="text-emerald-400 font-bold">{game.rtp}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Category</span>
                        <span className="text-purple-300 font-semibold">{game.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Min Bet</span>
                        <span className="text-gray-300 font-mono">₹{game.minBet}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Max Bet</span>
                        <span className="text-gray-300 font-mono">₹{game.maxBet}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Action */}
                <div className="p-3 bg-dark-850 border-t border-dark-800 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/play/${game.id}`);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${isPlayable
                        ? 'bg-amber-950/70 border border-gold/40 text-gold hover:bg-gold hover:text-black'
                        : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
                      }`}
                  >
                    {isPlayable ? <Play className="w-3 h-3 fill-current" /> : <Clock className="w-3 h-3" />}
                    <span>{isPlayable ? 'Test Demo' : 'Preview'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(game);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-gold/40 rounded-lg text-xs font-semibold text-gray-200 transition"
                  >
                    <Edit2 className="w-3 h-3 text-gold" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Game Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Configure Game Settings' : 'Add Authorized Game to Catalogue'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Game Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Diamond Pharaoh Slots"
              className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-gold"
              >
                <option value="SLOTS">SLOTS</option>
                <option value="FISHING">FISHING</option>
                <option value="TABLE_CARD">TABLE & CARD</option>
                <option value="BINGO">BINGO</option>
                <option value="CASINO">CASINO</option>
                <option value="CRASH">CRASH</option>
                <option value="PLINKO">PLINKO</option>
                <option value="MINES">MINES</option>
                <option value="SPORTS">SPORTS</option>
                <option value="ROULETTE_DICE">ROULETTE & DICE</option>
                <option value="KENO">KENO</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Game Provider
                </label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-gold"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Game features, reel layout, multiplier rules..."
              className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                RTP %
              </label>
              <input
                type="number"
                step="0.1"
                value={rtp}
                onChange={(e) => setRtp(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Min Bet (₹)
              </label>
              <input
                type="number"
                value={minBet}
                onChange={(e) => setMinBet(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Max Bet (₹)
              </label>
              <input
                type="number"
                value={maxBet}
                onChange={(e) => setMaxBet(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded bg-dark-950 border-dark-700 text-gold focus:ring-0 w-4 h-4"
              />
              <span>Game is Active in Lobby</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded bg-dark-950 border-dark-700 text-gold focus:ring-0 w-4 h-4"
              />
              <span className="text-gold font-bold">Featured Flagship Title</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => setIsDemo(e.target.checked)}
                className="rounded bg-dark-950 border-dark-700 text-gold focus:ring-0 w-4 h-4"
              />
              <span>Demo Mode Enabled</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-dark-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-xs font-semibold text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-black rounded-lg text-xs font-bold tracking-wider hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isEditing ? 'SAVE CONFIGURATION' : 'REGISTER GAME'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
