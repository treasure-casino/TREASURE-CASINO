import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Shield, Database, Menu } from 'lucide-react';
import { Badge } from '../common/Badge';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { admin, logout } = useAuth();
  const displayApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '') + '/api';

  return (
    <header className="h-16 bg-dark-900/95 backdrop-blur border-b border-dark-800 fixed top-0 right-0 left-0 lg:left-64 z-20 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-md">
      {/* Left: Mobile Menu Toggle & DB Status indicator */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gold border border-gold/30 hover:border-gold transition shadow-sm"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-dark-800 border border-dark-700 rounded-lg text-xs text-gray-300">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden xs:inline">MySQL (treasure_db)</span>
          <span className="xs:hidden">DB</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </div>
        <div className="text-xs text-gray-400 hidden xl:block">
          API: <span className="text-gold font-mono">{displayApiUrl}</span>
        </div>
      </div>

      {/* Right: Admin Info & Logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {admin && (
          <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-4 border-r border-dark-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-black font-bold text-sm shadow shrink-0">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-white leading-tight truncate max-w-[120px]">{admin.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-gold shrink-0" />
                <Badge status={admin.role} />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-rose-400 bg-dark-800 hover:bg-dark-750 border border-dark-700 hover:border-rose-900/50 rounded-lg transition"
          title="Sign out of Admin Portal"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
