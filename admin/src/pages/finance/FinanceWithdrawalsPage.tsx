import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { WithdrawalItem, Pagination } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  ArrowUpRight,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const FinanceWithdrawalsPage: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Modal State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewReason, setReviewReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchWithdrawals = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      let query = `/api/admin/finance/withdrawals?page=${page}&limit=${pagination.limit}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;

      const res = await apiClient.get(query);
      if (res.data.success && res.data.data) {
        setWithdrawals(res.data.data.withdrawals);
        setPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals(1);
  }, [statusFilter]);

  const openReviewModal = (w: WithdrawalItem, initialDecision: 'APPROVE' | 'REJECT') => {
    setSelectedWithdrawal(w);
    setDecision(initialDecision);
    setReviewReason(
      initialDecision === 'APPROVE'
        ? 'Account identity verified; simulated payout approved.'
        : ''
    );
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;

    if (decision === 'REJECT' && (!reviewReason.trim() || reviewReason.trim().length < 5)) {
      setError('A rejection reason of at least 5 characters is required for auditing.');
      return;
    }

    try {
      setSubmittingReview(true);
      setError(null);

      const res = await apiClient.put(
        `/api/admin/finance/withdrawals/${selectedWithdrawal.id}/review`,
        {
          decision,
          reason: reviewReason.trim(),
        }
      );

      if (res.data.success) {
        setActionSuccess(
          `Withdrawal for ₹${selectedWithdrawal.amount} was ${decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'}.`
        );
        setReviewModalOpen(false);
        fetchWithdrawals(pagination.page);
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit withdrawal review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-wide text-white font-cinzel">
              WITHDRAWAL REVIEW DESK
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 border border-amber-800 text-amber-400">
              SIMULATED FUNDS ONLY
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Review simulated player payout requests. Approving completes the deduction; rejecting refunds reserved funds.
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

      {/* Filter Bar */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gold"
          >
            <option value="ALL">All Request Statuses</option>
            <option value="PENDING">PENDING (Action Required)</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-850 border-b border-dark-800 text-xs text-gray-400 uppercase tracking-wider font-cinzel">
              <tr>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Bank / UPI Destination</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Requested Date</th>
                <th className="px-6 py-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gold">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <span>FETCHING WITHDRAWALS...</span>
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No withdrawal requests matching the selected filter.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  let bank = { accountNumber: '', upiId: '', ifscCode: '' };
                  try {
                    if (w.bankDetails) bank = JSON.parse(w.bankDetails);
                  } catch {}

                  return (
                    <tr key={w.id} className="hover:bg-dark-850/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {w.user?.email || `User: ${w.userId.substring(0, 8)}...`}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">ID: {w.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 font-cinzel font-bold text-amber-400 text-base">
                        ₹{Number(w.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {bank.upiId ? (
                          <div className="text-gold">UPI: {bank.upiId}</div>
                        ) : bank.accountNumber ? (
                          <div>
                            A/C: {bank.accountNumber} <br />
                            <span className="text-gray-500">IFSC: {bank.ifscCode}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Details provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={w.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(w.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openReviewModal(w, 'APPROVE')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-semibold transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => openReviewModal(w, 'REJECT')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-semibold transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Reviewed ({w.status})</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-dark-800 flex items-center justify-between text-xs text-gray-400 bg-dark-850">
            <div>
              Showing page <span className="text-white font-bold">{pagination.page}</span> of{' '}
              <span className="text-white font-bold">{pagination.totalPages}</span> ({pagination.total} total requests)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchWithdrawals(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchWithdrawals(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={decision === 'APPROVE' ? 'Approve Withdrawal Request' : 'Reject Withdrawal Request'}
      >
        {selectedWithdrawal && (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="bg-dark-950 p-4 rounded-lg border border-dark-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Player:</span>
                <span className="text-white font-bold">{selectedWithdrawal.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount Requested:</span>
                <span className="text-gold font-bold font-cinzel text-sm">
                  ₹{Number(selectedWithdrawal.amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Action Impact:</span>
                <span className={decision === 'APPROVE' ? 'text-emerald-400' : 'text-amber-400'}>
                  {decision === 'APPROVE'
                    ? 'Deducts reserved funds from wallet permanently'
                    : 'Safely restores reserved funds to player available balance'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Audit Review Notes / Reason {decision === 'REJECT' && '(Mandatory)'}
              </label>
              <textarea
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                rows={3}
                required={decision === 'REJECT'}
                placeholder={
                  decision === 'APPROVE'
                    ? 'Optional approval note...'
                    : 'Specify reason for rejection (e.g., incorrect banking IFSC or KYC discrepancy)...'
                }
                className="w-full bg-dark-950 border border-dark-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-dark-700">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-xs font-semibold text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider text-white transition disabled:opacity-50 flex items-center gap-2 ${
                  decision === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>CONFIRM {decision}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

