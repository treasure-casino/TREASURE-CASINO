import React, { useState, useEffect } from 'react';
import { spiralApi } from '../../services/spiralApi';
import { SpiralRoundStats } from '../../types/spiral';
import {
  Sparkles,
  Layers,
  Activity,
  Award,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  Coins,
} from 'lucide-react';

export const SpiralAdminPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [activeRounds, setActiveRounds] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [recentRounds, setRecentRounds] = useState<SpiralRoundStats[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await spiralApi.getAdminStats();
      if (res.success && res.data) {
        setTotalRounds(res.data.totalRounds);
        setActiveRounds(res.data.activeRounds);
        setCompletedRounds(res.data.completedRounds);
        setRecentRounds(res.data.recentRounds || []);
      }
    } catch (err) {
      console.error('Failed to fetch Spiral admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalBets = recentRounds.reduce((acc, r) => acc + (r.bet || 0), 0);
  const totalPayouts = recentRounds.reduce((acc, r) => acc + (r.payout || 0), 0);

  const filteredRounds = recentRounds.filter(
    (r) =>
      r.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.status.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.lastSymbol && r.lastSymbol.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-dark-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-cinzel font-black text-white flex items-center gap-2">
              TREASURE SPIRAL <span className="text-amber-400">MONITOR</span>
            </h1>
            <p className="text-xs text-gray-400">
              Real-time audit telemetry & rounds for 3 Concentric Rings game
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/lobby/arena/game-spiral-01"
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Total Rounds</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">
            {totalRounds}
          </div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Active Rounds</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">
            {activeRounds}
          </div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Completed Rounds</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {completedRounds}
          </div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Total Demo Bets</span>
            <Coins className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-yellow-300">
            ₹{totalBets.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
            <span>Demo Payouts</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-purple-300">
            ₹{totalPayouts.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Rounds Table */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Recent Spiral Rounds & Animal Events</span>
            <span className="text-xs px-2 py-0.5 bg-dark-800 rounded-full text-gray-400 font-mono">
              {filteredRounds.length}
            </span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, status, symbol..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700 pl-9 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-950/80 text-gray-400 uppercase tracking-wider text-[10px] font-bold border-b border-dark-800">
              <tr>
                <th className="py-3 px-4">Round ID</th>
                <th className="py-3 px-4">Bet Amount</th>
                <th className="py-3 px-4">Positions (Out/Mid/In)</th>
                <th className="py-3 px-4">Multiplier</th>
                <th className="py-3 px-4">Payout</th>
                <th className="py-3 px-4">Last Symbol</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60 font-mono">
              {filteredRounds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 font-sans">
                    No Spiral rounds found.
                  </td>
                </tr>
              ) : (
                filteredRounds.map((r) => (
                  <tr key={r.id} className="hover:bg-dark-800/40 transition">
                    <td className="py-3 px-4 text-gray-400 font-sans">
                      <span className="text-[11px] font-bold text-white block">
                        {r.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      ₹{r.bet.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-amber-400">{r.outerPosition}/8</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-sky-400">{r.middlePosition}/6</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-purple-400">{r.innerPosition}/4</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-bold">
                      {r.multiplier.toFixed(2)}x
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">
                      ₹{r.payout.toLocaleString('en-IN')}
                      {r.halfCashedOut && (
                        <span className="ml-1 text-[9px] text-sky-300 font-sans">(1/2)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.lastSymbol ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-dark-950 border border-dark-700 text-gray-200">
                          {r.lastSymbol === 'LION' && '🦁 LION'}
                          {r.lastSymbol === 'ELEPHANT' && '🐘 ELEPHANT'}
                          {r.lastSymbol === 'DOG' && '🐕 DOG'}
                          {r.lastSymbol === 'GOAT' && '🐐 GOAT'}
                          {r.lastSymbol === 'SKULL' && '💀 SKULL'}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'WON'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.status === 'ACTIVE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[10px] font-sans">
                      {new Date(r.startedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SpiralAdminPage;

