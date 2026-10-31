import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { UserItem, Pagination } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'BANNED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      let query = `/api/admin/users?page=${page}&limit=${pagination.limit}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;

      const res = await apiClient.get(query);
      if (res.data.success && res.data.data) {
        setUsers(res.data.data.users);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const openStatusModal = (user: UserItem) => {
    setSelectedUser(user);
    setNewStatus(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!statusReason.trim() || statusReason.trim().length < 5) {
      setError('An audit reason of at least 5 characters is mandatory.');
      return;
    }

    try {
      setSubmittingStatus(true);
      setError(null);

      const res = await apiClient.put(`/api/admin/users/${selectedUser.id}/status`, {
        status: newStatus,
        reason: statusReason.trim(),
      });

      if (res.data.success) {
        setActionSuccess(`User ${selectedUser.email} status updated to ${newStatus}`);
        setStatusModalOpen(false);
        fetchUsers(pagination.page);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to change user status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dark-800">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
            USER MANAGEMENT
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse registered players, inspect ledger balances, and enforce account statuses.
          </p>
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

      {/* Filters & Search Toolbar */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, phone, referral code..."
            className="w-full pl-10 pr-4 py-2 bg-dark-950 border border-dark-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gold transition"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="BANNED">BANNED</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-850 border-b border-dark-800 text-xs text-gray-400 uppercase tracking-wider font-cinzel">
              <tr>
                <th className="px-6 py-4">Player / Email</th>
                <th className="px-6 py-4">Display Name</th>
                <th className="px-6 py-4">Referral Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Simulated Balance</th>
                <th className="px-6 py-4">Registered</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gold">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <span>FETCHING PLAYERS FROM DATABASE...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No users matching the current criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-dark-850/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{u.email}</div>
                      {u.phone && <div className="text-xs text-gray-500">{u.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {u.profile?.displayName || '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gold">
                      {u.referralCode}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={u.status} />
                    </td>
                    <td className="px-6 py-4 font-cinzel font-bold text-white">
                      ₹{Number(u.wallet?.balance ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/users/${u.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 text-xs font-medium text-gray-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-gold" />
                        <span>Inspect</span>
                      </Link>

                      <button
                        onClick={() => openStatusModal(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 text-xs font-medium text-amber-400 hover:text-amber-300 transition"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Status</span>
                      </button>
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
              <span className="text-white font-bold">{pagination.totalPages}</span> ({pagination.total} total players)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Status Change Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Player Account Status"
      >
        {selectedUser && (
          <form onSubmit={handleStatusChange} className="space-y-4">
            <div className="bg-dark-950 p-3 rounded-lg border border-dark-800 text-xs">
              <div className="text-gray-400">Target Player:</div>
              <div className="text-white font-bold mt-0.5">{selectedUser.email}</div>
              <div className="text-gray-500 text-[11px] font-mono mt-0.5">ID: {selectedUser.id}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                New Account Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-gold"
              >
                <option value="ACTIVE">ACTIVE (Permit play and wallet actions)</option>
                <option value="SUSPENDED">SUSPENDED (Temporarily halt login and actions)</option>
                <option value="BANNED">BANNED (Permanently terminate account access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Audit Reason (Mandatory)
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={3}
                required
                placeholder="Specify the regulatory or operational reason for this account status change (recorded in immutable admin audit log)..."
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
              />
              <span className="text-[11px] text-gray-500">Minimum 5 characters required.</span>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-dark-700">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-xs font-semibold text-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingStatus}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-black rounded-lg text-xs font-bold tracking-wider hover:from-amber-500 hover:to-yellow-500 transition disabled:opacity-50 flex items-center gap-2"
              >
                {submittingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>SAVE AUDITED CHANGE</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

