import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  Sparkles,
  RotateCw,
  Flame,
  Droplets,
  Mountain,
  Wind,
  Skull,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Layers,
  Search,
} from 'lucide-react';

interface VortexRoundStats {
  id: string;
  bet: number;
  payout: number;
  multiplier: number;
  status: string;
  levels: { fire: number; water: number; earth: number };
  bonusTriggered: boolean;
  lastElement: string | null;
  historyCount: number;
  startedAt: string;
  settledAt: string | null;
}

export const VortexAdminPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [activeRounds, setActiveRounds] = useState<number>(0);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [recentRounds, setRecentRounds] = useState<VortexRoundStats[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/vortex/admin/stats');
      if (res.data?.success && res.data?.data) {
        setTotalRounds(res.data.data.totalRounds);
        setActiveRounds(res.data.data.activeRounds);
        setCompletedRounds(res.data.data.completedRounds);
        setRecentRounds(res.data.data.recentRounds || []);
      }
    } catch (err) {
      console.error('Failed to fetch Vortex admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredRounds = recentRounds.filter(
    (r) =>
      r.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.status.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black font-cinzel text-white">TREASURE VORTEX MONITOR</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time elemental engine metrics, active rounds, and elemental event audit log
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/play/game-vortex-01"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 text-xs font-bold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Game</span>
          </a>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-700 text-xs font-bold transition shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-dark-900 border border-dark-800 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase">Total Demo Rounds</div>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-1">{totalRounds}</div>
          </div>
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-dark-900 border border-dark-800 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase">Active In-Flight Rounds</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{activeRounds}</div>
          </div>
          <div className="p-3 bg-amber-950/60 border border-amber-500/30 rounded-xl text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-dark-900 border border-dark-800 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase">Completed Rounds</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{completedRounds}</div>
          </div>
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Audit Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Vortex Rounds & Elemental Levels
            </h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by Round ID or Status..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-dark-950 border border-dark-700 text-gray-200 pl-8 pr-3 py-1.5 rounded-xl text-xs w-64 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dark-800 text-gray-400 font-bold">
                <th className="py-2.5 px-3">Round ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Bet Amount</th>
                <th className="py-2.5 px-3">Multiplier</th>
                <th className="py-2.5 px-3">Payout</th>
                <th className="py-2.5 px-3">Elemental Levels</th>
                <th className="py-2.5 px-3">Convergence</th>
                <th className="py-2.5 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60">
              {filteredRounds.length > 0 ? (
                filteredRounds.map((r) => (
                  <tr key={r.id} className="hover:bg-dark-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-cyan-300">
                      {r.id.substring(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          r.status === 'WON'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                            : r.status === 'ACTIVE'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40 animate-pulse'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      ₹{r.bet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-amber-300">
                      {r.multiplier.toFixed(2)}x
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-300">
                      ₹{r.payout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-orange-400 font-bold">
                          <Flame className="w-3 h-3 fill-current" />
                          <span>{r.levels?.fire || 0}</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-cyan-400 font-bold">
                          <Droplets className="w-3 h-3 fill-current" />
                          <span>{r.levels?.water || 0}</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                          <Mountain className="w-3 h-3 fill-current" />
                          <span>{r.levels?.earth || 0}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {r.bonusTriggered ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                          Convergence!
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 text-[11px] font-mono">
                      {new Date(r.startedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    No rounds found matching filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VortexAdminPage;

