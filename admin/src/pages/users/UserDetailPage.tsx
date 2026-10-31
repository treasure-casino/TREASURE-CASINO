import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  User,
  Wallet,
  Gamepad2,
  HelpCircle,
  FileText,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change Modal State
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'BANNED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/admin/users/${id}`);
      if (res.data.success && res.data.data) {
        setUserData(res.data.data);
        setNewStatus(res.data.data.status);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim() || statusReason.trim().length < 5) {
      setError('An audit reason of at least 5 characters is mandatory.');
      return;
    }

    try {
      setSubmittingStatus(true);
      setError(null);

      const res = await apiClient.put(`/api/admin/users/${id}/status`, {
        status: newStatus,
        reason: statusReason.trim(),
      });

      if (res.data.success) {
        setActionSuccess(`Player status updated to ${newStatus}`);
        setStatusModalOpen(false);
        fetchUserDetails();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to change player status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  if (loading && !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gold">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <span className="text-sm font-cinzel">LOADING PLAYER PROFILE & FINANCIAL RECORD...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-400 mb-4">{error || 'User not found'}</p>
        <Link to="/users" className="text-gold hover:underline text-sm">
          Return to Users Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button & Title */}
      <div className="flex items-center justify-between pb-6 border-b border-dark-800">
        <div className="flex items-center gap-4">
          <Link
            to="/users"
            className="p-2 bg-dark-900 border border-dark-700 hover:border-gold/50 rounded-xl text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white font-cinzel">{userData.email}</h1>
              <Badge status={userData.status} />
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">User ID: {userData.id}</p>
          </div>
        </div>

        <button
          onClick={() => setStatusModalOpen(true)}
          className="px-4 py-2 bg-dark-800 hover:bg-dark-750 border border-amber-600/50 hover:border-amber-500 text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Change Account Status</span>
        </button>
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

      {/* Grid: Profile & Wallet Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-800">
            <User className="w-4 h-4 text-gold" />
            <h2 className="text-base font-bold text-white font-cinzel">Personal Profile</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Display Name:</span>
              <span className="text-white font-medium">{userData.profile?.displayName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Phone:</span>
              <span className="text-white font-medium">{userData.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Referral Code:</span>
              <span className="text-gold font-mono">{userData.referralCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Referred By:</span>
              <span className="text-gray-300 font-mono">{userData.referredBy || 'None (Direct)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Country:</span>
              <span className="text-white">{userData.profile?.country || 'India'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Registration Date:</span>
              <span className="text-gray-300">{new Date(userData.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Wallet Ledger Card */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-800">
            <Wallet className="w-4 h-4 text-gold" />
            <h2 className="text-base font-bold text-white font-cinzel">
              Wallet Ledger (Simulated)
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-dark-950 p-4 rounded-lg border border-dark-800">
              <div className="text-xs uppercase text-gray-400">Available Balance</div>
              <div className="text-2xl font-black text-white font-cinzel mt-1">
                ₹{Number(userData.wallet?.balance ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-dark-950 p-4 rounded-lg border border-dark-800">
              <div className="text-xs uppercase text-gray-400">Reserved Payout Funds</div>
              <div className="text-2xl font-black text-amber-400 font-cinzel mt-1">
                ₹{Number(userData.wallet?.reservedBalance ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            Wallet ID: {userData.wallet?.id} • Version: {userData.wallet?.version}
          </div>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-dark-800 bg-dark-850 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gold" />
          <h3 className="text-base font-bold text-white font-cinzel">
            Immutable Wallet Transactions Ledger
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-950 text-xs text-gray-400 uppercase tracking-wider font-cinzel">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Balance Before</th>
                <th className="px-6 py-3">Balance After</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-gray-300">
              {!userData.wallet?.transactions || userData.wallet.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    No transactions recorded for this wallet yet.
                  </td>
                </tr>
              ) : (
                userData.wallet.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-dark-850/50">
                    <td className="px-6 py-3 font-semibold text-white">{tx.type}</td>
                    <td className="px-6 py-3 font-bold font-cinzel text-gold">
                      ₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3 text-gray-400">₹{Number(tx.balanceBefore).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3 text-white">₹{Number(tx.balanceAfter).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3">
                      <Badge status={tx.status} />
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">{tx.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: Game Sessions & Submitted Support Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Sessions */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-dark-800 bg-dark-850 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white font-cinzel">Recent Game Activity</h3>
          </div>
          <div className="p-4">
            {!userData.gameSessions || userData.gameSessions.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">No game sessions recorded.</div>
            ) : (
              <div className="divide-y divide-dark-800 text-xs">
                {userData.gameSessions.map((g: any) => (
                  <div key={g.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">Round: {g.id.substring(0, 8)}...</div>
                      <div className="text-gray-500">{new Date(g.startedAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400">Bet: ₹{Number(g.betAmount).toLocaleString('en-IN')}</div>
                      <div className="font-bold text-gold font-cinzel">
                        Win: ₹{Number(g.winAmount).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-dark-800 bg-dark-850 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-cinzel">
              Player Support Tickets ({userData.supportTickets?.length ?? 0})
            </h3>
          </div>
          <div className="p-4">
            {!userData.supportTickets || userData.supportTickets.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                Player has submitted no support inquiries.
              </div>
            ) : (
              <div className="divide-y divide-dark-800 text-xs">
                {userData.supportTickets.map((t: any) => (
                  <div key={t.id} className="py-2.5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-white">{t.subject}</span>
                      <Badge status={t.status} />
                    </div>
                    <p className="text-gray-400 text-[11px] line-clamp-2">{t.description}</p>
                    <div className="text-gray-500 text-[10px] mt-1">
                      Submitted: {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Player Account Status"
      >
        <form onSubmit={handleStatusChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              New Account Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full bg-dark-950 border border-dark-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-gold"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Mandatory Audit Reason
            </label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={3}
              required
              placeholder="State the reason for this account status change..."
              className="w-full bg-dark-950 border border-dark-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
            />
            <span className="text-[11px] text-gray-500">Minimum 5 characters required.</span>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-dark-700">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-xs font-semibold text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingStatus}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-black rounded-lg text-xs font-bold tracking-wider hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 flex items-center gap-2"
            >
              {submittingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>SAVE AUDITED CHANGE</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

