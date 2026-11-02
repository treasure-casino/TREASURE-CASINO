import React, { useState, useEffect } from 'react';
import { chickenRunApi, ChickenRunAdminStats } from '../../services/api/chickenRunApi';
import {
  Trophy,
  Activity,
  RotateCw,
  Coins,
  Shield,
  CheckCircle,
  AlertCircle,
  Sliders,
  Save,
  Flame,
} from 'lucide-react';

export const ChickenRunAdminPage: React.FC = () => {
  const [stats, setStats] = useState<ChickenRunAdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable config state
  const [minBet, setMinBet] = useState<number>(10);
  const [maxBet, setMaxBet] = useState<number>(5000);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chickenRunApi.getAdminStats();
      setStats(data);
      if (data.config) {
        setMinBet(data.config.minBet);
        setMaxBet(data.config.maxBet);
        setIsEnabled(data.config.isEnabled);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch Chicken Run statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      await chickenRunApi.updateConfig({
        isEnabled,
        minBet: Number(minBet),
        maxBet: Number(maxBet),
      });

      setMessage('Treasure Chicken Run settings updated successfully!');
      await fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2 font-mono">
            <span className="text-2xl">🐔</span>
            <span>TREASURE CHICKEN RUN — ADMIN MONITOR</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Server-authoritative cartoon road crosser, 24-step multiplier ladders, and real-time ledger stats.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-mono text-sm transition-all"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center space-x-2 text-emerald-300 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-center space-x-2 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-1">
            <span>TOTAL ROUNDS</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {stats?.stats.totalRounds ?? 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Won: {stats?.stats.wonRounds ?? 0} | Lost: {stats?.stats.lostRounds ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-1">
            <span>TOTAL WAGERED</span>
            <Coins className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            ₹{(stats?.stats.totalWagered ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Total Paid: ₹{(stats?.stats.totalPayout ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-1">
            <span>THEORETICAL RTP</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300">
            {stats?.stats.theoreticalRtp ?? '96.0%'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Empirical RTP: {stats?.stats.empiricalRtp ?? '96.0%'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-1">
            <span>PEAK MULTIPLIER</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-yellow-400">
            {(stats?.stats.maxMultiplier ?? 0).toFixed(2)}x
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Win Rate: {stats?.stats.winRate ?? '0%'}
          </div>
        </div>
      </div>

      {/* Admin Settings Form */}
      <div className="p-6 rounded-2xl bg-black/40 border border-emerald-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-2 border-b border-emerald-900/60 pb-3 mb-5">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold font-mono text-white uppercase">
            Game Configuration & Bet Boundaries
          </h2>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Game Active Status
            </label>
            <select
              value={isEnabled ? 'true' : 'false'}
              onChange={(e) => setIsEnabled(e.target.value === 'true')}
              className="w-full bg-white/5 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-emerald-400 outline-none"
            >
              <option value="true" className="bg-gray-900">
                ACTIVE (Enabled for all players)
              </option>
              <option value="false" className="bg-gray-900">
                DISABLED (Maintenance Mode)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Minimum Demo Bet (₹)
            </label>
            <input
              type="number"
              min={1}
              value={minBet}
              onChange={(e) => setMinBet(Number(e.target.value))}
              className="w-full bg-white/5 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-emerald-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-gray-400 mb-2">
              Maximum Demo Bet (₹)
            </label>
            <input
              type="number"
              min={minBet}
              value={maxBet}
              onChange={(e) => setMaxBet(Number(e.target.value))}
              className="w-full bg-white/5 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-emerald-400 outline-none"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Transparent Difficulties Breakdown */}
      <div className="p-6 rounded-2xl bg-black/40 border border-emerald-900/60 backdrop-blur-md">
        <h2 className="text-lg font-bold font-mono text-white uppercase mb-4 flex items-center space-x-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>Difficulty Risk & Multiplier Ladders (24 Steps)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['EASY', 'MEDIUM', 'HARD', 'HARDCORE'] as const).map((d) => {
            const diff = stats?.config.difficulties[d];
            return (
              <div
                key={d}
                className="p-4 rounded-xl bg-white/5 border border-emerald-900/40 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm" style={{ color: diff?.color || '#10b981' }}>
                      {d}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{diff?.volatility}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{diff?.description}</p>
                </div>

                <div className="border-t border-white/5 pt-2 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Survival Rate:</span>
                    <strong className="text-white">{diff?.winRatePercent}</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Step 1 Multiplier:</span>
                    <strong className="text-emerald-400">{diff?.multipliers[0]}x</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Step 12 Multiplier:</span>
                    <strong className="text-yellow-400">{diff?.multipliers[11]}x</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Final Step 24:</span>
                    <strong className="text-amber-400">{diff?.multipliers[23]}x</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

