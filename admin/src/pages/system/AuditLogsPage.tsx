import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AuditLogItem, Pagination } from '../../types';
import {
  FileText,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(
        `/api/admin/audit-logs?page=${page}&limit=${pagination.limit}`
      );
      if (res.data.success && res.data.data) {
        setLogs(res.data.data.logs);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
              IMMUTABLE AUDIT LOGS
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 border border-emerald-800 text-emerald-400">
              TAMPER EVIDENT
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Complete cryptographic audit trail of all sensitive administrator mutations, approvals, and status changes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-sm rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-850 border-b border-dark-800 text-xs text-gray-400 uppercase tracking-wider font-cinzel">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Details / Parameters</th>
                <th className="px-6 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gold">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <span>FETCHING AUDIT TRAIL...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No administrator audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-850/50 transition">
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {log.admin?.name || 'Administrator'}
                      </div>
                      <div className="text-xs text-gray-500">{log.admin?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-dark-950 border border-amber-800/60 text-gold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-300">
                      {log.resource} {log.resourceId ? `(#${log.resourceId.substring(0, 8)})` : ''}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400 max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {log.ipAddress || '127.0.0.1'}
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
              <span className="text-white font-bold">{pagination.totalPages}</span> ({pagination.total} total audit records)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
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

