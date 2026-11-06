import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { DashboardStats, DashboardCharts, DepositItem, WithdrawalItem } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import {
  Users,
  UserCheck,
  Gamepad2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<DepositItem[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, chartsRes, depRes, wdrRes] = await Promise.all([
        apiClient.get('/api/admin/dashboard/stats'),
        apiClient.get('/api/admin/dashboard/charts'),
        apiClient.get('/api/admin/finance/deposits?limit=5'),
        apiClient.get('/api/admin/finance/withdrawals?limit=5&status=PENDING'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (chartsRes.data.success) {
        setCharts(chartsRes.data.data);
      }
      if (depRes.data.success && depRes.data.data) {
        setRecentDeposits(depRes.data.data.deposits || []);
      }
      if (wdrRes.data.success && wdrRes.data.data) {
        setPendingWithdrawals(wdrRes.data.data.withdrawals || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gold">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <span className="text-sm tracking-wider font-cinzel">LOADING CASINO PLATFORM METRICS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dark-800">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
            COMMAND DASHBOARD
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time operations, player activity, and financial ledger status.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-750 border border-dark-700 hover:border-gold/40 rounded-xl text-xs font-semibold text-gray-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold' : ''}`} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Registered Players"
          value={stats?.totalUsers ?? 0}
          subtitle={`${stats?.activeUsers ?? 0} active player accounts`}
          icon={Users}
          variant="default"
        />

        <StatCard
          title="Active Casino Games"
          value={stats?.activeGamesCount ?? 0}
          subtitle="Authorized demo & live titles"
          icon={Gamepad2}
          variant="gold"
        />

        <StatCard
          title="Pending Withdrawal Requests"
          value={stats?.pendingWithdrawalsCount ?? 0}
          subtitle="Requires financial admin review"
          icon={AlertCircle}
          variant={stats && stats.pendingWithdrawalsCount > 0 ? 'amber' : 'default'}
          isSimulated
        />

        <StatCard
          title="Gross Gaming Revenue"
          value={`₹${Number(stats?.grossGamingRevenue ?? 0).toLocaleString('en-IN')}`}
          subtitle="Deposits minus payouts"
          icon={TrendingUp}
          variant="emerald"
          isSimulated
        />
      </div>

      {/* Secondary Financial Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-3.5 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-emerald-950/50 border border-emerald-800/40 rounded-lg text-emerald-400">
              <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400">Total Deposits</div>
              <div className="text-lg sm:text-xl font-bold text-white font-cinzel">
                ₹{Number(stats?.totalDeposits ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <Link
            to="/finance/deposits"
            className="text-xs text-gold hover:underline flex items-center gap-1 font-medium shrink-0"
          >
            <span>View All</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-3.5 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-amber-950/50 border border-amber-800/40 rounded-lg text-amber-400">
              <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400">Total Payouts</div>
              <div className="text-lg sm:text-xl font-bold text-white font-cinzel">
                ₹{Number(stats?.totalWithdrawals ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <Link
            to="/finance/withdrawals"
            className="text-xs text-gold hover:underline flex items-center gap-1 font-medium shrink-0"
          >
            <span>Review Desk</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Two Columns: Pending Withdrawals & Recent Deposits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Withdrawals Action Desk */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-850">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white font-cinzel">
                Pending Withdrawal Requests
              </h2>
            </div>
            <Link
              to="/finance/withdrawals"
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              <span>Manage Desk</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5">
            {pendingWithdrawals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No pending withdrawal requests requiring attention.
              </div>
            ) : (
              <div className="divide-y divide-dark-800">
                {pendingWithdrawals.map((w) => (
                  <div key={w.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {w.user?.email || `User: ${w.userId.substring(0, 8)}...`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Requested: {new Date(w.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400 font-cinzel">
                        ₹{Number(w.amount).toLocaleString('en-IN')}
                      </div>
                      <Badge status={w.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Simulated Deposits */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-850">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white font-cinzel">
                Recent Deposits (Simulated)
              </h2>
            </div>
            <Link
              to="/finance/deposits"
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              <span>Full History</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5">
            {recentDeposits.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No simulated deposits recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-dark-800">
                {recentDeposits.map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {d.user?.email || `User: ${d.userId.substring(0, 8)}...`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {d.paymentOrder?.provider || 'SIMULATED_UPI'} •{' '}
                        {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400 font-cinzel">
                        +₹{Number(d.amount).toLocaleString('en-IN')}
                      </div>
                      <Badge status={d.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Games Catalog Summary Card */}
      {charts?.gamesByCategory && charts.gamesByCategory.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-base font-bold text-white font-cinzel mb-4">
            Game Catalogue by Category
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {charts.gamesByCategory.map((c) => (
              <div
                key={c.category}
                className="bg-dark-950 border border-dark-800 rounded-lg p-3 text-center"
              >
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {c.category}
                </div>
                <div className="text-xl font-bold text-gold font-cinzel mt-1">
                  {c._count.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

