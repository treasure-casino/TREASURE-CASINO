import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crown, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both administrator email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to sign in. Please verify your administrator credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 px-2 sm:px-0">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-xl shadow-gold/20 mb-3 sm:mb-4">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-gold font-cinzel">TREASURE</h1>
          <p className="text-xs sm:text-sm font-medium tracking-wider uppercase text-gray-400 mt-1">
            Admin Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-900/90 backdrop-blur border border-gold/30 rounded-2xl p-5 sm:p-8 shadow-2xl">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-5 sm:mb-6">Administrator Sign In</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@treasure.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-gold transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-gold transition text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black font-bold tracking-wider rounded-xl hover:from-amber-500 hover:to-yellow-400 focus:outline-none transition-all duration-200 shadow-lg shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <span>ENTER ADMIN CONSOLE</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-dark-800 text-center">
            <p className="text-xs text-gray-500">
              Default Seeded Account: <span className="text-gray-400">admin@treasure.com</span>
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          TREASURE Casino Portal • Restricted authorized access only
        </p>
      </div>
    </div>
  );
};

