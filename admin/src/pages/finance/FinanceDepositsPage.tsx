import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { DepositItem, Pagination } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const FinanceDepositsPage: React.FC = () => {
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeposits = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(
        `/api/admin/finance/deposits?page=${page}&limit=${pagination.limit}`
      );
      if (res.data.success && res.data.data) {
        setDeposits(res.data.data.deposits);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch deposits list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
              SIMULATED DEPOSITS LOG
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 border border-amber-800 text-amber-400">
              SIMULATED FUNDS ONLY
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Auditable records of all simulated player deposits credited to the platform ledger.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-4 flex items-center gap-3 text-xs text-gray-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>
          Compliance Note: All deposit transactions represent simulated wallet movements with idempotent keys.
          No live banking or gateway credentials are connected in this environment.
        </span>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-850 border-b border-dark-800 text-xs text-gray-400 uppercase tracking-wider font-cinzel">
              <tr>
                <th className="px-6 py-4">Deposit Order ID</th>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Provider / Channel</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gold">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <span>FETCHING DEPOSIT RECORDS...</span>
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No simulated deposits recorded in the system.
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-dark-850/50 transition">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      {d.paymentOrderId ? d.paymentOrderId.substring(0, 12) + '...' : d.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {d.user?.email || `User: ${d.userId.substring(0, 8)}...`}
                      </div>
                      {d.user?.phone && <div className="text-xs text-gray-500">{d.user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gold">
                      {d.paymentOrder?.provider || 'SIMULATED_UPI'}
                    </td>
                    <td className="px-6 py-4 font-cinzel font-bold text-emerald-400 text-base">
                      +₹{Number(d.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={d.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-dark-800 flex items-center justify-between text-xs text-gray-400 bg-dark-850">
            <div>
              Showing page <span className="text-white font-bold">{pagination.page}</span> of{' '}
              <span className="text-white font-bold">{pagination.totalPages}</span> ({pagination.total} total records)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDeposits(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchDeposits(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

