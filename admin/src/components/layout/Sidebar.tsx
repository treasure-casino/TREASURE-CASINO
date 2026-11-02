import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  HelpCircle,
  FileText,
  Settings,
  Crown,
  Sparkles,
  Layers,
  Trophy,
  Zap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'User Management', path: '/users', icon: Users },
      ],
    },
    {
      title: 'FINANCIAL (SIMULATED)',
      items: [
        { label: 'Deposits', path: '/finance/deposits', icon: ArrowDownLeft },
        { label: 'Withdrawal Review', path: '/finance/withdrawals', icon: ArrowUpRight },
      ],
    },
    {
      title: 'CASINO OPERATIONS',
      items: [
        { label: 'Player Game Lobby', path: '/lobby', icon: Gamepad2 },
        { label: 'Game Catalogue', path: '/games', icon: Gamepad2 },
        { label: 'Vortex Monitor', path: '/games/vortex', icon: Sparkles },
        { label: 'Spiral Monitor', path: '/games/spiral', icon: Layers },
        { label: 'Keno Monitor', path: '/games/keno', icon: Trophy },
        { label: 'Hilo Monitor', path: '/games/hilo', icon: Trophy },
        { label: 'Hotline Monitor', path: '/games/hotline', icon: Zap },
        { label: 'Chicken Run Monitor', path: '/games/chicken-run', icon: Trophy },
        { label: 'Promotions & Rewards', path: '/promotions', icon: Gift },
        { label: 'Support Tickets', path: '/support', icon: HelpCircle },
      ],
    },
    {
      title: 'SYSTEM & SECURITY',
      items: [
        { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-dark-800 bg-dark-950/80">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-600 text-black shadow-lg shadow-gold/10">
          <Crown className="w-5 h-5 fill-current" />
        </div>
        <div>
          <span className="text-lg font-black tracking-widest text-gold font-cinzel block">
            TREASURE
          </span>
          <span className="text-[10px] tracking-wider text-gray-400 uppercase block -mt-1 font-medium">
            Management Portal
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-amber-950/60 text-gold border border-gold/40 shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-dark-800'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Environment Mode Status */}
      <div className="p-4 border-t border-dark-800 bg-dark-950/50">
        <div className="bg-dark-850 border border-amber-800/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase block">
            SIMULATED PAYMENT MODE
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            Real money processing disabled
          </span>
        </div>
      </div>
    </aside>
  );
};

