import React, { useState, useEffect, useMemo } from 'react';
import {
  adminProbabilityApi,
  GameProbabilityItem,
  SimulationPreviewResult,
  ProbabilityAuditLogItem,
} from '../../services/adminProbabilityApi';
import { Modal } from '../../components/common/Modal';
import {
  Sliders,
  RotateCcw,
  Save,
  PlayCircle,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  History,
  Info,
  Sparkles,
  Gamepad2,
  Lock,
} from 'lucide-react';

export const GameProbabilityPage: React.FC = () => {
  const [games, setGames] = useState<GameProbabilityItem[]>([]);
  const [editedProbabilities, setEditedProbabilities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Preview / Simulation Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewGame, setPreviewGame] = useState<GameProbabilityItem | null>(null);
  const [previewRounds, setPreviewRounds] = useState<number>(1000);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationPreviewResult | null>(null);

  // Audit Trail Modal
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<ProbabilityAuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Reset Confirmation Modal
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [gameToReset, setGameToReset] = useState<GameProbabilityItem | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);

  // Load probabilities from backend
  const fetchProbabilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminProbabilityApi.getProbabilities();
      setGames(res.games || []);

      // Initialize state with current server values
      const initialMap: Record<string, number> = {};
      res.games.forEach((g) => {
        initialMap[g.id] = g.winProbability;
      });
      setEditedProbabilities(initialMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load probability settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProbabilities();
  }, []);

  // Handle Win Probability change (slider or text input)
  const handleWinChange = (gameId: string, val: number) => {
    // Clamp between 1.0 and 99.0
    const clamped = Math.min(99.0, Math.max(1.0, Math.round(val * 10) / 10));
    setEditedProbabilities((prev) => ({
      ...prev,
      [gameId]: clamped,
    }));
  };

  // Determine if a row has unsaved modifications
  const isRowModified = (game: GameProbabilityItem) => {
    const current = editedProbabilities[game.id];
    return current !== undefined && Math.abs(current - game.winProbability) > 0.05;
  };

  // Total unsaved modifications count
  const modifiedCount = useMemo(() => {
    return games.filter((g) => isRowModified(g)).length;
  }, [games, editedProbabilities]);

  // Save single game
  const handleSaveSingle = async (game: GameProbabilityItem) => {
    const win = editedProbabilities[game.id] ?? game.winProbability;
    try {
      setSavingId(game.id);
      setError(null);
      await adminProbabilityApi.updateSingleProbability(game.id, win);
      setSuccessMessage(`Saved demo probability for ${game.name}: ${win}% Win / ${(100 - win).toFixed(1)}% Loss`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Update baseline game
      setGames((prev) =>
        prev.map((g) =>
          g.id === game.id
            ? { ...g, winProbability: win, lossProbability: +(100 - win).toFixed(1) }
            : g
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || `Failed to save probability for ${game.name}`);
    } finally {
      setSavingId(null);
    }
  };

  // Save all modified games in one batch
  const handleSaveAll = async () => {
    const payload = games
      .filter((g) => isRowModified(g))
      .map((g) => ({
        gameId: g.id,
        winProbability: editedProbabilities[g.id] ?? g.winProbability,
      }));

    if (payload.length === 0) return;

    try {
      setSavingAll(true);
      setError(null);
      await adminProbabilityApi.updateBatchProbabilities(payload);
      setSuccessMessage(`Successfully saved demo probabilities for ${payload.length} game(s).`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Refresh from server
      await fetchProbabilities();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to batch save probability settings');
    } finally {
      setSavingAll(false);
    }
  };

  // Reset single game row to server baseline
  const handleResetRowLocal = (game: GameProbabilityItem) => {
    setEditedProbabilities((prev) => ({
      ...prev,
      [game.id]: game.winProbability,
    }));
  };

  // Reset in database to default certified RTP
  const handleConfirmReset = async () => {
    try {
      setResetting(true);
      setError(null);
      await adminProbabilityApi.resetProbabilities(gameToReset ? gameToReset.id : undefined);
      setSuccessMessage(
        gameToReset
          ? `Reset ${gameToReset.name} to certified baseline RTP.`
          : 'Reset all games to certified baseline RTP.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      setResetModalOpen(false);
      setGameToReset(null);
      await fetchProbabilities();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reset probability settings');
    } finally {
      setResetting(false);
    }
  };

  // Open simulation preview
  const handleOpenPreview = (game: GameProbabilityItem) => {
    setPreviewGame(game);
    setSimulationResult(null);
    setPreviewModalOpen(true);
    runPreviewSimulation(game, editedProbabilities[game.id] ?? game.winProbability, previewRounds);
  };

  const runPreviewSimulation = async (
    game: GameProbabilityItem,
    winProb: number,
    rounds: number
  ) => {
    try {
      setSimulationRunning(true);
      const res = await adminProbabilityApi.runSimulationPreview(game.id, winProb, rounds);
      setSimulationResult(res);
    } catch (err: any) {
      console.warn('Simulation error:', err);
    } finally {
      setSimulationRunning(false);
    }
  };

  // Open audit trail
  const handleOpenAudit = async () => {
    try {
      setLoadingAudit(true);
      setAuditModalOpen(true);
      const logs = await adminProbabilityApi.getAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoadingAudit(false);
    }
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === 'ALL' ||
        g.category.toUpperCase() === selectedCategory.toUpperCase();
      return matchesSearch && matchesCat;
    });
  }, [games, searchQuery, selectedCategory]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set(games.map((g) => g.category));
    return ['ALL', ...Array.from(set)];
  }, [games]);

  return (
    <div className="space-y-6 select-none">
      {/* ── Top Header & Mode Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-cinzel text-white tracking-wide">
              Game Probability Settings
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              DEMO / SIMULATION MODE ONLY
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 font-sans">
            Configure empirical win and loss frequencies for internal simulation and demo wallet play.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenAudit}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-xl border border-dark-700 transition text-xs font-bold shadow"
            title="View Admin Audit Trail"
          >
            <History className="w-4 h-4 text-purple-400" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => {
              setGameToReset(null);
              setResetModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-dark-800 hover:bg-dark-700 text-rose-300 hover:text-rose-200 rounded-xl border border-dark-700 transition text-xs font-bold shadow"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Reset All to RTP</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={modifiedCount === 0 || savingAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
              modifiedCount > 0
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black animate-pulse'
                : 'bg-dark-800 text-gray-500 border border-dark-700 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save All Changes {modifiedCount > 0 && `(${modifiedCount})`}</span>
          </button>
        </div>
      </div>

      {/* ── Strict Regulatory & Compliance Warning Banner ── */}
      <div className="bg-gradient-to-r from-amber-950/40 via-dark-900 to-dark-950 border-l-4 border-amber-500 p-4 rounded-xl shadow-xl flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Demo Simulation Safety Notice
            </span>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
              ISO/IEC RNG Compliant
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            These probability controls operate exclusively on <strong>DEMO PLAY</strong> and test accounts.
            Real-money player rounds are strictly governed by server-side cryptographic RNG and published game RTP.
            Hidden manipulation of real-money gameplay is permanently prohibited by architecture and license rules.
          </p>
        </div>
      </div>

      {/* ── Feedback Banners ── */}
      {successMessage && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-mono shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-mono shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono font-bold">Total Games</span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{games.length}</div>
            <span className="text-[11px] text-gray-500">13 In-House Registered</span>
          </div>
          <div className="p-3 bg-dark-800 rounded-xl border border-dark-700">
            <Gamepad2 className="w-5 h-5 text-gold" />
          </div>
        </div>

        <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono font-bold">Pending Changes</span>
            <div className="text-2xl font-black font-mono mt-0.5 text-amber-400">{modifiedCount}</div>
            <span className="text-[11px] text-gray-500">{modifiedCount === 0 ? 'All synced to DB' : 'Requires save'}</span>
          </div>
          <div className="p-3 bg-dark-800 rounded-xl border border-dark-700">
            <Sliders className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono font-bold">Simulation Engine</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">ACTIVE</div>
            <span className="text-[11px] text-gray-500">Demo Wallet Isolated</span>
          </div>
          <div className="p-3 bg-dark-800 rounded-xl border border-dark-700">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-mono font-bold">Real Money Guard</span>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">PROTECTED</div>
            <span className="text-[11px] text-gray-500">RNG Verified</span>
          </div>
          <div className="p-3 bg-dark-800 rounded-xl border border-dark-700">
            <Lock className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search game name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-950 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/60 transition"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-thin">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-gold/20 text-gold border border-gold/50 shadow'
                  : 'bg-dark-950 text-gray-400 border border-dark-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Probability Configuration Table ── */}
      <div className="bg-dark-900/90 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-mono text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-gold animate-spin" />
            <span>Loading Game Probability Registry...</span>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-mono text-sm">
            No games found matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-800 text-gray-400 text-xs font-mono uppercase bg-dark-950/60">
                  <th className="py-3.5 px-4">Game</th>
                  <th className="py-3.5 px-3">Mode</th>
                  <th className="py-3.5 px-3">Baseline RTP</th>
                  <th className="py-3.5 px-4 min-w-[260px]">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <TrendingUp className="w-4 h-4" />
                      Demo Win Probability (%)
                    </span>
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px]">
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <TrendingDown className="w-4 h-4" />
                      Loss Probability (%)
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/60 text-sm">
                {filteredGames.map((game) => {
                  const currentWin = editedProbabilities[game.id] ?? game.winProbability;
                  const calculatedLoss = +(100 - currentWin).toFixed(1);
                  const modified = isRowModified(game);

                  return (
                    <tr
                      key={game.id}
                      className={`hover:bg-dark-800/40 transition duration-150 ${
                        modified ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Game Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={game.thumbnailUrl}
                            alt={game.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/games/default.png';
                            }}
                            className="w-10 h-10 rounded-lg object-cover border border-dark-700 shadow shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white font-sans flex items-center gap-2">
                              <span>{game.name}</span>
                              {modified && (
                                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                  MODIFIED
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-gray-500 uppercase">
                              {game.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mode Badge */}
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40">
                          DEMO ONLY
                        </span>
                      </td>

                      {/* Baseline RTP */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs text-gray-300 font-bold">
                          {game.defaultRtp.toFixed(2)}%
                        </span>
                      </td>

                      {/* Configurable Win Probability (Slider + Input) */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <input
                              type="range"
                              min="1"
                              max="99"
                              step="0.5"
                              value={currentWin}
                              onChange={(e) => handleWinChange(game.id, parseFloat(e.target.value))}
                              className="w-full h-2 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="relative flex items-center shrink-0">
                              <input
                                type="number"
                                min="1"
                                max="99"
                                step="0.5"
                                value={currentWin}
                                onChange={(e) => handleWinChange(game.id, parseFloat(e.target.value) || 1)}
                                className="w-16 bg-dark-950 border border-dark-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 text-right focus:outline-none focus:border-emerald-500 transition"
                              />
                              <span className="text-gray-400 text-xs ml-1 font-mono">%</span>
                            </div>
                          </div>
                          {/* Visual win probability bar */}
                          <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-150"
                              style={{ width: `${currentWin}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Automatically Calculated Loss Probability (100 - Win) */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-rose-400">
                              {calculatedLoss.toFixed(1)}%
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">Auto-Calculated</span>
                          </div>
                          <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-150"
                              style={{ width: `${calculatedLoss}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions: Save, Reset, Preview */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Simulation Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(game)}
                            className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition"
                            title="Run Monte Carlo Simulation Preview"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>

                          {/* Reset to baseline row */}
                          <button
                            type="button"
                            onClick={() => {
                              if (modified) {
                                handleResetRowLocal(game);
                              } else {
                                setGameToReset(game);
                                setResetModalOpen(true);
                              }
                            }}
                            className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-gray-400 hover:text-rose-300 rounded-lg transition"
                            title="Reset to default RTP"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Save row */}
                          <button
                            type="button"
                            disabled={!modified || savingId === game.id}
                            onClick={() => handleSaveSingle(game)}
                            className={`p-1.5 rounded-lg border transition ${
                              modified
                                ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow cursor-pointer font-bold'
                                : 'bg-dark-950 text-gray-600 border-dark-800 cursor-not-allowed'
                            }`}
                            title="Save Probability Setting"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Monte Carlo Simulation Preview Modal ── */}
      {previewModalOpen && previewGame && (
        <Modal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={`Simulation Preview • ${previewGame.name}`}
        >
          <div className="space-y-4">
            <div className="bg-dark-950 p-3 rounded-xl border border-dark-800 text-xs text-gray-300 flex items-center justify-between">
              <div>
                <span className="text-gray-400 block font-mono text-[10px]">CONFIGURED WIN RATE</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {(editedProbabilities[previewGame.id] ?? previewGame.winProbability).toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block font-mono text-[10px]">CALCULATED LOSS RATE</span>
                <span className="text-lg font-black text-rose-400 font-mono">
                  {(100 - (editedProbabilities[previewGame.id] ?? previewGame.winProbability)).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Rounds Selector */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-400 font-bold font-mono">SAMPLE SIMULATION ROUNDS:</span>
              <div className="flex gap-1.5">
                {[500, 1000, 5000].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setPreviewRounds(r);
                      runPreviewSimulation(
                        previewGame,
                        editedProbabilities[previewGame.id] ?? previewGame.winProbability,
                        r
                      );
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                      previewRounds === r
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow'
                        : 'bg-dark-950 text-gray-400 border-dark-800 hover:text-white'
                    }`}
                  >
                    {r.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Results Display */}
            {simulationRunning ? (
              <div className="py-8 text-center text-cyan-400 font-mono text-sm flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Running Monte Carlo simulation ({previewRounds} rounds)...</span>
              </div>
            ) : simulationResult ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                    <span className="text-[10px] text-gray-400 font-mono block">WINS</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {simulationResult.simulatedWins.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                    <span className="text-[10px] text-gray-400 font-mono block">LOSSES</span>
                    <span className="text-base font-black text-rose-400 font-mono">
                      {simulationResult.simulatedLosses.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                    <span className="text-[10px] text-gray-400 font-mono block">MAX WIN STREAK</span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {simulationResult.maxWinStreak}
                    </span>
                  </div>
                  <div className="bg-dark-950 p-2.5 rounded-xl border border-dark-800">
                    <span className="text-[10px] text-gray-400 font-mono block">MAX LOSS STREAK</span>
                    <span className="text-base font-black text-gray-300 font-mono">
                      {simulationResult.maxLossStreak}
                    </span>
                  </div>
                </div>

                <div className="bg-dark-950 p-3 rounded-xl border border-dark-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400">Target Win Rate:</span>
                    <span className="text-emerald-400 font-bold">
                      {simulationResult.targetWinProbability.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400">Empirical Simulated Win Rate:</span>
                    <span className="text-cyan-300 font-bold">
                      {simulationResult.actualWinRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${simulationResult.actualWinRate}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${simulationResult.actualLossRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Admin Audit Trail Modal ── */}
      {auditModalOpen && (
        <Modal
          isOpen={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
          title="Game Probability Audit Trail"
        >
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Immutable system record of all administrator changes made to game probabilities.
            </p>

            {loadingAudit ? (
              <div className="p-8 text-center text-gray-400 font-mono text-xs">
                Loading audit trail records...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-mono text-xs">
                No probability modifications recorded in audit log yet.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {auditLogs.map((log) => {
                  let parsedDetails: any = null;
                  try {
                    parsedDetails = JSON.parse(log.details || '{}');
                  } catch {
                    parsedDetails = null;
                  }

                  return (
                    <div
                      key={log.id}
                      className="bg-dark-950 p-3 rounded-xl border border-dark-800 text-xs space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="text-amber-400 font-bold">{log.action}</span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-gray-300">
                        Admin: <span className="text-white">{log.admin?.email || log.adminUserId}</span>
                      </div>
                      {parsedDetails && (
                        <div className="text-[11px] text-gray-400 truncate">
                          Target: {log.resourceId} • {parsedDetails.scope || 'DEMO_MODE'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Confirmation Modal ── */}
      {resetModalOpen && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title={gameToReset ? `Reset ${gameToReset.name}` : 'Reset All Game Probabilities'}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              Are you sure you want to reset{' '}
              {gameToReset ? (
                <strong>{gameToReset.name}</strong>
              ) : (
                'all game probability overrides'
              )}{' '}
              back to the certified baseline RTP?
            </p>

            <div className="bg-dark-950 p-3 rounded-xl border border-dark-800 text-xs text-gray-400 font-mono">
              Action will be logged in the immutable Admin Audit Trail.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {resetting ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Confirm Reset</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GameProbabilityPage;
