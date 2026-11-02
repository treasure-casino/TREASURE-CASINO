import React, { useState, useEffect } from 'react';
import { hotlineApi } from '../../services/hotlineApi';
import { HotlineAdminStats } from '../../types/hotline';
import {
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
  Zap,
} from 'lucide-react';

export const HotlineAdminPage: React.FC = () => {
  const [stats, setStats] = useState<HotlineAdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Editable config state
  const [minBet, setMinBet] = useState<number>(10);
  const [maxBet, setMaxBet] = useState<number>(5000);
  const [baseRtp, setBaseRtp] = useState<number>(0.96);
  const [maxMultiplier, setMaxMultiplier] = useState<number>(1000.0);
  const [minNumber, setMinNumber] = useState<number>(1);
  const [maxNumber, setMaxNumber] = useState<number>(100);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hotlineApi.getAdminStats();
      if (data) {
        setStats(data);
        setMinBet(data.config.minBet);
        setMaxBet(data.config.maxBet);
        setBaseRtp(data.config.baseRtp);
        setMaxMultiplier(data.config.maxMultiplier);
        setMinNumber(data.config.minNumber);
        setMaxNumber(data.config.maxNumber);
        setIsEnabled(data.config.isEnabled);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch Hotline admin statistics');
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

      await hotlineApi.updateConfig({
        minBet,
        maxBet,
        baseRtp,
        maxMultiplier,
        minNumber,
        maxNumber,
        isEnabled,
      });

      setMessage('Hotline configuration successfully updated and saved to runtime engine.');
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
            <Zap className="w-6 h-6 animate-pulse text-gold" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-cinzel font-black text-white flex items-center gap-2">
              TREASURE HOTLINE MONITOR & CONFIG
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              Server-Authoritative Hotline Multiplier Engine • Demo Financial Mode
            </p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-xs font-bold font-mono transition text-gray-300 hover:text-white"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>REFRESH METRICS</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs font-mono">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Telemetry Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>TOTAL ROUNDS</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {stats?.totalRounds ?? 0}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 font-mono">Completed Demo Sessions</div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>TOTAL VOLUME</span>
            <Coins className="w-4 h-4 text-gold" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-gold">
            ₹{(stats?.totalBets ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 font-mono">Wagered in Demo Mode</div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>TOTAL PAYOUTS</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            ₹{(stats?.totalPayouts ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 font-mono">Credited to Demo Wallets</div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>MEASURED RTP</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
            {stats?.actualRtp ? `${stats.actualRtp}%` : '96.0%'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 font-mono">Target: 96.0% Base RTP</div>
        </div>
      </div>

      {/* Main Admin Content Grid: Config + Recent Rounds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form (5 cols) */}
        <div className="lg:col-span-5 bg-dark-900/90 border border-dark-800 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-black font-cinzel text-gold border-b border-dark-800 pb-3 mb-4">
            <Sliders className="w-4 h-4 text-gold" />
            <span>GAME ENGINE CONFIGURATION</span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 bg-dark-950/80 rounded-xl border border-dark-800">
              <div>
                <span className="text-xs font-bold block text-gray-300">Game Active Status</span>
                <span className="text-[10px] text-gray-500">Allow players to play Hotline</span>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {/* Bet Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">MIN BET (₹)</label>
                <input
                  type="number"
                  value={minBet}
                  onChange={(e) => setMinBet(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">MAX BET (₹)</label>
                <input
                  type="number"
                  value={maxBet}
                  onChange={(e) => setMaxBet(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Base RTP & Max Multiplier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">CONFIGURED BASE RTP</label>
                <input
                  type="number"
                  step="0.01"
                  value={baseRtp}
                  onChange={(e) => setBaseRtp(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">MAX MULTIPLIER (x)</label>
                <input
                  type="number"
                  value={maxMultiplier}
                  onChange={(e) => setMaxMultiplier(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Mathematical Model & Volatility Profile */}
            <div className="p-3 bg-dark-950/80 rounded-xl border border-dark-800 space-y-2">
              <span className="text-xs font-bold block text-gray-300">Slot Mathematical Profile</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-dark-900 rounded-lg border border-dark-800">
                  <span className="text-cyan-400 font-bold block">LOW RISK</span>
                  <span className="text-gray-400 block">Win Rate: ~42.1%</span>
                  <span className="text-gray-400 block">Vol: LOW (96% RTP)</span>
                </div>
                <div className="p-2 bg-dark-900 rounded-lg border border-dark-800">
                  <span className="text-fuchsia-400 font-bold block">HIGH RISK</span>
                  <span className="text-gray-400 block">Win Rate: ~44.4%</span>
                  <span className="text-gray-400 block">Vol: HIGH (96% RTP)</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                <span>Scatter Rate: <b className="text-yellow-400">1.0%</b></span>
                <span>Free Spins Trigger: <b className="text-yellow-400">0.04% (~1 in 2.5k)</b></span>
              </div>
            </div>

            {/* Number Range (1 to 100) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">MIN NUMBER</label>
                <input
                  type="number"
                  value={minNumber}
                  onChange={(e) => setMinNumber(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">MAX NUMBER</label>
                <input
                  type="number"
                  value={maxNumber}
                  onChange={(e) => setMaxNumber(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SAVING...' : 'SAVE HOTLINE CONFIGURATION'}</span>
            </button>
          </form>
        </div>

        {/* Right: Recent Rounds Telemetry (7 cols) */}
        <div className="lg:col-span-7 bg-dark-900/90 border border-dark-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-dark-800 pb-3 mb-4">
              <span className="text-sm font-black font-cinzel text-purple-300">RECENT HOTLINE ROUNDS</span>
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter rounds..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-dark-800/80">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Bet</th>
                    <th className="pb-2">Multiplier</th>
                    <th className="pb-2">Payout</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {filteredRounds.map((r) => (
                    <tr key={r.id} className="hover:bg-dark-800/30 transition">
                      <td className="py-2 text-gray-400">{r.id.slice(0, 8)}...</td>
                      <td className="py-2 text-gray-200">₹{r.bet.toFixed(2)}</td>
                      <td className="py-2 text-gold font-bold">{r.multiplier.toFixed(2)}x</td>
                      <td className="py-2 text-emerald-400 font-bold">₹{r.payout.toFixed(2)}</td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'WON'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-500 text-[10px]">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {filteredRounds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-gray-500 italic">
                        No matching rounds found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

