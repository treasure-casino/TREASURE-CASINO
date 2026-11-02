import React, { useState, useEffect } from 'react';
import { kenoApi } from '../../services/kenoApi';
import { KenoAdminStats, KenoConfig } from '../../types/keno';
import {
  Sparkles,
  Trophy,
  Activity,
  RotateCw,
  Coins,
  Shield,
  Layers,
  CheckCircle,
  AlertCircle,
  Sliders,
  Save,
  Search,
} from 'lucide-react';

export const KenoAdminPage: React.FC = () => {
  const [stats, setStats] = useState<KenoAdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Editable config state
  const [minBet, setMinBet] = useState<number>(10);
  const [maxBet, setMaxBet] = useState<number>(5000);
  const [minSpots, setMinSpots] = useState<number>(1);
  const [maxSpots, setMaxSpots] = useState<number>(10);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await kenoApi.getAdminStats();
      if (data) {
        setStats(data);
        setMinBet(data.config.minBet);
        setMaxBet(data.config.maxBet);
        setMinSpots(data.config.minSpots);
        setMaxSpots(data.config.maxSpots);
        setIsEnabled(data.config.isEnabled);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch Keno admin statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      await kenoApi.updateConfig({
        minBet,
        maxBet,
        minSpots,
        maxSpots,
        isEnabled,
      });

      setMessage('Keno configuration successfully updated and saved to runtime engine.');
      fetchStats();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const filteredRounds = (stats?.recentRounds || []).filter(
    (r) =>
      r.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(r.multiplier).includes(searchFilter)
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-dark-900/90 border border-purple-500/30 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-400">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-cinzel font-black text-white flex items-center gap-2">
              TREASURE KENO <span className="text-amber-400">ADMIN CONTROL</span>
            </h1>
            <p className="text-xs text-gray-400">
              Audit telemetry, spot limits, payout multipliers, and live round history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/lobby/arena/game-keno-01"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Open Game Arena</span>
          </a>
          <button
            onClick={fetchStats}
            className="p-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-gray-300 hover:text-white transition"
            title="Refresh Stats"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Total Rounds</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-2">
            {stats?.totalRounds ?? 0}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Settled server-side rounds</div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Total Bet Volume</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-2">
            ₹{(stats?.totalBets ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Sample window</div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Total Payouts</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-2">
            ₹{(stats?.totalPayouts ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Awarded winnings</div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Actual RTP</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-300 mt-2">
            {stats?.actualRtp ?? 95.8}%
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Target ~95.8% (House Edge ~4.2%)</div>
        </div>
      </div>

      {/* Configuration & Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-5 bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
            <Sliders className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-bold font-cinzel text-white uppercase tracking-wider">
              Keno Operational Rules
            </h2>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* Enable / Disable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-dark-950 border border-dark-800">
              <div>
                <div className="text-xs font-bold text-white">Enable Treasure Keno</div>
                <div className="text-[10px] text-gray-400">Controls player access in arena</div>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Bet Boundaries */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-400">Min Bet (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={minBet}
                  onChange={(e) => setMinBet(Number(e.target.value))}
                  className="w-full mt-1 bg-dark-950 border border-dark-800 focus:border-gold/60 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400">Max Bet (₹)</label>
                <input
                  type="number"
                  min={minBet}
                  value={maxBet}
                  onChange={(e) => setMaxBet(Number(e.target.value))}
                  className="w-full mt-1 bg-dark-950 border border-dark-800 focus:border-gold/60 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Spots Boundaries */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-400">Min Spots</label>
                <input
                  type="number"
                  min={1}
                  max={maxSpots}
                  value={minSpots}
                  onChange={(e) => setMinSpots(Number(e.target.value))}
                  className="w-full mt-1 bg-dark-950 border border-dark-800 focus:border-gold/60 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400">Max Spots</label>
                <input
                  type="number"
                  min={minSpots}
                  max={10}
                  value={maxSpots}
                  onChange={(e) => setMaxSpots(Number(e.target.value))}
                  className="w-full mt-1 bg-dark-950 border border-dark-800 focus:border-gold/60 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            {message && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </form>
        </div>

        {/* Right: Recent Rounds Telemetry Table */}
        <div className="lg:col-span-7 bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold font-cinzel text-white uppercase tracking-wider">
                Live Rounds Telemetry
              </h2>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search round ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-950 text-gray-400 border-b border-dark-800 font-mono">
                <tr>
                  <th className="p-2.5">Round ID</th>
                  <th className="p-2.5">Bet</th>
                  <th className="p-2.5">Multiplier</th>
                  <th className="p-2.5">Payout</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/60 font-mono">
                {filteredRounds.length > 0 ? (
                  filteredRounds.map((r) => (
                    <tr key={r.id} className="hover:bg-dark-850 transition">
                      <td className="p-2.5 text-gray-300 font-bold">{r.id.slice(0, 8)}...</td>
                      <td className="p-2.5 text-amber-300 font-bold">₹{r.bet.toFixed(2)}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.multiplier >= 10
                              ? 'bg-amber-500/20 text-gold border border-gold/40'
                              : r.multiplier > 1.0
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {r.multiplier}x
                        </span>
                      </td>
                      <td className="p-2.5 text-emerald-400 font-bold">₹{r.payout.toFixed(2)}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-500 text-[10px]">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 italic font-sans">
                      No matching Keno rounds found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KenoAdminPage;

