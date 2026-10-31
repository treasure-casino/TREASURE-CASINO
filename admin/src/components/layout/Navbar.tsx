import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Shield, Database } from 'lucide-react';
import { Badge } from '../common/Badge';

export const Navbar: React.FC = () => {
  const { admin, logout } = useAuth();
  const displayApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '') + '/api';

  return (
    <header className="h-16 bg-dark-900/90 backdrop-blur border-b border-dark-800 fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-8">
      {/* Left: Backend & DB Status indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-dark-800 border border-dark-700 rounded-lg text-xs text-gray-300">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>MySQL (treasure_db)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="text-xs text-gray-400 hidden md:block">
          API: <span className="text-gold font-mono">{displayApiUrl}</span>
        </div>
      </div>

      {/* Right: Admin Info & Logout */}
      <div className="flex items-center gap-4">
        {admin && (
          <div className="flex items-center gap-3 pr-4 border-r border-dark-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-black font-bold text-sm shadow">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-white leading-tight">{admin.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-gold" />
                <Badge status={admin.role} />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-rose-400 bg-dark-800 hover:bg-dark-750 border border-dark-700 hover:border-rose-900/50 rounded-lg transition"
          title="Sign out of Admin Portal"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

